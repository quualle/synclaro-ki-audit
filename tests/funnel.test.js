"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assessment = require("../netlify/functions/_shared/assessment");
const advisory = require("../netlify/functions/_shared/advisory");
const consents = require("../netlify/functions/_shared/consents");
const deliveries = require("../netlify/functions/_shared/deliveries");
const meta = require("../netlify/functions/_shared/meta");
const security = require("../netlify/functions/_shared/security");
const session = require("../netlify/functions/_shared/session");
const supabaseAdmin = require("../netlify/functions/_shared/supabase");
const submitModule = require("../netlify/functions/_shared/submit-lead-handler");
const submit = submitModule._test;
const analyze = require("../netlify/functions/analyze")._test;
const resultBuilder = require("../netlify/functions/_shared/result");
const tracking = require("../netlify/functions/track-event")._test;
const consentState = require("../public/consent-state");
const handoff = require("../public/handoff");

function answersWith(value) {
  return assessment.PHASES.flatMap((phase) => phase.questions)
    .filter((question) => question.dimension)
    .map((question) => ({ questionId: question.id, answer: String(value), answerLabel: question.options[value - 1].label }));
}

function adaptiveAnswersWith(value) {
  return [
    "prozess_standardisierung",
    "wissen_verteilung",
    "ki_nutzung",
    "verantwortung",
    "daten_zugriff",
    "team_digital",
    "ki_leitplanken",
    "erfolgsmessung",
  ].map((questionId) => ({ questionId, answer: String(value) }));
}

test("der feste Score hat stabile Randwerte und ist branchenneutral", () => {
  const low = assessment.scoreAssessment(answersWith(1), { branche: "Steuerberatung", mitarbeiter: "1-5" });
  const high = assessment.scoreAssessment(answersWith(4), { branche: "Metallbau", mitarbeiter: "1-5" });
  const otherIndustry = assessment.scoreAssessment(answersWith(1), { branche: "Online-Handel", mitarbeiter: "1-5" });
  assert.equal(low.scores.total.percent, 0);
  assert.equal(low.level, "KI-Fundament aufbauen");
  assert.equal(high.scores.total.percent, 100);
  assert.equal(high.level, "KI-Skalierbar");
  assert.deepEqual(low.scores, otherIndustry.scores);
  assert.equal(low.complete, true);
  assert.equal(low.assessmentVersion, "2026-07-19.v5");
});

test("der adaptive Score benötigt exakt zwei Messanker je Dimension", () => {
  const low = assessment.scoreAdaptiveAssessment(adaptiveAnswersWith(1), { branche: "Beratung", mitarbeiter: "solo" });
  const high = assessment.scoreAdaptiveAssessment(adaptiveAnswersWith(4), { branche: "Metallbau", mitarbeiter: "1-5" });
  assert.equal(low.complete, true);
  assert.equal(low.scores.total.percent, 0);
  assert.equal(high.scores.total.percent, 100);
  assert.deepEqual(low.coverage, { prozesse_daten: 2, team_wissen: 2, ki_praxis: 2, umsetzungskraft: 2 });
  assert.equal(assessment.scoreAdaptiveAssessment(adaptiveAnswersWith(2).slice(1), {}).complete, false);
});

test("Solo-Selbstständige erhalten passende Fragen bei identischer Bewertungslogik", () => {
  const soloPhase = assessment.getPhase(2, answersWith(2).slice(0, 4), { mitarbeiter: "solo" });
  const teamPhase = assessment.getPhase(2, answersWith(2).slice(0, 4), { mitarbeiter: "1-5" });
  const soloLabels = [1, 2, 3]
    .flatMap((step) => assessment.getPhase(step, answersWith(2), { mitarbeiter: "solo" }).questions)
    .map((question) => `${question.label} ${question.options?.map((option) => option.label).join(" ") || ""}`)
    .join(" ");
  assert.match(soloLabels, /eigenen Alltag|Arbeitswissen/);
  assert.doesNotMatch(soloLabels, /Das Team|andere bleiben|Schlüsselperson spontan ausfällt|je nach Person|Köpfe|gemeinsamen Regeln|mündliche Absprachen|wir wollen|Verantwortliche|Testgruppe|haben wir/);
  assert.notDeepEqual(soloPhase.questions[0].options, teamPhase.questions[0].options);
  assert.equal(assessment.scoreAssessment(answersWith(1), { mitarbeiter: "solo" }).scores.total.percent, 0);
  assert.equal(assessment.scoreAssessment(answersWith(4), { mitarbeiter: "solo" }).scores.total.percent, 100);
});

test("fehlende Kernantworten führen nie zu einem vollständigen Score", () => {
  const result = assessment.scoreAssessment(answersWith(3).slice(1), { mitarbeiter: "solo" });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingQuestionIds, ["prozess_standardisierung"]);
});

test("Lead-Eingaben werden normalisiert und serverseitig rekonstruiert", () => {
  assert.deepEqual(submit.sanitizeContact({ firstName: " Ada ", lastName: " Lovelace ", company: " Analytical GmbH ", email: " ADA@EXAMPLE.COM ", phone: "0170 1234567" }), {
    firstName: "Ada", lastName: "Lovelace", company: "Analytical GmbH", email: "ada@example.com",
  });
  const firstQuestion = assessment.PHASES[0].questions[0];
  const sanitized = submit.sanitizeAnswers([
    { questionId: firstQuestion.id, questionLabel: "Manipulierte Frage", answer: "2", answerLabel: "Manipulierte Antwort" },
    { questionId: firstQuestion.id, answer: "4" },
    { questionId: "unbekannt", answer: "4" },
  ]);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].questionLabel, firstQuestion.label);
  assert.equal(sanitized[0].answerLabel, firstQuestion.options[1].label);

  const soloQuestion = assessment.getQuestion("team_digital", { mitarbeiter: "solo" });
  const soloSanitized = submit.sanitizeAnswers([
    { questionId: soloQuestion.id, answer: "2", questionLabel: "Team?", answerLabel: "Manipuliert" },
  ], { mitarbeiter: "solo" });
  assert.equal(soloSanitized[0].questionLabel, soloQuestion.label);
  assert.equal(soloSanitized[0].answerLabel, soloQuestion.options[1].label);
});

test("Datenschutzhinweis, Newsletter und Tracking sind versioniert und nicht vermischt", () => {
  const result = submit.sanitizeConsents({
    privacyNotice: { acknowledged: true, version: consents.PRIVACY_VERSION },
    newsletter: { granted: true, version: consents.NEWSLETTER_CONSENT_VERSION, text: consents.NEWSLETTER_CONSENT_TEXT },
    analytics: { granted: true, version: consents.COOKIE_CONSENT_VERSION },
    marketing: { granted: false, version: consents.COOKIE_CONSENT_VERSION },
  });
  assert.equal(result.privacyNotice.acknowledged, true);
  assert.equal(result.newsletter.text, consents.NEWSLETTER_CONSENT_TEXT);
  assert.equal(result.newsletter.granted, true);
  assert.equal(result.analytics.text, consents.ANALYTICS_CONSENT_TEXT);
  assert.equal(result.marketing.granted, false);
  assert.equal(result.marketing.grantedAt, null);
  assert.throws(() => submit.sanitizeConsents({
    privacyNotice: { acknowledged: true, version: consents.PRIVACY_VERSION },
    newsletter: { granted: false, version: consents.NEWSLETTER_CONSENT_VERSION, text: consents.NEWSLETTER_CONSENT_TEXT },
    marketing: { granted: true, version: "veraltet" },
  }), /tracking_consent_version/);
});

test("eine ältere Grant-Antwort kann einen neueren Cross-Tab-Widerruf nicht reaktivieren", () => {
  const revokedWhileGrantWasInFlight = consentState.resolveAcceptedResponse({
    acceptedDecisionId: "grant-d1",
    observationSerialAtRequest: 0,
    targetAnalytics: true,
    targetMarketing: true,
    observed: {
      serial: 1,
      decisionId: "revoke-d2",
      analytics: false,
      marketing: false,
      serverConfirmed: true,
    },
  });
  assert.deepEqual(revokedWhileGrantWasInFlight, {
    superseded: true,
    analytics: false,
    marketing: false,
    canAdoptObserved: true,
  });

  const incomparableChoices = consentState.resolveAcceptedResponse({
    acceptedDecisionId: "mixed-d1",
    observationSerialAtRequest: 2,
    targetAnalytics: true,
    targetMarketing: false,
    observed: {
      serial: 3,
      decisionId: "mixed-d2",
      analytics: false,
      marketing: true,
      serverConfirmed: true,
    },
  });
  assert.deepEqual(incomparableChoices, {
    superseded: true,
    analytics: false,
    marketing: false,
    canAdoptObserved: false,
  });
});

test("vollständige Consent-Texte bleiben auch ohne Runtime-Config sichtbar", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  for (const text of [consents.ANALYTICS_CONSENT_TEXT, consents.MARKETING_CONSENT_TEXT]) assert.equal(html.includes(text), true);
  assert.equal(app.includes(consents.NEWSLETTER_CONSENT_TEXT), true);
  assert.match(app, /renderRuntimeConfig\(\);/);
  assert.match(app, /addEventListener\("storage", handleConsentStorage\)/);
});

test("Conversion-Gate, Formfelder und Ergebnis-CTAs bleiben transparent und barrierefrei benannt", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(html, /Am Ende: Name, Unternehmen und E-Mail · kein Rückruf · Newsletter freiwillig/);
  assert.equal((html.match(/data-calendar-cta/g) || []).length, 2);
  assert.match(app, /id="profileText" aria-labelledby="questionTitle"/);
  assert.match(app, /id="answerText" aria-labelledby="questionTitle"/);
  assert.match(app, /aria-labelledby="questionTitle"/);
  assert.doesNotMatch(app, /role="radio"|role="radiogroup"|aria-checked=/);
  assert.doesNotMatch(html, /id="(?:transitionScreen|scorePreview|measuringScreen)"/);
  assert.doesNotMatch(app, /showMeasuringAndAnalyze|animateMeasuring|setTimeout\(resolve, 1200\)/);
  assert.match(app, /showOnlyScreen\("fullResult"\)/);
  assert.match(app, /const TOTAL_JOURNEY_STEPS = PROFILE_STEPS\.length \+ CORE_QUESTION_COUNT \+ OPTIONAL_CONTEXT_COUNT \+ CONTACT_STEPS\.length/);
  assert.match(app, /Math\.ceil\(\(total - completed\) \* \.19\)/);
  assert.equal((app.match(/updateProgress\([^;]+TOTAL_JOURNEY_STEPS\);/g) || []).length, 4);
  assert.match(app, /optional, nicht Teil des Scores/);
  assert.match(app, /GPT‑5\.5/);
  assert.match(app, /Kontaktdaten an OpenRouter/);
  assert.match(app, /new AbortController\(\)/);
  assert.match(app, /applyConsentEffects\(\{ allowGrants: false \}\)/);
  assert.match(app, /function applyConsentEffects\(\{ allowGrants = true \} = \{\}\)/);
  assert.match(app, /allowGrants && consent\.marketing/);
  assert.match(app, /const incomingWasServerConfirmed = Boolean\(/);
  assert.match(app, /const synced = await syncTrackingConsent\(\)/);
  assert.match(app, /storageGeneration !== storageConsentGeneration/);
  assert.match(app, /question_count: CORE_QUESTION_COUNT/);
  assert.doesNotMatch(app, /adaptive_question_started/);
  assert.match(app, /session: "\/api\/readiness-session"/);
  assert.match(app, /question: "\/api\/readiness-question"/);
  assert.match(app, /result: "\/api\/readiness-result"/);
  assert.doesNotMatch(app, /`\$\{API\}\/(?:start-session|generate-questions|submit-lead)`/);
  assert.match(app, /adaptiveRequestController\?\.abort\(\)/);
  assert.match(app, /generation !== adaptiveRequestGeneration/);
  assert.match(app, /function cancelAnswerAdvance\(\)/);
  assert.match(app, /other\.disabled = true/);
  assert.match(app, /generation !== answerAdvanceGeneration/);
  assert.match(app, /function handleContactHandoffClick\(event\)/);
  assert.match(app, /event\.currentTarget\.href = currentContactHandoff\(\)/);
  assert.ok((app.match(/refreshContactHandoffLinks\(\);/g) || []).length >= 3);
  assert.match(app, /\["assessmentApp", "fullResult"\]\.includes\(layer\.id\)/);
  assert.match(app, /\$\("#closeResult"\)\.addEventListener\("click", closeTest\)/);
  assert.match(app, /\$\("#resultHomeLink"\)\.addEventListener/);
  assert.match(html, /id="closeResult"[^>]+aria-label="Ergebnis schließen"/);
  assert.match(html, /id="resultHomeLink"[^>]+aria-label="Ergebnis schließen/);
  assert.match(app, /preview_not_sent/);
  assert.match(css, /\.result-privacy-note[^}]*font-size: 14px/);
  assert.match(css, /\.lever-section > \* \{ min-width: 0; \}/);
  assert.match(css, /\.lever-section h2[^}]*overflow-wrap: anywhere/);
  assert.match(html, /class="brand-logo" src="\/assets\/synclaro-logo-weiss\.png"/);
  assert.match(html, /id="resultScoreDial"/);
  assert.match(html, /id="useCases"/);
  assert.match(app, /Diesen Anwendungsfall kostenlos mit Marco prüfen/);
  assert.match(app, /role="progressbar"/);
  assert.doesNotMatch(app, /Math\.max\(0, 900 -/);
  for (const page of [
    "newsletter-abgemeldet.html",
    "newsletter-abmeldung-fehlgeschlagen.html",
    "newsletter-abmeldung-preview.html",
    "newsletter-preview.html",
  ]) assert.equal(fs.existsSync(path.join(__dirname, `../public/${page}`)), true);
  for (const oldAsset of ["hero.jpg", "og.jpg", "phase1.jpg", "phase2.jpg", "phase3.jpg"]) {
    assert.equal(fs.existsSync(path.join(__dirname, `../public/assets/${oldAsset}`)), false);
  }
});

test("der frühere externe Analyse-Endpunkt ist dauerhaft deaktiviert", async () => {
  const response = await require("../netlify/functions/analyze").handler({ httpMethod: "POST" });
  assert.equal(response.statusCode, 410);
  assert.match(response.body, /deterministisch/);
  const source = fs.readFileSync(path.join(__dirname, "../netlify/functions/analyze.js"), "utf8");
  assert.doesNotMatch(source, /OpenAI|chat\.completions|OPENAI_API_KEY/);
});

test("Attribution bleibt ohne Marketing-Consent leer und entfernt mit Consent freie Identifikatoren", () => {
  const event = { headers: { "user-agent": "Test Browser" } };
  const raw = {
    landingUrl: "https://ki-check.synclaro.de/?utm_campaign=ai_readiness_de_prospecting_v1",
    referrer: "https://example.com/path?email=ada@example.com",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "ai_readiness_de_prospecting_v1",
    utm_id: "120251380526880206",
    utm_term: "120251380526890206",
    utm_content: "120251380526870206",
    placement: "instagram_stories",
    fbclid: "abc-123",
    fbp: "fb.1.1234567890.abc",
  };
  const denied = submit.sanitizeAttribution(raw, event, "55555555-5555-4555-8555-555555555555", false);
  assert.equal(denied.landingUrl, "https://ki-check.synclaro.de/");
  for (const key of ["referrer", "utm_source", "utm_campaign", "utm_id", "utm_term", "utm_content", "placement", "fbclid", "fbp", "user_agent"]) {
    assert.equal(denied[key], "");
  }
  const granted = submit.sanitizeAttribution(raw, event, "55555555-5555-4555-8555-555555555555", true);
  assert.equal(granted.referrer, "https://example.com");
  assert.equal(granted.utm_campaign, "ai_readiness_de_prospecting_v1");
  assert.equal(granted.utm_id, "120251380526880206");
  assert.equal(granted.utm_term, "120251380526890206");
  assert.equal(granted.utm_content, "120251380526870206");
  assert.equal(granted.placement, "instagram_stories");
  assert.equal(granted.fbclid, "abc-123");
  const injected = submit.sanitizeAttribution({
    ...raw,
    utm_id: "+491701234567",
    utm_term: "Ada Beispiel",
    utm_content: "ada@example.com",
    placement: "instagram_ada_example_com",
  }, event, "55555555-5555-4555-8555-555555555555", true);
  assert.equal(injected.utm_id, "");
  assert.equal(injected.utm_term, "");
  assert.equal(injected.utm_content, "");
  assert.equal(injected.placement, "instagram");
  const cardShaped = submit.sanitizeAttribution({
    ...raw,
    utm_id: "4111111111111111",
    placement: "facebook_right_column",
  }, event, "55555555-5555-4555-8555-555555555555", true);
  assert.equal(cardShaped.utm_id, "");
  assert.equal(cardShaped.placement, "facebook_right_column");
});

test("deterministische Detailanalyse liefert die sichtbare Gesamteinschätzung", () => {
  const baseline = assessment.scoreAssessment(answersWith(2), { branche: "Beratung", mitarbeiter: "1-5" });
  const result = analyze.deterministicFallback(baseline);
  assert.match(result.gesamteinschaetzung, /von 100 Punkten/);
  assert.equal(Object.hasOwn(result, "gesamteeinschaetzung"), false);
});

test("deterministische Detailanalyse bleibt bei gleichmäßig hohen Scores widerspruchsfrei", () => {
  const baseline = assessment.scoreAssessment(answersWith(4), { branche: "Beratung", mitarbeiter: "1-5" });
  const result = analyze.deterministicFallback(baseline, { mitarbeiter: "1-5" });
  const text = JSON.stringify(result);
  assert.match(text, /keinen einzelnen Schwachpunkt/);
  assert.match(text, /sehr belastbare Stärke/);
  assert.doesNotMatch(text, /größten Entwicklungsbedarf|noch nicht robust|noch nicht durchgängig verlässlich|greifen noch nicht belastbar/);
});

test("deterministische Solo-Analyse unterstellt weder Team noch Delegation", () => {
  const baseline = assessment.scoreAssessment(answersWith(1), { branche: "Beratung", mitarbeiter: "solo" });
  const result = analyze.deterministicFallback(baseline, { mitarbeiter: "solo" });
  const text = JSON.stringify(result);
  assert.match(text, /Arbeitswissen|eigenen Arbeitsablauf/);
  assert.doesNotMatch(text, /im Team|Das Team|verantwortliche Person|Nutzergruppe/);
});

test("Branche und Antwortsignale ändern konkrete Chancen, niemals den Score", () => {
  const baseAnswers = answersWith(2);
  const cleaningProfile = { branche: "Gebäudereinigung für Büros", mitarbeiter: "6-10", rolle: "inhaber", hauptziel: "zeit" };
  const consultingProfile = { branche: "Unternehmensberatung", mitarbeiter: "6-10", rolle: "inhaber", hauptziel: "zeit" };
  const cleaningBaseline = assessment.scoreAssessment(baseAnswers, cleaningProfile);
  const consultingBaseline = assessment.scoreAssessment(baseAnswers, consultingProfile);
  const cleaning = resultBuilder.buildDeterministicResult(cleaningBaseline, cleaningProfile, baseAnswers);
  const consulting = resultBuilder.buildDeterministicResult(consultingBaseline, consultingProfile, baseAnswers);
  assert.equal(cleaning.scores.total.percent, consulting.scores.total.percent);
  assert.equal(cleaning.advisory.industry.key, "reinigung");
  assert.equal(consulting.advisory.industry.key, "beratung");
  assert.notDeepEqual(cleaning.advisory.opportunities.map((item) => item.id), consulting.advisory.opportunities.map((item) => item.id));
  assert.equal(cleaning.advisory.opportunities.length, 3);
  assert.equal(cleaning.resultVersion, "2026-07-19.v5");
});

test("ein konkreter 90-Tage-Fokus priorisiert den passenden Branchenfall deterministisch", () => {
  const profile = { branche: "Reinigungsfirma", mitarbeiter: "1-5", rolle: "inhaber", hauptziel: "zeit" };
  const answers = [...answersWith(2), {
    questionId: "haupthebel",
    questionType: "textarea",
    answer: "Zahlungserinnerungen zuverlässiger vorbereiten",
    answerLabel: "Zahlungserinnerungen zuverlässiger vorbereiten",
  }];
  const baseline = assessment.scoreAssessment(answers, profile);
  const first = resultBuilder.buildDeterministicResult(baseline, profile, answers);
  const second = resultBuilder.buildDeterministicResult(baseline, profile, answers);
  assert.equal(first.advisory.opportunities[0].id, "cleaning-payment-reminder");
  assert.deepEqual(first.advisory, second.advisory);
  assert.match(first.advisory.opportunities[0].fitReason, /90-Tage-Ziel/);
});

test("Pilotstatus trennt Relevanz sauber von Umsetzungsbereitschaft", () => {
  const profile = { branche: "Metallbau", mitarbeiter: "1-5", rolle: "inhaber", hauptziel: "qualitaet" };
  const lowAnswers = answersWith(1);
  const highAnswers = answersWith(4);
  const low = resultBuilder.buildDeterministicResult(assessment.scoreAssessment(lowAnswers, profile), profile, lowAnswers);
  const high = resultBuilder.buildDeterministicResult(assessment.scoreAssessment(highAnswers, profile), profile, highAnswers);
  assert.equal(low.advisory.opportunities[0].status.key, "foundation_first");
  assert.equal(high.advisory.opportunities[0].status.key, "pilot_ready");
  assert.doesNotMatch(JSON.stringify(high), /noch nicht robust|noch nicht durchgängig verlässlich|größten Entwicklungsbedarf/);
});

test("unbekannte Branchen fallen sicher auf branchenoffene Fälle zurück", () => {
  const result = advisory.classifyIndustry("Spezialservice für Messestände");
  assert.equal(result.key, "allgemein");
  assert.equal(result.fallback, true);
  assert.equal(result.cases.length, 3);
});

test("Branchenbegriffe werden nicht über Teilwörter falsch zugeordnet", () => {
  assert.equal(advisory.classifyIndustry("Maschinenbau und Fertigung").key, "fertigung");
  assert.equal(advisory.classifyIndustry("Bauunternehmen im Hochbau").key, "handwerk");
  assert.equal(advisory.classifyIndustry("Sanitärbetrieb").key, "handwerk");
  assert.equal(advisory.classifyIndustry("Softwareentwicklung für Handwerksbetriebe").key, "it");
  assert.equal(advisory.classifyIndustry("Online-Shop für Sanitärbedarf").key, "handel");
  assert.equal(advisory.classifyIndustry("Facility Management für Büroimmobilien").key, "immobilien");
  assert.equal(advisory.classifyIndustry("Steuerungssoftware für Industrieanlagen").key, "it");
  assert.equal(advisory.classifyIndustry("Workshop- und KI-Beratung für Führungskräfte").key, "beratung");
  assert.equal(advisory.classifyIndustry("Netzwerkberatung für kleine Unternehmen").key, "beratung");
  assert.equal(advisory.classifyIndustry("Praxisnahe KI-Beratung").key, "beratung");
  assert.equal(advisory.classifyIndustry("Wohnzimmermöbel-Onlinehandel").key, "handel");
  assert.notEqual(advisory.classifyIndustry("Dachverband für soziale Träger").key, "handwerk");
  assert.equal(advisory.classifyIndustry("Content-Management-Software").key, "it");
  assert.equal(advisory.classifyIndustry("Weiterbildungsakademie").key, "bildung");
});

test("ausgeglichene Teilwerte erfinden weder Stärke noch Fokus", () => {
  const profile = { branche: "Unternehmensberatung", mitarbeiter: "1-5", rolle: "inhaber", hauptziel: "klarheit" };
  const answers = answersWith(2);
  const result = resultBuilder.buildDeterministicResult(assessment.scoreAssessment(answers, profile), profile, answers);
  assert.equal(result.advisory.diagnosis.balanced, true);
  assert.equal(result.advisory.diagnosis.spread, 0);
  assert.equal(result.advisory.diagnosis.strongest, null);
  assert.equal(result.advisory.diagnosis.weakest, null);
  assert.match(result.gesamteinschaetzung, /kein Bereich sticht als einzelner Engpass hervor/);
});

test("Tracking-Properties verwerfen Antworten, Kontaktdaten und freie Kampagnenwerte", () => {
  const result = tracking.sanitizeProperties({
    assessment_version: "2026-07-19.v5",
    question_count: 8,
    score: 47,
    depth: 75,
    phase: "assessment",
    employee_band: "1-5",
    respondent_role: "inhaber",
    level: "KI-Startklar",
    field: "email",
    error_code: "required_or_invalid",
    duration_bucket: "31-120",
    email: "ada@example.com",
    phone: "+49170",
    answers: [{ answer: "x" }],
    utm_campaign: "ada@example.com",
    placement: "instagram_stories",
    preview: false,
  });
  assert.deepEqual(result, {
    assessment_version: "2026-07-19.v5",
    question_count: 8,
    score: 47,
    depth: 75,
    phase: "assessment",
    employee_band: "1-5",
    respondent_role: "inhaber",
    level: "KI-Startklar",
    field: "email",
    error_code: "required_or_invalid",
    duration_bucket: "31-120",
    utm_campaign: "other",
    placement: "instagram_stories",
    preview: false,
  });
  const injected = tracking.sanitizeProperties(Object.fromEntries([
    "assessment_version", "phase", "employee_band", "respondent_role", "question_count", "score", "level", "field",
    "error_code", "depth", "duration_bucket", "preview",
  ].map((key) => [key, "ada@example.com"])));
  assert.equal(JSON.stringify(injected).includes("ada"), false);
  const encodedPlacement = tracking.sanitizeProperties({
    placement: "instagram_ada_example_com",
    utm_campaign: "facebook_491701234567",
  });
  assert.deepEqual(encodedPlacement, { placement: "instagram", utm_campaign: "other" });
  assert.equal(JSON.stringify(encodedPlacement).includes("ada"), false);
  assert.equal(JSON.stringify(encodedPlacement).includes("491701234567"), false);
});

test("Readiness-Handoff trägt nur signierte Zuordnung und freigegebene Meta-Kampagnenwerte", () => {
  const reference = `${"a".repeat(40)}.${"b".repeat(40)}`;
  const campaignId = "120251380526880206";
  const adsetId = "120251380526890206";
  const adId = "120251380526870206";
  const withoutMarketing = new URL(handoff.buildContactHandoff({
    contactUrl: "https://synclaro.de/kontakt/",
    bookingReference: reference,
    marketingConsent: false,
    attribution: {
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "ai_readiness_de_prospecting_v1",
      utm_id: campaignId, utm_term: adsetId, utm_content: adId,
      placement: "instagram_stories", fbclid: "secret-click-id",
    },
  }));
  assert.equal(withoutMarketing.searchParams.get("flow"), "ai-readiness");
  assert.equal(withoutMarketing.searchParams.get("readiness_ref"), reference);
  assert.equal(withoutMarketing.searchParams.has("utm_source"), false);
  assert.equal(withoutMarketing.searchParams.has("fbclid"), false);

  const withMarketing = new URL(handoff.buildContactHandoff({
    contactUrl: "https://evil.example/phish",
    bookingReference: reference,
    marketingConsent: true,
    attribution: {
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "meta_ai_readiness_de_prospecting_v1",
      utm_id: campaignId, utm_term: adsetId, utm_content: adId,
      placement: "instagram_stories", fbclid: "secret-click-id",
    },
  }));
  assert.equal(withMarketing.origin, "https://synclaro.de");
  assert.equal(withMarketing.pathname, "/kontakt/");
  assert.equal(withMarketing.searchParams.get("utm_source"), "meta");
  assert.equal(withMarketing.searchParams.get("utm_medium"), "paid_social");
  assert.equal(withMarketing.searchParams.get("utm_campaign"), "ai_readiness_de_prospecting_v1");
  assert.equal(withMarketing.searchParams.get("utm_id"), campaignId);
  assert.equal(withMarketing.searchParams.get("utm_term"), adsetId);
  assert.equal(withMarketing.searchParams.get("utm_content"), adId);
  assert.equal(withMarketing.searchParams.get("placement"), "instagram_stories");
  assert.equal(withMarketing.searchParams.has("fbclid"), false);
});

test("Readiness-Handoff verwirft PII, unbekannte Kampagnen und ungültige Referenzen", () => {
  const url = new URL(handoff.buildContactHandoff({
    bookingReference: "not-signed",
    marketingConsent: true,
    attribution: {
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "ada@example.com",
      utm_id: "+491701234567", utm_term: "Ada Beispiel", utm_content: "ada@example.com",
      placement: "instagram_ada_example_com",
    },
  }));
  assert.equal(url.searchParams.has("readiness_ref"), false);
  assert.equal(url.searchParams.has("utm_source"), false);
  assert.equal(url.toString().includes("ada"), false);
});

test("Readiness-Handoff reduziert PII-verdächtige Placement-Suffixe und verwirft freie Meta-IDs", () => {
  const url = new URL(handoff.buildContactHandoff({
    marketingConsent: true,
    attribution: {
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "ai_readiness_de_prospecting_v1",
      utm_id: "+491701234567", utm_term: "Ada Beispiel", utm_content: "ada@example.com",
      placement: "instagram_ada_example_com",
    },
  }));
  assert.equal(url.searchParams.has("utm_id"), false);
  assert.equal(url.searchParams.has("utm_term"), false);
  assert.equal(url.searchParams.has("utm_content"), false);
  assert.equal(url.searchParams.get("placement"), "instagram");
  assert.equal(url.toString().includes("ada"), false);
  assert.equal(url.toString().includes("491701234567"), false);
});

test("Readiness-Handoff erhält konkrete Advantage+-Placements und verwirft 16-stellige Zahlencodes", () => {
  for (const placement of [
    "facebook_right_column",
    "facebook_video_feeds",
    "facebook_instream_video",
    "instagram_search",
    "instagram_explore_home",
  ]) {
    const url = new URL(handoff.buildContactHandoff({
      marketingConsent: true,
      attribution: {
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: "ai_readiness_de_prospecting_v1",
        utm_id: "4111111111111111",
        placement,
      },
    }));
    assert.equal(url.searchParams.has("utm_id"), false);
    assert.equal(url.searchParams.get("placement"), placement);
  }
});

test("Analytics-Events benötigen eine aktuelle, versionierte Einwilligung", () => {
  assert.match(tracking.validateAnalyticsConsent({
    granted: true,
    version: consents.COOKIE_CONSENT_VERSION,
    grantedAt: new Date().toISOString(),
  }), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(tracking.validateAnalyticsConsent({ granted: true, version: "veraltet", grantedAt: new Date().toISOString() }), null);
  assert.equal(tracking.validateAnalyticsConsent({
    granted: true,
    version: consents.COOKIE_CONSENT_VERSION,
    grantedAt: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(),
  }), null);
});

test("Sessions sind signiert, zeitlich begrenzt und nicht manipulierbar", () => {
  const before = process.env.LEAD_SIGNING_SECRET;
  process.env.LEAD_SIGNING_SECRET = "x".repeat(64);
  const issued = session.issueSession();
  const event = { headers: { cookie: `${session.COOKIE_NAME}=${issued.token}` } };
  assert.equal(session.readSession(event).sessionHash, issued.sessionHash);
  const tampered = { headers: { cookie: `${session.COOKIE_NAME}=${issued.token}x` } };
  assert.equal(session.readSession(tampered), null);
  if (before === undefined) delete process.env.LEAD_SIGNING_SECRET; else process.env.LEAD_SIGNING_SECRET = before;
});

test("Supabase akzeptiert genau einen serverseitigen Admin-Key", () => {
  assert.equal(supabaseAdmin.selectSupabaseAdminKey("secret-key", undefined), "secret-key");
  assert.equal(supabaseAdmin.selectSupabaseAdminKey(undefined, "service-role-key"), "service-role-key");
  assert.throws(() => supabaseAdmin.selectSupabaseAdminKey(undefined, undefined), /genau ein/);
  assert.throws(() => supabaseAdmin.selectSupabaseAdminKey("secret-key", "service-role-key"), /genau ein/);
});

test("Production-Origin wird auf die KI-Check-Domain begrenzt", () => {
  const before = process.env.CONTEXT;
  process.env.CONTEXT = "production";
  assert.equal(security.hasAllowedOrigin({ headers: { host: "ki-check.synclaro.de", origin: "https://ki-check.synclaro.de" } }), true);
  assert.equal(security.hasAllowedOrigin({ headers: { host: "ki-check.synclaro.de" } }), false);
  assert.equal(security.hasAllowedOrigin({ headers: { host: "ki-check.synclaro.de", origin: "https://evil.example" } }), false);
  assert.equal(security.hasAllowedOrigin({ headers: { host: "evil.example", origin: "https://ki-check.synclaro.de" } }), false);
  if (before === undefined) delete process.env.CONTEXT; else process.env.CONTEXT = before;
});

test("manuelle Netlify-Production-Deploys verwenden den expliziten Readiness-Schalter", () => {
  const beforeContext = process.env.CONTEXT;
  const beforeFlag = process.env.AI_READINESS_PRODUCTION;
  delete process.env.CONTEXT;
  delete process.env.AI_READINESS_PRODUCTION;
  assert.equal(security.isProduction(), false);
  process.env.CONTEXT = "production";
  assert.equal(security.isProduction(), true);
  process.env.AI_READINESS_PRODUCTION = "false";
  assert.equal(security.isProduction(), true);
  process.env.CONTEXT = "";
  process.env.AI_READINESS_PRODUCTION = "true";
  assert.equal(security.isProduction(), false);
  delete process.env.CONTEXT;
  process.env.AI_READINESS_PRODUCTION = "true";
  assert.equal(security.isProduction(), true);
  assert.equal(security.hasAllowedOrigin({ headers: { host: "ki-check.synclaro.de", origin: "https://ki-check.synclaro.de" } }), true);
  assert.equal(security.hasAllowedOrigin({ headers: { host: "ki-check.synclaro.de", origin: "https://evil.example" } }), false);
  process.env.CONTEXT = "deploy-preview";
  assert.equal(security.isProduction(), false);
  if (beforeContext === undefined) delete process.env.CONTEXT; else process.env.CONTEXT = beforeContext;
  if (beforeFlag === undefined) delete process.env.AI_READINESS_PRODUCTION; else process.env.AI_READINESS_PRODUCTION = beforeFlag;
});

test("Netlifys kanonische Client-IP gewinnt und ungültige Header werden verworfen", () => {
  assert.equal(security.clientIp({ headers: {
    "x-nf-client-connection-ip": "203.0.113.10",
    "x-forwarded-for": "198.51.100.9, 10.0.0.1",
  } }), "203.0.113.10");
  assert.equal(security.clientIp({ headers: { "x-forwarded-for": "198.51.100.9, 10.0.0.1" } }), "198.51.100.9");
  assert.equal(security.clientIp({ headers: { "x-nf-client-connection-ip": "spoofed", "x-forwarded-for": "also-invalid" } }), "");
  const before = process.env.CONTEXT;
  process.env.CONTEXT = "production";
  assert.equal(security.clientIp({ headers: { "x-forwarded-for": "198.51.100.9" } }), "");
  if (before === undefined) delete process.env.CONTEXT; else process.env.CONTEXT = before;
});

test("Telegram-Benachrichtigung enthält keine Kontaktdaten und verlinkt nur ins CRM", async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const originalChat = process.env.LEAD_TELEGRAM_CHAT_ID;
  const originalApproval = process.env.TELEGRAM_TRANSFER_APPROVED;
  process.env.LEAD_TELEGRAM_BOT_TOKEN = "test-token";
  process.env.LEAD_TELEGRAM_CHAT_ID = "test-chat";
  process.env.TELEGRAM_TRANSFER_APPROVED = "true";
  let request;
  global.fetch = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const outcome = await deliveries.sendTelegramLeadNotification({
    contactId: "33333333-3333-4333-8333-333333333333",
    assessmentId: "44444444-4444-4444-8444-444444444444",
    contact: { email: "ada@example.com", phone: "+491701234567" },
    baseline: { scores: { total: { percent: 47 } }, level: "KI-Startklar" },
    attribution: { utm_campaign: "ada@example.com", utm_source: "meta" },
  });
  assert.equal(outcome.sent, true);
  assert.equal(request.body.text.includes("ada@example.com"), false);
  assert.equal(request.body.text.includes("+491701234567"), false);
  assert.equal(request.body.text.includes("44444444-4444-4444-8444-444444444444"), false);
  assert.equal(request.body.reply_markup.inline_keyboard[0][0].url.includes("33333333-3333-4333-8333-333333333333"), false);
  assert.match(request.body.text, /Double-Opt-in ausstehend/);
  assert.doesNotMatch(request.body.text, /Score|Kampagne/);
  assert.equal(request.body.reply_markup.inline_keyboard[0][0].url, "https://crm.synclaro.de/crm/contacts");
  global.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.LEAD_TELEGRAM_BOT_TOKEN; else process.env.LEAD_TELEGRAM_BOT_TOKEN = originalToken;
  if (originalChat === undefined) delete process.env.LEAD_TELEGRAM_CHAT_ID; else process.env.LEAD_TELEGRAM_CHAT_ID = originalChat;
  if (originalApproval === undefined) delete process.env.TELEGRAM_TRANSFER_APPROVED; else process.env.TELEGRAM_TRANSFER_APPROVED = originalApproval;
});

test("Telegram bleibt ohne dokumentierte Transferfreigabe fail-closed", async () => {
  const originalApproval = process.env.TELEGRAM_TRANSFER_APPROVED;
  delete process.env.TELEGRAM_TRANSFER_APPROVED;
  const result = await deliveries.sendTelegramLeadNotification({
    contactId: "33333333-3333-4333-8333-333333333333",
    assessmentId: "44444444-4444-4444-8444-444444444444",
    baseline: { scores: { total: { percent: 47 } }, level: "KI-Startklar" },
  });
  assert.deepEqual(result, { sent: false, skipped: "not_approved" });
  if (originalApproval === undefined) delete process.env.TELEGRAM_TRANSFER_APPROVED; else process.env.TELEGRAM_TRANSFER_APPROVED = originalApproval;
});

test("interne E-Mail-Benachrichtigung hält Kontaktdaten ausschließlich im CRM", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalRecipient = process.env.LEADS_NOTIFICATION_EMAIL;
  const originalSender = process.env.LEADS_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-key";
  process.env.LEADS_NOTIFICATION_EMAIL = "intern@example.com";
  process.env.LEADS_FROM_EMAIL = "Synclaro <leads@example.com>";
  let request;
  global.fetch = async (_url, options) => {
    request = { body: JSON.parse(options.body), headers: options.headers };
    return { ok: true };
  };
  const outcome = await deliveries.sendLeadNotification({
    contactId: "33333333-3333-4333-8333-333333333333",
    assessmentId: "44444444-4444-4444-8444-444444444444",
    contact: { firstName: "Ada", lastName: "Lovelace", company: "Analytical GmbH", email: "ada@example.com", phone: "+491701234567" },
    profile: { branche: "Beratung", mitarbeiter: "1-5", rolle: "inhaber" },
    baseline: { scores: { total: { percent: 47 } }, level: "KI-Startklar" },
    attribution: { utm_campaign: "ada@example.com", utm_source: "meta" },
  });
  assert.equal(outcome.sent, true);
  for (const pii of ["Ada", "Lovelace", "Analytical GmbH", "ada@example.com", "+491701234567", "Beratung"]) {
    assert.equal(request.body.html.includes(pii), false);
  }
  assert.match(request.body.html, /crm\.synclaro\.de\/crm\/contacts\/33333333/);
  assert.match(request.body.html, /Meta · sonstige Kampagne/);
  assert.equal(Object.hasOwn(request.body, "reply_to"), false);
  assert.equal(request.headers["Idempotency-Key"], "ai-readiness-lead-44444444-4444-4444-8444-444444444444");
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalApiKey;
  if (originalRecipient === undefined) delete process.env.LEADS_NOTIFICATION_EMAIL; else process.env.LEADS_NOTIFICATION_EMAIL = originalRecipient;
  if (originalSender === undefined) delete process.env.LEADS_FROM_EMAIL; else process.env.LEADS_FROM_EMAIL = originalSender;
});

test("Meta-CAPI verwendet Event-ID zur Pixel-Deduplizierung und hasht PII", async () => {
  const originalFetch = global.fetch;
  const originalPixel = process.env.META_PIXEL_ID;
  const originalToken = process.env.META_CAPI_ACCESS_TOKEN;
  process.env.META_PIXEL_ID = "123";
  process.env.META_CAPI_ACCESS_TOKEN = "test-token";
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ events_received: 1 }) };
  };
  const result = await meta.sendMetaLead({
    contact: { email: "mutated@example.com", phone: "+491701111111", firstName: "Ada", lastName: "Lovelace" },
    attribution: { eventId: "55555555-5555-4555-8555-555555555555", score: 47, employeeBand: "1-5" },
    deliveryContext: { clientIpAddress: "203.0.113.10", emailSha256: "a".repeat(64), phoneSha256: "b".repeat(64) },
    eventSourceUrl: "https://ki-check.synclaro.de/?utm_campaign=ada%40example.com",
  });
  assert.equal(result.sent, true);
  assert.equal(payload.data[0].event_id, "55555555-5555-4555-8555-555555555555");
  assert.equal(payload.data[0].event_source_url, "https://ki-check.synclaro.de/");
  assert.equal(payload.data[0].user_data.client_ip_address, "203.0.113.10");
  assert.equal(payload.data[0].user_data.em[0], "a".repeat(64));
  assert.equal(Object.hasOwn(payload.data[0].user_data, "ph"), false);
  assert.equal(Object.hasOwn(payload.data[0].user_data, "fn"), false);
  assert.equal(Object.hasOwn(payload.data[0].user_data, "ln"), false);
  assert.equal(Object.hasOwn(payload.data[0].custom_data, "score"), false);
  assert.equal(Object.hasOwn(payload.data[0].custom_data, "employee_band"), false);
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ events_received: 0 }) });
  const zeroAccepted = await meta.sendMetaLead({
    attribution: { eventId: "55555555-5555-4555-8555-555555555555" },
    deliveryContext: { emailSha256: "a".repeat(64), phoneSha256: "b".repeat(64) },
    eventSourceUrl: "https://ki-check.synclaro.de/",
  });
  assert.equal(zeroAccepted.sent, false);
  assert.equal(zeroAccepted.errorCode, "zero_events_received");
  global.fetch = originalFetch;
  if (originalPixel === undefined) delete process.env.META_PIXEL_ID; else process.env.META_PIXEL_ID = originalPixel;
  if (originalToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = originalToken;
});

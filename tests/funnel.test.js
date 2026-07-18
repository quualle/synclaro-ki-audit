"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assessment = require("../netlify/functions/_shared/assessment");
const consents = require("../netlify/functions/_shared/consents");
const deliveries = require("../netlify/functions/_shared/deliveries");
const meta = require("../netlify/functions/_shared/meta");
const security = require("../netlify/functions/_shared/security");
const session = require("../netlify/functions/_shared/session");
const supabaseAdmin = require("../netlify/functions/_shared/supabase");
const submit = require("../netlify/functions/submit-lead")._test;
const analyze = require("../netlify/functions/analyze")._test;
const tracking = require("../netlify/functions/track-event")._test;
const consentState = require("../public/consent-state");

function answersWith(value) {
  return assessment.PHASES.flatMap((phase) => phase.questions)
    .filter((question) => question.dimension)
    .map((question) => ({ questionId: question.id, answer: String(value), answerLabel: question.options[value - 1].label }));
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
  assert.equal(low.assessmentVersion, "2026-07-18.v2");
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
  assert.notEqual(soloPhase.questions[0].label, teamPhase.questions[0].label);
  assert.equal(assessment.scoreAssessment(answersWith(1), { mitarbeiter: "solo" }).scores.total.percent, 0);
  assert.equal(assessment.scoreAssessment(answersWith(4), { mitarbeiter: "solo" }).scores.total.percent, 100);
});

test("fehlende Kernantworten führen nie zu einem vollständigen Score", () => {
  const result = assessment.scoreAssessment(answersWith(3).slice(1), { mitarbeiter: "solo" });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingQuestionIds, ["prozess_standardisierung"]);
});

test("Lead-Eingaben werden normalisiert und serverseitig rekonstruiert", () => {
  assert.equal(submit.normalizePhone("0170 1234567"), "+491701234567");
  assert.equal(submit.normalizePhone("123"), null);
  assert.deepEqual(submit.sanitizeContact({ firstName: " Ada ", lastName: " Lovelace ", company: " Analytical GmbH ", email: " ADA@EXAMPLE.COM ", phone: "0170 1234567" }), {
    firstName: "Ada", lastName: "Lovelace", company: "Analytical GmbH", email: "ada@example.com", phone: "+491701234567",
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

test("Pflicht- und Tracking-Einwilligungen sind versioniert und nicht vermischt", () => {
  const result = submit.sanitizeConsents({
    callback: { granted: true, version: consents.CALLBACK_CONSENT_VERSION },
    aiProcessing: { granted: true, version: consents.AI_CONSENT_VERSION },
    analytics: { granted: true, version: consents.COOKIE_CONSENT_VERSION },
    marketing: { granted: false, version: consents.COOKIE_CONSENT_VERSION },
  });
  assert.equal(result.callback.text, consents.CALLBACK_CONSENT_TEXT);
  assert.equal(result.aiProcessing.text, consents.AI_CONSENT_TEXT);
  assert.equal(result.analytics.text, consents.ANALYTICS_CONSENT_TEXT);
  assert.equal(result.marketing.granted, false);
  assert.equal(result.marketing.grantedAt, null);
  assert.throws(() => submit.sanitizeConsents({
    callback: { granted: true, version: consents.CALLBACK_CONSENT_VERSION },
    aiProcessing: { granted: true, version: consents.AI_CONSENT_VERSION },
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
  for (const text of [
    consents.CALLBACK_CONSENT_TEXT,
    consents.AI_CONSENT_TEXT,
    consents.ANALYTICS_CONSENT_TEXT,
    consents.MARKETING_CONSENT_TEXT,
  ]) assert.equal(html.includes(text), true);
  assert.match(app, /renderRuntimeConfig\(\);/);
  assert.match(app, /addEventListener\("storage", handleConsentStorage\)/);
});

test("Analyse-Prompt hält freie Texte und Rohbranche vollständig von OpenAI fern", () => {
  const redacted = analyze.redactPotentialContactData("Bitte an ada@example.com oder +49 170 1234567 melden.");
  assert.equal(redacted.includes("ada@example.com"), false);
  assert.equal(redacted.includes("1234567"), false);
  assert.match(redacted, /E-Mail entfernt/);
  assert.match(redacted, /Telefonnummer entfernt/);
  const prompt = analyze.buildPrompt(
    { branche: "Muster GmbH, Musterstraße 1, 80331 München", mitarbeiter: "1-5", rolle: "inhaber", hauptziel: "klarheit" },
    [
      { questionId: "ki_nutzung", questionType: "radio", questionLabel: "Wie wird KI genutzt?", answerLabel: "Punktuell für einzelne Aufgaben" },
      { questionId: "haupthebel", questionType: "textarea", questionLabel: "Freitext", answerLabel: "Bitte Max Mustermann von Beispiel AG in Hauptstraße 7, 80331 München kontaktieren" },
    ],
    assessment.scoreAssessment(answersWith(2), { branche: "Beratung", mitarbeiter: "1-5" })
  );
  for (const personalText of ["Muster GmbH", "Musterstraße", "80331", "München", "Max Mustermann", "Beispiel AG", "Hauptstraße", "kontaktieren"]) {
    assert.equal(prompt.includes(personalText), false, `${personalText} gelangte in den OpenAI-Prompt`);
  }
  assert.match(prompt, /Sonstige oder nicht kategorisierte Branche/);
  assert.match(prompt, /Punktuell für einzelne Aufgaben/);
  assert.equal(analyze.coarseIndustry("Metallbau"), "Handwerk und technische Dienstleistungen");
});

test("Attribution bleibt ohne Marketing-Consent leer und entfernt mit Consent freie Identifikatoren", () => {
  const event = { headers: { "user-agent": "Test Browser" } };
  const raw = {
    landingUrl: "https://ki-check.synclaro.de/?utm_campaign=ai_readiness_de_prospecting_v1",
    referrer: "https://example.com/path?email=ada@example.com",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "ai_readiness_de_prospecting_v1",
    utm_content: "ada@example.com",
    placement: "instagram_stories",
    fbclid: "abc-123",
    fbp: "fb.1.1234567890.abc",
  };
  const denied = submit.sanitizeAttribution(raw, event, "55555555-5555-4555-8555-555555555555", false);
  assert.equal(denied.landingUrl, "https://ki-check.synclaro.de/");
  for (const key of ["referrer", "utm_source", "utm_campaign", "utm_content", "placement", "fbclid", "fbp", "user_agent"]) {
    assert.equal(denied[key], "");
  }
  const granted = submit.sanitizeAttribution(raw, event, "55555555-5555-4555-8555-555555555555", true);
  assert.equal(granted.referrer, "https://example.com");
  assert.equal(granted.utm_campaign, "ai_readiness_de_prospecting_v1");
  assert.equal(granted.utm_content, "");
  assert.equal(granted.placement, "instagram_stories");
  assert.equal(granted.fbclid, "abc-123");
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

test("Tracking-Properties verwerfen Antworten, Kontaktdaten und freie Kampagnenwerte", () => {
  const result = tracking.sanitizeProperties({ score: 47, phase: "2", email: "ada@example.com", phone: "+49170", answers: [{ answer: "x" }], utm_campaign: "ada@example.com", placement: "instagram_stories", preview: false });
  assert.deepEqual(result, { score: 47, phase: "2", utm_campaign: "other", placement: "instagram_stories", preview: false });
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
  assert.match(request.body.text, /Meta · sonstige Kampagne/);
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
  assert.equal(payload.data[0].user_data.ph[0], "b".repeat(64));
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

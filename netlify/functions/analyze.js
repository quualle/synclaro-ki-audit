"use strict";

const OpenAI = require("openai");
const crypto = require("crypto");
const { cleanText, DIMENSIONS, scoreAssessment } = require("./_shared/assessment");
const { AI_CONSENT_VERSION } = require("./_shared/consents");
const { getSupabaseAdmin } = require("./_shared/supabase");
const { hasAllowedOrigin, isProduction, jsonResponse, verifyAnalysisToken } = require("./_shared/security");

const MODEL = process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.4";

const SYSTEM_PROMPT = `Du bist Senior-Diagnostiker bei Synclaro. Du formulierst die individuelle Einordnung eines branchenoffenen KI-Readiness-Tests für Selbstständige und inhabergeführte Unternehmen.

VERBINDLICHE GRENZEN:
- Der deterministische Score und die vier Teil-Scores werden vom Server vorgegeben. Du darfst sie weder ändern noch neu berechnen.
- Beziehe jede Aussage auf konkrete Antworten. Erfinde keine Kennzahlen, Benchmarks, Kundenfälle, Einsparungen oder Förderzusagen.
- Formuliere branchenpassend, aber ohne Klischees. Keine Begriffe wie Baustelle, Werkstatt oder Praxis, wenn sie nicht aus dem Profil stammen.
- Bei der Teamgröße „solo“ sprichst du konsequent über die Person, ihre Arbeitsweise und ihre Systeme. Unterstelle weder Team, Mitarbeitende noch Delegation.
- Schreibe klar, konkret und wertschätzend in der Sie-Form. Kein KI-Hype, keine Angst-Rhetorik.
- Nenne niemals Namen, E-Mail-Adressen, Telefonnummern oder andere Kontaktdaten.
- Das Ergebnis ist eine strukturierte Selbsteinschätzung, keine Zertifizierung und keine Garantie.

AUSGABE ALS STRIKTES JSON:
{
  "gesamteinschaetzung": "3 bis 4 konkrete Sätze: stärkster Befund, größter Engpass, sinnvoller Fokus",
  "groessterHebel": {"titel": "kurz", "begruendung": "2 konkrete Sätze mit Antwortbezug"},
  "empfehlungen": [
    {"titel":"kurz", "beobachtung":"1 bis 2 Sätze mit Antwortbezug", "naechsterSchritt":"eine innerhalb von 7 Tagen umsetzbare Handlung", "aufwand":"gering|mittel|hoch", "wirkung":"mittel|hoch|sehr hoch"}
  ],
  "roadmap": {
    "phase1":{"zeitraum":"Tage 1–30","titel":"kurz","punkte":["…","…"]},
    "phase2":{"zeitraum":"Tage 31–60","titel":"kurz","punkte":["…","…"]},
    "phase3":{"zeitraum":"Tage 61–90","titel":"kurz","punkte":["…","…"]}
  }
}

Liefere genau drei Empfehlungen, jeweils zu einem anderen Hebel.`;

const FALLBACKS = {
  prozesse_daten: {
    title: "Einen Kernprozess messbar machen",
    observation: "Ihre Antworten zeigen, dass Informationen und Arbeitsschritte noch nicht durchgängig verlässlich zusammenlaufen. Das bremst jede spätere KI-Automatisierung.",
    step: "Wählen Sie einen häufigen Ablauf und halten Sie Eingang, Schritte, Prüfpunkte und Ergebnis auf einer Seite fest.",
  },
  team_wissen: {
    title: "Schlüsselwissen aus Köpfen lösen",
    observation: "Wissen und digitale Arbeitsweisen sind noch nicht robust genug im Team verteilt. Dadurch hängen Verbesserungen zu stark an Einzelpersonen.",
    step: "Dokumentieren Sie diese Woche die fünf häufigsten Rückfragen zu einem zentralen Ablauf an einem gemeinsamen Ort.",
  },
  ki_praxis: {
    title: "Einen sicheren KI-Anwendungsfall definieren",
    observation: "KI-Nutzung, Zielbild und Leitplanken greifen noch nicht belastbar ineinander. Ein klar abgegrenzter Test schafft Nutzen, ohne unnötiges Risiko.",
    step: "Definieren Sie einen Anwendungsfall ohne sensible Daten mit Ziel, Testumfang und Prüfschritt.",
  },
  umsetzungskraft: {
    title: "Verantwortung und Erfolgskriterium festlegen",
    observation: "Der Engpass liegt weniger bei Ideen als bei Verantwortung, Tempo und Messung. Ohne Eigentümer und Zielwert bleibt KI leicht ein Nebenthema.",
    step: "Benennen Sie eine verantwortliche Person und einen messbaren Zielwert für einen vierwöchigen Test.",
  },
};

const SOLO_FALLBACKS = {
  team_wissen: {
    title: "Arbeitswissen verlässlich sichern",
    observation: "Arbeitswissen und neue digitale Routinen sind noch nicht so gesichert, dass sie auch unter Zeitdruck verlässlich tragen. Dadurch kostet das Wiederaufnehmen wichtiger Aufgaben unnötig Energie.",
    step: "Dokumentieren Sie diese Woche die fünf häufigsten Schritte eines zentralen Ablaufs in einer Checkliste oder Vorlage.",
  },
  umsetzungskraft: {
    title: "Verbindliche Umsetzungszeit reservieren",
    observation: "Der Engpass liegt weniger bei Ideen als bei Priorität, Zeitrahmen und Messung. Ohne fest reservierte Zeit bleibt KI im Tagesgeschäft leicht ein Nebenthema.",
    step: "Reservieren Sie ein festes wöchentliches Zeitfenster und definieren Sie einen messbaren Zielwert für einen vierwöchigen Test.",
  },
};

const MATURE_FALLBACKS = {
  prozesse_daten: {
    title: "Stabile Abläufe gezielt erweitern",
    observation: "Die Prozess- und Datengrundlage trägt bereits. Zusätzliche KI sollte deshalb nur in einem klar begrenzten Ablauf getestet werden, ohne die bestehende Verlässlichkeit zu verschlechtern.",
    step: "Wählen Sie einen stabilen Ablauf und definieren Sie vor dem Test einen Zielwert sowie ein Qualitätskriterium.",
  },
  team_wissen: {
    title: "Bewährte Arbeitsweisen gezielt ausbauen",
    observation: "Wissen und digitale Arbeitsweisen bilden bereits eine belastbare Grundlage. Der nächste Schritt ist, eine bewährte Routine messbar weiterzuentwickeln.",
    step: "Wählen Sie eine gut funktionierende Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll.",
  },
  ki_praxis: {
    title: "Sichere KI-Praxis vertiefen",
    observation: "KI-Nutzung, Zielbild und Leitplanken sind bereits gut aufeinander abgestimmt. Jetzt zählt ein Vergleich, der zusätzlichen Nutzen nachvollziehbar belegt.",
    step: "Vergleichen Sie einen klar abgegrenzten KI-Anwendungsfall vier Wochen lang mit dem bisherigen Ablauf.",
  },
  umsetzungskraft: {
    title: "Umsetzung systematisch skalieren",
    observation: "Priorität, Tempo und Erfolgsmessung sind bereits tragfähig. Ein nächster Test sollte deshalb vor allem die Entscheidung über eine sinnvolle Skalierung vorbereiten.",
    step: "Legen Sie für den nächsten Test vorab Fortführen-, Anpassen- und Stoppen-Kriterien fest.",
  },
};

function redactPotentialContactData(value) {
  return cleanText(value, 700)
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/gi, "[E-Mail entfernt]")
    .replace(/(?:\+?\d[\s()./-]*){7,}/g, "[Telefonnummer entfernt]");
}

function answerLabel(answer) {
  if (Array.isArray(answer?.answerLabel)) return redactPotentialContactData(answer.answerLabel.join(", "));
  return redactPotentialContactData(answer?.answerLabel || answer?.label || answer?.answer);
}

function coarseIndustry(value) {
  const industry = cleanText(value, 80).toLowerCase();
  const groups = [
    [/(handwerk|bau|metall|elektro|sanitär|heizung|schrein|holz|maler|dach|kfz)/, "Handwerk und technische Dienstleistungen"],
    [/(beratung|agentur|steuer|recht|kanzlei|consult|buchhalt|marketing)/, "Beratung und professionelle Dienstleistungen"],
    [/(handel|shop|e-commerce|ecommerce|einzelhandel|großhandel)/, "Handel und E-Commerce"],
    [/(software|\bit\b|digital|web|saas|technologie)/, "IT und digitale Dienstleistungen"],
    [/(produktion|fertigung|industrie|maschinen)/, "Produktion und Industrie"],
    [/(gesund|pflege|therap|medizin|arzt|apothek)/, "Gesundheit und soziale Dienstleistungen"],
    [/(gastro|hotel|touris|restaurant)/, "Gastgewerbe und Tourismus"],
    [/(logistik|transport|spedition|mobilität)/, "Logistik und Mobilität"],
    [/(immobil|hausverwaltung)/, "Immobilien"],
    [/(bildung|schule|training|akademie)/, "Bildung und Weiterbildung"],
  ];
  return groups.find(([pattern]) => pattern.test(industry))?.[1] || "Sonstige oder nicht kategorisierte Branche";
}

function buildPrompt(profile, answers, baseline) {
  const structuredAnswers = (Array.isArray(answers) ? answers : [])
    .filter((answer) => answer?.questionType !== "textarea" && answer?.questionId !== "haupthebel");
  const lines = structuredAnswers.map((answer, index) => {
    const question = cleanText(answer.questionLabel, 240);
    return `${index + 1}. ${question}: ${answerLabel(answer) || "keine Angabe"}`;
  });
  const scoreLines = Object.entries(DIMENSIONS).map(([key, config]) => {
    return `- ${config.label}: ${baseline.scores[key].percent}/100`;
  });
  return `UNTERNEHMENSPROFIL
- Grobe Branchenkategorie: ${coarseIndustry(profile.branche)}
- Teamgröße: ${redactPotentialContactData(cleanText(profile.mitarbeiter, 20)) || "nicht angegeben"}
- Rolle: ${redactPotentialContactData(cleanText(profile.rolle, 50)) || "nicht angegeben"}
- Wichtigstes Ziel: ${redactPotentialContactData(cleanText(profile.hauptziel, 80)) || "nicht angegeben"}

DETERMINISTISCHES ERGEBNIS — NICHT VERÄNDERN
- Gesamt: ${baseline.scores.total.percent}/100
- Reifegrad: ${baseline.level}
${scoreLines.join("\n")}
- Zeitpotenzial-Indikator: ${baseline.timePotential.label}; ${baseline.timePotential.note}

ANTWORTEN
${lines.join("\n")}

Formuliere jetzt ausschließlich die qualitative Einordnung im vereinbarten JSON-Format.`;
}

function validateGenerated(result) {
  if (!result || typeof result !== "object") throw new Error("Analyse ist kein Objekt.");
  if (!cleanText(result.gesamteinschaetzung, 2000)) throw new Error("Gesamteinschätzung fehlt.");
  if (!result.groessterHebel?.titel || !result.groessterHebel?.begruendung) throw new Error("Größter Hebel fehlt.");
  if (!Array.isArray(result.empfehlungen) || result.empfehlungen.length !== 3) throw new Error("Empfehlungen unvollständig.");
  for (const item of result.empfehlungen) {
    if (!item.titel || !item.beobachtung || !item.naechsterSchritt || !["gering", "mittel", "hoch"].includes(item.aufwand) || !["mittel", "hoch", "sehr hoch"].includes(item.wirkung)) {
      throw new Error("Empfehlung hat ein ungültiges Schema.");
    }
  }
  if (!result.roadmap || !["phase1", "phase2", "phase3"].every((key) => result.roadmap[key]?.titel && Array.isArray(result.roadmap[key]?.punkte))) {
    throw new Error("Roadmap unvollständig.");
  }
}

function deterministicFallback(baseline, profile = {}) {
  const isSolo = cleanText(profile.mitarbeiter, 20) === "solo";
  const fallbackFor = (key, score = baseline.scores[key].percent) => {
    const base = (isSolo && SOLO_FALLBACKS[key]) || FALLBACKS[key];
    if (score < 65) return base;
    const mature = { ...MATURE_FALLBACKS[key] };
    if (isSolo && key === "team_wissen") {
      mature.title = "Bewährte eigene Arbeitsweisen ausbauen";
      mature.step = "Wählen Sie eine gut funktionierende eigene Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll.";
    }
    const rating = score >= 85 ? "bereits eine sehr belastbare Stärke" : "eine solide Grundlage";
    mature.observation = `${DIMENSIONS[key].label} ist mit ${score} von 100 Punkten ${rating}. ${mature.observation}`;
    return mature;
  };
  const ranked = Object.keys(DIMENSIONS).sort((a, b) => baseline.scores[a].percent - baseline.scores[b].percent);
  const selected = ranked.slice(0, 3).map((key, index) => {
    const fallback = fallbackFor(key);
    return {
      titel: fallback.title,
      beobachtung: fallback.observation,
      naechsterSchritt: fallback.step,
      aufwand: index === 0 ? "gering" : "mittel",
      wirkung: index === 0 ? "sehr hoch" : "hoch",
    };
  });
  const strongest = Object.keys(DIMENSIONS).sort((a, b) => baseline.scores[b].percent - baseline.scores[a].percent)[0];
  const weakest = ranked[0];
  const lowest = baseline.scores[weakest].percent;
  const highest = baseline.scores[strongest].percent;
  const balanced = highest - lowest <= 5;
  const allMature = lowest >= 85;
  const comparison = allMature
    ? "Alle vier Bereiche sind bereits sehr belastbar; es gibt keinen einzelnen Schwachpunkt."
    : balanced
      ? "Die vier Teilwerte liegen eng beieinander; kein Bereich sticht als einzelner Engpass hervor."
      : `Ihre stärkste Grundlage ist ${DIMENSIONS[strongest].label}; ${lowest >= 65 ? "das größte relative Ausbaupotenzial" : "den größten Entwicklungsbedarf"} zeigt ${DIMENSIONS[weakest].label}.`;
  const leverage = balanced
    ? {
        title: "Nächsten messbaren KI-Test auswählen",
        observation: allMature
          ? "Die vier Teilwerte liegen auf einem durchgängig hohen Niveau. Der größte Nutzen entsteht jetzt durch einen kleinen Vergleichstest mit klarer Qualitäts- und Wirkungsmessung."
          : "Die Teilwerte sind ausgewogen. Statt einen vermeintlichen Schwachpunkt zu behandeln, sollte der nächste Test nach messbarem Nutzen und geringem Risiko ausgewählt werden.",
      }
    : { title: fallbackFor(weakest).title, observation: fallbackFor(weakest).observation };
  return {
    gesamteinschaetzung: `Mit ${baseline.scores.total.percent} von 100 Punkten liegt Ihr Unternehmen im Reifegrad „${baseline.level}“. ${comparison} Der sinnvollste nächste Schritt ist ein eng begrenzter Test, dessen Wirkung vorab messbar gemacht wird.`,
    groessterHebel: {
      titel: leverage.title,
      begruendung: leverage.observation,
    },
    empfehlungen: selected,
    roadmap: {
      phase1: { zeitraum: "Tage 1–30", titel: "Fundament klären", punkte: [selected[0].naechsterSchritt, "Ausgangswert und Ziel dokumentieren"] },
      phase2: { zeitraum: "Tage 31–60", titel: "Klein testen", punkte: [selected[1].naechsterSchritt, isSolo ? "Test in einem klar abgegrenzten eigenen Arbeitsablauf durchführen" : "Test mit einer klaren Nutzergruppe durchführen"] },
      phase3: { zeitraum: "Tage 61–90", titel: "Wirkung entscheiden", punkte: [selected[2].naechsterSchritt, "Ergebnis messen und nächste Stufe bewusst freigeben"] },
    },
    fallback: true,
  };
}

async function generateAnalysis(profile, answers, baseline) {
  if (!process.env.OPENAI_API_KEY) return deterministicFallback(baseline, profile);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const request = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(profile, answers, baseline) },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2600,
    reasoning_effort: "low",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const completion = await openai.chat.completions.create(request, { signal: controller.signal });
    const content = completion.choices[0]?.message?.content;
    const result = JSON.parse(content || "{}");
    validateGenerated(result);
    return result;
  } catch (error) {
    console.error("[analyze] OpenAI fallback", error?.name || "unknown");
    return deterministicFallback(baseline, profile);
  } finally {
    clearTimeout(timeout);
  }
}

async function claimAnalysis(supabase, assessmentId, submissionId, leaseToken) {
  const { data, error } = await supabase.rpc("claim_ai_readiness_analysis_v1", {
    p_assessment_id: assessmentId,
    p_submission_id: submissionId,
    p_lease_token: leaseToken,
  });
  if (error) throw new Error("analysis_claim_failed");
  return Array.isArray(data) ? data[0] : data;
}

async function persistAnalysis(supabase, assessmentId, leaseToken, result) {
  const { data, error } = await supabase.rpc("complete_ai_readiness_analysis_v1", {
    p_assessment_id: assessmentId,
    p_lease_token: leaseToken,
    p_result: result,
  });
  if (error) {
    const safeError = new Error(error.message?.includes("analysis_consent_revoked")
      ? "analysis_consent_revoked"
      : "analysis_persist_failed");
    safeError.code = safeError.message;
    throw safeError;
  }
  return Array.isArray(data) ? data[0] : data;
}

async function canonicalAssessment(assessmentId, submissionId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_readiness_assessments")
    .select("submission_id, assessment_version, industry, employee_band, respondent_role, primary_goal, answers, score_total, readiness_level, ai_consent_version, ai_consent_revoked_at, analysis_status, analysis_result")
    .eq("id", assessmentId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error || !data) throw new Error("assessment_not_found");
  if (data.ai_consent_version !== AI_CONSENT_VERSION) throw new Error("ai_consent_mismatch");
  if (data.ai_consent_revoked_at && data.analysis_status !== "completed") {
    const consentError = new Error("analysis_consent_revoked");
    consentError.code = consentError.message;
    throw consentError;
  }
  const profile = {
    branche: data.industry,
    mitarbeiter: data.employee_band,
    rolle: data.respondent_role,
    hauptziel: data.primary_goal,
  };
  const answers = Array.isArray(data.answers) ? data.answers : [];
  const baseline = scoreAssessment(answers, profile);
  if (!baseline.complete || baseline.scores.total.percent !== data.score_total || baseline.level !== data.readiness_level) {
    throw new Error("stored_score_mismatch");
  }
  return { supabase, profile, answers, baseline, existingResult: data.analysis_status === "completed" ? data.analysis_result : null };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 65536) return jsonResponse(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const assessmentId = cleanText(payload.assessmentId, 80);
    const submissionId = cleanText(payload.submissionId, 80);

    if (!isProduction() && process.env.ALLOW_PREVIEW_ANALYSIS !== "true") {
      return jsonResponse(409, { error: "Die externe KI-Analyse ist in der Preview deaktiviert.", preview: true });
    }
    if (isProduction() && !verifyAnalysisToken(payload.analysisToken, assessmentId, submissionId)) {
      return jsonResponse(403, { error: "Analysefreigabe ungültig oder abgelaufen." });
    }
    let supabase = null;
    let profile;
    let answers;
    let baseline;
    let analysisLeaseToken = null;
    if (isProduction()) {
      const canonical = await canonicalAssessment(assessmentId, submissionId);
      if (canonical.existingResult) return jsonResponse(200, canonical.existingResult);
      ({ supabase, profile, answers, baseline } = canonical);
      analysisLeaseToken = crypto.randomUUID();
      const claim = await claimAnalysis(supabase, assessmentId, submissionId, analysisLeaseToken);
      if (claim?.status === "completed" && claim.result) return jsonResponse(200, claim.result);
      if (claim?.status === "consent_revoked") {
        return jsonResponse(403, { error: "Die Einwilligung zur KI-Auswertung wurde widerrufen." });
      }
      if (claim?.status !== "claimed") return jsonResponse(409, { error: "Die Auswertung wird bereits erstellt. Bitte versuchen Sie es gleich erneut." });
    } else {
      if (!payload.aiProcessingConsent?.granted || payload.aiProcessingConsent?.version !== AI_CONSENT_VERSION) {
        return jsonResponse(400, { error: "Einwilligung zur KI-Verarbeitung fehlt." });
      }
      profile = payload.companyProfile || {};
      answers = Array.isArray(payload.answers) ? payload.answers.slice(0, 20) : [];
      baseline = scoreAssessment(answers, profile);
      if (!baseline.complete) return jsonResponse(400, { error: "Für den Score fehlen Antworten." });
    }

    const generated = await generateAnalysis(profile, answers, baseline);
    const result = {
      ...generated,
      scores: baseline.scores,
      level: baseline.level,
      timePotential: baseline.timePotential,
      assessmentVersion: baseline.assessmentVersion,
      diagnosticNote: "Strukturierte Selbsteinschätzung mit fester Bewertungslogik; keine Zertifizierung oder Erfolgsgarantie.",
    };

    const persisted = isProduction() ? await persistAnalysis(supabase, assessmentId, analysisLeaseToken, result) : result;
    return jsonResponse(200, persisted);
  } catch (error) {
    console.error("[analyze] failed", error?.code || error?.name || "unknown");
    if (error?.code === "analysis_consent_revoked" || error?.message === "analysis_consent_revoked") {
      return jsonResponse(403, { error: "Die Einwilligung zur KI-Auswertung wurde widerrufen." });
    }
    return jsonResponse(503, { error: "Die Detailauswertung konnte nicht sicher abgeschlossen werden. Ihr Basisscore bleibt erhalten; bitte versuchen Sie es erneut." });
  }
};

module.exports._test = { answerLabel, buildPrompt, coarseIndustry, deterministicFallback, redactPotentialContactData, validateGenerated };

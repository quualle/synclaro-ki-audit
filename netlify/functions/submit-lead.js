"use strict";

const { parsePhoneNumberFromString } = require("libphonenumber-js");
const { ASSESSMENT_VERSION, cleanText, getQuestion, scoreAssessment } = require("./_shared/assessment");
const { AI_CONSENT_TEXT, AI_CONSENT_VERSION, ANALYTICS_CONSENT_TEXT, CALLBACK_CONSENT_TEXT, CALLBACK_CONSENT_VERSION, COOKIE_CONSENT_VERSION, MARKETING_CONSENT_TEXT, PRIVACY_VERSION } = require("./_shared/consents");
const { normalizeClientIp, normalizeEmail } = require("./_shared/meta");
const { getSupabaseAdmin } = require("./_shared/supabase");
const { clientIp, evidenceIpHash, hasAllowedOrigin, isProduction, jsonResponse, privacyHmac, signAnalysisToken } = require("./_shared/security");
const { readSession } = require("./_shared/session");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPLOYEE_BANDS = new Set(["solo", "1-5", "6-10", "11-20", "21-50", "51+"]);
const ROLES = new Set(["inhaber", "geschaeftsfuehrung", "leitung", "mitarbeit", "beratung"]);
const GOALS = new Set(["zeit", "wachstum", "qualitaet", "wissen", "klarheit"]);

function normalizePhone(value) {
  const raw = cleanText(value, 40);
  const parsed = parsePhoneNumberFromString(raw, "DE");
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

function sanitizeContact(contact) {
  const firstName = cleanText(contact?.firstName, 80);
  const lastName = cleanText(contact?.lastName, 100);
  const company = cleanText(contact?.company, 160);
  const email = normalizeEmail(contact?.email).slice(0, 254);
  const phone = normalizePhone(contact?.phone);
  if (!firstName || !lastName || !company) throw new Error("contact_required");
  if (!EMAIL_RE.test(email)) throw new Error("email_invalid");
  if (!phone) throw new Error("phone_invalid");
  return { firstName, lastName, company, email, phone };
}

function sanitizeProfile(profile) {
  const result = {
    branche: cleanText(profile?.branche, 80),
    mitarbeiter: cleanText(profile?.mitarbeiter, 20),
    rolle: cleanText(profile?.rolle, 50),
    hauptziel: cleanText(profile?.hauptziel, 80),
  };
  if (!result.branche || !EMPLOYEE_BANDS.has(result.mitarbeiter) || !ROLES.has(result.rolle) || !GOALS.has(result.hauptziel)) {
    throw new Error("profile_invalid");
  }
  return result;
}

function sanitizeAnswers(answers, profile = {}) {
  const sanitized = [];
  const seen = new Set();
  for (const input of Array.isArray(answers) ? answers.slice(0, 20) : []) {
    const id = cleanText(input?.questionId, 80);
    const question = getQuestion(id, profile);
    if (!question || seen.has(id)) continue;
    seen.add(id);
    if (question.type === "textarea") {
      const value = cleanText(input.answer, 700);
      sanitized.push({ questionId: id, questionLabel: question.label, questionType: question.type, answer: value, answerLabel: value || "keine Angabe" });
      continue;
    }
    const value = String(input.answer || "");
    const option = question.options?.find((item) => item.value === value);
    if (!option) continue;
    sanitized.push({ questionId: id, questionLabel: question.label, questionType: question.type, answer: option.value, answerLabel: option.label });
  }
  return sanitized;
}

function sanitizeAttribution(attribution, event, submissionId, marketingGranted) {
  const take = (key, max = 180) => cleanText(attribution?.[key], max);
  const landingUrl = take("landingUrl", 600);
  let safeLanding = "https://ki-check.synclaro.de/";
  try {
    const url = new URL(landingUrl || safeLanding);
    if (url.protocol === "https:" && url.hostname === "ki-check.synclaro.de") {
      safeLanding = `${url.origin}${url.pathname}`.slice(0, 600);
    }
  } catch {}
  if (!marketingGranted) {
    return {
      eventId: submissionId,
      landingUrl: safeLanding,
      referrer: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_id: "",
      utm_content: "",
      utm_term: "",
      placement: "",
      fbclid: "",
      fbp: "",
      fbc: "",
      user_agent: "",
    };
  }
  const safeLabel = (key, max = 180) => {
    const value = take(key, max);
    return value && /^[\p{L}\p{N} ._|{}-]+$/u.test(value) ? value : "";
  };
  const source = take("utm_source", 80).toLowerCase();
  const medium = take("utm_medium", 80).toLowerCase();
  const campaign = take("utm_campaign", 120).toLowerCase();
  const placement = take("placement", 80).toLowerCase();
  const opaque = (key, max = 255) => {
    const value = take(key, max);
    return value && /^[A-Za-z0-9._-]+$/.test(value) ? value : "";
  };
  let safeReferrer = "";
  try {
    const url = new URL(take("referrer", 500));
    if (url.protocol === "https:" || url.protocol === "http:") safeReferrer = url.origin;
  } catch {}
  return {
    eventId: submissionId,
    landingUrl: safeLanding,
    referrer: safeReferrer,
    utm_source: source === "meta" ? "meta" : (source ? "other" : ""),
    utm_medium: medium === "paid_social" ? "paid_social" : (medium ? "other" : ""),
    utm_campaign: ["ai_readiness_de_prospecting_v1", "meta_ai_readiness_de_prospecting_v1"].includes(campaign)
      ? "ai_readiness_de_prospecting_v1"
      : (campaign ? "other" : ""),
    utm_id: safeLabel("utm_id", 120),
    utm_content: safeLabel("utm_content", 180),
    utm_term: safeLabel("utm_term", 120),
    placement: /^(facebook|instagram|messenger|threads|audience_network)([._-][a-z0-9_-]+)*$/.test(placement) ? placement : (placement ? "other" : ""),
    fbclid: opaque("fbclid", 500),
    fbp: opaque("fbp", 255),
    fbc: opaque("fbc", 255),
    user_agent: cleanText(event.headers?.["user-agent"] || event.headers?.["User-Agent"], 500),
  };
}

function sanitizeConsents(consents) {
  if (consents?.callback?.granted !== true || consents.callback.version !== CALLBACK_CONSENT_VERSION) throw new Error("callback_consent_missing");
  if (consents?.aiProcessing?.granted !== true || consents.aiProcessing.version !== AI_CONSENT_VERSION) throw new Error("ai_consent_missing");
  const now = new Date().toISOString();
  const analyticsGranted = consents?.analytics?.granted === true;
  const marketingGranted = consents?.marketing?.granted === true;
  if (analyticsGranted && consents.analytics.version !== COOKIE_CONSENT_VERSION) throw new Error("tracking_consent_version");
  if (marketingGranted && consents.marketing.version !== COOKIE_CONSENT_VERSION) throw new Error("tracking_consent_version");
  return {
    callback: { granted: true, version: CALLBACK_CONSENT_VERSION, text: CALLBACK_CONSENT_TEXT, grantedAt: now },
    aiProcessing: { granted: true, version: AI_CONSENT_VERSION, text: AI_CONSENT_TEXT, grantedAt: now },
    analytics: { granted: analyticsGranted, version: COOKIE_CONSENT_VERSION, text: ANALYTICS_CONSENT_TEXT, grantedAt: analyticsGranted ? now : null },
    marketing: { granted: marketingGranted, version: COOKIE_CONSENT_VERSION, text: MARKETING_CONSENT_TEXT, grantedAt: marketingGranted ? now : null },
  };
}

function errorMessage(code) {
  const map = {
    contact_required: "Bitte füllen Sie Name und Unternehmen vollständig aus.",
    email_invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    phone_invalid: "Bitte geben Sie eine erreichbare Telefonnummer mit Vorwahl ein.",
    profile_invalid: "Unternehmensprofil unvollständig.",
    callback_consent_missing: "Die Bitte um persönliche Kontaktaufnahme fehlt.",
    ai_consent_missing: "Die Einwilligung zur individuellen KI-Auswertung fehlt.",
    tracking_consent_version: "Die Tracking-Auswahl ist veraltet. Bitte laden Sie die Seite neu und wählen Sie erneut.",
  };
  return map[code] || "Der Lead konnte nicht sicher gespeichert werden. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 65536) return jsonResponse(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    if (cleanText(payload.website, 120)) return jsonResponse(201, { accepted: true });
    const submissionId = cleanText(payload.submissionId, 80);
    if (!UUID_RE.test(submissionId)) return jsonResponse(400, { error: "Ungültige Übertragungs-ID." });
    const runId = cleanText(payload.runId, 80);
    if (!UUID_RE.test(runId)) return jsonResponse(400, { error: "Ungültige Testlauf-ID." });
    const trackingSubjectId = cleanText(payload.trackingSubjectId, 80);
    if (!UUID_RE.test(trackingSubjectId)) return jsonResponse(400, { error: "Ungültige Consent-ID." });
    const trackingPreviousDecisionId = cleanText(payload.trackingPreviousDecisionId, 80);
    if (trackingPreviousDecisionId && !UUID_RE.test(trackingPreviousDecisionId)) return jsonResponse(400, { error: "Ungültige Consent-Entscheidung." });

    const profile = sanitizeProfile(payload.companyProfile);
    const answers = sanitizeAnswers(payload.answers, profile);
    const baseline = scoreAssessment(answers, profile);
    if (!baseline.complete) return jsonResponse(400, { error: "Bitte beantworten Sie alle Kernfragen." });
    const contact = sanitizeContact(payload.contact);
    const consents = sanitizeConsents(payload.consents);
    const attribution = sanitizeAttribution(payload.attribution, event, submissionId, consents.marketing.granted);

    if (!isProduction()) {
      return jsonResponse(201, {
        accepted: true,
        preview: true,
        assessmentId: `preview-${submissionId}`,
        submissionId,
        baseline,
      });
    }

    const session = readSession(event);
    if (!session || session.ageSeconds < 5) return jsonResponse(400, { error: "Bitte starten Sie den Test erneut und füllen Sie ihn in Ruhe aus." });

    const supabase = getSupabaseAdmin();
    const trackingSubjectHash = privacyHmac("tracking-subject", trackingSubjectId);
    const consentEvidenceIpHash = evidenceIpHash(event);
    const consentEvidenceUserAgent = cleanText(event.headers?.["user-agent"] || event.headers?.["User-Agent"], 500);
    const { data: trackingConsentData, error: trackingConsentError } = await supabase.rpc("record_ai_readiness_tracking_consent_v1", {
      p_decision_id: submissionId,
      p_previous_decision_id: trackingPreviousDecisionId || null,
      p_run_id: runId,
      p_session_hash: session.sessionHash,
      p_tracking_subject_hash: trackingSubjectHash,
      p_consent_version: COOKIE_CONSENT_VERSION,
      p_analytics: consents.analytics.granted,
      p_marketing: consents.marketing.granted,
      p_evidence_ip_hash: consentEvidenceIpHash,
      p_evidence_user_agent: consentEvidenceUserAgent,
    });
    if (trackingConsentError) {
      return jsonResponse(503, { error: "Ihre Tracking-Auswahl konnte nicht verbindlich zugeordnet werden. Es wurde noch kein Lead gespeichert." });
    }
    const trackingConsentResult = Array.isArray(trackingConsentData) ? trackingConsentData[0] : trackingConsentData;
    if (trackingConsentResult?.status === "stale" || trackingConsentResult?.accepted === false) {
      return jsonResponse(409, { error: "Ihre Tracking-Auswahl wurde inzwischen in einem anderen Tab geändert. Bitte prüfen Sie die Auswahl und senden Sie erneut." });
    }
    const rpcPayload = {
      submission_id: submissionId,
      run_id: runId,
      session_hash: session.sessionHash,
      rate_ip_hash: privacyHmac("ip", clientIp(event) || `session:${session.sessionHash}`),
      rate_email_hash: privacyHmac("email", contact.email),
      rate_phone_hash: privacyHmac("phone", contact.phone),
      tracking_subject_hash: trackingSubjectHash,
      contact,
      profile,
      answers,
      baseline,
      attribution,
      consents,
      assessment_version: ASSESSMENT_VERSION,
      privacy_version: PRIVACY_VERSION,
      delivery_context: consents.marketing.granted
        ? { clientIpAddress: normalizeClientIp(clientIp(event)) || null }
        : {},
    };
    rpcPayload.consents.evidence = {
      ipHash: consentEvidenceIpHash,
      userAgent: consentEvidenceUserAgent,
    };
    const { data, error } = await supabase.rpc("submit_ai_readiness_lead_v1", { p_payload: rpcPayload });
    if (error) {
      const rateLimited = String(error.message || "").includes("rate_limited");
      return jsonResponse(rateLimited ? 429 : 503, { error: rateLimited ? "Zu viele Versuche. Bitte versuchen Sie es später erneut." : "Der Lead konnte nicht dauerhaft gespeichert werden. Es wurde noch keine Erfolgsmeldung ausgelöst." });
    }
    const result = Array.isArray(data) ? data[0] : data;
    const assessmentId = result?.assessment_id || result?.assessmentId;
    if (!assessmentId) throw new Error("assessment_id_missing");

    return jsonResponse(201, {
      accepted: true,
      assessmentId,
      submissionId,
      analysisToken: signAnalysisToken(assessmentId, submissionId),
      baseline,
      leadEventId: submissionId,
      notificationQueued: result?.status === "created",
      telegramQueued: result?.status === "created",
      trackingConsentDecidedAt: trackingConsentResult?.decided_at || trackingConsentResult?.decidedAt || null,
      trackingConsentDecisionId: trackingConsentResult?.decision_id || trackingConsentResult?.decisionId || submissionId,
    });
  } catch (error) {
    const code = error?.message || "unknown";
    console.error("[submit-lead] rejected", /^[a-z_]+$/.test(code) ? code : error?.name || "unknown");
    return jsonResponse(400, { error: errorMessage(code) });
  }
};

module.exports._test = {
  AI_CONSENT_TEXT,
  AI_CONSENT_VERSION,
  CALLBACK_CONSENT_TEXT,
  CALLBACK_CONSENT_VERSION,
  PRIVACY_VERSION,
  normalizePhone,
  sanitizeAnswers,
  sanitizeConsents,
  sanitizeContact,
  sanitizeProfile,
  sanitizeAttribution,
};

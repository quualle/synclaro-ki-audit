"use strict";

const { cleanText } = require("./_shared/assessment");
const { COOKIE_CONSENT_VERSION } = require("./_shared/consents");
const { getSupabaseAdmin } = require("./_shared/supabase");
const { evidenceIpHash, hasAllowedOrigin, isProduction, jsonResponse, privacyHmac } = require("./_shared/security");
const { readSession } = require("./_shared/session");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 8192) return jsonResponse(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const decisionId = cleanText(payload.decisionId, 80);
    const previousDecisionId = cleanText(payload.previousDecisionId, 80);
    const runId = cleanText(payload.runId, 80);
    const subjectId = cleanText(payload.trackingSubjectId, 80);
    if (!UUID_RE.test(decisionId) || (previousDecisionId && !UUID_RE.test(previousDecisionId))
      || !UUID_RE.test(runId) || !UUID_RE.test(subjectId)) {
      return jsonResponse(400, { error: "Ungültige Consent-Entscheidung." });
    }
    if (payload.version !== COOKIE_CONSENT_VERSION || typeof payload.analytics !== "boolean" || typeof payload.marketing !== "boolean") {
      return jsonResponse(400, { error: "Ungültiger Consent-Stand." });
    }

    const decidedAt = new Date().toISOString();
    if (!isProduction()) return jsonResponse(200, { accepted: true, preview: true, decidedAt });

    const session = readSession(event);
    if (!session) return jsonResponse(401, { error: "Testsitzung abgelaufen." });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_ai_readiness_tracking_consent_v1", {
      p_decision_id: decisionId,
      p_previous_decision_id: previousDecisionId || null,
      p_run_id: runId,
      p_session_hash: session.sessionHash,
      p_tracking_subject_hash: privacyHmac("tracking-subject", subjectId),
      p_consent_version: COOKIE_CONSENT_VERSION,
      p_analytics: payload.analytics,
      p_marketing: payload.marketing,
      p_evidence_ip_hash: evidenceIpHash(event),
      p_evidence_user_agent: cleanText(event.headers?.["user-agent"] || event.headers?.["User-Agent"], 500),
    });
    if (error) {
      const limited = String(error.message || "").includes("rate_limited");
      return jsonResponse(limited ? 429 : 503, { error: limited ? "Zu viele Consent-Änderungen." : "Consent-Stand konnte nicht gespeichert werden." });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.status === "stale" || result?.accepted === false) {
      return jsonResponse(409, {
        accepted: false,
        status: "stale",
        currentDecisionId: result?.current_decision_id || null,
        currentAnalytics: result?.current_analytics === true,
        currentMarketing: result?.current_marketing === true,
        currentDecidedAt: result?.current_decided_at || null,
        error: "Die Tracking-Auswahl wurde inzwischen in einem anderen Tab geändert.",
      });
    }
    return jsonResponse(200, {
      accepted: true,
      status: result?.status || "accepted",
      decisionId: result?.decision_id || result?.decisionId || decisionId,
      decidedAt: result?.decided_at || result?.decidedAt || decidedAt,
    });
  } catch (error) {
    console.error("[update-tracking-consent] rejected", error?.name || "unknown");
    return jsonResponse(400, { error: "Consent-Stand konnte nicht verarbeitet werden." });
  }
};

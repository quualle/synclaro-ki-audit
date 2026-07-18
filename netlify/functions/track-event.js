"use strict";

const { cleanText } = require("./_shared/assessment");
const { COOKIE_CONSENT_VERSION } = require("./_shared/consents");
const { getSupabaseAdmin } = require("./_shared/supabase");
const { hasAllowedOrigin, isProduction, jsonResponse } = require("./_shared/security");
const { readSession } = require("./_shared/session");

const EVENTS = new Set([
  "landing_viewed",
  "test_started",
  "profile_completed",
  "phase_started",
  "phase_completed",
  "result_preview_viewed",
  "lead_form_viewed",
  "lead_form_validation_error",
  "lead_submitted",
  "report_viewed",
  "calendar_cta_clicked",
  "consent_updated",
  "scroll_depth",
  "session_duration",
]);
const PROPERTY_KEYS = new Set([
  "assessment_version",
  "phase",
  "question_count",
  "employee_band",
  "respondent_role",
  "score",
  "level",
  "field",
  "error_code",
  "depth",
  "duration_bucket",
  "utm_campaign",
  "placement",
  "preview",
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

function validateAnalyticsConsent(input) {
  if (input?.granted !== true || input.version !== COOKIE_CONSENT_VERSION) return null;
  const grantedAt = Date.parse(input.grantedAt || "");
  if (!Number.isFinite(grantedAt) || grantedAt < Date.now() - CONSENT_MAX_AGE_MS || grantedAt > Date.now() + 5 * 60 * 1000) return null;
  return new Date(grantedAt).toISOString();
}

function sanitizeProperties(input) {
  const output = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return output;
  for (const [key, value] of Object.entries(input)) {
    if (!PROPERTY_KEYS.has(key)) continue;
    if (key === "utm_campaign") {
      const campaign = cleanText(value, 120).toLowerCase();
      output[key] = ["ai_readiness_de_prospecting_v1", "meta_ai_readiness_de_prospecting_v1", "meta_other", "other"].includes(campaign)
        ? campaign.replace(/^meta_ai_/, "ai_")
        : "other";
      continue;
    }
    if (key === "placement") {
      const placement = cleanText(value, 80).toLowerCase();
      output[key] = /^(facebook|instagram|messenger|threads|audience_network)([._-][a-z0-9_-]+)*$/.test(placement) ? placement : "other";
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "boolean") output[key] = value;
    else output[key] = cleanText(value, 120);
  }
  return output;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 16384) return jsonResponse(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const consentGrantedAt = validateAnalyticsConsent(payload.analyticsConsent);
    if (!consentGrantedAt) return jsonResponse(202, { accepted: false, reason: "no_current_analytics_consent" });
    const eventId = cleanText(payload.eventId, 80);
    const runId = cleanText(payload.runId, 80);
    const eventName = cleanText(payload.eventName, 80);
    if (!UUID_RE.test(eventId) || !UUID_RE.test(runId) || !EVENTS.has(eventName)) return jsonResponse(400, { error: "Ungültiges Ereignis." });
    if (!isProduction()) return jsonResponse(202, { accepted: true, preview: true });

    const session = readSession(event);
    if (!session) return jsonResponse(401, { error: "Testsitzung abgelaufen." });
    const occurredAt = new Date(payload.occurredAt || Date.now());
    const safeOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date().toISOString() : occurredAt.toISOString();
    const step = Number.isInteger(Number(payload.step)) ? Math.max(0, Math.min(100, Number(payload.step))) : null;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_ai_readiness_event_v1", {
      p_event_id: eventId,
      p_run_id: runId,
      p_session_hash: session.sessionHash,
      p_event_name: eventName,
      p_step: step,
      p_properties: sanitizeProperties(payload.properties),
      p_occurred_at: safeOccurredAt,
      p_analytics_consent_version: COOKIE_CONSENT_VERSION,
      p_analytics_consent_granted_at: consentGrantedAt,
    });
    if (error) {
      const limited = String(error.message || "").includes("rate_limited");
      return jsonResponse(limited ? 429 : 503, { error: limited ? "Ereignisrate überschritten." : "Ereignis nicht gespeichert." });
    }
    return jsonResponse(202, { accepted: true, status: Array.isArray(data) ? data[0]?.status : data?.status });
  } catch (error) {
    console.error("[track-event] rejected", error?.name || "unknown");
    return jsonResponse(400, { error: "Ereignis konnte nicht verarbeitet werden." });
  }
};

module.exports._test = { sanitizeProperties, validateAnalyticsConsent };

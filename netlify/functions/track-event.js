"use strict";

const { cleanText } = require("./_shared/assessment");
const { sanitizeMetaObjectId, sanitizePlacement } = require("./_shared/attribution");
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
  "contact_handoff_clicked",
  "consent_updated",
  "scroll_depth",
  "session_duration",
  "profile_step_viewed",
  "profile_step_completed",
  "question_viewed",
  "question_answered",
  "question_load_failed",
  "question_retry",
  "contact_step_viewed",
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
  "campaign_id",
  "adset_id",
  "ad_id",
  "placement",
  "preview",
  "profile_step",
  "question_id",
  "position",
  "dimension",
  "selection_mode",
  "generation_latency_bucket",
  "response_time_bucket",
  "changed_after_back",
  "reason_bucket",
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const ENUM_PROPERTIES = Object.freeze({
  phase: new Set(["assessment"]),
  employee_band: new Set(["solo", "1-5", "6-10", "11-20", "21-50", "51+"]),
  respondent_role: new Set(["inhaber", "geschaeftsfuehrung", "leitung", "mitarbeit", "beratung"]),
  level: new Set(["KI-Fundament aufbauen", "KI-Startklar", "KI-Umsetzungsbereit", "KI-Skalierbar"]),
  field: new Set(["firstName", "lastName", "company", "email"]),
  error_code: new Set(["required_or_invalid"]),
  duration_bucket: new Set(["0-30", "31-120", "121-300", "300+"]),
  profile_step: new Set(["mitarbeiter", "rolle", "hauptziel", "branche"]),
  dimension: new Set(["prozesse_daten", "team_wissen", "ki_praxis", "umsetzungskraft", "optional_context"]),
  selection_mode: new Set(["frontier_adaptive", "deterministic_fallback", "static_optional"]),
  generation_latency_bucket: new Set(["cached", "under_2s", "2_5s", "5_10s", "over_10s"]),
  response_time_bucket: new Set(["under_5s", "5_15s", "15_30s", "30_60s", "over_60s"]),
  reason_bucket: new Set(["network", "server", "invalid_response", "other"]),
});
const NUMBER_PROPERTIES = Object.freeze({
  question_count: [0, 8],
  score: [0, 100],
  depth: [0, 100],
  position: [1, 9],
});
const QUESTION_IDS = new Set([
  "prozess_standardisierung", "daten_zugriff", "system_brueche", "routineaufgaben",
  "wissen_verteilung", "team_digital", "ki_nutzung", "ki_leitplanken",
  "ki_zielbild", "verantwortung", "umsetzungstempo", "erfolgsmessung", "haupthebel",
  "adaptive_pending",
]);
const MARKETING_ATTRIBUTION_KEYS = ["campaign_id", "adset_id", "ad_id", "placement"];

function validateAnalyticsConsent(input) {
  if (input?.granted !== true || input.version !== COOKIE_CONSENT_VERSION) return null;
  const grantedAt = Date.parse(input.grantedAt || "");
  if (!Number.isFinite(grantedAt) || grantedAt < Date.now() - CONSENT_MAX_AGE_MS || grantedAt > Date.now() + 5 * 60 * 1000) return null;
  return new Date(grantedAt).toISOString();
}

function sanitizeProperties(input, { eventName = "", allowMarketingAttribution = false } = {}) {
  const output = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return output;
  for (const [key, value] of Object.entries(input)) {
    if (!PROPERTY_KEYS.has(key)) continue;
    if (key === "assessment_version") {
      const version = cleanText(value, 32);
      if (/^\d{4}-\d{2}-\d{2}\.v\d{1,3}$/.test(version)) output[key] = version;
      continue;
    }
    if (Object.hasOwn(ENUM_PROPERTIES, key)) {
      const candidate = cleanText(value, 40);
      if (ENUM_PROPERTIES[key].has(candidate)) output[key] = candidate;
      continue;
    }
    if (Object.hasOwn(NUMBER_PROPERTIES, key)) {
      const [min, max] = NUMBER_PROPERTIES[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
        && (key !== "position" || Number.isInteger(value))) output[key] = value;
      continue;
    }
    if (key === "preview") {
      if (typeof value === "boolean") output[key] = value;
      continue;
    }
    if (key === "changed_after_back") {
      if (typeof value === "boolean") output[key] = value;
      continue;
    }
    if (key === "question_id") {
      const questionId = cleanText(value, 64);
      if (QUESTION_IDS.has(questionId)) output[key] = questionId;
      continue;
    }
    if (key === "utm_campaign") {
      const campaign = cleanText(value, 120).toLowerCase();
      output[key] = ["ai_readiness_de_prospecting_v1", "meta_ai_readiness_de_prospecting_v1", "meta_other", "other"].includes(campaign)
        ? campaign.replace(/^meta_ai_/, "ai_")
        : "other";
      continue;
    }
    if (key === "placement") {
      if (allowMarketingAttribution) output[key] = sanitizePlacement(value) || "other";
      continue;
    }
    if (["campaign_id", "adset_id", "ad_id"].includes(key)) {
      if (allowMarketingAttribution) {
        const objectId = sanitizeMetaObjectId(value);
        if (objectId) output[key] = objectId;
      }
      continue;
    }
  }
  if (eventName && !["landing_viewed", "test_started"].includes(eventName)) {
    for (const key of MARKETING_ATTRIBUTION_KEYS) delete output[key];
  }
  if (eventName === "question_viewed") {
    delete output.response_time_bucket;
    delete output.changed_after_back;
    delete output.reason_bucket;
  } else if (eventName === "question_answered") {
    delete output.generation_latency_bucket;
    delete output.reason_bucket;
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
    const marketingConsentGrantedAt = validateAnalyticsConsent(payload.marketingConsent);
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
    const { data, error } = await supabase.rpc("record_ai_readiness_event_v2", {
      p_event_id: eventId,
      p_run_id: runId,
      p_session_hash: session.sessionHash,
      p_event_name: eventName,
      p_step: step,
      p_properties: sanitizeProperties(payload.properties, {
        eventName,
        allowMarketingAttribution: Boolean(marketingConsentGrantedAt),
      }),
      p_occurred_at: safeOccurredAt,
      p_analytics_consent_version: COOKIE_CONSENT_VERSION,
      p_analytics_consent_granted_at: consentGrantedAt,
      p_marketing_consent_granted_at: marketingConsentGrantedAt,
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

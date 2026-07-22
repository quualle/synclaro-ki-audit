"use strict";

const { cleanText } = require("./assessment");
const { COOKIE_CONSENT_VERSION } = require("./consents");
const { sendMetaEvent } = require("./meta");
const { getSupabaseAdmin } = require("./supabase");
const { hasAllowedOrigin, isProduction, jsonResponse } = require("./security");
const { readSession } = require("./session");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FBP_RE = /^fb\.1\.\d{10,13}\.\d{1,32}$/;
const FBC_RE = /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{6,240}$/;
const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

function validateMarketingConsent(input) {
  if (input?.granted !== true || input.version !== COOKIE_CONSENT_VERSION) return null;
  const grantedAt = Date.parse(input.grantedAt || "");
  if (!Number.isFinite(grantedAt)
    || grantedAt < Date.now() - CONSENT_MAX_AGE_MS
    || grantedAt > Date.now() + 5 * 60 * 1000) return null;
  return new Date(grantedAt).toISOString();
}

function sanitizeBrowserIdentifiers(input) {
  const fbp = cleanText(input?.fbp, 255);
  const fbc = cleanText(input?.fbc, 255);
  return {
    fbp: FBP_RE.test(fbp) ? fbp : "",
    fbc: FBC_RE.test(fbc) ? fbc : "",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" } };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 8192) return jsonResponse(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const eventId = cleanText(payload.eventId, 80);
    const runId = cleanText(payload.runId, 80);
    const marketingConsentGrantedAt = validateMarketingConsent(payload.marketingConsent);
    if (!UUID_RE.test(eventId) || !UUID_RE.test(runId) || !marketingConsentGrantedAt) {
      return jsonResponse(400, { error: "Ungültiges Meta-Ereignis." });
    }
    if (!isProduction()) return jsonResponse(202, { accepted: true, preview: true });

    const session = readSession(event);
    if (!session) return jsonResponse(401, { error: "Testsitzung abgelaufen." });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("authorize_ai_readiness_marketing_event_v1", {
      p_run_id: runId,
      p_session_hash: session.sessionHash,
      p_consent_version: COOKIE_CONSENT_VERSION,
      p_marketing_consent_granted_at: marketingConsentGrantedAt,
    });
    if (error) return jsonResponse(503, { error: "Meta-Consent konnte nicht bestätigt werden." });
    const authorization = Array.isArray(data) ? data[0] : data;
    if (authorization?.authorized !== true) {
      return jsonResponse(202, { accepted: false, reason: "no_current_marketing_consent" });
    }

    const identifiers = sanitizeBrowserIdentifiers(payload.attribution);
    const outcome = await sendMetaEvent({
      eventName: "PageView",
      event,
      attribution: { ...identifiers, eventId },
      eventSourceUrl: "https://ki-check.synclaro.de/",
      eventTime: Math.floor(Date.now() / 1000),
    });
    if (!outcome.sent) {
      console.error("[meta-pageview] delivery failed", outcome.errorCode || outcome.skipped || "unknown");
      return jsonResponse(outcome.skipped === "not_configured" ? 503 : 502, { error: "Meta-Ereignis wurde nicht bestätigt." });
    }
    return jsonResponse(202, { accepted: true, eventsReceived: outcome.eventsReceived });
  } catch (error) {
    console.error("[meta-pageview] rejected", error?.name || "unknown");
    return jsonResponse(400, { error: "Meta-Ereignis konnte nicht verarbeitet werden." });
  }
};

module.exports._test = { sanitizeBrowserIdentifiers, validateMarketingConsent };

"use strict";

const crypto = require("crypto");
const { getSupabaseAdmin } = require("./_shared/supabase");
const { isProduction, jsonResponse, sha256, verifyBookingReference } = require("./_shared/security");

function rawBody(event) {
  return event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64")
    : Buffer.from(String(event.body || ""), "utf8");
}

function validSignature(body, supplied, secret) {
  if (!secret || secret.length < 32 || !supplied) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(String(supplied).trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function bookingReferenceFromPayload(payload = {}) {
  const candidate = payload.responses?.readiness_ref?.value
    ?? payload.customInputs?.readiness_ref
    ?? payload.userFieldsResponses?.readiness_ref?.value
    ?? payload.userFieldsResponses?.readiness_ref
    ?? payload.metadata?.readiness_ref;
  return typeof candidate === "string" && candidate.length <= 800 ? candidate : "";
}

function header(event, name) {
  const headers = event.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." }, { Allow: "POST" });
  if (!isProduction()) return jsonResponse(202, { accepted: false, preview: true });
  const body = rawBody(event);
  if (!body.length || body.length > 65536) return jsonResponse(413, { error: "Anfrage zu groß oder leer." });
  const secret = process.env.CAL_READINESS_WEBHOOK_SECRET || "";
  if (!validSignature(body, header(event, "x-cal-signature-256"), secret)) return jsonResponse(401, { error: "Signatur ungültig." });
  if (header(event, "x-cal-webhook-version") !== "2021-10-20") return jsonResponse(400, { error: "Webhook-Version nicht unterstützt." });

  let envelope;
  try { envelope = JSON.parse(body.toString("utf8")); } catch { return jsonResponse(400, { error: "JSON ungültig." }); }
  if (envelope.triggerEvent !== "BOOKING_CREATED" || !envelope.payload || typeof envelope.payload !== "object") {
    return jsonResponse(202, { accepted: false, ignored: true });
  }
  const createdAt = new Date(envelope.createdAt);
  if (!Number.isFinite(createdAt.getTime()) || createdAt.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000 || createdAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return jsonResponse(400, { error: "Webhook-Zeitpunkt ungültig." });
  }

  const payload = envelope.payload;
  const configuredEventTypeId = Number(process.env.CAL_READINESS_EVENT_TYPE_ID);
  const configuredSlug = String(process.env.CAL_READINESS_EVENT_TYPE_SLUG || "ki-erstgespraech");
  const configuredOrganizer = String(process.env.CAL_READINESS_ORGANIZER_EMAIL || "").trim().toLowerCase();
  if (!Number.isSafeInteger(configuredEventTypeId) || configuredEventTypeId < 1 || !configuredOrganizer) {
    return jsonResponse(503, { error: "Readiness-Webhook ist noch nicht freigegeben." });
  }
  if (Number(payload.eventTypeId) !== configuredEventTypeId
    || String(payload.type || "") !== configuredSlug
    || String(payload.organizer?.email || "").trim().toLowerCase() !== configuredOrganizer) {
    return jsonResponse(202, { accepted: false, ignored: true });
  }

  const bookingUid = String(payload.bookingUid || payload.uid || "").trim();
  const reference = verifyBookingReference(bookingReferenceFromPayload(payload));
  if (!bookingUid || bookingUid.length > 160 || !reference) return jsonResponse(422, { error: "Readiness-Zuordnung fehlt oder ist ungültig." });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_ai_readiness_booking_v1", {
      p_booking_uid: bookingUid,
      p_assessment_id: reference.assessmentId,
      p_submission_id: reference.submissionId,
      p_event_type_id: configuredEventTypeId,
      p_event_type_slug: configuredSlug,
      p_body_hash: sha256(body),
      p_booking_created_at: createdAt.toISOString(),
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || result?.accepted !== true) return jsonResponse(503, { error: "Buchung konnte nicht sicher verbucht werden." });
    return jsonResponse(200, { accepted: true, status: result.status });
  } catch {
    return jsonResponse(503, { error: "Buchung konnte nicht sicher verbucht werden." });
  }
};

module.exports._test = { bookingReferenceFromPayload, rawBody, validSignature };

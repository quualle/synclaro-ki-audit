"use strict";

const net = require("net");
const { clientIp, sha256 } = require("./security");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/[^0-9+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("0") && !phone.startsWith("00")) phone = `+49${phone.slice(1)}`;
  return phone.replace(/\D/g, "");
}

function hashed(value) {
  return value ? sha256(value) : undefined;
}

function validatedHash(value) {
  const hash = String(value || "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(hash) ? hash : undefined;
}

function normalizeClientIp(value) {
  const ip = String(value || "").trim().slice(0, 80);
  return net.isIP(ip) ? ip : undefined;
}

function canonicalEventSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol === "https:" && url.hostname === "ki-check.synclaro.de") return `${url.origin}${url.pathname}`;
  } catch {}
  return "https://ki-check.synclaro.de/";
}

async function sendMetaLead({ event = {}, contact, attribution, deliveryContext = {}, eventSourceUrl, eventTime }) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return { sent: false, skipped: "not_configured" };

  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const userData = {
    em: [validatedHash(deliveryContext.emailSha256) || hashed(normalizeEmail(contact?.email))],
    ph: [validatedHash(deliveryContext.phoneSha256) || hashed(normalizePhone(contact?.phone))],
    client_ip_address: normalizeClientIp(deliveryContext.clientIpAddress || clientIp(event)),
    client_user_agent: String(attribution.user_agent || event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "").slice(0, 500) || undefined,
    fbp: String(attribution.fbp || "").slice(0, 255) || undefined,
    fbc: String(attribution.fbc || "").slice(0, 255) || undefined,
  };
  for (const key of Object.keys(userData)) if (userData[key] === undefined) delete userData[key];

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Number.isFinite(Number(eventTime)) ? Math.floor(Number(eventTime)) : Math.floor(Date.now() / 1000),
        event_id: attribution.eventId,
        action_source: "website",
        event_source_url: canonicalEventSourceUrl(eventSourceUrl),
        user_data: userData,
        custom_data: {
          content_name: "Synclaro AI Readiness Test",
          content_category: "AI Readiness Assessment",
        },
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
      return { sent: false, status: response.status, errorCode: result.error?.code || "meta_error" };
    }
    const eventsReceived = Number(result.events_received || 0);
    if (!Number.isFinite(eventsReceived) || eventsReceived < 1) {
      return { sent: false, status: response.status, errorCode: "zero_events_received", traceId: result.fbtrace_id || null };
    }
    return { sent: true, eventsReceived, traceId: result.fbtrace_id || null };
  } catch (error) {
    return { sent: false, errorCode: error?.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { canonicalEventSourceUrl, normalizeClientIp, normalizeEmail, normalizePhone, sendMetaLead, validatedHash };

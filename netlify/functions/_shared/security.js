"use strict";

const crypto = require("crypto");
const net = require("net");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...JSON_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function isProduction() {
  if (process.env.CONTEXT !== undefined) return process.env.CONTEXT === "production";
  return process.env.AI_READINESS_PRODUCTION === "true";
}

function requestHost(event) {
  return String(event.headers?.host || event.headers?.Host || "").toLowerCase().split(":")[0];
}

function requestOrigin(event) {
  return String(event.headers?.origin || event.headers?.Origin || "").toLowerCase().replace(/\/$/, "");
}

function hasAllowedOrigin(event) {
  if (!isProduction()) return true;
  const host = requestHost(event);
  const origin = requestOrigin(event);
  if (host !== "ki-check.synclaro.de") return false;
  return origin === "https://ki-check.synclaro.de";
}

function clientIp(event) {
  const headers = event.headers || {};
  const netlifyIp = String(headers["x-nf-client-connection-ip"] || headers["X-Nf-Client-Connection-Ip"] || "").trim().slice(0, 80);
  if (net.isIP(netlifyIp)) return netlifyIp;
  if (isProduction()) return "";
  const forwarded = String(headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "");
  const fallback = forwarded.split(",")[0].trim().slice(0, 80);
  return net.isIP(fallback) ? fallback : "";
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function evidenceIpHash(event) {
  const salt = process.env.LEAD_IP_HASH_SALT || process.env.LEAD_SIGNING_SECRET || "";
  const ip = clientIp(event);
  return salt && ip ? sha256(`${salt}:${ip}`) : null;
}

function privacyHmac(scope, value) {
  const secret = process.env.LEAD_RATE_LIMIT_SECRET || process.env.LEAD_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("LEAD_RATE_LIMIT_SECRET fehlt oder ist zu kurz.");
  return crypto.createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

function signingSecret() {
  const secret = process.env.LEAD_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("LEAD_SIGNING_SECRET fehlt oder ist zu kurz.");
  return secret;
}

function signNewsletterToken(assessmentId, submissionId, ttlSeconds = 86400) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const data = `newsletter:${assessmentId}:${submissionId}:${expires}`;
  const signature = crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
  return `${expires}.${signature}`;
}

function verifyNewsletterToken(token, assessmentId, submissionId) {
  try {
    const [expiresRaw, supplied] = String(token || "").split(".");
    const expires = Number(expiresRaw);
    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || !supplied) return false;
    const data = `newsletter:${assessmentId}:${submissionId}:${expires}`;
    const expected = crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function signNewsletterUnsubscribeToken(assessmentId, submissionId) {
  const data = `newsletter-unsubscribe:${assessmentId}:${submissionId}`;
  return crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
}

function verifyNewsletterUnsubscribeToken(token, assessmentId, submissionId) {
  try {
    const expected = signNewsletterUnsubscribeToken(assessmentId, submissionId);
    const suppliedBuffer = Buffer.from(String(token || ""));
    const expectedBuffer = Buffer.from(expected);
    return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function signBookingReference(assessmentId, submissionId, ttlSeconds = 30 * 24 * 60 * 60) {
  const payload = Buffer.from(JSON.stringify({
    a: assessmentId,
    s: submissionId,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret()).update(`booking:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyBookingReference(reference) {
  try {
    const [payload, supplied] = String(reference || "").split(".");
    if (!payload || !supplied) return null;
    const expected = crypto.createHmac("sha256", signingSecret()).update(`booking:${payload}`).digest("base64url");
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(parsed.a) || !uuid.test(parsed.s) || !Number.isInteger(parsed.e) || parsed.e < Math.floor(Date.now() / 1000)) return null;
    return { assessmentId: parsed.a, submissionId: parsed.s, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

module.exports = {
  JSON_HEADERS,
  clientIp,
  evidenceIpHash,
  hasAllowedOrigin,
  isProduction,
  jsonResponse,
  privacyHmac,
  requestHost,
  requestOrigin,
  sha256,
  signBookingReference,
  signNewsletterToken,
  signNewsletterUnsubscribeToken,
  verifyBookingReference,
  verifyNewsletterToken,
  verifyNewsletterUnsubscribeToken,
};

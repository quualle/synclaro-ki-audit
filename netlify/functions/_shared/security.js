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
  return process.env.CONTEXT === "production";
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

function signAnalysisToken(assessmentId, submissionId, ttlSeconds = 3600) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const data = `${assessmentId}:${submissionId}:${expires}`;
  const signature = crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
  return `${expires}.${signature}`;
}

function verifyAnalysisToken(token, assessmentId, submissionId) {
  try {
    const [expiresRaw, supplied] = String(token || "").split(".");
    const expires = Number(expiresRaw);
    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || !supplied) return false;
    const data = `${assessmentId}:${submissionId}:${expires}`;
    const expected = crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
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
  signAnalysisToken,
  verifyAnalysisToken,
};

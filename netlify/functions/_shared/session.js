"use strict";

const crypto = require("crypto");
const { isProduction } = require("./security");

const COOKIE_NAME = "synclaro_ai_session";
const MAX_AGE_SECONDS = 7200;

function secret() {
  const value = process.env.SESSION_HMAC_SECRET || process.env.LEAD_SIGNING_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_HMAC_SECRET fehlt oder ist zu kurz.");
  return value;
}

function hmac(value, purpose = "session") {
  return crypto.createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function issueSession() {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = hmac(`${nonce}.${issuedAt}`, "cookie");
  return {
    token: `${nonce}.${issuedAt}.${signature}`,
    issuedAt,
    sessionHash: hmac(nonce, "database-session"),
  };
}

function parseCookies(event) {
  const raw = String(event.headers?.cookie || event.headers?.Cookie || "");
  return Object.fromEntries(
    raw.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf("=");
      return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    })
  );
}

function readSession(event) {
  const token = parseCookies(event)[COOKIE_NAME];
  const [nonce, issuedRaw, supplied] = String(token || "").split(".");
  const issuedAt = Number(issuedRaw);
  if (!nonce || !Number.isInteger(issuedAt) || !supplied) return null;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < -60 || age > MAX_AGE_SECONDS) return null;
  const expected = hmac(`${nonce}.${issuedAt}`, "cookie");
  if (!safeEqual(supplied, expected)) return null;
  return { issuedAt, ageSeconds: age, sessionHash: hmac(nonce, "database-session") };
}

function setCookieHeader(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${isProduction() ? "; Secure" : ""}`;
}

module.exports = { COOKIE_NAME, MAX_AGE_SECONDS, issueSession, readSession, setCookieHeader };

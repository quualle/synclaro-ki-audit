"use strict";

const { hasAllowedOrigin, isProduction, jsonResponse } = require("./security");
const { adaptiveAIConfigured } = require("./openrouter");
const { issueSession, readSession, setCookieHeader } = require("./session");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Cache-Control": "no-store" } };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return jsonResponse(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 1024) return jsonResponse(413, { error: "Anfrage zu groß." });
  if (!isProduction() && !adaptiveAIConfigured()) return jsonResponse(200, { ready: true, preview: true, issuedAt: new Date().toISOString() });
  try {
    const payload = JSON.parse(event.body || "{}");
    const existing = payload.fresh === true ? null : readSession(event);
    if (existing) {
      return jsonResponse(200, { ready: true, reused: true, issuedAt: new Date(existing.issuedAt * 1000).toISOString() });
    }
    const session = issueSession();
    return jsonResponse(
      200,
      { ready: true, preview: !isProduction(), issuedAt: new Date(session.issuedAt * 1000).toISOString() },
      { "Set-Cookie": setCookieHeader(session.token) }
    );
  } catch (error) {
    console.error("[start-session] configuration error", error?.name || "unknown");
    return jsonResponse(503, { error: "Der Test kann gerade nicht sicher gestartet werden." });
  }
};

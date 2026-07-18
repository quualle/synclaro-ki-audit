"use strict";

const { cleanText, getPhase } = require("./_shared/assessment");
const { hasAllowedOrigin } = require("./_shared/security");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function response(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function sanitizeProfile(profile) {
  return {
    branche: cleanText(profile?.branche, 80),
    mitarbeiter: cleanText(profile?.mitarbeiter, 20),
    rolle: cleanText(profile?.rolle, 50),
    hauptziel: cleanText(profile?.hauptziel, 50),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return response(405, { error: "Methode nicht erlaubt." });
  if (!hasAllowedOrigin(event)) return response(403, { error: "Ursprung nicht erlaubt." });
  if (Buffer.byteLength(event.body || "", "utf8") > 32768) return response(413, { error: "Anfrage zu groß." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const stepNumber = Number(payload.stepNumber || 1);
    if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > 3) {
      return response(400, { error: "Ungültige Phase." });
    }

    const profile = sanitizeProfile(payload.companyProfile || {});
    if (!profile.branche || !profile.mitarbeiter || !profile.rolle) {
      return response(400, { error: "Unternehmensprofil unvollständig." });
    }

    return response(200, getPhase(stepNumber, payload.previousAnswers || [], profile));
  } catch (error) {
    console.error("[generate-questions] invalid request", error?.message || "unknown");
    return response(400, { error: "Anfrage konnte nicht verarbeitet werden." });
  }
};

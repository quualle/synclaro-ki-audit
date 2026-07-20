"use strict";

const { getSupabaseAdmin } = require("./_shared/supabase");
const {
  isProduction,
  signBookingReference,
  signNewsletterUnsubscribeToken,
  verifyNewsletterToken,
} = require("./_shared/security");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirect(location) {
  return {
    statusCode: 303,
    headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
    body: "",
  };
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function requestFields(event) {
  if (event.httpMethod === "GET") return event.queryStringParameters || {};
  const raw = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(raw, "utf8") > 4096) return {};
  const contentType = String(event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function confirmationPage({ assessmentId, submissionId, token }) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
    body: `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>KI-Impulse bestätigen · Synclaro</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#f7f5f1;background:#0b0b0c;font:16px/1.55 Arial,sans-serif}.card{width:min(100%,680px);padding:clamp(28px,7vw,58px);border:1px solid #3b3a3d;border-left:4px solid #ff4f00;border-radius:18px;background:#161619;box-shadow:0 28px 90px #0008}.kicker{margin:0 0 18px;color:#ff6a24;font-size:12px;font-weight:800;letter-spacing:.12em}.card h1{margin:0;font-size:clamp(32px,7vw,52px);line-height:1.04;letter-spacing:-.035em}.card p{margin:20px 0 0;color:#c6c3bc}.button{width:100%;min-height:58px;margin-top:30px;border:0;border-radius:10px;color:#0b0b0c;background:#ff4f00;font:800 16px/1 Arial,sans-serif;cursor:pointer}.note{font-size:13px}</style></head>
<body><main class="card"><p class="kicker">SYNCLARO · PROFESSIONAL AI EDUCATION</p><h1>KI-Impulse wirklich aktivieren?</h1><p>Bestätigen Sie jetzt bewusst Ihre freiwillige Anmeldung. Erst nach diesem Klick wird Ihre E-Mail-Adresse für die Synclaro KI-Impulse freigeschaltet.</p>
<form method="post" action="/.netlify/functions/confirm-newsletter"><input type="hidden" name="assessment" value="${escapeHtml(assessmentId)}"><input type="hidden" name="submission" value="${escapeHtml(submissionId)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button class="button" type="submit">E-Mail-Adresse jetzt bestätigen</button></form>
<p class="note">Wenn Sie sich nicht angemeldet haben, schließen Sie diese Seite einfach. Es wird nichts aktiviert.</p></main></body></html>`,
  };
}

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return { statusCode: 405, headers: { Allow: "GET, POST", "Cache-Control": "no-store" }, body: "" };
  const fields = requestFields(event);
  const assessmentId = String(fields.assessment || "");
  const submissionId = String(fields.submission || "");
  const token = String(fields.token || "");
  if (!UUID_RE.test(assessmentId) || !UUID_RE.test(submissionId) || !verifyNewsletterToken(token, assessmentId, submissionId)) {
    return redirect("/newsletter-link-ungueltig.html");
  }
  if (event.httpMethod === "GET") return confirmationPage({ assessmentId, submissionId, token });
  if (!isProduction()) return redirect("/newsletter-preview.html");
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("confirm_ai_readiness_newsletter_v1", {
      p_assessment_id: assessmentId,
      p_submission_id: submissionId,
      p_booking_reference: signBookingReference(assessmentId, submissionId),
      p_unsubscribe_token: signNewsletterUnsubscribeToken(assessmentId, submissionId),
    });
    const result = Array.isArray(data) ? data[0] : data;
    return redirect(!error && result?.accepted === true ? "/newsletter-bestaetigt.html" : "/newsletter-link-ungueltig.html");
  } catch {
    return redirect("/newsletter-link-ungueltig.html");
  }
};

module.exports._test = { confirmationPage, redirect, requestFields };

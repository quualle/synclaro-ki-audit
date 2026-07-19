"use strict";

const { getSupabaseAdmin } = require("./_shared/supabase");
const { isProduction, verifyNewsletterUnsubscribeToken } = require("./_shared/security");

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
  const query = event.queryStringParameters || {};
  if (event.httpMethod === "GET") return query;
  const raw = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(raw, "utf8") > 4096) return query;
  const contentType = String(event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  let body = {};
  if (contentType.includes("application/json")) {
    try { body = JSON.parse(raw); } catch { body = {}; }
  } else {
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  return { ...query, ...body };
}

function isOneClickPost(event) {
  if (event.httpMethod !== "POST") return false;
  const contentType = String(event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  const raw = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(raw, "utf8") > 4096) return false;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(raw).get("List-Unsubscribe") === "One-Click";
  }
  if (contentType.includes("multipart/form-data")) {
    return /content-disposition:\s*form-data;\s*name="List-Unsubscribe"[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\nOne-Click(?:\r?\n|$)/i.test(raw);
  }
  return false;
}

function oneClickResponse(statusCode) {
  return {
    statusCode,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
    body: "",
  };
}

function unsubscribePage({ assessmentId, submissionId, token }) {
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
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>KI-Impulse abmelden · Synclaro</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#f7f5f1;background:#0b0b0c;font:16px/1.55 Arial,sans-serif}.card{width:min(100%,680px);padding:clamp(28px,7vw,58px);border:1px solid #3b3a3d;border-left:4px solid #ff4f00;border-radius:18px;background:#161619;box-shadow:0 28px 90px #0008}.kicker{margin:0 0 18px;color:#ff6a24;font-size:12px;font-weight:800;letter-spacing:.12em}.card h1{margin:0;font-size:clamp(32px,7vw,52px);line-height:1.04;letter-spacing:-.035em}.card p{margin:20px 0 0;color:#c6c3bc}.button{width:100%;min-height:58px;margin-top:30px;border:0;border-radius:10px;color:#0b0b0c;background:#ff4f00;font:800 16px/1 Arial,sans-serif;cursor:pointer}.note{font-size:13px}</style></head>
<body><main class="card"><p class="kicker">SYNCLARO · PROFESSIONAL AI EDUCATION</p><h1>KI-Impulse abmelden?</h1><p>Bestätigen Sie die Abmeldung bewusst. Danach erhalten Sie über diese Einwilligung keine weiteren Synclaro KI-Impulse, Einladungen oder Angebote per E-Mail.</p>
<form method="post" action="/.netlify/functions/unsubscribe-newsletter"><input type="hidden" name="assessment" value="${escapeHtml(assessmentId)}"><input type="hidden" name="submission" value="${escapeHtml(submissionId)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button class="button" type="submit">Jetzt abmelden</button></form>
<p class="note">Wenn Sie angemeldet bleiben möchten, schließen Sie diese Seite einfach. Ein Aufruf der Seite allein verändert nichts.</p></main></body></html>`,
  };
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return { statusCode: 405, headers: { Allow: "GET, POST", "Cache-Control": "no-store" }, body: "" };
  const oneClick = isOneClickPost(event);
  const fields = requestFields(event);
  const assessmentId = String(fields.assessment || "");
  const submissionId = String(fields.submission || "");
  const token = String(fields.token || "");
  if (!UUID_RE.test(assessmentId) || !UUID_RE.test(submissionId)
    || !verifyNewsletterUnsubscribeToken(token, assessmentId, submissionId)) {
    return oneClick && isProduction() ? oneClickResponse(400) : redirect("/newsletter-abmeldung-fehlgeschlagen.html");
  }
  if (event.httpMethod === "GET") return unsubscribePage({ assessmentId, submissionId, token });
  if (!isProduction()) return redirect("/newsletter-abmeldung-preview.html");
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("revoke_ai_readiness_newsletter_v1", {
      p_assessment_id: assessmentId,
      p_submission_id: submissionId,
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (oneClick) return oneClickResponse(!error && result?.accepted === true ? 200 : 503);
    return redirect(!error && result?.accepted === true ? "/newsletter-abgemeldet.html" : "/newsletter-abmeldung-fehlgeschlagen.html");
  } catch {
    return oneClick ? oneClickResponse(503) : redirect("/newsletter-abmeldung-fehlgeschlagen.html");
  }
};

module.exports._test = { isOneClickPost, oneClickResponse, requestFields, unsubscribePage };

"use strict";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function crmContactUrl(contactId) {
  const crmBaseUrl = String(process.env.CRM_BASE_URL || "https://crm.synclaro.de").replace(/\/$/, "");
  return `${crmBaseUrl}/crm/contacts/${encodeURIComponent(contactId)}`;
}

function crmContactsUrl() {
  const crmBaseUrl = String(process.env.CRM_BASE_URL || "https://crm.synclaro.de").replace(/\/$/, "");
  return `${crmBaseUrl}/crm/contacts`;
}

function campaignLabel(attribution = {}) {
  const campaign = String(attribution.utm_campaign || "").trim().toLowerCase();
  if (campaign === "ai_readiness_de_prospecting_v1" || campaign === "meta_ai_readiness_de_prospecting_v1") {
    return "Meta · AI Readiness DE · Prospecting v1";
  }
  return String(attribution.utm_source || "").toLowerCase() === "meta" ? "Meta · sonstige Kampagne" : "direkt / sonstige Quelle";
}

async function sendLeadNotification({ contactId, assessmentId, baseline, attribution = {} }) {
  if (!process.env.RESEND_API_KEY || !process.env.LEADS_NOTIFICATION_EMAIL || !process.env.LEADS_FROM_EMAIL) {
    return { sent: false, skipped: "not_configured" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const crmUrl = crmContactUrl(contactId);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `ai-readiness-lead-${assessmentId}`,
      },
      body: JSON.stringify({
        from: process.env.LEADS_FROM_EMAIL,
        to: [process.env.LEADS_NOTIFICATION_EMAIL],
        subject: `Neuer KI-Readiness-Lead · ${baseline.scores.total.percent}/100`,
        html: `<h1>Neuer KI-Readiness-Lead</h1>
        <p>Score: <strong>${baseline.scores.total.percent}/100 · ${escapeHtml(baseline.level)}</strong><br>
        <p>Kampagne: ${escapeHtml(campaignLabel(attribution))}<br>
        Assessment-ID: ${escapeHtml(assessmentId)}</p>
        <p><a href="${escapeHtml(crmUrl)}">Lead im geschützten CRM öffnen</a></p>
        <p>Kontaktdaten werden aus Datenschutzgründen nicht in diese Benachrichtigung kopiert.</p>
        <p>Die Person hat den einmaligen Rückruf und ein E-Mail-Nachfassen ausdrücklich angefordert. Kein Newsletter-Opt-in.</p>`,
      }),
      signal: controller.signal,
    });
    return response.ok ? { sent: true } : { sent: false, errorCode: "resend_error" };
  } catch (error) {
    return { sent: false, errorCode: error?.name === "AbortError" ? "timeout" : "resend_network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function markDelivery(supabase, outboxId, leaseToken, outcome) {
  const { error } = await supabase.rpc("complete_ai_readiness_delivery_v1", {
    p_outbox_id: outboxId,
    p_lease_token: leaseToken,
    p_success: outcome.sent === true,
    p_error_code: outcome.errorCode || outcome.skipped || null,
  });
  if (error) throw new Error(`delivery_status_${error.code || "unknown"}`);
}

async function sendTelegramLeadNotification({ baseline, attribution = {} }) {
  if (process.env.TELEGRAM_TRANSFER_APPROVED !== "true") return { sent: false, skipped: "not_approved" };
  const token = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LEAD_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, skipped: "not_configured" };
  const crmUrl = crmContactsUrl();
  const campaign = escapeHtml(campaignLabel(attribution));
  const text = `🔔 <b>Neuer AI-Readiness-Lead</b>\n\nScore: <b>${baseline.scores.total.percent}/100</b> · ${escapeHtml(baseline.level)}\nKampagne: ${campaign}\n\nKontaktdaten und interne IDs bleiben im geschützten CRM.`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "Lead im CRM öffnen", url: crmUrl }]] },
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) return { sent: false, errorCode: "telegram_error" };
    return { sent: true };
  } catch (error) {
    return { sent: false, errorCode: error?.name === "AbortError" ? "timeout" : "telegram_network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { campaignLabel, crmContactsUrl, markDelivery, sendLeadNotification, sendTelegramLeadNotification };

"use strict";

const { verifyBookingReference } = require("./security");

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
        <p>Diese Meldung dokumentiert nur den abgeschlossenen Test. Es wurde kein Rückruf angefordert.</p>`,
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
  const { error } = await supabase.rpc("complete_ai_readiness_delivery_v2", {
    p_outbox_id: outboxId,
    p_lease_token: leaseToken,
    p_success: outcome.sent === true,
    p_error_code: outcome.errorCode || outcome.skipped || null,
  });
  if (error) throw new Error(`delivery_status_${error.code || "unknown"}`);
}

async function sendTelegramLeadNotification({ deliveryContext = {} }) {
  if (process.env.TELEGRAM_TRANSFER_APPROVED !== "true") return { sent: false, skipped: "not_approved" };
  const token = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LEAD_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, skipped: "not_configured" };
  const crmUrl = crmContactsUrl();
  const newsletterStatus = deliveryContext.newsletterStatus === "already_active"
    ? "bereits aktiv"
    : "Double-Opt-in ausstehend";
  const text = `🔔 <b>Neuer AI-Readiness-Lead</b>\n\nNewsletter: <b>${newsletterStatus}</b>\n\nKontaktdaten liegen ausschließlich im geschützten CRM.`;
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

async function sendTelegramBookingNotification() {
  if (process.env.TELEGRAM_TRANSFER_APPROVED !== "true") return { sent: false, skipped: "not_approved" };
  const token = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.LEAD_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, skipped: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "📅 <b>Neue KI-Potenzialanalyse gebucht</b>\n\nDie Buchung wurde dem Readiness-Funnel zugeordnet. Kontaktdaten und Termindetails bleiben in den geschützten Systemen.",
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "CRM öffnen", url: crmContactsUrl() }]] },
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result.ok === true ? { sent: true } : { sent: false, errorCode: "telegram_error" };
  } catch (error) {
    return { sent: false, errorCode: error?.name === "AbortError" ? "timeout" : "telegram_network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendNewsletterConfirmation({ assessmentId, submissionId, contact, deliveryContext = {} }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.LEADS_FROM_EMAIL;
  const token = String(deliveryContext.confirmationToken || "");
  if (!apiKey || !from) return { sent: false, skipped: "not_configured" };
  if (!contact?.email || !token || !assessmentId || !submissionId) return { sent: false, errorCode: "confirmation_payload_invalid" };
  const url = new URL("https://ki-check.synclaro.de/.netlify/functions/confirm-newsletter");
  url.searchParams.set("assessment", assessmentId);
  url.searchParams.set("submission", submissionId);
  url.searchParams.set("token", token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `ai-readiness-newsletter-${assessmentId}`,
      },
      body: JSON.stringify({
        from,
        to: [contact.email],
        subject: "Bitte bestätigen Sie Ihre Synclaro KI-Impulse",
        html: `<h1>Fast geschafft</h1>
          <p>Öffnen Sie die sichere Bestätigungsseite und aktivieren Sie dort mit einem bewussten Klick die freiwilligen Synclaro KI-Impulse per E-Mail.</p>
          <p><a href="${escapeHtml(url.toString())}">Sichere Bestätigungsseite öffnen</a></p>
          <p>Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese Nachricht. Ohne Bestätigung werden Sie nicht in die Readiness-Newsletter-Liste aufgenommen.</p>`,
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

function newsletterUnsubscribeUrl(assessmentId, submissionId, token) {
  const url = new URL("https://ki-check.synclaro.de/.netlify/functions/unsubscribe-newsletter");
  url.searchParams.set("assessment", assessmentId);
  url.searchParams.set("submission", submissionId);
  url.searchParams.set("token", token);
  return url;
}

function newsletterBookingUrl(bookingReference) {
  const url = new URL("https://cal.com/marcoheer/ki-erstgespraech");
  url.searchParams.set("utm_source", "newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "ai_readiness_nurture_v1");
  url.searchParams.set("utm_content", "welcome");
  url.searchParams.set("readiness_ref", bookingReference);
  return url;
}

async function sendNewsletterWelcome({ assessmentId, submissionId, contact, deliveryContext = {} }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.LEADS_FROM_EMAIL;
  const token = String(deliveryContext.unsubscribeToken || "");
  const bookingReference = String(deliveryContext.bookingReference || "");
  if (!apiKey || !from) return { sent: false, skipped: "not_configured" };
  const verifiedBooking = verifyBookingReference(bookingReference);
  if (!contact?.email || !token || !assessmentId || !submissionId
    || verifiedBooking?.assessmentId !== assessmentId || verifiedBooking?.submissionId !== submissionId) {
    return { sent: false, errorCode: "welcome_payload_invalid" };
  }
  const unsubscribeUrl = newsletterUnsubscribeUrl(assessmentId, submissionId, token);
  const unsubscribeHref = escapeHtml(unsubscribeUrl.toString());
  const bookingHref = escapeHtml(newsletterBookingUrl(bookingReference).toString());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `ai-readiness-welcome-${assessmentId}`,
      },
      body: JSON.stringify({
        from,
        to: [contact.email],
        subject: "Vom Readiness-Test zur Umsetzung: drei nächste Schritte",
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl.toString()}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `<h1>Aus Ihrem Score wird erst durch Umsetzung ein Vorteil.</h1>
          <p>Danke für Ihre bestätigte Anmeldung zu den Synclaro KI-Impulsen. Für einen belastbaren Start brauchen Sie keine lange Tool-Liste, sondern eine klare Reihenfolge:</p>
          <ol>
            <li><strong>Einen wiederkehrenden Prozess auswählen</strong>, der heute messbar Zeit oder Qualität kostet.</li>
            <li><strong>Daten, Zuständigkeit und Leitplanken klären</strong>, bevor ein KI-Werkzeug eingeführt wird.</li>
            <li><strong>Ein Erfolgskriterium für 30 Tage festlegen</strong>, zum Beispiel Bearbeitungszeit, Fehlerquote oder Durchlaufzeit.</li>
          </ol>
          <p>Wenn Sie Ihren größten Hebel gemeinsam priorisieren möchten, können Sie eine kostenlose KI-Potenzialanalyse mit Marco buchen:</p>
          <p><a href="${bookingHref}">Kostenlose Potenzialanalyse buchen</a></p>
          <hr><p style="font-size:13px;color:#666">Sie erhalten diese E-Mail, weil Sie die Synclaro KI-Impulse im AI Readiness Test per Double-Opt-in bestätigt haben. <a href="${unsubscribeHref}">KI-Impulse abmelden</a>.</p>`,
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

module.exports = {
  campaignLabel,
  crmContactsUrl,
  markDelivery,
  newsletterBookingUrl,
  newsletterUnsubscribeUrl,
  sendLeadNotification,
  sendNewsletterConfirmation,
  sendNewsletterWelcome,
  sendTelegramBookingNotification,
  sendTelegramLeadNotification,
};

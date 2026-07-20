"use strict";

const {
  markDelivery,
  sendLeadNotification,
  sendNewsletterConfirmation,
  sendNewsletterWelcome,
  sendTelegramBookingNotification,
  sendTelegramLeadNotification,
} = require("./_shared/deliveries");
const { sendMetaEvent, sendMetaLead } = require("./_shared/meta");
const { isProduction } = require("./_shared/security");
const { getSupabaseAdmin } = require("./_shared/supabase");

function deliveryInput(row) {
  return {
    assessmentId: row.assessment_id,
    submissionId: row.submission_id,
    contactId: row.contact_id,
    contact: {
      firstName: row.first_name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
    },
    profile: {
      branche: row.industry,
      mitarbeiter: row.employee_band,
      rolle: row.respondent_role,
    },
    baseline: {
      scores: { total: { percent: row.score_total } },
      level: row.readiness_level,
    },
    attribution: row.attribution || {},
    deliveryContext: row.delivery_payload || {},
  };
}

async function processDelivery(supabase, row) {
  const input = deliveryInput(row);
  let outcome;
  const { data: authorization, error: authorizationError } = await supabase.rpc("authorize_ai_readiness_delivery_v2", {
    p_outbox_id: row.outbox_id,
    p_lease_token: row.lease_token,
  });
  if (authorizationError) throw new Error(`delivery_authorization_${authorizationError.code || "unknown"}`);
  const decision = Array.isArray(authorization) ? authorization[0] : authorization;
  const leaseValid = decision?.lease_valid ?? decision?.leaseValid;
  if (leaseValid !== true) return true;
  if (decision?.authorized !== true) {
    outcome = { sent: false, skipped: "consent_revoked" };
  } else if (row.delivery_type === "internal_notification") {
    outcome = await sendLeadNotification(input);
  } else if (row.delivery_type === "telegram_notification") {
    outcome = await sendTelegramLeadNotification(input);
  } else if (row.delivery_type === "telegram_booking") {
    outcome = await sendTelegramBookingNotification(input);
  } else if (row.delivery_type === "newsletter_double_optin") {
    outcome = await sendNewsletterConfirmation(input);
  } else if (row.delivery_type === "newsletter_welcome") {
    outcome = await sendNewsletterWelcome(input);
  } else if (row.delivery_type === "meta_capi") {
      outcome = await sendMetaLead({
        contact: input.contact,
        attribution: input.attribution,
        deliveryContext: input.deliveryContext,
        eventSourceUrl: "https://ki-check.synclaro.de/",
        eventTime: Math.floor(new Date(row.submitted_at).getTime() / 1000),
      });
  } else if (row.delivery_type === "meta_schedule") {
    outcome = await sendMetaEvent({
      eventName: "Schedule",
      contact: input.contact,
      attribution: { ...input.attribution, eventId: input.deliveryContext.eventId },
      deliveryContext: input.deliveryContext,
      eventSourceUrl: "https://ki-check.synclaro.de/",
      eventTime: Number(input.deliveryContext.eventTime),
    });
  } else {
    outcome = { sent: false, errorCode: "invalid_delivery_type" };
  }
  await markDelivery(supabase, row.outbox_id, row.lease_token, outcome);
  return outcome.sent === true || outcome.skipped === "consent_revoked";
}

exports.handler = async () => {
  if (!isProduction()) return { statusCode: 204, body: "" };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("claim_ai_readiness_deliveries_v2", { p_limit: 4 });
  if (error) throw new Error(`outbox_claim_${error.code || "unknown"}`);
  const rows = Array.isArray(data) ? data : [];
  const settled = await Promise.allSettled(rows.map((row) => processDelivery(supabase, row)));
  const rejected = settled.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
  if (settled.some((result) => result.status === "fulfilled" && result.value !== true)) {
    throw new Error("outbox_delivery_incomplete");
  }
  return { statusCode: 204, body: "" };
};

module.exports._test = { deliveryInput, processDelivery };

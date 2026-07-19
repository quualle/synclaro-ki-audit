"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const deliveries = require("../netlify/functions/_shared/deliveries");
const meta = require("../netlify/functions/_shared/meta");
const security = require("../netlify/functions/_shared/security");
const assessment = require("../netlify/functions/_shared/assessment");
const consents = require("../netlify/functions/_shared/consents");

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function signedCalEvent(secret, envelope) {
  const body = JSON.stringify(envelope);
  return {
    httpMethod: "POST",
    headers: {
      "x-cal-signature-256": crypto.createHmac("sha256", secret).update(body).digest("hex"),
      "x-cal-webhook-version": "2021-10-20",
    },
    body,
  };
}

test("Booking-Referenzen sind signiert, gebunden und zeitlich begrenzt", () => {
  const previousSecret = process.env.LEAD_SIGNING_SECRET;
  const originalNow = Date.now;
  process.env.LEAD_SIGNING_SECRET = "booking-test-secret-".padEnd(64, "x");
  Date.now = () => 2_000_000_000_000;
  try {
    const assessmentId = "11111111-1111-4111-8111-111111111111";
    const submissionId = "22222222-2222-4222-8222-222222222222";
    const reference = security.signBookingReference(assessmentId, submissionId, 120);
    assert.deepEqual(security.verifyBookingReference(reference), {
      assessmentId,
      submissionId,
      expiresAt: 2_000_000_120,
    });

    const [payload, signature] = reference.split(".");
    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith("a") ? "b" : "a"}`;
    assert.equal(security.verifyBookingReference(`${tamperedPayload}.${signature}`), null);
    assert.equal(security.verifyBookingReference(`${payload}.${signature.slice(0, -1)}x`), null);

    const expired = security.signBookingReference(assessmentId, submissionId, -1);
    assert.equal(security.verifyBookingReference(expired), null);
  } finally {
    Date.now = originalNow;
    restoreEnv("LEAD_SIGNING_SECRET", previousSecret);
  }
});

test("ein idempotenter Lead-Retry bindet den Kalender-Verweis an das bereits gespeicherte Assessment", async () => {
  const envNames = ["CONTEXT", "LEAD_SIGNING_SECRET", "LEAD_RATE_LIMIT_SECRET", "LEAD_IP_HASH_SALT"];
  const previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const supabasePath = require.resolve("../netlify/functions/_shared/supabase");
  const sessionPath = require.resolve("../netlify/functions/_shared/session");
  const submitPath = require.resolve("../netlify/functions/submit-lead");
  const supabaseModule = require(supabasePath);
  const sessionModule = require(sessionPath);
  const originalGetSupabaseAdmin = supabaseModule.getSupabaseAdmin;
  const originalReadSession = sessionModule.readSession;
  const storedAssessmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const submissionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const runId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const trackingSubjectId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const storedResult = {
    scores: { total: { percent: 73 } },
    level: "KI-Umsetzungsbereit",
    gesamteinschaetzung: "Bereits persistierte SSOT-Auswertung",
  };

  process.env.CONTEXT = "production";
  process.env.LEAD_SIGNING_SECRET = "lead-signing-test-secret-".padEnd(64, "x");
  process.env.LEAD_RATE_LIMIT_SECRET = "lead-rate-test-secret-".padEnd(64, "x");
  process.env.LEAD_IP_HASH_SALT = "lead-ip-test-secret-".padEnd(64, "x");
  sessionModule.readSession = () => ({ ageSeconds: 30, sessionHash: "e".repeat(64) });
  const calls = [];
  supabaseModule.getSupabaseAdmin = () => ({
    rpc: async (name) => {
      calls.push(name);
      if (name !== "restore_ai_readiness_lead_v1") throw new Error(`unexpected_rpc_${name}`);
      return { data: [{ found: true, accepted: true, status: "idempotent", assessment_id: storedAssessmentId, meta_lead_eligible: true, result: storedResult }], error: null };
    },
  });
  delete require.cache[submitPath];
  const submit = require(submitPath);

  try {
    const answers = assessment.PHASES.flatMap((phase) => phase.questions)
      .filter((question) => question.dimension)
      .map((question) => ({ questionId: question.id, answer: "2" }));
    const response = await submit.handler({
      httpMethod: "POST",
      headers: {
        host: "ki-check.synclaro.de",
        origin: "https://ki-check.synclaro.de",
        "user-agent": "Regression Test",
        "x-nf-client-connection-ip": "203.0.113.10",
      },
      body: JSON.stringify({
        submissionId,
        runId,
        trackingSubjectId,
        trackingPreviousDecisionId: "",
        companyProfile: { branche: "Beratung", mitarbeiter: "solo", rolle: "inhaber", hauptziel: "zeit" },
        answers,
        contact: { firstName: "Ada", lastName: "Lovelace", company: "Analytical", email: "ada@example.com" },
        consents: {
          privacyNotice: { acknowledged: true, version: consents.PRIVACY_VERSION },
          newsletter: { granted: false, version: consents.NEWSLETTER_CONSENT_VERSION, text: consents.NEWSLETTER_CONSENT_TEXT },
          analytics: { granted: false, version: consents.COOKIE_CONSENT_VERSION },
          marketing: { granted: false, version: consents.COOKIE_CONSENT_VERSION },
        },
        attribution: {},
      }),
    });
    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.assessmentId, storedAssessmentId);
    assert.deepEqual(body.result, storedResult);
    assert.deepEqual(body.baseline, storedResult);
    assert.equal(body.metaLeadEligible, true);
    assert.deepEqual(calls, ["restore_ai_readiness_lead_v1"]);
    assert.deepEqual(security.verifyBookingReference(body.bookingReference), {
      assessmentId: storedAssessmentId,
      submissionId,
      expiresAt: security.verifyBookingReference(body.bookingReference).expiresAt,
    });
  } finally {
    supabaseModule.getSupabaseAdmin = originalGetSupabaseAdmin;
    sessionModule.readSession = originalReadSession;
    delete require.cache[submitPath];
    for (const name of envNames) restoreEnv(name, previousEnv[name]);
  }
});

test("Newsletter-DOI mutiert niemals per GET und bestätigt erst nach explizitem POST", async () => {
  const previousSecret = process.env.LEAD_SIGNING_SECRET;
  const supabasePath = require.resolve("../netlify/functions/_shared/supabase");
  const confirmPath = require.resolve("../netlify/functions/confirm-newsletter");
  const supabaseModule = require(supabasePath);
  const originalGetSupabaseAdmin = supabaseModule.getSupabaseAdmin;
  const calls = [];
  process.env.LEAD_SIGNING_SECRET = "doi-post-test-secret-".padEnd(64, "x");
  supabaseModule.getSupabaseAdmin = () => ({
    rpc: async (name, params) => {
      calls.push({ name, params });
      return { data: [{ accepted: true, status: "confirmed" }], error: null };
    },
  });
  delete require.cache[confirmPath];
  const confirm = require(confirmPath);

  try {
    const assessmentId = "11111111-1111-4111-8111-111111111111";
    const submissionId = "22222222-2222-4222-8222-222222222222";
    const token = security.signNewsletterToken(assessmentId, submissionId);
    const queryStringParameters = { assessment: assessmentId, submission: submissionId, token };
    const getResponse = await confirm.handler({ httpMethod: "GET", queryStringParameters });
    assert.equal(getResponse.statusCode, 200);
    assert.match(getResponse.body, /method="post"/);
    assert.match(getResponse.body, /E-Mail-Adresse jetzt bestätigen/);
    assert.equal(calls.length, 0);

    const postResponse = await confirm.handler({
      httpMethod: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(queryStringParameters).toString(),
    });
    assert.equal(postResponse.statusCode, 303);
    assert.equal(postResponse.headers.Location, "/newsletter-bestaetigt.html");
    assert.deepEqual(calls, [{
      name: "confirm_ai_readiness_newsletter_v1",
      params: { p_assessment_id: assessmentId, p_submission_id: submissionId },
    }]);
  } finally {
    supabaseModule.getSupabaseAdmin = originalGetSupabaseAdmin;
    delete require.cache[confirmPath];
    restoreEnv("LEAD_SIGNING_SECRET", previousSecret);
  }
});

test("Cal-Webhooks prüfen Signatur und extrahieren nur kurze Readiness-Referenzen", () => {
  const cal = require("../netlify/functions/cal-readiness-webhook")._test;
  const secret = "cal-webhook-test-secret-".padEnd(64, "x");
  const body = Buffer.from("{\"test\":true}");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(cal.validSignature(body, signature, secret), true);
  assert.equal(cal.validSignature(Buffer.from("{\"test\":false}"), signature, secret), false);
  assert.equal(cal.validSignature(body, signature, "zu-kurz"), false);
  assert.equal(cal.bookingReferenceFromPayload({ responses: { readiness_ref: { value: "signed-ref" } } }), "signed-ref");
  assert.equal(cal.bookingReferenceFromPayload({ customInputs: { readiness_ref: "custom-ref" } }), "custom-ref");
  assert.equal(cal.bookingReferenceFromPayload({ responses: { readiness_ref: { value: "x".repeat(801) } } }), "");
});

test("Cal-Readiness-Webhook ist allowlist-gebunden und verbucht Wiederholungen über denselben RPC-Vertrag", async () => {
  const envNames = [
    "LEAD_SIGNING_SECRET",
    "CAL_READINESS_WEBHOOK_SECRET",
    "CAL_READINESS_EVENT_TYPE_ID",
    "CAL_READINESS_EVENT_TYPE_SLUG",
    "CAL_READINESS_ORGANIZER_EMAIL",
  ];
  const previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const supabasePath = require.resolve("../netlify/functions/_shared/supabase");
  const calPath = require.resolve("../netlify/functions/cal-readiness-webhook");
  const supabaseModule = require(supabasePath);
  const originalGetSupabaseAdmin = supabaseModule.getSupabaseAdmin;
  const calls = [];
  process.env.LEAD_SIGNING_SECRET = "booking-test-secret-".padEnd(64, "x");
  process.env.CAL_READINESS_WEBHOOK_SECRET = "cal-webhook-test-secret-".padEnd(64, "x");
  process.env.CAL_READINESS_EVENT_TYPE_ID = "12345";
  process.env.CAL_READINESS_EVENT_TYPE_SLUG = "ki-erstgespraech";
  process.env.CAL_READINESS_ORGANIZER_EMAIL = "marcoheer@synclaro.de";

  supabaseModule.getSupabaseAdmin = () => ({
    rpc: async (name, params) => {
      calls.push({ name, params });
      return {
        data: [{ accepted: true, status: calls.length === 1 ? "created" : "duplicate" }],
        error: null,
      };
    },
  });
  delete require.cache[calPath];
  const cal = require(calPath);

  try {
    const assessmentId = "11111111-1111-4111-8111-111111111111";
    const submissionId = "22222222-2222-4222-8222-222222222222";
    const reference = security.signBookingReference(assessmentId, submissionId);
    const createdAt = new Date().toISOString();
    const basePayload = {
      eventTypeId: 12345,
      type: "ki-erstgespraech",
      organizer: { email: "MarcoHeer@Synclaro.de" },
      bookingUid: "cal-booking-uid-123",
      responses: { readiness_ref: { value: reference } },
    };

    const wrongEvent = signedCalEvent(process.env.CAL_READINESS_WEBHOOK_SECRET, {
      triggerEvent: "BOOKING_CREATED",
      createdAt,
      payload: { ...basePayload, eventTypeId: 99999 },
    });
    const ignored = await cal.handler(wrongEvent);
    assert.equal(ignored.statusCode, 202);
    assert.deepEqual(JSON.parse(ignored.body), { accepted: false, ignored: true });
    assert.equal(calls.length, 0);

    const event = signedCalEvent(process.env.CAL_READINESS_WEBHOOK_SECRET, {
      triggerEvent: "BOOKING_CREATED",
      createdAt,
      payload: basePayload,
    });
    const first = await cal.handler(event);
    const replay = await cal.handler(event);
    assert.equal(first.statusCode, 200);
    assert.deepEqual(JSON.parse(first.body), { accepted: true, status: "created" });
    assert.deepEqual(JSON.parse(replay.body), { accepted: true, status: "duplicate" });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], calls[1]);
    assert.equal(calls[0].name, "record_ai_readiness_booking_v1");
    assert.deepEqual(calls[0].params, {
      p_booking_uid: "cal-booking-uid-123",
      p_assessment_id: assessmentId,
      p_submission_id: submissionId,
      p_event_type_id: 12345,
      p_event_type_slug: "ki-erstgespraech",
      p_body_hash: security.sha256(Buffer.from(event.body)),
      p_booking_created_at: createdAt,
    });
  } finally {
    supabaseModule.getSupabaseAdmin = originalGetSupabaseAdmin;
    delete require.cache[calPath];
    for (const name of envNames) restoreEnv(name, previousEnv[name]);
  }
});

test("Newsletter-DOI-Mail geht nur an den Lead und enthält den gebundenen Bestätigungslink", async () => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousNewsletterFrom = process.env.NEWSLETTER_FROM_EMAIL;
  const previousLeadsFrom = process.env.LEADS_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-key";
  process.env.NEWSLETTER_FROM_EMAIL = "Synclaro <impulse@example.com>";
  process.env.LEADS_FROM_EMAIL = "Synclaro <leads@example.com>";
  let request;
  global.fetch = async (url, options) => {
    request = { url, headers: options.headers, body: JSON.parse(options.body) };
    return { ok: true };
  };
  try {
    const outcome = await deliveries.sendNewsletterConfirmation({
      assessmentId: "11111111-1111-4111-8111-111111111111",
      submissionId: "22222222-2222-4222-8222-222222222222",
      contact: { email: "ada@example.com", phone: "+491701234567" },
      deliveryContext: { confirmationToken: "token.with-special_value" },
    });
    assert.deepEqual(outcome, { sent: true });
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.deepEqual(request.body.to, ["ada@example.com"]);
    assert.equal(request.body.from, "Synclaro <impulse@example.com>");
    assert.equal(Object.hasOwn(request.body, "reply_to"), false);
    assert.equal(request.body.html.includes("+491701234567"), false);
    assert.equal(request.headers["Idempotency-Key"], "ai-readiness-newsletter-11111111-1111-4111-8111-111111111111");
    const href = request.body.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
    const confirmationUrl = new URL(href);
    assert.equal(confirmationUrl.origin, "https://ki-check.synclaro.de");
    assert.equal(confirmationUrl.pathname, "/.netlify/functions/confirm-newsletter");
    assert.equal(confirmationUrl.searchParams.get("assessment"), "11111111-1111-4111-8111-111111111111");
    assert.equal(confirmationUrl.searchParams.get("submission"), "22222222-2222-4222-8222-222222222222");
    assert.equal(confirmationUrl.searchParams.get("token"), "token.with-special_value");
  } finally {
    global.fetch = previousFetch;
    restoreEnv("RESEND_API_KEY", previousApiKey);
    restoreEnv("NEWSLETTER_FROM_EMAIL", previousNewsletterFrom);
    restoreEnv("LEADS_FROM_EMAIL", previousLeadsFrom);
  }
});

test("Telegram-Buchungsmeldung bleibt frei von Lead-PII und Detailkennungen", async () => {
  const previousFetch = global.fetch;
  const previousToken = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.LEAD_TELEGRAM_CHAT_ID;
  const previousApproval = process.env.TELEGRAM_TRANSFER_APPROVED;
  process.env.LEAD_TELEGRAM_BOT_TOKEN = "test-token";
  process.env.LEAD_TELEGRAM_CHAT_ID = "test-chat";
  process.env.TELEGRAM_TRANSFER_APPROVED = "true";
  let request;
  global.fetch = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    const outcome = await deliveries.sendTelegramBookingNotification({
      assessmentId: "11111111-1111-4111-8111-111111111111",
      bookingUid: "booking-secret-uid",
      contact: { email: "ada@example.com", phone: "+491701234567", firstName: "Ada" },
    });
    assert.deepEqual(outcome, { sent: true });
    assert.match(request.url, /^https:\/\/api\.telegram\.org\/bottest-token\/sendMessage$/);
    for (const pii of ["ada@example.com", "+491701234567", "Ada", "11111111-1111-4111-8111-111111111111", "booking-secret-uid"]) {
      assert.equal(request.body.text.includes(pii), false);
    }
    assert.equal(request.body.reply_markup.inline_keyboard[0][0].url, "https://crm.synclaro.de/crm/contacts");
  } finally {
    global.fetch = previousFetch;
    restoreEnv("LEAD_TELEGRAM_BOT_TOKEN", previousToken);
    restoreEnv("LEAD_TELEGRAM_CHAT_ID", previousChat);
    restoreEnv("TELEGRAM_TRANSFER_APPROVED", previousApproval);
  }
});

test("Meta Schedule sendet die Buchung ohne Telefonnummer oder Namenshashes", async () => {
  const previousFetch = global.fetch;
  const previousPixel = process.env.META_PIXEL_ID;
  const previousToken = process.env.META_CAPI_ACCESS_TOKEN;
  process.env.META_PIXEL_ID = "123";
  process.env.META_CAPI_ACCESS_TOKEN = "test-token";
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ events_received: 1 }) };
  };
  try {
    const outcome = await meta.sendMetaEvent({
      eventName: "Schedule",
      contact: { email: "ada@example.com", phone: "+491701234567", firstName: "Ada", lastName: "Lovelace" },
      attribution: { eventId: "schedule-event-id", user_agent: "Test Browser" },
      deliveryContext: { emailSha256: "a".repeat(64), phoneSha256: "b".repeat(64), clientIpAddress: "203.0.113.10" },
      eventSourceUrl: "https://ki-check.synclaro.de/ergebnis?email=ada@example.com",
      eventTime: 2_000_000_000,
    });
    assert.equal(outcome.sent, true);
    assert.equal(payload.data[0].event_name, "Schedule");
    assert.equal(payload.data[0].event_id, "schedule-event-id");
    assert.equal(payload.data[0].event_time, 2_000_000_000);
    assert.equal(payload.data[0].event_source_url, "https://ki-check.synclaro.de/ergebnis");
    assert.deepEqual(payload.data[0].user_data.em, ["a".repeat(64)]);
    for (const key of ["ph", "fn", "ln"]) assert.equal(Object.hasOwn(payload.data[0].user_data, key), false);
    assert.deepEqual(payload.data[0].custom_data, {
      content_name: "Synclaro KI-Potenzialanalyse",
      content_category: "Consultation Booking",
    });
    assert.equal(JSON.stringify(payload).includes("+491701234567"), false);
    assert.equal(JSON.stringify(payload).includes("b".repeat(64)), false);
  } finally {
    global.fetch = previousFetch;
    restoreEnv("META_PIXEL_ID", previousPixel);
    restoreEnv("META_CAPI_ACCESS_TOKEN", previousToken);
  }
});

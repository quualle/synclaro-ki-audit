"use strict";

const { ASSESSMENT_VERSION } = require("./_shared/assessment");
const { AI_CONSENT_TEXT, AI_CONSENT_VERSION, ANALYTICS_CONSENT_TEXT, CALLBACK_CONSENT_TEXT, CALLBACK_CONSENT_VERSION, COOKIE_CONSENT_VERSION, MARKETING_CONSENT_TEXT, PRIVACY_VERSION } = require("./_shared/consents");
const { isProduction, jsonResponse } = require("./_shared/security");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  return jsonResponse(200, {
    assessmentVersion: ASSESSMENT_VERSION,
    privacyVersion: PRIVACY_VERSION,
    cookieConsentVersion: COOKIE_CONSENT_VERSION,
    callbackConsent: { version: CALLBACK_CONSENT_VERSION, text: CALLBACK_CONSENT_TEXT },
    aiProcessingConsent: { version: AI_CONSENT_VERSION, text: AI_CONSENT_TEXT },
    analyticsConsent: { version: COOKIE_CONSENT_VERSION, text: ANALYTICS_CONSENT_TEXT },
    marketingConsent: { version: COOKIE_CONSENT_VERSION, text: MARKETING_CONSENT_TEXT },
    metaPixelId: process.env.META_PIXEL_ID || "1497847851628194",
    calendarUrl: "https://cal.com/marcoheer/ki-erstgespraech",
    production: isProduction(),
  });
};

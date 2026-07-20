"use strict";

const { ASSESSMENT_VERSION } = require("./_shared/assessment");
const { ANALYTICS_CONSENT_TEXT, COOKIE_CONSENT_VERSION, MARKETING_CONSENT_TEXT, NEWSLETTER_CONSENT_TEXT, NEWSLETTER_CONSENT_VERSION, PRIVACY_VERSION } = require("./_shared/consents");
const { isProduction, jsonResponse } = require("./_shared/security");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Methode nicht erlaubt." });
  return jsonResponse(200, {
    assessmentVersion: ASSESSMENT_VERSION,
    privacyVersion: PRIVACY_VERSION,
    cookieConsentVersion: COOKIE_CONSENT_VERSION,
    newsletterConsent: { version: NEWSLETTER_CONSENT_VERSION, text: NEWSLETTER_CONSENT_TEXT },
    analyticsConsent: { version: COOKIE_CONSENT_VERSION, text: ANALYTICS_CONSENT_TEXT },
    marketingConsent: { version: COOKIE_CONSENT_VERSION, text: MARKETING_CONSENT_TEXT },
    metaPixelId: process.env.META_PIXEL_ID || "1497847851628194",
    contactUrl: "https://synclaro.de/kontakt/",
    production: isProduction(),
  });
};

"use strict";

const NEWSLETTER_CONSENT_VERSION = "newsletter-email-v1-2026-07-19";
const NEWSLETTER_CONSENT_TEXT = "Ja, ich möchte regelmäßig praxistaugliche KI-Impulse, Einladungen und Angebote von Synclaro per E-Mail erhalten. Die Anmeldung wird per Double-Opt-in bestätigt; eine Abmeldung ist jederzeit möglich.";
const PRIVACY_VERSION = "privacy-ai-readiness-v2-2026-07-19";
const COOKIE_CONSENT_VERSION = "cookie-v1-2026-07-18";
const ANALYTICS_CONSENT_TEXT = "Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert.";
const MARKETING_CONSENT_TEXT = "Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden.";

module.exports = {
  COOKIE_CONSENT_VERSION,
  ANALYTICS_CONSENT_TEXT,
  MARKETING_CONSENT_TEXT,
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_CONSENT_VERSION,
  PRIVACY_VERSION,
};

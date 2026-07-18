"use strict";

const CALLBACK_CONSENT_VERSION = "callback-v1-2026-07-18";
const CALLBACK_CONSENT_TEXT = "Ich möchte meine vollständige KI-Readiness-Auswertung erhalten und bitte Synclaro IT Dienstleistungen, Inhaber Marco Heer, mich zu diesem Testergebnis einmal per Telefon zu kontaktieren. Falls ich nicht erreichbar bin, darf Synclaro per E-Mail nachfassen. Dabei dürfen mir passende Leistungen rund um KI und Automatisierung vorgestellt werden. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.";
const AI_CONSENT_VERSION = "ai-processing-v2-2026-07-18";
const AI_CONSENT_TEXT = "Ich willige ein, dass meine Unternehmensangaben und Testantworten zur individuellen Auswertung durch OpenAI Ireland Ltd. verarbeitet werden. Dabei kann eine technische Weiterverarbeitung außerhalb des EWR auf Grundlage geeigneter Garantien, zum Beispiel EU-Standardvertragsklauseln, erfolgen. Meine Kontaktdaten werden nicht an OpenAI übermittelt. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.";
const PRIVACY_VERSION = "privacy-ai-readiness-v1-2026-07-18";
const COOKIE_CONSENT_VERSION = "cookie-v1-2026-07-18";
const ANALYTICS_CONSENT_TEXT = "Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert.";
const MARKETING_CONSENT_TEXT = "Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden.";

module.exports = {
  AI_CONSENT_TEXT,
  AI_CONSENT_VERSION,
  CALLBACK_CONSENT_TEXT,
  CALLBACK_CONSENT_VERSION,
  COOKIE_CONSENT_VERSION,
  ANALYTICS_CONSENT_TEXT,
  MARKETING_CONSENT_TEXT,
  PRIVACY_VERSION,
};

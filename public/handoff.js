(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SynclaroReadinessHandoff = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const REFERENCE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  const LABEL = /^[\p{L}\p{N} ._|{}+\-]+$/u;
  const PLACEMENT = /^(facebook|instagram|messenger|threads|audience_network)([._-][a-z0-9_-]+)*$/;
  const CAMPAIGNS = new Set(["ai_readiness_de_prospecting_v1", "meta_ai_readiness_de_prospecting_v1"]);

  function text(value, maxLength) {
    return typeof value === "string"
      ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength)
      : "";
  }

  function validReference(value) {
    const candidate = text(value, 800);
    return REFERENCE.test(candidate) ? candidate : "";
  }

  function safeLabel(value, maxLength) {
    const candidate = text(value, maxLength);
    if (!candidate || !LABEL.test(candidate) || /(?:@|https?|www\.)/i.test(candidate)) return "";
    return candidate;
  }

  function buildContactHandoff({ contactUrl, bookingReference, marketingConsent, attribution } = {}) {
    let target;
    try {
      target = new URL(text(contactUrl, 300) || "https://synclaro.de/kontakt/");
    } catch {
      target = new URL("https://synclaro.de/kontakt/");
    }
    if (target.protocol !== "https:" || !["synclaro.de", "www.synclaro.de"].includes(target.hostname)) {
      target = new URL("https://synclaro.de/kontakt/");
    }
    target.pathname = "/kontakt/";
    target.search = "";
    target.hash = "";
    target.searchParams.set("flow", "ai-readiness");

    const reference = validReference(bookingReference);
    if (reference) target.searchParams.set("readiness_ref", reference);

    const values = attribution && typeof attribution === "object" && !Array.isArray(attribution) ? attribution : {};
    const source = text(values.utm_source, 80).toLowerCase();
    const medium = text(values.utm_medium, 80).toLowerCase();
    const campaign = text(values.utm_campaign, 120).toLowerCase();
    if (marketingConsent === true && source === "meta" && medium === "paid_social" && CAMPAIGNS.has(campaign)) {
      target.searchParams.set("utm_source", "meta");
      target.searchParams.set("utm_medium", "paid_social");
      target.searchParams.set("utm_campaign", "ai_readiness_de_prospecting_v1");
      const content = safeLabel(values.utm_content, 180);
      const placement = text(values.placement, 100).toLowerCase();
      if (content) target.searchParams.set("utm_content", content);
      if (PLACEMENT.test(placement)) target.searchParams.set("placement", placement);
    }
    return target.toString();
  }

  return { buildContactHandoff, safeLabel, validReference };
});

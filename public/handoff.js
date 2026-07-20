(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SynclaroReadinessHandoff = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const REFERENCE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  const LABEL = /^[\p{L}\p{N} ._|{}+\-]+$/u;
  const META_OBJECT_ID = /^\d{18}$/;
  const KNOWN_PLACEMENTS = new Set([
    "facebook_feed",
    "facebook_mobile_feed",
    "facebook_marketplace",
    "facebook_reels",
    "facebook_right_column",
    "facebook_search",
    "facebook_stories",
    "facebook_video_feeds",
    "facebook_instream_video",
    "instagram_explore",
    "instagram_explore_home",
    "instagram_feed",
    "instagram_profile_feed",
    "instagram_reels",
    "instagram_search",
    "instagram_stories",
    "messenger_inbox",
    "messenger_stories",
    "threads_feed",
    "audience_network_native_banner_interstitial",
    "audience_network_rewarded_video",
  ]);
  const PLACEMENT_PLATFORMS = ["audience_network", "facebook", "instagram", "messenger", "threads"];
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

  function sanitizeMetaObjectId(value) {
    const candidate = text(value, 32);
    return META_OBJECT_ID.test(candidate) ? candidate : "";
  }

  function sanitizePlacement(value) {
    const placement = text(value, 80).toLowerCase();
    if (KNOWN_PLACEMENTS.has(placement)) return placement;
    return PLACEMENT_PLATFORMS.find((platform) => (
      placement === platform
      || placement.startsWith(`${platform}.`)
      || placement.startsWith(`${platform}_`)
      || placement.startsWith(`${platform}-`)
    )) || (placement ? "other" : "");
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
      const campaignId = sanitizeMetaObjectId(values.utm_id);
      const adsetId = sanitizeMetaObjectId(values.utm_term);
      const adId = sanitizeMetaObjectId(values.utm_content);
      const placement = sanitizePlacement(values.placement);
      if (campaignId) target.searchParams.set("utm_id", campaignId);
      if (adsetId) target.searchParams.set("utm_term", adsetId);
      if (adId) target.searchParams.set("utm_content", adId);
      if (placement) target.searchParams.set("placement", placement);
    }
    return target.toString();
  }

  return { buildContactHandoff, safeLabel, sanitizeMetaObjectId, sanitizePlacement, validReference };
});

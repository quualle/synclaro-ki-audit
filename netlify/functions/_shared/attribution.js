"use strict";

const { cleanText } = require("./assessment");

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

function sanitizePlacement(value) {
  const placement = cleanText(value, 80).toLowerCase();
  if (KNOWN_PLACEMENTS.has(placement)) return placement;
  return PLACEMENT_PLATFORMS.find((platform) => (
    placement === platform
    || placement.startsWith(`${platform}.`)
    || placement.startsWith(`${platform}_`)
    || placement.startsWith(`${platform}-`)
  )) || (placement ? "other" : "");
}

function sanitizeMetaObjectId(value) {
  const candidate = cleanText(value, 32);
  return /^\d{18}$/.test(candidate) ? candidate : "";
}

module.exports = { sanitizeMetaObjectId, sanitizePlacement };

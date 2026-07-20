(function exposeConsentState(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SynclaroConsentState = api;
})(typeof window !== "undefined" ? window : null, function createConsentState() {
  "use strict";

  function restrictiveMerge(first = {}, second = {}) {
    return {
      analytics: first.analytics === true && second.analytics === true,
      marketing: first.marketing === true && second.marketing === true,
    };
  }

  function resolveAcceptedResponse({
    acceptedDecisionId,
    observationSerialAtRequest = 0,
    observed,
    targetAnalytics,
    targetMarketing,
  } = {}) {
    const superseded = Boolean(
      observed
      && Number(observed.serial) > Number(observationSerialAtRequest)
      && observed.decisionId !== acceptedDecisionId
    );
    if (!superseded) return { superseded: false };
    const merged = restrictiveMerge(
      { analytics: targetAnalytics, marketing: targetMarketing },
      observed
    );
    const matchesObserved = merged.analytics === (observed.analytics === true)
      && merged.marketing === (observed.marketing === true);
    return {
      superseded: true,
      analytics: merged.analytics,
      marketing: merged.marketing,
      canAdoptObserved: matchesObserved && observed.serverConfirmed === true && Boolean(observed.decisionId),
    };
  }

  return { restrictiveMerge, resolveAcceptedResponse };
});

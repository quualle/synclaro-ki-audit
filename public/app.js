(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const API = "/.netlify/functions";
  const CONSENT_STATE = window.SynclaroConsentState;
  const STATE_KEY = "synclaro_ai_readiness_state_v5";
  const CONSENT_KEY = "synclaro_ai_readiness_consent_v1";
  const CONSENT_SUBJECT_KEY = "synclaro_ai_readiness_consent_subject_v1";
  const ATTRIBUTION_KEY = "synclaro_ai_readiness_attribution_v1";
  const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
  const DEFAULT_CONFIG = {
    assessmentVersion: "2026-07-18.v2",
    privacyVersion: "privacy-ai-readiness-v1-2026-07-18",
    cookieConsentVersion: "cookie-v1-2026-07-18",
    callbackConsent: { version: "callback-v1-2026-07-18", text: "Ich möchte meine vollständige KI-Readiness-Auswertung erhalten und bitte Synclaro IT Dienstleistungen, Inhaber Marco Heer, mich zu diesem Testergebnis einmal per Telefon zu kontaktieren. Falls ich nicht erreichbar bin, darf Synclaro per E-Mail nachfassen. Dabei dürfen mir passende Leistungen rund um KI und Automatisierung vorgestellt werden. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen." },
    aiProcessingConsent: { version: "ai-processing-v2-2026-07-18", text: "Ich willige ein, dass meine Unternehmensangaben und Testantworten zur individuellen Auswertung durch OpenAI Ireland Ltd. verarbeitet werden. Dabei kann eine technische Weiterverarbeitung außerhalb des EWR auf Grundlage geeigneter Garantien, zum Beispiel EU-Standardvertragsklauseln, erfolgen. Meine Kontaktdaten werden nicht an OpenAI übermittelt. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen." },
    analyticsConsent: { version: "cookie-v1-2026-07-18", text: "Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert." },
    marketingConsent: { version: "cookie-v1-2026-07-18", text: "Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden." },
    metaPixelId: "1497847851628194",
    calendarUrl: "https://cal.com/marcoheer/ki-erstgespraech",
    production: location.hostname === "ki-check.synclaro.de",
  };
  const DIMENSIONS = {
    prozesse_daten: { label: "Prozesse & Daten", weight: .3, short: "Abläufe, Systeme und Informationen" },
    team_wissen: { label: "Wissen & Arbeitsweise", weight: .25, short: "Wissenszugang und verlässliche neue Arbeitsweisen" },
    ki_praxis: { label: "KI-Praxis & Sicherheit", weight: .25, short: "Nutzung, Zielbild und Leitplanken" },
    umsetzungskraft: { label: "Umsetzungskraft", weight: .2, short: "Verantwortung, Tempo und Messung" },
  };
  const PROFILE_STEPS = [
    {
      id: "mitarbeiter",
      type: "radio",
      kicker: "Unternehmensprofil · 1 von 4",
      label: "Wie groß ist Ihr Unternehmen?",
      help: "Sie selbst zählen nicht zwingend als Mitarbeiter — wählen Sie die passendste Größenklasse.",
      options: [
        { value: "solo", label: "Solo-selbstständig" },
        { value: "1-5", label: "1–5 Mitarbeitende" },
        { value: "6-10", label: "6–10 Mitarbeitende" },
        { value: "11-20", label: "11–20 Mitarbeitende" },
        { value: "21-50", label: "21–50 Mitarbeitende" },
        { value: "51+", label: "Mehr als 50 Mitarbeitende" },
      ],
    },
    {
      id: "rolle",
      type: "radio",
      kicker: "Unternehmensprofil · 2 von 4",
      label: "Welche Rolle haben Sie im Unternehmen?",
      options: [
        { value: "inhaber", label: "Inhaber/in oder selbstständig" },
        { value: "geschaeftsfuehrung", label: "Geschäftsführung" },
        { value: "leitung", label: "Bereichs- oder Teamleitung" },
        { value: "mitarbeit", label: "Mitarbeit im Unternehmen" },
        { value: "beratung", label: "Externe Beratung oder Begleitung" },
      ],
    },
    {
      id: "hauptziel",
      type: "radio",
      kicker: "Unternehmensprofil · 3 von 4",
      label: "Welches Ergebnis ist für Sie gerade am wichtigsten?",
      options: [
        { value: "zeit", label: "Wiederkehrende Arbeit reduzieren" },
        { value: "wachstum", label: "Mehr Geschäft ohne mehr Chaos bewältigen" },
        { value: "qualitaet", label: "Qualität und Verlässlichkeit erhöhen" },
        { value: "wissen", label: "Wissen besser sichern und verteilen" },
        { value: "klarheit", label: "Erst verstehen, wo KI sinnvoll ist" },
      ],
    },
    {
      id: "branche",
      type: "text",
      kicker: "Unternehmensprofil · 4 von 4",
      label: "In welcher Branche ist Ihr Unternehmen tätig?",
      help: "Eine kurze, konkrete Bezeichnung genügt.",
      placeholder: "z. B. Steuerberatung, Agentur, Online-Handel, Metallbau",
    },
  ];

  let config = { ...DEFAULT_CONFIG };
  let consent = { necessary: true, analytics: false, marketing: false, version: DEFAULT_CONFIG.cookieConsentVersion, grantedAt: null, globalDecisionId: null };
  let trackingSubjectId = readOrCreateTrackingSubjectId();
  let attribution = captureAttribution();
  cleanBrowserUrlForTracking();
  let state = freshState();
  let formOpenedAt = 0;
  let metaLoaded = false;
  let sessionReady = false;
  let sessionIssuedAt = null;
  let sessionPromise = null;
  let trackingConsentPromise = null;
  let freshSessionRequired = false;
  let transitionStarted = 0;
  let toastTimer = null;
  let landingTracked = false;
  let landingTrackPromise = null;
  let consentSaving = false;
  let pendingConsentIntent = null;
  let consentReturnFocus = null;
  let testReturnFocus = null;
  let leadFormReturnFocus = null;
  let currentInteractionLayer = null;
  const scrollMilestones = new Set();
  const sessionStartedAt = Date.now();

  function renderRuntimeConfig() {
    $("#callbackConsentText").textContent = config.callbackConsent.text;
    $("#aiConsentText").textContent = config.aiProcessingConsent.text;
    $("#analyticsConsentText").textContent = config.analyticsConsent.text;
    $("#marketingConsentText").textContent = config.marketingConsent.text;
    $("#calendarCta").href = config.calendarUrl;
    $("#previewNotice").hidden = config.production;
  }

  renderRuntimeConfig();
  const runtimeConfigController = new AbortController();
  const runtimeConfigTimeout = setTimeout(() => runtimeConfigController.abort(), 3000);
  const configPromise = fetch(`${API}/runtime-config`, {
    headers: { Accept: "application/json" },
    signal: runtimeConfigController.signal,
  })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("config")))
    .then((runtime) => {
      config = { ...config, ...runtime };
      renderRuntimeConfig();
      return config;
    })
    .catch(() => {
      renderRuntimeConfig();
      return config;
    })
    .finally(() => clearTimeout(runtimeConfigTimeout));

  function freshState() {
    return {
      stage: "landing",
      profile: {},
      profileIndex: 0,
      phases: [],
      phaseIndex: -1,
      questionIndex: 0,
      answers: [],
      baseline: null,
      assessmentId: null,
      submissionId: null,
      runId: uuid(),
      sessionIssuedAt: null,
      result: null,
    };
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
      return (char === "x" ? random : (random & 3) | 8).toString(16);
    });
  }

  function readOrCreateTrackingSubjectId() {
    try {
      const stored = localStorage.getItem(CONSENT_SUBJECT_KEY) || "";
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) return stored;
      const created = uuid();
      localStorage.setItem(CONSENT_SUBJECT_KEY, created);
      return created;
    } catch {
      return uuid();
    }
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
  }

  function visibleInteractionLayer() {
    const consentLayer = $("#consentLayer");
    if (!consentLayer.hidden) return consentLayer;
    return ["assessmentApp", "transitionScreen", "scorePreview", "measuringScreen", "fullResult"]
      .map((id) => $(`#${id}`))
      .find((element) => !element.hidden) || null;
  }

  function defaultLayerFocus(layer) {
    if (!layer) return null;
    if (layer.id === "consentLayer") {
      if (!$("#closeConsentSettings").hidden) return $("#closeConsentSettings");
      return !$("#acceptAll").hidden ? $("#acceptAll") : $("#saveConsent");
    }
    if (layer.id === "assessmentApp") {
      return $("#questionTitle", layer) || $("#closeButton", layer);
    }
    const targets = {
      transitionScreen: "#transitionTitle",
      scorePreview: "#scorePreviewTitle",
      measuringScreen: "#measuringTitle",
      fullResult: "#resultTitle",
    };
    return $(targets[layer.id] || "", layer);
  }

  function refreshInteractionLayer() {
    const next = visibleInteractionLayer();
    Array.from(document.body.children).forEach((element) => {
      const alwaysAvailable = ["toast"].includes(element.id) || element.classList.contains("grain");
      element.inert = Boolean(next && element !== next && !alwaysAvailable);
    });
    document.body.classList.toggle("modal-open", Boolean(next));
    if (next === currentInteractionLayer) return;
    currentInteractionLayer = next;
    if (!next) return;
    requestAnimationFrame(() => defaultLayerFocus(next)?.focus({ preventScroll: true }));
  }

  function focusQuestionTitle() {
    const title = $("#questionTitle");
    title?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (title?.isConnected) title.focus({ preventScroll: true });
    });
  }

  function focusableElements(layer) {
    return $$("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])", layer)
      .filter((element) => {
        const style = getComputedStyle(element);
        return !element.hidden
          && element.getAttribute("aria-hidden") !== "true"
          && style.display !== "none"
          && style.visibility !== "hidden"
          && element.getClientRects().length > 0;
      });
  }

  function handleModalKeyboard(event) {
    const layer = visibleInteractionLayer();
    if (!layer) return;
    if (event.key === "Escape") {
      if (layer.id === "consentLayer" && !$("#closeConsentSettings").hidden) {
        event.preventDefault();
        closeConsentDialog();
      } else if (layer.id === "assessmentApp") {
        event.preventDefault();
        closeTest();
      } else if (layer.id === "scorePreview" && !$("#leadForm").hidden) {
        event.preventDefault();
        closeLeadForm();
      }
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = focusableElements(layer);
    if (!focusable.length) {
      event.preventDefault();
      defaultLayerFocus(layer)?.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function restoreFocus(element) {
    if (!(element instanceof HTMLElement)) return;
    requestAnimationFrame(() => element.focus({ preventScroll: true }));
  }

  function hideConsentDialog({ restore = true } = {}) {
    $("#consentLayer").hidden = true;
    $("#closeConsentSettings").hidden = true;
    const target = consentReturnFocus;
    consentReturnFocus = null;
    refreshInteractionLayer();
    if (restore) restoreFocus(target);
  }

  function closeConsentDialog() {
    if (!consent.expiresAt) {
      void saveConsent(false, false);
      return;
    }
    $("#analyticsToggle").checked = consent.analytics;
    $("#marketingToggle").checked = consent.marketing;
    hideConsentDialog();
  }

  const interactionObserver = new MutationObserver(refreshInteractionLayer);
  ["consentLayer", "assessmentApp", "transitionScreen", "scorePreview", "measuringScreen", "fullResult"]
    .forEach((id) => interactionObserver.observe($(`#${id}`), { attributes: true, attributeFilter: ["hidden"] }));
  addEventListener("keydown", handleModalKeyboard);

  function captureAttribution() {
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content", "utm_term", "placement", "fbclid"];
    const params = new URLSearchParams(location.search);
    const current = {};
    keys.forEach((key) => { if (params.get(key)) current[key] = params.get(key).slice(0, 500); });
    return {
      ...current,
      landingUrl: location.href.slice(0, 600),
      referrer: document.referrer.slice(0, 500),
      capturedAt: new Date().toISOString(),
    };
  }

  function restoreConsentedAttribution() {
    const hasCurrentCampaign = ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content", "utm_term", "placement", "fbclid"]
      .some((key) => Boolean(attribution[key]));
    if (hasCurrentCampaign) return;
    try {
      const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "null");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) attribution = stored;
    } catch {}
  }

  function cleanBrowserUrlForTracking() {
    if (location.hostname !== "ki-check.synclaro.de" || (!location.search && !location.hash)) return;
    try { history.replaceState(history.state, "", location.pathname); } catch {}
  }

  function analyticsCampaignKey() {
    const campaign = String(attribution.utm_campaign || "").trim().toLowerCase();
    if (campaign === "ai_readiness_de_prospecting_v1" || campaign === "meta_ai_readiness_de_prospecting_v1") return "ai_readiness_de_prospecting_v1";
    return String(attribution.utm_source || "").toLowerCase() === "meta" ? "meta_other" : "other";
  }

  function saveState() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...state, savedAt: Date.now() })); } catch {}
  }

  function restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
      const freshEnough = saved && Number(saved.savedAt) > Date.now() - (2 * 60 * 60 * 1000);
      const validStage = ["profile", "assessment", "preview", "result"].includes(saved?.stage);
      if (!freshEnough || !validStage || !saved.profile || !Array.isArray(saved.answers) || !Array.isArray(saved.phases)) return false;
      state = { ...freshState(), ...saved };
      $$('[data-start-test]').forEach((button) => { button.firstChild.textContent = "Test fortsetzen "; });
      return true;
    } catch {
      clearState();
      return false;
    }
  }

  function clearState() {
    try { sessionStorage.removeItem(STATE_KEY); } catch {}
  }

  async function loadConsent() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      const isCurrent = stored?.version === config.cookieConsentVersion;
      const isFresh = Number.isFinite(Date.parse(stored?.expiresAt || "")) && Date.parse(stored.expiresAt) > Date.now();
      if (stored && isCurrent && isFresh && typeof stored.analytics === "boolean" && typeof stored.marketing === "boolean") {
        consent = {
          necessary: true,
          ...stored,
          globalDecisionId: stored.globalDecisionId || stored.decisionId || null,
        };
        $("#consentLayer").hidden = true;
        if (config.production) {
          const ready = await ensureSession();
          const currentSessionRecorded = ready && consent.syncedSessionIssuedAt === sessionIssuedAt && consent.syncedRunId === state.runId;
          if (!currentSessionRecorded && !(await syncTrackingConsent())) {
            consent = {
              necessary: true,
              analytics: false,
              marketing: false,
              version: config.cookieConsentVersion,
              grantedAt: null,
              expiresAt: stored.expiresAt,
              globalDecisionId: stored.globalDecisionId || stored.decisionId || null,
              decisionId: null,
              syncedSessionIssuedAt: null,
              syncedRunId: null,
            };
            try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
            if (stored.analytics || stored.marketing) toast("Tracking bleibt aus, weil der Consent-Stand nicht sicher bestätigt werden konnte.");
          }
        }
        applyConsentEffects();
        return;
      }
    } catch {}
    try {
      localStorage.removeItem(CONSENT_KEY);
      sessionStorage.removeItem(ATTRIBUTION_KEY);
    } catch {}
    ["_fbp", "_fbc"].forEach((name) => { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`; });
    $("#consentLayer").hidden = false;
    document.body.classList.add("modal-open");
  }

  function storedConsentIsValid(stored) {
    return stored?.version === config.cookieConsentVersion
      && Number.isFinite(Date.parse(stored?.expiresAt || ""))
      && Date.parse(stored.expiresAt) > Date.now()
      && typeof stored.analytics === "boolean"
      && typeof stored.marketing === "boolean";
  }

  function handleConsentStorage(event) {
    if (event.key !== CONSENT_KEY) return;
    let incoming = null;
    try { incoming = JSON.parse(event.newValue || "null"); } catch {}
    if (!storedConsentIsValid(incoming)) {
      incoming = {
        analytics: false,
        marketing: false,
        version: config.cookieConsentVersion,
        grantedAt: null,
        expiresAt: new Date(Date.now() + CONSENT_MAX_AGE_MS).toISOString(),
      };
    }
    const choiceChanged = consent.analytics !== incoming.analytics
      || consent.marketing !== incoming.marketing
      || consent.version !== incoming.version;
    const incomingGlobalDecisionId = incoming.globalDecisionId || incoming.decisionId || null;
    if (pendingConsentIntent) {
      const previousObservation = pendingConsentIntent.observedDecision;
      const observationSerial = (pendingConsentIntent.observationSerial || 0) + 1;
      pendingConsentIntent.observationSerial = observationSerial;
      pendingConsentIntent.observedDecision = {
        serial: observationSerial,
        decisionId: incomingGlobalDecisionId || previousObservation?.decisionId || null,
        analytics: (previousObservation?.analytics ?? true) && incoming.analytics === true,
        marketing: (previousObservation?.marketing ?? true) && incoming.marketing === true,
        decidedAt: incoming.grantedAt || previousObservation?.decidedAt || null,
        serverConfirmed: Boolean(incoming.decisionId && incoming.decisionId === incomingGlobalDecisionId),
      };
      consent.globalDecisionId = incomingGlobalDecisionId || consent.globalDecisionId || null;
      consent.analytics = consent.analytics && incoming.analytics === true;
      consent.marketing = consent.marketing && incoming.marketing === true;
      if (!consent.analytics || !consent.marketing) applyConsentEffects();
      return;
    }
    if (!choiceChanged) {
      consent.globalDecisionId = incomingGlobalDecisionId || consent.globalDecisionId || null;
      return;
    }
    consent = {
      necessary: true,
      ...incoming,
      globalDecisionId: incomingGlobalDecisionId,
      decisionId: null,
      syncedSessionIssuedAt: null,
      syncedRunId: null,
    };
    applyConsentEffects();
  }

  async function syncTrackingConsent({ rebaseOnStale = false, intentId = null } = {}) {
    if (!(await ensureSession())) return false;
    if (trackingConsentPromise) {
      await trackingConsentPromise;
      if (consent.syncedSessionIssuedAt === sessionIssuedAt && consent.syncedRunId === state.runId) return true;
    }

    const requestRunId = state.runId;
    const requestSessionIssuedAt = sessionIssuedAt || "preview";
    const requestSubjectId = trackingSubjectId;
    const requestAnalytics = consent.analytics;
    const requestMarketing = consent.marketing;
    let targetAnalytics = requestAnalytics;
    let targetMarketing = requestMarketing;
    const intentIsCurrent = () => pendingConsentIntent?.id === intentId
      && pendingConsentIntent.analytics === requestAnalytics
      && pendingConsentIntent.marketing === requestMarketing;
    const pending = (async () => {
      if (!config.production) {
        consent.grantedAt = new Date().toISOString();
        consent.syncedSessionIssuedAt = requestSessionIssuedAt;
        consent.syncedRunId = requestRunId;
        return true;
      }
      let previousDecisionId = consent.globalDecisionId || null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const queuedObservation = rebaseOnStale && intentIsCurrent()
          ? pendingConsentIntent.observedDecision
          : null;
        if (queuedObservation) {
          targetAnalytics = targetAnalytics && queuedObservation.analytics === true;
          targetMarketing = targetMarketing && queuedObservation.marketing === true;
          consent = {
            ...consent,
            analytics: targetAnalytics,
            marketing: targetMarketing,
            globalDecisionId: queuedObservation.decisionId || consent.globalDecisionId || null,
          };
          pendingConsentIntent.observedDecision = null;
          applyConsentEffects();
          if (!queuedObservation.decisionId) return false;
          previousDecisionId = queuedObservation.decisionId;
        }
        const observationSerialAtRequest = pendingConsentIntent?.observationSerial || 0;
        const decisionId = uuid();
        try {
          const response = await fetch(`${API}/update-tracking-consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              decisionId,
              previousDecisionId,
              runId: requestRunId,
              trackingSubjectId: requestSubjectId,
              version: config.cookieConsentVersion,
              analytics: targetAnalytics,
              marketing: targetMarketing,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.status === 409 && result.status === "stale") {
            if (state.runId !== requestRunId || trackingSubjectId !== requestSubjectId) return false;
            if (rebaseOnStale ? !intentIsCurrent() : (
              consent.analytics !== requestAnalytics || consent.marketing !== requestMarketing
            )) return false;
            previousDecisionId = result.currentDecisionId || null;
            consent.globalDecisionId = previousDecisionId;
            const activeRevocationIntent = rebaseOnStale
              && intentIsCurrent()
              && (!requestAnalytics || !requestMarketing);
            if (activeRevocationIntent) {
              targetAnalytics = targetAnalytics && result.currentAnalytics === true;
              targetMarketing = targetMarketing && result.currentMarketing === true;
              consent = { ...consent, analytics: targetAnalytics, marketing: targetMarketing };
              applyConsentEffects();
              continue;
            }
            if (!pendingConsentIntent) {
              const sameChoice = consent.analytics === result.currentAnalytics
                && consent.marketing === result.currentMarketing;
              consent = {
                ...consent,
                analytics: result.currentAnalytics === true,
                marketing: result.currentMarketing === true,
                globalDecisionId: previousDecisionId,
                grantedAt: sameChoice ? consent.grantedAt : null,
                decisionId: sameChoice ? consent.decisionId : null,
                syncedSessionIssuedAt: sameChoice ? consent.syncedSessionIssuedAt : null,
                syncedRunId: sameChoice ? consent.syncedRunId : null,
              };
              try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
              applyConsentEffects();
            }
            return false;
          }
          if (!response.ok || !result.accepted || !result.decidedAt) return false;
          const acceptedDecisionId = result.decisionId || decisionId;
          const observed = rebaseOnStale && intentIsCurrent()
            ? pendingConsentIntent.observedDecision
            : null;
          const acceptedResolution = CONSENT_STATE.resolveAcceptedResponse({
            acceptedDecisionId,
            observationSerialAtRequest,
            observed,
            targetAnalytics,
            targetMarketing,
          });
          if (acceptedResolution.superseded) {
            targetAnalytics = acceptedResolution.analytics;
            targetMarketing = acceptedResolution.marketing;
            consent = {
              ...consent,
              analytics: targetAnalytics,
              marketing: targetMarketing,
              globalDecisionId: observed.decisionId || consent.globalDecisionId || null,
            };
            pendingConsentIntent.observedDecision = null;
            applyConsentEffects();
            if (acceptedResolution.canAdoptObserved) {
              const matchesAccepted = targetAnalytics === requestAnalytics
                && targetMarketing === requestMarketing;
              consent.grantedAt = matchesAccepted ? result.decidedAt : observed.decidedAt;
              consent.decisionId = matchesAccepted ? acceptedDecisionId : null;
              consent.syncedSessionIssuedAt = matchesAccepted ? requestSessionIssuedAt : null;
              consent.syncedRunId = matchesAccepted ? requestRunId : null;
              try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
              return true;
            }
            if (!observed.decisionId) return false;
            previousDecisionId = observed.decisionId;
            continue;
          }
          if (state.runId !== requestRunId
            || (sessionIssuedAt || "preview") !== requestSessionIssuedAt
            || trackingSubjectId !== requestSubjectId) return false;
          if (rebaseOnStale ? !intentIsCurrent() : (
            consent.analytics !== requestAnalytics || consent.marketing !== requestMarketing
          )) return false;
          consent.analytics = targetAnalytics;
          consent.marketing = targetMarketing;
          consent.grantedAt = result.decidedAt;
          consent.decisionId = acceptedDecisionId;
          consent.globalDecisionId = acceptedDecisionId;
          consent.syncedSessionIssuedAt = requestSessionIssuedAt;
          consent.syncedRunId = requestRunId;
          try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
          return true;
        } catch {
          return false;
        }
      }
      return false;
    })();
    trackingConsentPromise = pending;
    try {
      return await pending;
    } finally {
      if (trackingConsentPromise === pending) trackingConsentPromise = null;
    }
  }

  async function saveConsent(analytics, marketing) {
    if (consentSaving) return;
    consentSaving = true;
    ["acceptAll", "necessaryOnly", "saveConsent"].forEach((id) => { $(`#${id}`).disabled = true; });
    const previous = { ...consent };
    consent = {
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      version: config.cookieConsentVersion,
      grantedAt: null,
      globalDecisionId: previous.globalDecisionId || previous.decisionId || null,
      expiresAt: new Date(Date.now() + CONSENT_MAX_AGE_MS).toISOString(),
    };
    const intentId = uuid();
    pendingConsentIntent = {
      id: intentId,
      analytics: consent.analytics,
      marketing: consent.marketing,
      observationSerial: 0,
      observedDecision: null,
    };
    if (!consent.analytics || !consent.marketing) applyConsentEffects();
    try {
      const synced = await syncTrackingConsent({ rebaseOnStale: true, intentId });
      if (!synced && (consent.analytics || consent.marketing || previous.analytics || previous.marketing)) {
        consent = { ...consent, analytics: false, marketing: false, grantedAt: null, decisionId: null, syncedSessionIssuedAt: null, syncedRunId: null };
        try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
        applyConsentEffects();
        $("#consentLayer").hidden = false;
        refreshInteractionLayer();
        toast(previous.marketing
          ? "Meta ist lokal deaktiviert. Der serverseitige Widerruf konnte noch nicht bestätigt werden — bitte erneut speichern."
          : "Tracking bleibt aus, weil der Consent-Stand nicht sicher gespeichert werden konnte.");
        return;
      }
      if (!synced) consent = { ...consent, decisionId: null, syncedSessionIssuedAt: null, syncedRunId: null };
      try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
      hideConsentDialog();
      applyConsentEffects();
      track("consent_updated", { preview: !config.production });
    } finally {
      if (pendingConsentIntent?.id === intentId) pendingConsentIntent = null;
      consentSaving = false;
      ["acceptAll", "necessaryOnly", "saveConsent"].forEach((id) => { $(`#${id}`).disabled = false; });
    }
  }

  function applyConsentEffects() {
    $("#analyticsToggle").checked = consent.analytics;
    $("#marketingToggle").checked = consent.marketing;
    if (consent.analytics && !landingTracked && !landingTrackPromise) {
      const pendingLandingTrack = (async () => {
        const ready = await ensureTrackingDecisionForCurrentRun();
        if (!ready || !consent.analytics || landingTracked) return false;
        const accepted = await track("landing_viewed", { utm_campaign: analyticsCampaignKey() });
        if (accepted) landingTracked = true;
        return accepted;
      })();
      landingTrackPromise = pendingLandingTrack;
      pendingLandingTrack.finally(() => {
        if (landingTrackPromise === pendingLandingTrack) landingTrackPromise = null;
      });
    }
    if (consent.marketing) {
      restoreConsentedAttribution();
      try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch {}
      loadMeta();
    } else {
      if (typeof window.fbq === "function") window.fbq("consent", "revoke");
      try { sessionStorage.removeItem(ATTRIBUTION_KEY); } catch {}
      ["_fbp", "_fbc"].forEach((name) => { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax` });
      attribution = {
        landingUrl: `${location.origin}${location.pathname}`.slice(0, 600),
        referrer: "",
        capturedAt: new Date().toISOString(),
      };
    }
  }

  function openConsentSettings() {
    if ($("#consentLayer").hidden) consentReturnFocus = document.activeElement;
    $("#consentOptions").hidden = false;
    $("#saveConsent").hidden = false;
    $("#acceptAll").hidden = true;
    $("#necessaryOnly").hidden = true;
    $("#customizeConsent").hidden = true;
    $("#closeConsentSettings").hidden = false;
    $("#consentLayer").hidden = false;
    refreshInteractionLayer();
  }

  function loadMeta() {
    if (!config.production || location.hostname !== "ki-check.synclaro.de" || !consent.marketing) return;
    if (metaLoaded && typeof window.fbq === "function") {
      window.fbq("consent", "grant");
      return;
    }
    metaLoaded = true;
    /* Meta's official loader, activated only after explicit marketing consent. */
    ((f, b, e, v, n, t, s) => {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("set", "autoConfig", "false", config.metaPixelId);
    window.fbq("init", config.metaPixelId);
    window.fbq("consent", "grant");
    window.fbq("track", "PageView");
  }

  function metaEvent(name, params = {}, options) {
    if (!consent.marketing || !config.production || typeof window.fbq !== "function") return;
    if (name === "Lead") window.fbq("track", name, params, options || {});
    else window.fbq("trackCustom", name, params, options || {});
  }

  function readCookie(name) {
    const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
  }

  function metaAttribution() {
    if (!consent.marketing) {
      return {
        landingUrl: "https://ki-check.synclaro.de/",
        referrer: "",
        utm_source: "",
        utm_medium: "",
        utm_campaign: "",
        utm_id: "",
        utm_content: "",
        utm_term: "",
        placement: "",
        fbclid: "",
        fbp: "",
        fbc: "",
      };
    }
    let fbc = readCookie("_fbc");
    if (!fbc && attribution.fbclid) {
      const timestamp = Math.floor(new Date(attribution.capturedAt || Date.now()).getTime());
      fbc = `fb.1.${timestamp}.${attribution.fbclid}`;
    }
    return { ...attribution, fbp: readCookie("_fbp"), fbc };
  }

  async function track(eventName, properties = {}, step = null) {
    if (!consent.analytics) return false;
    try {
      const response = await fetch(`${API}/track-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventId: uuid(), eventName, step, occurredAt: new Date().toISOString(), properties,
          runId: state.runId,
          analyticsConsent: { granted: true, version: consent.version, grantedAt: consent.grantedAt },
        }),
      });
      const result = await response.json().catch(() => ({}));
      return response.ok && result.accepted === true;
    } catch {
      return false;
    }
  }

  async function ensureSession() {
    const issuedAtMs = Date.parse(sessionIssuedAt || "");
    const locallyFresh = Number.isFinite(issuedAtMs) && Date.now() - issuedAtMs < SESSION_MAX_AGE_MS - 60000;
    if (sessionReady && !freshSessionRequired && locallyFresh) return true;
    if (sessionPromise) return sessionPromise;
    const requestFresh = freshSessionRequired;
    const pending = (async () => {
      sessionReady = false;
      await configPromise;
      try {
        const response = await fetch(`${API}/start-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fresh: requestFresh }),
        });
        if (!response.ok) throw new Error("session");
        const result = await response.json().catch(() => ({}));
        const nextIssuedAt = result.issuedAt || null;
        if (state.sessionIssuedAt && nextIssuedAt && state.sessionIssuedAt !== nextIssuedAt && !state.assessmentId) {
          state.runId = uuid();
          state.submissionId = null;
          consent = { ...consent, decisionId: null, syncedSessionIssuedAt: null, syncedRunId: null };
        }
        sessionReady = true;
        sessionIssuedAt = nextIssuedAt;
        state.sessionIssuedAt = nextIssuedAt;
        freshSessionRequired = false;
        saveState();
        return true;
      } catch {
        toast("Der Test kann gerade nicht sicher gestartet werden. Bitte versuchen Sie es erneut.");
        return false;
      }
    })();
    sessionPromise = pending;
    try {
      return await pending;
    } finally {
      if (sessionPromise === pending) sessionPromise = null;
    }
  }

  async function ensureTrackingDecisionForCurrentRun() {
    if (consent.syncedSessionIssuedAt === sessionIssuedAt && consent.syncedRunId === state.runId) return true;
    if (await syncTrackingConsent()) return true;
    consent = {
      ...consent,
      analytics: false,
      marketing: false,
      grantedAt: null,
      decisionId: null,
      syncedSessionIssuedAt: null,
      syncedRunId: null,
    };
    applyConsentEffects();
    return false;
  }

  function hideAllScreens() {
    ["assessmentApp", "transitionScreen", "scorePreview", "measuringScreen", "fullResult"].forEach((id) => { $(`#${id}`).hidden = true; });
    refreshInteractionLayer();
  }

  async function startTest() {
    testReturnFocus ||= document.activeElement;
    if (!(await ensureSession())) return;
    if (!(await ensureTrackingDecisionForCurrentRun())) {
      toast("Der Test läuft weiter; freiwilliges Tracking bleibt mangels bestätigtem Consent aus.");
    }
    if (state.stage === "profile") {
      hideAllScreens();
      $("#assessmentApp").hidden = false;
      document.body.classList.add("modal-open");
      renderProfile();
      return;
    }
    if (state.stage === "assessment" && currentPhase() && currentQuestion()) {
      hideAllScreens();
      $("#assessmentApp").hidden = false;
      document.body.classList.add("modal-open");
      renderQuestion();
      return;
    }
    if (state.stage === "preview" && state.baseline) {
      showScorePreview();
      return;
    }
    if (state.stage === "result" && state.result) {
      renderFullResult();
      return;
    }
    state.stage = "profile";
    hideAllScreens();
    $("#assessmentApp").hidden = false;
    document.body.classList.add("modal-open");
    renderProfile();
    track("test_started", { assessment_version: config.assessmentVersion, utm_campaign: analyticsCampaignKey() });
    metaEvent("StartAIReadinessTest", { assessment_version: config.assessmentVersion });
  }

  function updateProgress(label, completed, total) {
    $("#progressLabel").textContent = label;
    const remaining = Math.max(1, Math.ceil((total - completed) * .22));
    $("#progressTime").textContent = completed >= total ? "fast geschafft" : `noch ca. ${remaining} Min.`;
    $("#progressBar").style.width = `${Math.max(2, Math.min(100, (completed / total) * 100))}%`;
  }

  function optionHtml(option, selected) {
    return `<button class="option${selected ? " selected" : ""}" type="button" role="radio" aria-checked="${selected ? "true" : "false"}" data-value="${esc(option.value)}"><span class="marker" aria-hidden="true"></span><strong>${esc(option.label)}</strong></button>`;
  }

  function transitionQuestion(render) {
    const card = $(".question-card", $("#questionHost"));
    if (!card) return render();
    card.classList.add("exiting");
    setTimeout(render, 175);
  }

  function renderProfile() {
    const item = PROFILE_STEPS[state.profileIndex];
    if (!item) return startAssessment();
    state.stage = "profile";
    updateProgress("Unternehmensprofil", state.profileIndex, 17);
    $("#backButton").style.visibility = state.profileIndex === 0 ? "hidden" : "visible";
    const current = state.profile[item.id] || "";
    let body = `<article class="question-card"><p class="question-index">${esc(item.kicker)}</p><h1 id="questionTitle" tabindex="-1">${esc(item.label)}</h1>${item.help ? `<p class="question-help">${esc(item.help)}</p>` : ""}`;
    if (item.type === "text") {
      body += `<div class="question-field"><input id="profileText" maxlength="80" autocomplete="off" placeholder="${esc(item.placeholder)}"></div><div class="question-actions"><button class="button button-accent" id="profileNext" type="button">Weiter</button></div>`;
    } else {
      body += `<div class="option-list" role="radiogroup" aria-labelledby="questionTitle">${item.options.map((option) => optionHtml(option, current === option.value)).join("")}</div>`;
    }
    body += "</article>";
    $("#questionHost").innerHTML = body;
    if (item.type === "text") {
      const input = $("#profileText");
      input.value = current;
      setTimeout(() => input.focus(), 50);
      const submit = () => {
        const value = input.value.trim();
        if (value.length < 2) return toast("Bitte tragen Sie Ihre Branche kurz ein.");
        state.profile[item.id] = value.slice(0, 80);
        advanceProfile();
      };
      $("#profileNext").addEventListener("click", submit);
      input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } });
    } else {
      focusQuestionTitle();
      $$(".option", $("#questionHost")).forEach((button) => button.addEventListener("click", () => {
        state.profile[item.id] = button.dataset.value;
        $$(".option", $("#questionHost")).forEach((other) => {
          const selected = other === button;
          other.classList.toggle("selected", selected);
          other.setAttribute("aria-checked", selected ? "true" : "false");
        });
        saveState();
        setTimeout(advanceProfile, 190);
      }));
    }
    saveState();
  }

  function advanceProfile() {
    if (state.profileIndex < PROFILE_STEPS.length - 1) {
      state.profileIndex += 1;
      transitionQuestion(renderProfile);
    } else {
      saveState();
      track("profile_completed", { employee_band: state.profile.mitarbeiter, respondent_role: state.profile.rolle }, 4);
      startAssessment();
    }
  }

  async function fetchPhase(step) {
    const payload = { companyProfile: state.profile, previousAnswers: state.answers, stepNumber: step };
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${API}/generate-questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const phase = await response.json();
        if (!Array.isArray(phase.questions) || !phase.questions.length) throw new Error("schema");
        return phase;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error("phase");
  }

  async function startAssessment() {
    state.stage = "assessment";
    await moveToPhase(0, "Ihr Readiness-Profil startet.", "Wir beginnen mit dem Fundament: Prozesse, Daten und wiederkehrende Arbeit.");
  }

  async function moveToPhase(index, title, text) {
    $("#assessmentApp").hidden = true;
    $("#transitionScreen").hidden = false;
    document.body.classList.add("modal-open");
    transitionStarted = Date.now();
    $("#transitionKicker").textContent = `PHASE ${index + 1} VON 3`;
    $("#transitionTitle").textContent = title;
    $("#transitionText").textContent = text;
    requestAnimationFrame(() => $("#transitionTitle").focus({ preventScroll: true }));
    try {
      const phase = state.phases[index] || await fetchPhase(index + 1);
      state.phases[index] = phase;
      const wait = Math.max(0, 900 - (Date.now() - transitionStarted));
      await new Promise((resolve) => setTimeout(resolve, wait));
      state.phaseIndex = index;
      state.questionIndex = 0;
      $("#transitionScreen").hidden = true;
      $("#assessmentApp").hidden = false;
      renderQuestion();
      track("phase_started", { phase: String(index + 1), question_count: phase.questions.length }, index + 1);
    } catch {
      $("#transitionScreen").hidden = true;
      $("#assessmentApp").hidden = false;
      $("#questionHost").innerHTML = `<article class="question-card"><p class="question-index">Verbindung unterbrochen</p><h1 id="questionTitle" tabindex="-1">Die nächste Runde konnte nicht sicher geladen werden.</h1><p class="question-help">Ihre bisherigen Antworten bleiben in dieser Browsersitzung erhalten.</p><div class="question-actions"><button class="button button-accent" id="retryPhase" type="button">Erneut versuchen</button></div></article>`;
      focusQuestionTitle();
      $("#retryPhase").addEventListener("click", () => moveToPhase(index, title, text));
    }
  }

  function currentPhase() { return state.phases[state.phaseIndex]; }
  function currentQuestion() { return currentPhase()?.questions[state.questionIndex]; }
  function existingAnswer(id) { return state.answers.find((answer) => answer.questionId === id); }

  function renderQuestion() {
    const phase = currentPhase();
    const question = currentQuestion();
    if (!phase || !question) return;
    const phaseQuestionsBefore = state.phases.slice(0, state.phaseIndex).reduce((sum, item) => sum + item.questions.length, 0);
    const completed = PROFILE_STEPS.length + phaseQuestionsBefore + state.questionIndex;
    updateProgress(`Phase ${state.phaseIndex + 1}/3 · Frage ${state.questionIndex + 1}/${phase.questions.length}`, completed, 17);
    $("#backButton").style.visibility = "visible";
    const existing = existingAnswer(question.id);
    let body = `<article class="question-card"><p class="question-index">${esc(phase.phaseTitle)} · ${state.questionIndex + 1} von ${phase.questions.length}</p><h1 id="questionTitle" tabindex="-1">${esc(question.label)}</h1>`;
    if (question.type === "textarea") {
      body += `<p class="question-help">Optional — ein oder zwei konkrete Sätze genügen. Bitte keine Namen, Kontakt- oder Kundendaten eingeben.</p><div class="question-field"><textarea id="answerText" maxlength="700" placeholder="${esc(question.placeholder || "Ihre Antwort …")}"></textarea></div><div class="question-actions"><button class="button button-accent" id="answerNext" type="button">Weiter</button><button class="text-button" id="answerSkip" type="button">Überspringen</button></div>`;
    } else {
      body += `<div class="option-list" role="radiogroup" aria-labelledby="questionTitle">${(question.options || []).map((option) => optionHtml(option, existing?.answer === option.value)).join("")}</div>`;
    }
    body += "</article>";
    $("#questionHost").innerHTML = body;
    if (question.type === "textarea") {
      const textarea = $("#answerText");
      textarea.value = existing?.answer || "";
      focusQuestionTitle();
      const submit = (skip = false) => {
        recordAnswer(question, skip ? "" : textarea.value.trim(), skip ? "keine Angabe" : textarea.value.trim());
        advanceQuestion();
      };
      $("#answerNext").addEventListener("click", () => submit(false));
      $("#answerSkip").addEventListener("click", () => submit(true));
    } else {
      focusQuestionTitle();
      $$(".option", $("#questionHost")).forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.locked) return;
        $$(".option", $("#questionHost")).forEach((other) => {
          const selected = other === button;
          other.classList.toggle("selected", selected);
          other.setAttribute("aria-checked", selected ? "true" : "false");
        });
        const option = question.options.find((item) => item.value === button.dataset.value);
        recordAnswer(question, option.value, option.label);
        button.dataset.locked = "true";
        setTimeout(advanceQuestion, 190);
      }));
    }
    saveState();
  }

  function recordAnswer(question, answer, answerLabel) {
    const entry = {
      questionId: question.id,
      questionLabel: question.label,
      questionType: question.type,
      dimension: question.dimension || null,
      answer,
      answerLabel,
      phase: state.phaseIndex + 1,
    };
    const index = state.answers.findIndex((item) => item.questionId === question.id);
    if (index >= 0) state.answers[index] = entry;
    else state.answers.push(entry);
    saveState();
  }

  function advanceQuestion() {
    const phase = currentPhase();
    if (state.questionIndex < phase.questions.length - 1) {
      state.questionIndex += 1;
      transitionQuestion(renderQuestion);
      return;
    }
    track("phase_completed", { phase: String(state.phaseIndex + 1), question_count: phase.questions.length }, state.phaseIndex + 1);
    if (state.phaseIndex >= 2) return showScorePreview();
    const nextIndex = state.phaseIndex + 1;
    const nextTitle = nextIndex === 1 ? "Das Fundament steht. Jetzt zählt der Alltag." : "Potenzial erkannt. Jetzt zählt Umsetzung.";
    const insight = phase.transitionInsight || "Ihre Antworten werden zur nächsten Runde verdichtet.";
    moveToPhase(nextIndex, nextTitle, insight);
  }

  function goBack() {
    if (state.stage === "profile") {
      if (state.profileIndex > 0) { state.profileIndex -= 1; transitionQuestion(renderProfile); }
      return;
    }
    if (state.stage !== "assessment") return;
    if (state.questionIndex > 0) {
      state.questionIndex -= 1;
      transitionQuestion(renderQuestion);
    } else if (state.phaseIndex > 0) {
      state.phaseIndex -= 1;
      state.questionIndex = currentPhase().questions.length - 1;
      transitionQuestion(renderQuestion);
    } else {
      state.stage = "profile";
      state.profileIndex = PROFILE_STEPS.length - 1;
      transitionQuestion(renderProfile);
    }
  }

  function closeTest() {
    hideAllScreens();
    window.scrollTo({ top: 0, behavior: "smooth" });
    const returnTarget = testReturnFocus;
    testReturnFocus = null;
    restoreFocus(returnTarget);
    toast("Der Test ist geschlossen. Ihre Antworten bleiben in dieser Browsersitzung erhalten.");
  }

  function scoreAssessment() {
    const buckets = Object.fromEntries(Object.keys(DIMENSIONS).map((key) => [key, []]));
    state.answers.forEach((answer) => {
      if (!answer.dimension || !buckets[answer.dimension]) return;
      const value = Number(answer.answer);
      if (value >= 1 && value <= 4) buckets[answer.dimension].push(((value - 1) / 3) * 100);
    });
    const scores = {};
    let weighted = 0;
    let usedWeight = 0;
    Object.entries(DIMENSIONS).forEach(([key, dimension]) => {
      const values = buckets[key];
      const percent = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
      scores[key] = { percent, label: dimension.label, short: dimension.short };
      if (values.length) { weighted += percent * dimension.weight; usedWeight += dimension.weight; }
    });
    const total = usedWeight ? Math.round(weighted / usedWeight) : 0;
    const level = total < 25 ? "KI-Fundament aufbauen" : total < 50 ? "KI-Startklar" : total < 75 ? "KI-Umsetzungsbereit" : "KI-Skalierbar";
    const routine = Number(existingAnswer("routineaufgaben")?.answer || 2);
    const potential = routine <= 1
      ? { label: "Hohes Entlastungspotenzial", note: "Ihre Selbsteinschätzung zeigt starke Belastung durch wiederkehrende Arbeit. Das Potenzial muss an einem konkreten Ablauf gemessen werden." }
      : routine === 2
        ? { label: "Klares Entlastungspotenzial", note: "Wiederkehrende Arbeit bindet spürbar Zeit. Ein abgegrenzter Prozess eignet sich für einen messbaren Test." }
        : routine === 3
          ? { label: "Gezieltes Entlastungspotenzial", note: "Einzelne Zeitfresser sind erkennbar. Priorisieren Sie nach Häufigkeit, Risiko und messbarem Nutzen." }
          : { label: "Selektives Optimierungspotenzial", note: "Routinen laufen bereits effizient. KI sollte nur dort getestet werden, wo ein zusätzlicher messbarer Nutzen plausibel ist." };
    return {
      assessmentVersion: config.assessmentVersion,
      scores: { ...scores, total: { percent: total } },
      level,
      timePotential: potential,
    };
  }

  function breakdownHtml(baseline, detailed = false) {
    return Object.entries(DIMENSIONS).map(([key, dimension]) => {
      const score = baseline.scores[key]?.percent || 0;
      return `<article class="score-row"><div class="score-row-head"><strong>${esc(dimension.label)}</strong><span>${score}/100</span></div><div class="score-bar"><i data-width="${score}"></i></div><p>${esc(detailed && baseline.scores[key]?.summary ? baseline.scores[key].summary : dimension.short)}</p></article>`;
    }).join("");
  }

  function animateBars(root) {
    requestAnimationFrame(() => setTimeout(() => $$('[data-width]', root).forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; }), 80));
  }

  function showScorePreview() {
    state.baseline = scoreAssessment();
    state.stage = "preview";
    saveState();
    hideAllScreens();
    $("#scorePreview").hidden = false;
    document.body.classList.add("modal-open");
    $("#previewScore").textContent = state.baseline.scores.total.percent;
    $("#previewLevel").textContent = state.baseline.level;
    $("#previewBreakdown").innerHTML = breakdownHtml(state.baseline);
    const circumference = 2 * Math.PI * 92;
    const offset = circumference * (1 - state.baseline.scores.total.percent / 100);
    $("#previewDial").style.strokeDasharray = String(circumference);
    requestAnimationFrame(() => { $("#previewDial").style.strokeDashoffset = String(offset); });
    animateBars($("#previewBreakdown"));
    window.scrollTo(0, 0);
    requestAnimationFrame(() => $("#scorePreviewTitle").focus({ preventScroll: true }));
    track("result_preview_viewed", { score: state.baseline.scores.total.percent, level: state.baseline.level }, 16);
    metaEvent("AIReadinessCompleted");
  }

  function openLeadForm() {
    leadFormReturnFocus = document.activeElement;
    formOpenedAt = Date.now();
    $("#leadForm").hidden = false;
    $("#unlockCard").hidden = true;
    $("#scoreMobileCta").hidden = true;
    $("#leadForm").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("#leadFormTitle").focus({ preventScroll: true }), 400);
    track("lead_form_viewed", { score: state.baseline.scores.total.percent }, 17);
  }

  function closeLeadForm() {
    $("#leadForm").hidden = true;
    $("#unlockCard").hidden = false;
    $("#scoreMobileCta").hidden = false;
    $("#unlockCard").scrollIntoView({ behavior: "smooth", block: "center" });
    const returnTarget = leadFormReturnFocus;
    leadFormReturnFocus = null;
    restoreFocus(returnTarget);
  }

  function validateLeadForm(form) {
    const fields = ["firstName", "lastName", "company", "email", "phone"];
    let firstInvalid = null;
    const mark = (name, valid) => {
      const input = form.elements[name];
      input.classList.toggle("invalid", !valid && input.type !== "checkbox");
      input.setAttribute("aria-invalid", valid ? "false" : "true");
      const message = $(`#${name}Error`);
      if (message) message.hidden = valid;
      if (!valid && !firstInvalid) firstInvalid = input;
    };
    fields.forEach((name) => {
      const input = form.elements[name];
      const valid = input.checkValidity() && input.value.trim().length >= (name === "email" ? 5 : 2);
      mark(name, valid);
    });
    const phoneDigits = form.elements.phone.value.replace(/\D/g, "");
    mark("phone", phoneDigits.length >= 7 && phoneDigits.length <= 15);
    mark("callbackConsent", form.elements.callbackConsent.checked);
    mark("aiConsent", form.elements.aiConsent.checked);
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus();
      track("lead_form_validation_error", { field: firstInvalid.name || "consent", error_code: "required_or_invalid" }, 17);
      return false;
    }
    return true;
  }

  async function submitLead(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = $("#leadFormError");
    errorBox.hidden = true;
    if (!validateLeadForm(form)) {
      errorBox.textContent = "Bitte prüfen Sie die markierten Pflichtfelder und beide Einwilligungen.";
      errorBox.hidden = false;
      return;
    }
    const button = $("#submitLead");
    button.disabled = true;
    button.textContent = "Wird sicher gespeichert …";
    if (!(await ensureSession())) {
      errorBox.textContent = "Die sichere Testsitzung konnte nicht erneuert werden. Bitte versuchen Sie es erneut.";
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = "Auswertung & Rückruf anfordern";
      return;
    }
    if (!(await ensureTrackingDecisionForCurrentRun())) {
      toast("Freiwilliges Tracking bleibt aus; Ihre Auswertung kann trotzdem angefordert werden.");
    }
    state.submissionId ||= uuid();
    saveState();
    const contact = {
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
    };
    const payload = {
      submissionId: state.submissionId,
      runId: state.runId,
      trackingSubjectId,
      trackingPreviousDecisionId: consent.globalDecisionId || null,
      website: "",
      formOpenedAt: new Date(formOpenedAt || Date.now()).toISOString(),
      companyProfile: state.profile,
      answers: state.answers,
      contact,
      attribution: metaAttribution(),
      consents: {
        callback: { granted: true, version: config.callbackConsent.version },
        aiProcessing: { granted: true, version: config.aiProcessingConsent.version },
        analytics: { granted: consent.analytics, version: consent.version, grantedAt: consent.analytics ? consent.grantedAt : null },
        marketing: { granted: consent.marketing, version: consent.version, grantedAt: consent.marketing ? consent.grantedAt : null },
      },
    };
    try {
      const response = await fetch(`${API}/submit-lead`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.accepted) throw new Error(result.error || "Der Lead konnte nicht sicher gespeichert werden.");
      if (!result.assessmentId) {
        throw new Error("Die Speicherung wurde nicht bestätigt. Bitte prüfen Sie automatisch ausgefüllte Felder und senden Sie erneut.");
      }
      if (result.trackingConsentDecidedAt) {
        consent.grantedAt = result.trackingConsentDecidedAt;
        consent.decisionId = result.trackingConsentDecisionId || state.submissionId;
        consent.globalDecisionId = result.trackingConsentDecisionId || state.submissionId;
        try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch {}
      }
      state.assessmentId = result.assessmentId;
      state.baseline = result.baseline || state.baseline;
      saveState();
      track("lead_submitted", { score: state.baseline.scores.total.percent, employee_band: state.profile.mitarbeiter }, 17);
      metaEvent("Lead", {}, { eventID: result.leadEventId || state.submissionId });
      await showMeasuringAndAnalyze(result, contact);
    } catch (error) {
      errorBox.textContent = error.message || "Der Lead konnte nicht sicher gespeichert werden. Bitte versuchen Sie es erneut.";
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = "Auswertung & Rückruf anfordern";
    }
  }

  async function showMeasuringAndAnalyze(submissionResult) {
    $("#scorePreview").hidden = true;
    $("#measuringScreen").hidden = false;
    requestAnimationFrame(() => $("#measuringTitle").focus({ preventScroll: true }));
    const steps = $$("#measuringSteps li");
    steps[0].classList.add("done");
    steps[1].classList.add("active");
    const animation = animateMeasuring(steps);
    let result;
    if (submissionResult.preview) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      result = localDetailedResult(state.baseline);
    } else {
      try {
        const response = await fetch(`${API}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: submissionResult.assessmentId,
            submissionId: submissionResult.submissionId,
            analysisToken: submissionResult.analysisToken,
            companyProfile: state.profile,
            answers: state.answers,
            aiProcessingConsent: { granted: true, version: config.aiProcessingConsent.version },
          }),
        });
        const analysis = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(analysis.error || "Analyse fehlgeschlagen");
        result = analysis;
      } catch {
        result = localDetailedResult(state.baseline);
        result.diagnosticNote += " Die sprachliche Detailanalyse war vorübergehend nicht erreichbar; der feste Score und die Empfehlungen bleiben nutzbar.";
      }
    }
    await animation;
    state.result = result;
    saveState();
    renderFullResult();
  }

  async function animateMeasuring(steps) {
    for (let index = 1; index < steps.length; index += 1) {
      steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === index));
      await new Promise((resolve) => setTimeout(resolve, 620));
      steps[index].classList.remove("active");
      steps[index].classList.add("done");
    }
    $("#measuringStatus").textContent = "Auswertung ist bereit.";
  }

  function localDetailedResult(baseline) {
    const templates = {
      prozesse_daten: ["Einen Kernprozess messbar machen", "Ihre Antworten zeigen, dass Informationen und Arbeitsschritte noch nicht durchgängig verlässlich zusammenlaufen.", "Wählen Sie einen häufigen Ablauf und halten Sie Eingang, Schritte, Prüfpunkte und Ergebnis auf einer Seite fest."],
      team_wissen: state.profile.mitarbeiter === "solo"
        ? ["Arbeitswissen verlässlich sichern", "Wissen und digitale Arbeitsweisen sind noch nicht robust genug im eigenen Alltag verankert.", "Dokumentieren Sie fünf wiederkehrende Entscheidungen oder Rückfragen zu einem zentralen Ablauf an einem festen Ort."]
        : ["Schlüsselwissen verlässlich sichern", "Wissen und digitale Arbeitsweisen sind noch nicht robust genug im Arbeitsalltag verteilt.", "Dokumentieren Sie die fünf häufigsten Rückfragen zu einem zentralen Ablauf an einem gemeinsamen Ort."],
      ki_praxis: ["Einen sicheren KI-Anwendungsfall definieren", "KI-Nutzung, Zielbild und Leitplanken greifen noch nicht belastbar ineinander.", "Definieren Sie einen Anwendungsfall ohne sensible Daten mit Ziel, Testumfang und Prüfschritt."],
      umsetzungskraft: state.profile.mitarbeiter === "solo"
        ? ["Verbindliche Umsetzungszeit reservieren", "Der Engpass liegt weniger bei Ideen als bei Priorität, Zeitrahmen und Messung.", "Reservieren Sie ein festes wöchentliches Zeitfenster und einen Zielwert für einen vierwöchigen Test."]
        : ["Verantwortung und Erfolgskriterium festlegen", "Der Engpass liegt weniger bei Ideen als bei Verantwortung, Tempo und Messung.", "Benennen Sie eine verantwortliche Person und einen Zielwert für einen vierwöchigen Test."],
    };
    const matureTemplates = {
      prozesse_daten: ["Stabile Abläufe gezielt erweitern", "Die Prozess- und Datengrundlage trägt bereits. Zusätzliche KI sollte deshalb nur in einem klar begrenzten Ablauf getestet werden, ohne die bestehende Verlässlichkeit zu verschlechtern.", "Wählen Sie einen stabilen Ablauf und definieren Sie vor dem Test einen Zielwert sowie ein Qualitätskriterium."],
      team_wissen: state.profile.mitarbeiter === "solo"
        ? ["Bewährte eigene Arbeitsweisen ausbauen", "Wissen und digitale Arbeitsweisen bilden bereits eine belastbare Grundlage. Der nächste Schritt ist, eine bewährte eigene Routine messbar weiterzuentwickeln.", "Wählen Sie eine gut funktionierende eigene Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll."]
        : ["Bewährte Arbeitsweisen gezielt ausbauen", "Wissen und digitale Arbeitsweisen bilden bereits eine belastbare Grundlage. Der nächste Schritt ist, eine bewährte Routine messbar weiterzuentwickeln.", "Wählen Sie eine gut funktionierende Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll."],
      ki_praxis: ["Sichere KI-Praxis vertiefen", "KI-Nutzung, Zielbild und Leitplanken sind bereits gut aufeinander abgestimmt. Jetzt zählt ein Vergleich, der zusätzlichen Nutzen nachvollziehbar belegt.", "Vergleichen Sie einen klar abgegrenzten KI-Anwendungsfall vier Wochen lang mit dem bisherigen Ablauf."],
      umsetzungskraft: ["Umsetzung systematisch skalieren", "Priorität, Tempo und Erfolgsmessung sind bereits tragfähig. Ein nächster Test sollte deshalb vor allem die Entscheidung über eine sinnvolle Skalierung vorbereiten.", "Legen Sie für den nächsten Test vorab Fortführen-, Anpassen- und Stoppen-Kriterien fest."],
    };
    const copyFor = (key) => {
      const score = baseline.scores[key].percent;
      if (score < 65) return templates[key];
      const copy = [...matureTemplates[key]];
      const rating = score >= 85 ? "bereits eine sehr belastbare Stärke" : "eine solide Grundlage";
      copy[1] = `${DIMENSIONS[key].label} ist mit ${score} von 100 Punkten ${rating}. ${copy[1]}`;
      return copy;
    };
    const ranked = Object.keys(DIMENSIONS).sort((a, b) => baseline.scores[a].percent - baseline.scores[b].percent);
    const strongest = [...ranked].reverse()[0];
    const weakest = ranked[0];
    const lowest = baseline.scores[weakest].percent;
    const highest = baseline.scores[strongest].percent;
    const balanced = highest - lowest <= 5;
    const allMature = lowest >= 85;
    const comparison = allMature
      ? "Alle vier Bereiche sind bereits sehr belastbar; es gibt keinen einzelnen Schwachpunkt."
      : balanced
        ? "Die vier Teilwerte liegen eng beieinander; kein Bereich sticht als einzelner Engpass hervor."
        : `Ihre stärkste Grundlage ist ${DIMENSIONS[strongest].label}; ${lowest >= 65 ? "das größte relative Ausbaupotenzial" : "den größten Entwicklungsbedarf"} zeigt ${DIMENSIONS[weakest].label}.`;
    const leverage = balanced
      ? [
          "Nächsten messbaren KI-Test auswählen",
          allMature
            ? "Die vier Teilwerte liegen auf einem durchgängig hohen Niveau. Der größte Nutzen entsteht jetzt durch einen kleinen Vergleichstest mit klarer Qualitäts- und Wirkungsmessung."
            : "Die Teilwerte sind ausgewogen. Statt einen vermeintlichen Schwachpunkt zu behandeln, sollte der nächste Test nach messbarem Nutzen und geringem Risiko ausgewählt werden.",
        ]
      : copyFor(weakest);
    const recos = ranked.slice(0, 3).map((key, index) => {
      const copy = copyFor(key);
      return { titel: copy[0], beobachtung: copy[1], naechsterSchritt: copy[2], aufwand: index ? "mittel" : "gering", wirkung: index ? "hoch" : "sehr hoch" };
    });
    return {
      ...baseline,
      gesamteinschaetzung: `Mit ${baseline.scores.total.percent} von 100 Punkten liegt Ihr Unternehmen im Reifegrad „${baseline.level}“. ${comparison} Beginnen Sie mit einem eng begrenzten Test, dessen Wirkung vorher messbar ist.`,
      groessterHebel: { titel: leverage[0], begruendung: leverage[1] },
      empfehlungen: recos,
      roadmap: {
        phase1: { zeitraum: "Tage 1–30", titel: "Fundament klären", punkte: [recos[0].naechsterSchritt, "Ausgangswert und Ziel dokumentieren"] },
        phase2: { zeitraum: "Tage 31–60", titel: "Klein testen", punkte: [recos[1].naechsterSchritt, state.profile.mitarbeiter === "solo" ? "Test in einem klar abgegrenzten eigenen Arbeitsablauf durchführen" : "Test mit einer klaren Nutzergruppe durchführen"] },
        phase3: { zeitraum: "Tage 61–90", titel: "Wirkung entscheiden", punkte: [recos[2].naechsterSchritt, "Ergebnis messen und nächste Stufe bewusst freigeben"] },
      },
      diagnosticNote: "Strukturierte Selbsteinschätzung mit fester Bewertungslogik; keine Zertifizierung oder Erfolgsgarantie.",
    };
  }

  function renderFullResult() {
    const result = state.result;
    state.stage = "result";
    $("#measuringScreen").hidden = true;
    $("#fullResult").hidden = false;
    document.body.classList.add("modal-open");
    $("#resultScore").textContent = result.scores.total.percent;
    $("#resultLevel").textContent = result.level;
    $("#resultVerdict").textContent = result.gesamteinschaetzung;
    $("#resultBreakdown").innerHTML = breakdownHtml(result, true);
    animateBars($("#resultBreakdown"));
    $("#leverTitle").textContent = result.groessterHebel?.titel || "Ihr sinnvollster nächster Schritt";
    $("#leverReason").textContent = result.groessterHebel?.begruendung || "Beginnen Sie dort, wo Aufwand und Wirkung am klarsten messbar sind.";
    $("#timePotential").textContent = result.timePotential?.label || "—";
    $("#timeNote").textContent = result.timePotential?.note || "Orientierungswert, kein Leistungsversprechen.";
    $("#recommendations").innerHTML = (result.empfehlungen || []).map((item, index) => `<article class="recommendation"><span>0${index + 1}</span><div><h3>${esc(item.titel)}</h3><p>${esc(item.beobachtung)}</p><p class="next-step"><strong>Diese Woche:</strong> ${esc(item.naechsterSchritt)}</p></div><div class="tags"><span class="tag">Aufwand ${esc(item.aufwand)}</span><span class="tag accent">Wirkung ${esc(item.wirkung)}</span></div></article>`).join("");
    const roadmap = result.roadmap || {};
    $("#roadmap").innerHTML = ["phase1", "phase2", "phase3"].map((key) => roadmap[key]).filter(Boolean).map((phase) => `<article><small>${esc(phase.zeitraum)}</small><h3>${esc(phase.titel)}</h3><ul>${(phase.punkte || []).map((point) => `<li>${esc(point)}</li>`).join("")}</ul></article>`).join("");
    $("#diagnosticNote").textContent = result.diagnosticNote || "Strukturierte Selbsteinschätzung; keine Zertifizierung oder Erfolgsgarantie.";
    const calendar = new URL(config.calendarUrl);
    calendar.searchParams.set("utm_source", "ki-readiness");
    calendar.searchParams.set("utm_medium", "result");
    calendar.searchParams.set("utm_campaign", "ai_readiness_result");
    $("#calendarCta").href = calendar.toString();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => $("#resultTitle").focus({ preventScroll: true }));
    track("report_viewed", { score: result.scores.total.percent, level: result.level }, 18);
    saveState();
  }

  function restart() {
    if (!confirm("Möchten Sie den Test wirklich neu starten? Ihre bisherigen Antworten und dieses Ergebnis werden in diesem Browser verworfen.")) return;
    clearState();
    state = freshState();
    sessionReady = false;
    freshSessionRequired = false;
    hideAllScreens();
    window.scrollTo({ top: 0, behavior: "smooth" });
    const returnTarget = testReturnFocus;
    testReturnFocus = null;
    restoreFocus(returnTarget);
  }

  function initEvents() {
    $$('[data-start-test]').forEach((button) => button.addEventListener("click", startTest));
    $$('[data-cookie-settings]').forEach((button) => button.addEventListener("click", openConsentSettings));
    $("#backButton").addEventListener("click", goBack);
    $("#closeButton").addEventListener("click", closeTest);
    $("#openLeadForm").addEventListener("click", openLeadForm);
    $("#openLeadFormTop").addEventListener("click", openLeadForm);
    $("#closeLeadForm").addEventListener("click", closeLeadForm);
    $("#leadForm").addEventListener("submit", submitLead);
    $("#leadForm").addEventListener("input", (event) => {
      const input = event.target;
      if (!input?.name) return;
      input.classList.remove("invalid");
      input.setAttribute("aria-invalid", "false");
      const message = $(`#${input.name}Error`);
      if (message) message.hidden = true;
    });
    $("#restartFromPreview").addEventListener("click", restart);
    $("#restartResult").addEventListener("click", restart);
    $("#calendarCta").addEventListener("click", () => track("calendar_cta_clicked", { score: state.result?.scores?.total?.percent || 0 }, 19));
    $("#acceptAll").addEventListener("click", () => { void saveConsent(true, true); });
    $("#necessaryOnly").addEventListener("click", () => { void saveConsent(false, false); });
    $("#customizeConsent").addEventListener("click", openConsentSettings);
    $("#saveConsent").addEventListener("click", () => { void saveConsent($("#analyticsToggle").checked, $("#marketingToggle").checked); });
    $("#closeConsentSettings").addEventListener("click", closeConsentDialog);
    addEventListener("storage", handleConsentStorage);
    addEventListener("scroll", () => {
      if (state.stage !== "landing" || !consent.analytics) return;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max <= 0) return;
      const depth = Math.round((scrollY / max) * 100);
      [25, 50, 75, 90].forEach((milestone) => {
        if (depth >= milestone && !scrollMilestones.has(milestone)) {
          scrollMilestones.add(milestone);
          track("scroll_depth", { depth: milestone });
        }
      });
    }, { passive: true });
    addEventListener("pagehide", () => {
      const seconds = Math.round((Date.now() - sessionStartedAt) / 1000);
      const bucket = seconds < 30 ? "0-30" : seconds < 120 ? "31-120" : seconds < 300 ? "121-300" : "300+";
      track("session_duration", { duration_bucket: bucket });
    });
    addEventListener("scroll", () => $("#siteNav").classList.toggle("scrolled", scrollY > 16), { passive: true });
  }

  initEvents();
  restoreState();
  void loadConsent();
})();

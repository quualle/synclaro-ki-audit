(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const API = "/.netlify/functions";
  const CONSENT_STATE = window.SynclaroConsentState;
  const STATE_KEY = "synclaro_ai_readiness_state_v8";
  const CONSENT_KEY = "synclaro_ai_readiness_consent_v1";
  const CONSENT_SUBJECT_KEY = "synclaro_ai_readiness_consent_subject_v1";
  const ATTRIBUTION_KEY = "synclaro_ai_readiness_attribution_v1";
  const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
  const DEFAULT_CONFIG = {
    assessmentVersion: "2026-07-19.v5",
    privacyVersion: "privacy-ai-readiness-v3-2026-07-19",
    cookieConsentVersion: "cookie-v1-2026-07-18",
    newsletterConsent: { version: "newsletter-email-v1-2026-07-19", text: "Ja, ich möchte regelmäßig praxistaugliche KI-Impulse, Einladungen und Angebote von Synclaro per E-Mail erhalten. Die Anmeldung wird per Double-Opt-in bestätigt; eine Abmeldung ist jederzeit möglich." },
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
      label: "Was bietet Ihr Unternehmen an – und in welcher Branche?",
      help: "Eine kurze, konkrete Bezeichnung hilft, passende Anwendungsfälle auszuwählen.",
      placeholder: "z. B. Gebäudereinigung für Büros oder Steuerberatung für Arztpraxen",
    },
  ];
  const CONTACT_STEPS = [
    { id: "firstName", label: "Wie dürfen wir Sie ansprechen?", autocomplete: "given-name", maxlength: 80, error: "Bitte geben Sie Ihren Vornamen ein." },
    { id: "lastName", label: "Und wie lautet Ihr Nachname?", autocomplete: "family-name", maxlength: 100, error: "Bitte geben Sie Ihren Nachnamen ein." },
    { id: "company", label: "Für welches Unternehmen machen Sie den Test?", autocomplete: "organization", maxlength: 160, error: "Bitte nennen Sie Ihr Unternehmen oder Ihre selbstständige Tätigkeit." },
    { id: "email", label: "Welche E-Mail-Adresse gehört zu Ihrer Auswertung?", autocomplete: "email", maxlength: 254, type: "email", inputmode: "email", error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
  ];
  const ADAPTIVE_VERSION = "adaptive-v1";
  const AI_PROCESSING_VERSION = "ai-processing-v1-2026-07-19";
  const CORE_QUESTION_COUNT = 8;
  const OPTIONAL_CONTEXT_COUNT = 1;
  const TOTAL_JOURNEY_STEPS = PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT + CONTACT_STEPS.length;
  const OPTIONAL_CONTEXT_QUESTION = {
    id: "haupthebel",
    type: "textarea",
    required: false,
    label: "Welcher Arbeitsablauf soll in den nächsten 90 Tagen spürbar besser laufen?",
    help: "Optional: Nennen Sie möglichst Ablauf und gewünschten Effekt. Bitte keine Personen-, Kunden- oder vertraulichen Daten eingeben.",
    placeholder: "Zum Beispiel: Angebote schneller erstellen oder Terminausfälle reduzieren …",
  };

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
  let toastTimer = null;
  let adaptiveRequestController = null;
  let adaptiveRequestGeneration = 0;
  let answerAdvanceTimer = null;
  let answerAdvanceGeneration = 0;
  let landingTracked = false;
  let landingTrackPromise = null;
  let consentSaving = false;
  let pendingConsentIntent = null;
  let consentReturnFocus = null;
  let testReturnFocus = null;
  let currentInteractionLayer = null;
  const scrollMilestones = new Set();
  const sessionStartedAt = Date.now();

  function renderRuntimeConfig() {
    $("#analyticsConsentText").textContent = config.analyticsConsent.text;
    $("#marketingConsentText").textContent = config.marketingConsent.text;
    $("#calendarCta").href = config.calendarUrl;
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
      questions: [],
      questionIndex: 0,
      answers: [],
      contact: {},
      contactIndex: 0,
      baseline: null,
      assessmentId: null,
      submissionId: null,
      bookingReference: null,
      newsletterStatus: null,
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
    return ["assessmentApp", "fullResult"]
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
    const targets = { fullResult: "#resultTitle" };
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
      } else if (["assessmentApp", "fullResult"].includes(layer.id)) {
        event.preventDefault();
        closeTest();
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
  ["consentLayer", "assessmentApp", "fullResult"]
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
      const validStage = ["profile", "assessment", "contact", "result"].includes(saved?.stage);
      if (!freshEnough || !validStage || !saved.profile || !Array.isArray(saved.answers) || !Array.isArray(saved.questions)) return false;
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
    ["assessmentApp", "fullResult"].forEach((id) => { $(`#${id}`).hidden = true; });
    refreshInteractionLayer();
  }

  function showOnlyScreen(id) {
    hideAllScreens();
    $(`#${id}`).hidden = false;
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
    if (state.stage === "assessment" && currentQuestion()) {
      hideAllScreens();
      $("#assessmentApp").hidden = false;
      document.body.classList.add("modal-open");
      renderQuestion();
      return;
    }
    if (state.stage === "contact" && state.baseline) {
      hideAllScreens();
      $("#assessmentApp").hidden = false;
      document.body.classList.add("modal-open");
      renderContactStep();
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
    const remaining = Math.max(1, Math.ceil((total - completed) * .19));
    $("#progressTime").textContent = completed >= total ? "fast geschafft" : `noch ca. ${remaining} Min.`;
    $("#progressBar").style.width = `${Math.max(2, Math.min(100, (completed / total) * 100))}%`;
  }

  function optionHtml(option, selected) {
    return `<button class="option${selected ? " selected" : ""}" type="button" aria-pressed="${selected ? "true" : "false"}" data-value="${esc(option.value)}"><span class="marker" aria-hidden="true"></span><strong>${esc(option.label)}</strong></button>`;
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
    updateProgress("Unternehmensprofil", state.profileIndex, TOTAL_JOURNEY_STEPS);
    $("#backButton").style.visibility = state.profileIndex === 0 ? "hidden" : "visible";
    const current = state.profile[item.id] || "";
    let body = `<article class="question-card"><p class="question-index">${esc(item.kicker)}</p><h1 id="questionTitle" tabindex="-1">${esc(item.label)}</h1>${item.help ? `<p class="question-help">${esc(item.help)}</p>` : ""}`;
    if (item.type === "text") {
      const aiNotice = item.id === "branche"
        ? `<aside class="ai-processing-note"><strong>Ab hier arbeitet die Diagnose adaptiv.</strong><span>Für die Auswahl der nächsten Frage übermitteln wir Branche, Größe, Rolle, Ziel und Testantworten ohne Kontaktdaten an OpenRouter und das Modell GPT‑5.5. Bitte geben Sie keine Personen-, Kunden- oder vertraulichen Daten ein.</span></aside>`
        : "";
      body += `<div class="question-field"><input id="profileText" aria-labelledby="questionTitle" maxlength="80" autocomplete="off" placeholder="${esc(item.placeholder)}"></div>${aiNotice}<div class="question-actions"><button class="button button-accent" id="profileNext" type="button">${item.id === "branche" ? "Adaptive Diagnose starten" : "Weiter"}</button></div>`;
    } else {
      body += `<div class="option-list" role="group" aria-labelledby="questionTitle">${item.options.map((option) => optionHtml(option, current === option.value)).join("")}</div>`;
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
        if (button.dataset.locked) return;
        cancelAnswerAdvance();
        const generation = answerAdvanceGeneration;
        const profileIndex = state.profileIndex;
        const itemId = item.id;
        state.profile[item.id] = button.dataset.value;
        $$(".option", $("#questionHost")).forEach((other) => {
          const selected = other === button;
          other.classList.toggle("selected", selected);
          other.setAttribute("aria-pressed", selected ? "true" : "false");
          other.dataset.locked = "true";
          other.disabled = true;
        });
        saveState();
        answerAdvanceTimer = setTimeout(() => {
          answerAdvanceTimer = null;
          if (generation !== answerAdvanceGeneration || state.stage !== "profile" || state.profileIndex !== profileIndex || PROFILE_STEPS[state.profileIndex]?.id !== itemId) return;
          advanceProfile();
        }, 190);
      }));
    }
    saveState();
  }

  function advanceProfile() {
    if (state.profileIndex < PROFILE_STEPS.length - 1) {
      state.profileIndex += 1;
      transitionQuestion(renderProfile);
    } else {
      cancelAdaptiveQuestionRequest();
      state.questions = [];
      state.answers = [];
      state.questionIndex = 0;
      saveState();
      track("profile_completed", { employee_band: state.profile.mitarbeiter, respondent_role: state.profile.rolle }, 4);
      void startAssessment();
    }
  }

  function validAdaptiveQuestion(question, index) {
    if (!question || typeof question !== "object") return false;
    if (!question.id || !question.dimension || question.type !== "radio" || question.required !== true) return false;
    if (!Array.isArray(question.options) || question.options.length !== 4) return false;
    if (!question.options.every((option, optionIndex) => option.value === String(optionIndex + 1) && String(option.label || "").trim())) return false;
    return !state.questions.slice(0, index).some((item) => item.id === question.id);
  }

  function cancelAdaptiveQuestionRequest() {
    adaptiveRequestGeneration += 1;
    adaptiveRequestController?.abort();
    adaptiveRequestController = null;
  }

  function cancelAnswerAdvance() {
    answerAdvanceGeneration += 1;
    if (answerAdvanceTimer) clearTimeout(answerAdvanceTimer);
    answerAdvanceTimer = null;
  }

  async function fetchAdaptiveQuestion(index, signal) {
    const response = await fetch(`${API}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        protocolVersion: ADAPTIVE_VERSION,
        companyProfile: state.profile,
        previousAnswers: state.answers
          .filter((answer) => answer.questionType !== "textarea")
          .map((answer) => ({ questionId: answer.questionId, value: answer.answer })),
        questionNumber: index + 1,
        aiProcessing: { acknowledged: true, version: AI_PROCESSING_VERSION },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    if (payload.totalQuestions !== CORE_QUESTION_COUNT || !validAdaptiveQuestion(payload.question, index)) throw new Error("schema");
    return { ...payload.question, selectionMode: payload.selectionMode || "fallback", modelLabel: payload.modelLabel || null };
  }

  function renderAdaptiveLoading(index) {
    state.stage = "assessment";
    showOnlyScreen("assessmentApp");
    document.body.classList.add("modal-open");
    updateProgress(`Adaptive Diagnose · Frage ${index + 1}/${CORE_QUESTION_COUNT}`, PROFILE_STEPS.length + index, TOTAL_JOURNEY_STEPS);
    $("#backButton").style.visibility = "visible";
    $("#questionHost").innerHTML = `<article class="question-card adaptive-loading" role="status" aria-live="polite">
      <p class="question-index">Adaptive Diagnose · Frage ${index + 1} von ${CORE_QUESTION_COUNT}</p>
      <h1 id="questionTitle" tabindex="-1">Ihre Antwort schärft die nächste Frage.</h1>
      <p class="question-help">GPT‑5.5 prüft, welcher Messanker in Ihrem Branchenkontext jetzt den größten Erkenntnisgewinn liefert.</p>
      <div class="adaptive-loading-steps" aria-hidden="true"><span>Profil verstanden</span><span>Antwort eingeordnet</span><span class="active">Folgefrage gewählt</span></div>
    </article>`;
    focusQuestionTitle();
  }

  async function loadAdaptiveQuestion(index) {
    cancelAdaptiveQuestionRequest();
    if (state.questions[index]) {
      state.questionIndex = index;
      renderQuestion();
      return;
    }
    const generation = adaptiveRequestGeneration;
    const controller = new AbortController();
    adaptiveRequestController = controller;
    state.questionIndex = index;
    saveState();
    renderAdaptiveLoading(index);
    try {
      const question = await fetchAdaptiveQuestion(index, controller.signal);
      if (generation !== adaptiveRequestGeneration || controller.signal.aborted || state.stage !== "assessment" || state.questionIndex !== index) return;
      state.questions[index] = question;
      state.questionIndex = index;
      saveState();
      renderQuestion();
      track("adaptive_question_started", { question_number: String(index + 1), selection_mode: question.selectionMode }, index + 1);
    } catch (error) {
      if (generation !== adaptiveRequestGeneration || controller.signal.aborted || error?.name === "AbortError") return;
      $("#questionHost").innerHTML = `<article class="question-card"><p class="question-index">Verbindung unterbrochen</p><h1 id="questionTitle" tabindex="-1">Die nächste Frage konnte nicht sicher geladen werden.</h1><p class="question-help">Ihre bisherigen Antworten bleiben in dieser Browsersitzung erhalten. Bei einem Modellfehler liefert der Server automatisch eine geprüfte Ersatzfrage; hier ist die Verbindung selbst abgebrochen.</p><div class="question-actions"><button class="button button-accent" id="retryQuestion" type="button">Erneut versuchen</button></div></article>`;
      focusQuestionTitle();
      $("#retryQuestion").addEventListener("click", () => loadAdaptiveQuestion(index));
    } finally {
      if (generation === adaptiveRequestGeneration) adaptiveRequestController = null;
    }
  }

  async function startAssessment() {
    state.stage = "assessment";
    state.questionIndex = Math.max(0, Math.min(state.questionIndex || 0, state.questions.length - 1));
    if (currentQuestion()) renderQuestion();
    else await loadAdaptiveQuestion(0);
  }

  function currentQuestion() { return state.questions[state.questionIndex]; }
  function existingAnswer(id) { return state.answers.find((answer) => answer.questionId === id); }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const completed = PROFILE_STEPS.length + state.questionIndex;
    const optionalContext = question.required === false;
    const progressLabel = optionalContext
      ? "Adaptive Diagnose · optionaler Kontext"
      : `Adaptive Diagnose · Frage ${state.questionIndex + 1}/${CORE_QUESTION_COUNT}`;
    updateProgress(progressLabel, completed, TOTAL_JOURNEY_STEPS);
    $("#backButton").style.visibility = "visible";
    const existing = existingAnswer(question.id);
    const questionIndex = optionalContext
      ? "Ihr konkreter Fokus · optional, nicht Teil des Scores"
      : `${esc(DIMENSIONS[question.dimension]?.label || "Readiness")} · ${state.questionIndex + 1} von ${CORE_QUESTION_COUNT}`;
    const rationale = !optionalContext && question.whyNow
      ? `<aside class="adaptive-rationale"><strong>Warum diese Frage jetzt?</strong><span>${esc(question.whyNow)}</span></aside>`
      : "";
    const helper = question.type === "textarea"
      ? question.help || "Optional — ein oder zwei konkrete Sätze genügen. Bitte keine Namen, Kontakt- oder Kundendaten eingeben."
      : question.help || "";
    const describedBy = helper ? ' aria-describedby="questionHelp"' : "";
    let body = `<article class="question-card"><p class="question-index">${questionIndex}</p>${rationale}<h1 id="questionTitle" tabindex="-1"${describedBy}>${esc(question.label)}</h1>${helper ? `<p class="question-help" id="questionHelp">${esc(helper)}</p>` : ""}`;
    if (question.type === "textarea") {
      body += `<div class="question-field"><textarea id="answerText" aria-labelledby="questionTitle" aria-describedby="questionHelp" maxlength="700" placeholder="${esc(question.placeholder || "Ihre Antwort …")}"></textarea></div><div class="question-actions"><button class="button button-accent" id="answerNext" type="button">Weiter</button><button class="text-button" id="answerSkip" type="button">Überspringen</button></div>`;
    } else {
      body += `<div class="option-list" role="group" aria-labelledby="questionTitle"${helper ? ' aria-describedby="questionHelp"' : ""}>${(question.options || []).map((option) => optionHtml(option, existing?.answer === option.value)).join("")}</div>`;
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
        cancelAnswerAdvance();
        const generation = answerAdvanceGeneration;
        const questionId = question.id;
        $$(".option", $("#questionHost")).forEach((other) => {
          const selected = other === button;
          other.classList.toggle("selected", selected);
          other.setAttribute("aria-pressed", selected ? "true" : "false");
          other.dataset.locked = "true";
          other.disabled = true;
        });
        const option = question.options.find((item) => item.value === button.dataset.value);
        recordAnswer(question, option.value, option.label);
        answerAdvanceTimer = setTimeout(() => {
          answerAdvanceTimer = null;
          if (generation !== answerAdvanceGeneration || state.stage !== "assessment" || currentQuestion()?.id !== questionId) return;
          void advanceQuestion();
        }, 190);
      }));
    }
    saveState();
  }

  function recordAnswer(question, answer, answerLabel) {
    const previous = existingAnswer(question.id);
    const pathChanged = previous && previous.answer !== answer;
    if (pathChanged && state.questionIndex < state.questions.length - 1) {
      const retainedIds = new Set(state.questions.slice(0, state.questionIndex + 1).map((item) => item.id));
      state.answers = state.answers.filter((item) => retainedIds.has(item.questionId));
      state.questions = state.questions.slice(0, state.questionIndex + 1);
    }
    const entry = {
      questionId: question.id,
      questionLabel: question.label,
      questionType: question.type,
      dimension: question.dimension || null,
      answer,
      answerLabel,
      sequence: state.questionIndex + 1,
    };
    const index = state.answers.findIndex((item) => item.questionId === question.id);
    if (index >= 0) state.answers[index] = entry;
    else state.answers.push(entry);
    saveState();
  }

  async function advanceQuestion() {
    const question = currentQuestion();
    if (question?.required === false) return startContactCapture();
    const nextIndex = state.questionIndex + 1;
    if (nextIndex === CORE_QUESTION_COUNT) {
      state.questions[nextIndex] = OPTIONAL_CONTEXT_QUESTION;
      state.questionIndex = nextIndex;
      saveState();
      transitionQuestion(renderQuestion);
      return;
    }
    if (state.questions[nextIndex]) {
      state.questionIndex = nextIndex;
      transitionQuestion(renderQuestion);
      return;
    }
    await loadAdaptiveQuestion(nextIndex);
  }

  function goBack() {
    cancelAnswerAdvance();
    cancelAdaptiveQuestionRequest();
    if (state.stage === "profile") {
      if (state.profileIndex > 0) { state.profileIndex -= 1; transitionQuestion(renderProfile); }
      return;
    }
    if (state.stage === "contact") {
      if (state.contactIndex > 0) {
        state.contactIndex -= 1;
        transitionQuestion(renderContactStep);
      } else {
        state.stage = "assessment";
        state.questionIndex = state.questions.length - 1;
        transitionQuestion(renderQuestion);
      }
      saveState();
      return;
    }
    if (state.stage !== "assessment") return;
    if (state.questionIndex > 0) {
      state.questionIndex -= 1;
      transitionQuestion(renderQuestion);
    } else {
      state.stage = "profile";
      state.profileIndex = PROFILE_STEPS.length - 1;
      transitionQuestion(renderProfile);
    }
  }

  function closeTest() {
    cancelAnswerAdvance();
    cancelAdaptiveQuestionRequest();
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
    const balanced = baseline.advisory?.diagnosis?.balanced === true;
    const strongest = balanced ? null : baseline.advisory?.diagnosis?.strongest?.key;
    const weakest = balanced ? null : baseline.advisory?.diagnosis?.weakest?.key;
    return Object.entries(DIMENSIONS).map(([key, dimension]) => {
      const score = baseline.scores[key]?.percent || 0;
      const marker = key === strongest ? "Stärke" : key === weakest ? "Fokus" : "Teilwert";
      const classes = ["score-row", key === strongest ? "is-strength" : "", key === weakest ? "is-focus" : ""].filter(Boolean).join(" ");
      return `<article class="${classes}"><div class="score-row-head"><strong>${esc(dimension.label)}</strong><span><small>${marker}</small>${score}/100</span></div><div class="score-bar" role="progressbar" aria-label="${esc(dimension.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><i data-width="${score}"></i></div><p>${esc(detailed && baseline.scores[key]?.summary ? baseline.scores[key].summary : dimension.short)}</p></article>`;
    }).join("");
  }

  function animateBars(root) {
    requestAnimationFrame(() => setTimeout(() => $$('[data-width]', root).forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; }), 80));
  }

  function startContactCapture() {
    cancelAnswerAdvance();
    cancelAdaptiveQuestionRequest();
    state.baseline = scoreAssessment();
    state.stage = "contact";
    state.contactIndex = Math.max(0, Math.min(CONTACT_STEPS.length - 1, state.contactIndex || 0));
    formOpenedAt = Date.now();
    saveState();
    track("phase_completed", { phase: "assessment", question_count: state.answers.length }, PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT);
    metaEvent("AIReadinessCompleted", { assessment_version: config.assessmentVersion });
    renderContactStep();
    track("lead_form_viewed", { employee_band: state.profile.mitarbeiter }, PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT);
  }

  function validContactValue(step, value) {
    const clean = String(value || "").trim();
    if (step.id === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean) && clean.length <= step.maxlength;
    return clean.length >= 2 && clean.length <= step.maxlength;
  }

  function renderContactStep() {
    const step = CONTACT_STEPS[state.contactIndex];
    if (!step) return;
    state.stage = "contact";
    updateProgress(`Auswertung · ${state.contactIndex + 1}/${CONTACT_STEPS.length}`, PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT + state.contactIndex, TOTAL_JOURNEY_STEPS);
    $("#backButton").style.visibility = "visible";
    const isFinal = state.contactIndex === CONTACT_STEPS.length - 1;
    const stored = state.contact?.[step.id] || "";
    const newsletterChecked = state.contact?.newsletter === true;
    const inputAttributes = [
      `type="${esc(step.type || "text")}"`,
      `name="${esc(step.id)}"`,
      `id="contactValue"`,
      `autocomplete="${esc(step.autocomplete)}"`,
      `maxlength="${step.maxlength}"`,
      step.inputmode ? `inputmode="${esc(step.inputmode)}"` : "",
      `aria-labelledby="questionTitle"`,
      `aria-describedby="contactFieldError"`,
      "required",
    ].filter(Boolean).join(" ");
    const finalContent = isFinal ? `
      <label class="check-row newsletter-choice"><input type="checkbox" name="newsletter"${newsletterChecked ? " checked" : ""}><span><strong>Freiwillige KI-Impulse per E-Mail</strong><small>${esc(config.newsletterConsent.text)}</small></span></label>
      <p class="result-privacy-note">Mit Klick auf „Meine Auswertung erstellen“ verarbeiten wir Ihre Angaben zur Zuordnung, Speicherung und unmittelbaren Anzeige. Das Modell erhält weiterhin keine Kontakt- oder Trackingdaten. Die Newsletter-Einwilligung ist freiwillig. <a href="https://synclaro.de/datenschutz#ki-readiness-test" target="_blank" rel="noopener">Datenschutzhinweise</a></p>
      <input class="form-honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-error" id="leadFormError" role="alert" hidden></div>` : "";
    const contactIntro = state.contactIndex === 0
      ? '<aside class="phase-context contact-intro"><strong>Ihre Diagnosefragen sind vollständig.</strong><span>Noch vier Angaben für die sichere Zuordnung und Anzeige: Vorname, Nachname, Unternehmen und E-Mail. Kein Rückruf; Newsletter nur freiwillig.</span></aside>'
      : "";
    $("#questionHost").innerHTML = `<form class="question-card contact-step" id="contactStepForm" novalidate>
      <p class="question-index">Fast geschafft · ${state.contactIndex + 1} von ${CONTACT_STEPS.length}</p>
      ${contactIntro}
      <h1 id="questionTitle" tabindex="-1">${esc(step.label)}</h1>
      <div class="question-field"><input ${inputAttributes} value="${esc(stored)}"><small class="field-error" id="contactFieldError" hidden>${esc(step.error)}</small></div>
      ${finalContent}
      <div class="question-actions"><button class="button button-accent${isFinal ? " button-large" : ""}" id="contactNext" type="submit">${isFinal ? "Meine Auswertung erstellen" : "Weiter"}</button></div>
      ${isFinal && !config.production ? '<p class="preview-notice">Preview-Modus: Es werden keine Lead-, E-Mail-, Meta- oder Telegram-Daten übertragen.</p>' : ""}
    </form>`;
    const form = $("#contactStepForm");
    const input = $("#contactValue");
    setTimeout(() => input.focus(), 50);
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
      input.setAttribute("aria-invalid", "false");
      $("#contactFieldError").hidden = true;
    });
    form.addEventListener("submit", (event) => {
      const value = input.value.trim();
      if (!validContactValue(step, value)) {
        event.preventDefault();
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        $("#contactFieldError").hidden = false;
        input.focus();
        track("lead_form_validation_error", { field: step.id, error_code: "required_or_invalid" }, PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT + state.contactIndex);
        return;
      }
      state.contact[step.id] = value;
      if (!isFinal) {
        event.preventDefault();
        state.contactIndex += 1;
        saveState();
        transitionQuestion(renderContactStep);
        return;
      }
      state.contact.newsletter = form.elements.newsletter.checked;
      saveState();
      void submitLead(event);
    });
    saveState();
  }

  async function submitLead(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = $("#leadFormError");
    errorBox.hidden = true;
    const button = $("#contactNext");
    button.disabled = true;
    button.textContent = "Ihre KI-Auswertung entsteht …";
    if (!(await ensureSession())) {
      errorBox.textContent = "Die sichere Testsitzung konnte nicht erneuert werden. Bitte versuchen Sie es erneut.";
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = "Meine Auswertung erstellen";
      return;
    }
    if (!(await ensureTrackingDecisionForCurrentRun())) {
      toast("Freiwilliges Tracking bleibt aus; Ihre Auswertung kann trotzdem angefordert werden.");
    }
    state.submissionId ||= uuid();
    saveState();
    const contact = {
      firstName: state.contact.firstName.trim(),
      lastName: state.contact.lastName.trim(),
      company: state.contact.company.trim(),
      email: state.contact.email.trim(),
    };
    const payload = {
      submissionId: state.submissionId,
      runId: state.runId,
      trackingSubjectId,
      trackingPreviousDecisionId: consent.globalDecisionId || null,
      website: form.elements.website?.value || "",
      formOpenedAt: new Date(formOpenedAt || Date.now()).toISOString(),
      companyProfile: state.profile,
      answers: state.answers,
      adaptiveVersion: ADAPTIVE_VERSION,
      aiProcessing: { acknowledged: true, version: AI_PROCESSING_VERSION },
      contact,
      attribution: metaAttribution(),
      consents: {
        privacyNotice: { acknowledged: true, version: config.privacyVersion },
        newsletter: {
          granted: state.contact.newsletter === true,
          version: config.newsletterConsent.version,
          text: config.newsletterConsent.text,
        },
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
      state.bookingReference = result.bookingReference || null;
      state.newsletterStatus = result.newsletterStatus || (result.preview && state.contact.newsletter ? "preview_not_sent" : state.contact.newsletter ? "doi_pending" : "not_requested");
      state.baseline = result.baseline || state.baseline;
      saveState();
      track("lead_submitted", { score: state.baseline.scores.total.percent, employee_band: state.profile.mitarbeiter }, PROFILE_STEPS.length + CORE_QUESTION_COUNT + OPTIONAL_CONTEXT_COUNT);
      if (result.metaLeadEligible) metaEvent("Lead", {}, { eventID: result.leadEventId || state.submissionId });
      state.result = result.result || localDetailedResult(state.baseline);
      saveState();
      renderFullResult();
    } catch (error) {
      errorBox.textContent = error.message || "Der Lead konnte nicht sicher gespeichert werden. Bitte versuchen Sie es erneut.";
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = "Meine Auswertung erstellen";
    }
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
      diagnosticNote: "Adaptive Selbsteinschätzung mit festen Messankern; keine Zertifizierung oder Erfolgsgarantie.",
    };
  }

  function advisoryForResult(result) {
    if (result.advisory?.opportunities?.length) return result.advisory;
    const rankedDimensions = Object.entries(DIMENSIONS)
      .map(([key, value]) => ({ key, label: value.label, score: result.scores[key]?.percent || 0 }))
      .sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));
    const spread = rankedDimensions.at(-1).score - rankedDimensions[0].score;
    const balanced = spread <= 5;
    const legacy = (result.empfehlungen || []).slice(0, 3).map((item, index) => ({
      id: `legacy-${index + 1}`,
      role: index === 0 ? "primary" : "secondary",
      status: { key: "prepare", label: "Individuell prüfen", explanation: "Dieser ältere Ergebnisstand enthält noch keine branchenspezifische Pilotbewertung." },
      title: item.titel,
      fitReason: item.beobachtung,
      today: item.beobachtung,
      assist: item.naechsterSchritt,
      human: "Die verantwortliche Person prüft Ergebnis und nächsten Schritt.",
      effect: "Der Ablauf wird klarer, ohne Entscheidungen ungeprüft zu automatisieren.",
      metric: "Zeit, Qualität oder Fehlerquote vor und nach dem Test",
      prerequisite: "Ein klar abgegrenzter Ablauf und ein dokumentierter Ausgangswert.",
      nextStep: item.naechsterSchritt,
    }));
    return {
      industry: { entered: state.profile.branche || "Ihr Unternehmen", label: "Ihr Unternehmen", fallback: true },
      goal: { label: "den wirtschaftlich sinnvollen KI-Einstieg finden" },
      diagnosis: {
        balanced,
        spread,
        strongest: balanced ? null : rankedDimensions.at(-1),
        weakest: balanced ? null : rankedDimensions[0],
      },
      pilotWindow: { value: "noch offen", label: "Startfenster" },
      focusNote: null,
      opportunities: legacy,
    };
  }

  function opportunityHtml(item, index) {
    const status = item.status || { key: "prepare", label: "Individuell prüfen", explanation: "" };
    const flow = [
      ["Heute", item.today],
      ["KI unterstützt", item.assist],
      ["Mensch prüft", item.human],
      ["Greifbarer Effekt", item.effect],
    ];
    return `<article class="use-case-card${index === 0 ? " is-primary" : ""}">
      <div class="use-case-head"><span>0${index + 1}</span><small class="use-case-status ${esc(status.key)}">${esc(status.label)}</small></div>
      <h3>${esc(item.title)}</h3>
      <p class="use-case-fit"><strong>Warum das zu Ihren Antworten passt:</strong> ${esc(item.fitReason)}</p>
      <div class="use-case-flow">${flow.map(([label, text]) => `<div><small>${esc(label)}</small><p>${esc(text)}</p></div>`).join("")}</div>
      <div class="use-case-meta"><p><small>Im Pilot messen</small><strong>${esc(item.metric)}</strong></p><p><small>Voraussetzung</small><strong>${esc(item.prerequisite)}</strong></p></div>
      ${status.explanation ? `<p class="use-case-readiness">${esc(status.explanation)}</p>` : ""}
      ${index === 0 ? `<a class="button button-accent use-case-inline-cta" href="${esc(config.calendarUrl)}" data-calendar-cta>Diesen Anwendungsfall kostenlos mit Marco prüfen</a>` : ""}
    </article>`;
  }

  function renderFullResult() {
    const result = state.result;
    const advisory = advisoryForResult(result);
    result.advisory ||= advisory;
    state.stage = "result";
    showOnlyScreen("fullResult");
    document.body.classList.add("modal-open");
    const totalScore = result.scores.total.percent;
    $("#resultScore").textContent = totalScore;
    $("#resultLevel").textContent = result.level;
    $("#resultVerdict").textContent = result.gesamteinschaetzung;
    $("#resultContext").textContent = `${advisory.industry.entered} · Ziel: ${advisory.goal.label}`;
    const analysisBadge = $("#analysisBadge");
    const frontierAnalysis = result.analysisMode === "frontier_adaptive";
    analysisBadge.textContent = frontierAnalysis
      ? `Vertieft mit ${result.analysisModel || "Frontier-KI"} · Score aus festen Messankern`
      : "Robuste Basisauswertung · Score aus festen Messankern";
    analysisBadge.classList.toggle("is-ai", frontierAnalysis);
    const scoreRing = $("#resultScoreRing");
    scoreRing.style.strokeDashoffset = `${578 - (Math.max(0, Math.min(100, totalScore)) / 100) * 578}`;
    $("#resultScoreDial").setAttribute("aria-label", `Gesamter Readiness-Score: ${totalScore} von 100. ${result.level}.`);
    const diagnosis = advisory.diagnosis || {};
    const resultSignals = diagnosis.balanced
      ? [
          { value: `${totalScore}/100`, label: "Vier Teilwerte eng beieinander" },
          { value: `${diagnosis.spread || 0} Punkte`, label: "Spannweite · kein Einzelengpass" },
          advisory.pilotWindow,
        ]
      : [
          { value: `${diagnosis.strongest.score}/100`, label: `Stärkstes Fundament · ${diagnosis.strongest.label}` },
          { value: `${diagnosis.weakest.score}/100`, label: `Größter Fokus · ${diagnosis.weakest.label}` },
          advisory.pilotWindow,
        ];
    $("#resultSignals").innerHTML = resultSignals.map((signal) => `<article><strong>${esc(signal.value)}</strong><span>${esc(signal.label)}</span></article>`).join("");
    $("#industryUseCaseTitle").textContent = `Drei konkrete KI-Chancen für ${advisory.industry.entered}.`;
    $("#industryUseCaseIntro").textContent = `Nicht als allgemeine Tool-Liste: Die Reihenfolge verbindet Ihre Branche, Ihr Ziel „${advisory.goal.label}“ und Ihre tatsächlichen Antwortwerte.`;
    $("#useCases").innerHTML = advisory.opportunities.slice(0, 3).map(opportunityHtml).join("");
    const focusNote = $("#resultFocusNote");
    if (advisory.focusNote) {
      focusNote.innerHTML = `<small>Ihr freiwilliger 90-Tage-Fokus</small><strong>„${esc(advisory.focusNote)}“</strong>`;
      focusNote.hidden = false;
    } else {
      focusNote.hidden = true;
      focusNote.replaceChildren();
    }
    $("#resultBreakdown").innerHTML = breakdownHtml(result, true);
    animateBars($("#resultBreakdown"));
    const primary = advisory.opportunities[0];
    $("#bookingTitle").textContent = `„${primary.title}“ mit Marco auf Umsetzbarkeit prüfen.`;
    $("#bookingCopy").textContent = `In 20 Minuten prüfen Sie gemeinsam, ob der Anwendungsfall mit Ihren heutigen Systemen sinnvoll startbar ist, welche Voraussetzung zuerst fehlt und woran Sie einen Pilot messen würden.`;
    $("#finalBookingTitle").textContent = `Ist „${primary.title}“ wirklich Ihr stärkster erster Hebel?`;
    const roadmap = result.roadmap || {};
    $("#roadmap").innerHTML = ["phase1", "phase2", "phase3"].map((key) => roadmap[key]).filter(Boolean).map((phase) => `<article><small>${esc(phase.zeitraum)}</small><h3>${esc(phase.titel)}</h3><ul>${(phase.punkte || []).map((point) => `<li>${esc(point)}</li>`).join("")}</ul></article>`).join("");
    $("#diagnosticNote").textContent = result.diagnosticNote || "Strukturierte Selbsteinschätzung; keine Zertifizierung oder Erfolgsgarantie.";
    const newsletterNote = $("#newsletterResultNote");
    if (state.newsletterStatus === "doi_pending") {
      newsletterNote.innerHTML = "<strong>KI-Impulse: Bitte jetzt Ihr Postfach prüfen.</strong><span>Öffnen Sie die Bestätigungs-E-Mail und bestätigen Sie Ihre freiwillige Anmeldung innerhalb von 24 Stunden. Falls sie nicht erscheint, prüfen Sie bitte auch den Spam-Ordner.</span>";
      newsletterNote.hidden = false;
    } else if (state.newsletterStatus === "preview_not_sent") {
      newsletterNote.innerHTML = "<strong>Preview-Modus: Newsletter-Auswahl geprüft.</strong><span>In dieser Vorschau wurde absichtlich keine Bestätigungs-E-Mail versendet und keine Anmeldung gespeichert.</span>";
      newsletterNote.hidden = false;
    } else if (["already_active", "confirmed"].includes(state.newsletterStatus)) {
      newsletterNote.innerHTML = "<strong>Ihre Synclaro KI-Impulse sind bereits aktiviert.</strong><span>Eine Abmeldung ist jederzeit über den Link in jeder Newsletter-E-Mail möglich.</span>";
      newsletterNote.hidden = false;
    } else {
      newsletterNote.hidden = true;
      newsletterNote.replaceChildren();
    }
    const calendar = new URL(config.calendarUrl);
    calendar.searchParams.set("utm_source", "ki-readiness");
    calendar.searchParams.set("utm_medium", "result");
    calendar.searchParams.set("utm_campaign", "ai_readiness_result");
    if (state.bookingReference) calendar.searchParams.set("readiness_ref", state.bookingReference);
    $$('[data-calendar-cta]').forEach((cta) => { cta.href = calendar.toString(); });
    $("#useCases").querySelectorAll("[data-calendar-cta]").forEach((cta) => cta.addEventListener("click", () => track("calendar_cta_clicked", { score: state.result?.scores?.total?.percent || 0 }, 19)));
    window.scrollTo(0, 0);
    requestAnimationFrame(() => $("#resultTitle").focus({ preventScroll: true }));
    track("report_viewed", { score: totalScore, level: result.level }, 18);
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
    $("#closeResult").addEventListener("click", closeTest);
    $("#resultHomeLink").addEventListener("click", (event) => { event.preventDefault(); closeTest(); });
    $("#restartResult").addEventListener("click", restart);
    $$('[data-calendar-cta]').forEach((cta) => cta.addEventListener("click", () => track("calendar_cta_clicked", { score: state.result?.scores?.total?.percent || 0 }, 19)));
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

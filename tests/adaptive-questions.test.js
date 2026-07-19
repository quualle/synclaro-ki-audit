"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const assessment = require("../netlify/functions/_shared/assessment");
const generateQuestions = require("../netlify/functions/_shared/generate-questions-handler");
const adaptive = generateQuestions._test;

function importFunctionEntry(name) {
  return import(pathToFileURL(path.join(__dirname, `../netlify/functions/${name}.mjs`)).href);
}

const PROFILE = {
  branche: "Gebäudereinigung",
  mitarbeiter: "6-10",
  rolle: "Inhaber",
  hauptziel: "Weniger Verwaltungsaufwand",
};

function withAdaptiveEnv(callback) {
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
      else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
      if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previousKey;
    });
}

test("acht Fallback-Fragen decken jede Dimension exakt zweimal und ohne Duplikate ab", async () => {
  const history = [];
  for (let questionNumber = 1; questionNumber <= adaptive.TOTAL_QUESTIONS; questionNumber += 1) {
    const generated = await adaptive.generateNextQuestion({ profile: PROFILE, history, questionNumber });
    assert.equal(generated.selectionMode, "deterministic_fallback");
    assert.equal(history.some((answer) => answer.questionId === generated.question.id), false);
    history.push(...adaptive.reconstructHistory([
      { questionId: generated.question.id, value: "2", answerLabel: "Manipuliert", email: "ignored@example.com" },
    ], PROFILE));
  }

  assert.equal(new Set(history.map((answer) => answer.questionId)).size, 8);
  assert.deepEqual(adaptive.dimensionCounts(history), {
    prozesse_daten: 2,
    team_wissen: 2,
    ki_praxis: 2,
    umsetzungskraft: 2,
  });
});

test("Kandidatenauswahl hält die Dimensionsabdeckung nach jedem Schritt erreichbar", () => {
  const history = adaptive.reconstructHistory([
    { questionId: "system_brueche", value: "1" },
    { questionId: "ki_nutzung", value: "3" },
  ], PROFILE);
  const candidates = adaptive.eligibleCandidates(history, PROFILE);
  assert.deepEqual(new Set(candidates.map((question) => question.dimension)), new Set(["team_wissen", "umsetzungskraft"]));
  assert.equal(candidates.some((question) => question.id === "system_brueche"), false);
});

test("Frontier-Ausgabe darf Texte, aber keine ID-, Dimensions- oder Scoringanker verändern", async () => {
  await withAdaptiveEnv(async () => {
    const generated = await adaptive.generateNextQuestion({
      profile: PROFILE,
      history: [],
      questionNumber: 1,
      request: async ({ schema }) => {
        assert.equal(schema.additionalProperties, false);
        assert.deepEqual(schema.required, ["choiceId", "whyNow"]);
        assert.equal(schema.properties.choiceId.enum.includes("system_brueche"), true);
        return {
          choiceId: "system_brueche",
          whyNow: "Bei einer Gebäudereinigung zeigt dieser Übergang früh, wo vermeidbare Nacharbeit entsteht.",
          label: "Manipulierte Gegenfrage",
          optionLabels: ["Perfekt", "Gut", "Schlecht", "Katastrophal"],
        };
      },
    });
    assert.equal(generated.selectionMode, "frontier_adaptive");
    assert.equal(generated.question.id, "system_brueche");
    assert.equal(generated.question.dimension, "prozesse_daten");
    assert.equal(generated.question.type, "radio");
    assert.equal(generated.question.required, true);
    assert.deepEqual(generated.question.options.map((option) => option.value), ["1", "2", "3", "4"]);
    const canonical = assessment.getQuestion("system_brueche", PROFILE);
    assert.equal(generated.question.label, canonical.label);
    assert.deepEqual(generated.question.options, canonical.options);
    assert.equal(generated.question.help, canonical.help);
  });
});

test("ungültige Modellwahl fällt ohne harten Fehler auf eine kanonische Frage zurück", async () => {
  await withAdaptiveEnv(async () => {
    const generated = await adaptive.generateNextQuestion({
      profile: PROFILE,
      history: [],
      questionNumber: 1,
      request: async () => ({
        choiceId: "nicht_erlaubt",
        whyNow: "Auch diese Begründung wäre von der Länge her grundsätzlich zulässig.",
      }),
    });
    assert.equal(generated.selectionMode, "deterministic_fallback");
    assert.equal(generated.question.id, "prozess_standardisierung");
    assert.equal(generated.modelLabel, null);
  });
});

test("Antwortverlauf wird ausschließlich aus kanonischer ID und Wert rekonstruiert", () => {
  const [answer] = adaptive.reconstructHistory([{
    questionId: "routineaufgaben",
    value: "4",
    questionLabel: "Manipuliert",
    answerLabel: "Manipuliert",
    contact: { email: "ignored@example.com" },
    attribution: { fbclid: "ignored" },
  }], PROFILE);
  const canonical = assessment.getQuestion("routineaufgaben", PROFILE);
  assert.equal(answer.questionLabel, canonical.label);
  assert.equal(answer.answerLabel, canonical.options[3].label);
  assert.equal("contact" in answer, false);
  assert.equal("attribution" in answer, false);
});

test("doppelte, unbekannte oder dimensionsüberfüllende Antworten werden abgewiesen", () => {
  assert.throws(() => adaptive.reconstructHistory([
    { questionId: "ki_nutzung", value: "2" },
    { questionId: "ki_nutzung", value: "3" },
  ], PROFILE), /answer_invalid/);
  assert.throws(() => adaptive.reconstructHistory([
    { questionId: "unbekannt", value: "2" },
  ], PROFILE), /answer_invalid/);
  assert.throws(() => adaptive.reconstructHistory([
    { questionId: "ki_nutzung", value: "2" },
    { questionId: "ki_leitplanken", value: "2" },
    { questionId: "ki_zielbild", value: "2" },
  ], PROFILE), /coverage_invalid/);
});

test("Preview-Endpunkt liefert den stabilen Acht-Fragen-Vertrag auch ohne KI-Konfiguration", async () => {
  const previousContext = process.env.CONTEXT;
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.CONTEXT = "deploy-preview";
  delete process.env.AI_ADAPTIVE_ENABLED;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const response = await generateQuestions.handler({
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify({ protocolVersion: "adaptive-v1", aiProcessing: { acknowledged: true, version: "ai-processing-v1-2026-07-19" }, companyProfile: PROFILE, previousAnswers: [], questionNumber: 1 }),
    });
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.deepEqual(Object.keys(payload).sort(), [
      "assessmentVersion",
      "modelLabel",
      "question",
      "questionNumber",
      "selectionMode",
      "totalQuestions",
    ]);
    assert.equal(payload.questionNumber, 1);
    assert.equal(payload.totalQuestions, 8);
    assert.equal(payload.selectionMode, "deterministic_fallback");
    assert.deepEqual(Object.keys(payload.question).sort(), [
      "dimension",
      "help",
      "id",
      "label",
      "options",
      "required",
      "type",
      "whyNow",
    ]);
  } finally {
    if (previousContext === undefined) delete process.env.CONTEXT;
    else process.env.CONTEXT = previousContext;
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("Production-Endpunkt verlangt vor jedem Modellaufruf eine gültige Sitzung", async () => {
  const previousContext = process.env.CONTEXT;
  process.env.CONTEXT = "production";
  try {
    const response = await generateQuestions.handler({
      httpMethod: "POST",
      headers: {
        host: "ki-check.synclaro.de",
        origin: "https://ki-check.synclaro.de",
      },
      body: JSON.stringify({ protocolVersion: "adaptive-v1", aiProcessing: { acknowledged: true, version: "ai-processing-v1-2026-07-19" }, companyProfile: PROFILE, previousAnswers: [], questionNumber: 1 }),
    });
    assert.equal(response.statusCode, 401);
  } finally {
    if (previousContext === undefined) delete process.env.CONTEXT;
    else process.env.CONTEXT = previousContext;
  }
});

test("aktivierter KI-Preview stellt eine Sitzung aus und schützt die bezahlten Endpunkte per Rate-Limit", async () => {
  const previous = {
    context: process.env.CONTEXT,
    flag: process.env.AI_ADAPTIVE_ENABLED,
    key: process.env.OPENROUTER_API_KEY,
    secret: process.env.SESSION_HMAC_SECRET,
  };
  process.env.CONTEXT = "deploy-preview";
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.SESSION_HMAC_SECRET = "a".repeat(32);
  try {
    const [startEntry, questionsEntry] = await Promise.all([
      importFunctionEntry("start-session"),
      importFunctionEntry("generate-questions"),
    ]);
    const issued = await startEntry.default(new Request("https://preview.example/.netlify/functions/start-session", {
      method: "POST",
      body: "{}",
    }), {});
    assert.equal(issued.status, 200);
    assert.match(issued.headers.get("set-cookie"), /^synclaro_ai_session=/);
    assert.equal((await issued.json()).preview, true);

    const unauthenticated = await questionsEntry.default(new Request("https://preview.example/.netlify/functions/generate-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ protocolVersion: "adaptive-v1", aiProcessing: { acknowledged: true, version: "ai-processing-v1-2026-07-19" }, companyProfile: PROFILE, previousAnswers: [], questionNumber: 1 }),
    }), {});
    assert.equal(unauthenticated.status, 401);
    assert.deepEqual(questionsEntry.config.rateLimit, { windowLimit: 20, windowSize: 180, aggregateBy: ["ip", "domain"] });
    assert.deepEqual(startEntry.config.rateLimit, { windowLimit: 12, windowSize: 180, aggregateBy: ["ip", "domain"] });
  } finally {
    const restore = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
    restore("CONTEXT", previous.context);
    restore("AI_ADAPTIVE_ENABLED", previous.flag);
    restore("OPENROUTER_API_KEY", previous.key);
    restore("SESSION_HMAC_SECRET", previous.secret);
  }
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const assessment = require("../netlify/functions/_shared/assessment");
const resultBuilder = require("../netlify/functions/_shared/result");
const aiResult = require("../netlify/functions/_shared/ai-result");

const PROFILE = { branche: "Gebäudereinigung für Büros", mitarbeiter: "6-10", rolle: "inhaber", hauptziel: "zeit" };
const ANSWERS = [
  "prozess_standardisierung",
  "wissen_verteilung",
  "ki_nutzung",
  "verantwortung",
  "daten_zugriff",
  "team_digital",
  "ki_leitplanken",
  "erfolgsmessung",
].map((questionId, index) => ({ questionId, answer: String((index % 4) + 1) }));

function baseResult() {
  const baseline = assessment.scoreAdaptiveAssessment(ANSWERS, PROFILE);
  return resultBuilder.buildDeterministicResult(baseline, PROFILE, ANSWERS);
}

function validCustomization(base) {
  return {
    overallAssessment: "Ihre Antworten zeigen ein belastbares Prozessfundament, aber noch eine Lücke zwischen einzelnen KI-Versuchen und einem klar geführten Pilot. Für Ihre Gebäudereinigung sollte der erste Test deshalb an einem wiederkehrenden Büroübergang ansetzen, dessen Qualität Sie heute schon prüfen können.",
    leverageReason: "Der ausgewählte Hebel verbindet einen häufigen Übergang zwischen Einsatz und Büro mit einer klaren menschlichen Freigabe. Zu prüfen ist zuerst, ob die Eingangsdaten in den heutigen Berichten einheitlich genug sind.",
    dimensionSummaries: {
      prozesse_daten: "Ihre Prozessantworten zeigen eine brauchbare Grundlage, während Informationsübergänge noch gezielt auf Medienbrüche geprüft werden sollten.",
      team_wissen: "Wissen ist teilweise greifbar, doch der Alltag braucht einen festen Ort und eine verlässliche Routine für wiederkehrende Entscheidungen.",
      ki_praxis: "Erste KI-Praxis ist erkennbar; für einen betrieblichen Einsatz fehlen noch ein klarer Anwendungsfall und verbindliche Prüfschritte.",
      umsetzungskraft: "Ein kleiner Pilot ist organisatorisch denkbar, wenn Zuständigkeit, Testfenster und eine überprüfbare Erfolgsgröße vor dem Start feststehen.",
    },
    primaryOpportunity: {
      id: base.advisory.opportunities[0].id,
      fitReason: "Die priorisierte Chance passt zu den übergebenen Antwortsignalen und muss an einem echten, bereinigten Vorgang geprüft werden.",
      today: "Der betreffende Ablauf enthält heute wiederkehrende Übergaben, deren Vollständigkeit vor einem Pilot konkret geprüft werden muss.",
      assist: "Die KI strukturiert nur die freigegebenen Eingangsdaten und markiert fehlende Angaben für die weitere Bearbeitung.",
      effect: "Der Pilot macht sichtbar, ob Nacharbeit und Rückfragen sinken, ohne Entscheidungen ungeprüft zu automatisieren.",
      nextStep: "Einen typischen Vorgang auswählen, Pflichtangaben festlegen und den heutigen Ablauf als Vergleich dokumentieren.",
    },
  };
}

test("KI-Vertiefung darf Score, Status, Messgröße und Sicherheitsvoraussetzung nicht verändern", async () => {
  const base = baseResult();
  let requestOptions;
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  let result;
  try {
    result = await aiResult.enhanceResultWithAI(base, PROFILE, ANSWERS, async (options) => {
      requestOptions = options;
      return validCustomization(base);
    });
  } finally {
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }

  assert.equal(requestOptions.reasoningEffort, "low");
  assert.equal(requestOptions.timeoutMs, 18000);
  assert.equal(requestOptions.strictSchema, false);
  assert.equal(requestOptions.maxTokens, 900);
  assert.equal(result.analysisMode, "frontier_adaptive");
  assert.deepEqual(result.scores.total, base.scores.total);
  assert.equal(result.level, base.level);
  for (let index = 0; index < 3; index += 1) {
    assert.equal(result.advisory.opportunities[index].id, base.advisory.opportunities[index].id);
    assert.deepEqual(result.advisory.opportunities[index].status, base.advisory.opportunities[index].status);
    assert.equal(result.advisory.opportunities[index].metric, base.advisory.opportunities[index].metric);
    assert.equal(result.advisory.opportunities[index].prerequisite, base.advisory.opportunities[index].prerequisite);
    assert.equal(result.advisory.opportunities[index].human, base.advisory.opportunities[index].human);
  }
  assert.equal(result.advisory.opportunities[1].fitReason, base.advisory.opportunities[1].fitReason);
});

test("OpenRouter-Prompt enthält nur Profil und kanonische Antworten, niemals Kontakt oder Attribution", () => {
  const base = baseResult();
  const messages = aiResult.promptMessages(base, {
    ...PROFILE,
    branche: "Gebäudereinigung ada@example.com +49 170 12345678 https://example.com",
  }, [
    ...ANSWERS,
    { questionId: "haupthebel", answer: "Kontakt ada@example.com, Telefon +49 170 12345678 und https://example.com" },
    { questionId: "ignored", answer: "ignored", email: "lead@example.com", company: "Geheim GmbH", fbclid: "abc" },
  ]);
  const serialized = JSON.stringify(messages);
  assert.doesNotMatch(serialized, /ada@example\.com|lead@example\.com|Geheim GmbH|\+49 170 12345678|https:\/\/example\.com|fbclid/);
  assert.match(serialized, /E-Mail entfernt|Telefonnummer entfernt|Link entfernt/);
});

test("Provider- oder Schemafehler verlieren das Ergebnis nicht", async () => {
  const base = baseResult();
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  try {
    const failed = await aiResult.enhanceResultWithAI(base, PROFILE, ANSWERS, async () => { throw new Error("provider"); });
    assert.equal(failed.analysisMode, "deterministic_fallback");
    assert.deepEqual(failed.scores, base.scores);
    const malformed = await aiResult.enhanceResultWithAI(base, PROFILE, ANSWERS, async () => ({ overallAssessment: "zu kurz" }));
    assert.equal(malformed.analysisMode, "deterministic_fallback");
    assert.deepEqual(malformed.advisory, base.advisory);
  } finally {
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("geringfügig zu lange KI-Texte werden sicher gekürzt statt die gesamte Vertiefung zu verwerfen", () => {
  const base = baseResult();
  const customization = validCustomization(base);
  customization.primaryOpportunity.fitReason = `${customization.primaryOpportunity.fitReason} ${"zusätzlicher Kontext ".repeat(8)}`;
  const cleaned = aiResult.cleanResultOutput(customization, base.advisory.opportunities.map((item) => item.id));
  assert.ok(cleaned);
  assert.ok(cleaned.primaryOpportunity.fitReason.length <= 220);
  assert.match(cleaned.primaryOpportunity.fitReason, /\.$/);
});

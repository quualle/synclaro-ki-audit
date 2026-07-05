// E2E-Testharness für generate-questions.js und analyze.js (v3 Neubau)
// Lädt die echten Handler direkt (CommonJS via createRequire) und ruft sie ohne
// HTTP-Server auf. Simuliert einen SHK-Betrieb über 3 Fragerunden bis zur Analyse.
//
// Ausführen mit:
//   cd /Users/marcoheer/projects/synclaro-ki-audit && source ~/.synclaro/.env && node scripts/test-functions.mjs

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const generateQuestions = require("../netlify/functions/generate-questions.js");
const analyze = require("../netlify/functions/analyze.js");

const VALID_TYPES = new Set(["radio", "scale", "checkbox", "textarea"]);

let failCount = 0;
let passCount = 0;

function check(label, condition, detail) {
  if (condition) {
    passCount += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failCount += 1;
    console.log(`  ✗ ${label}${detail ? " — " + detail : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function callHandler(handler, payload) {
  const t0 = Date.now();
  const res = await handler.handler({
    httpMethod: "POST",
    body: JSON.stringify(payload),
  });
  const ms = Date.now() - t0;
  let body;
  try {
    body = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`Antwort ist kein valides JSON: ${res.body}`);
  }
  if (res.statusCode !== 200) {
    throw new Error(`Statuscode ${res.statusCode}: ${JSON.stringify(body)}`);
  }
  return { body, ms };
}

// Wählt für eine Frage eine plausible Antwort: option[1] bei radio/checkbox,
// value "2" bei scale, kurzer Text bei textarea.
function pickAnswer(question) {
  switch (question.type) {
    case "radio": {
      const opt = question.options[1] || question.options[0];
      return opt.value;
    }
    case "checkbox": {
      const opts = question.options.slice(0, 2).map((o) => o.value);
      return opts;
    }
    case "scale":
      return "2";
    case "textarea":
      return "Wir wünschen uns weniger Zettelwirtschaft und mehr Überblick im Tagesgeschäft.";
    default:
      throw new Error(`Unbekannter Fragetyp beim Beantworten: ${question.type}`);
  }
}

function validateStepSchema(step, expectPartialNote) {
  check("phaseTitle vorhanden", typeof step.phaseTitle === "string" && step.phaseTitle.length > 0);
  check("phaseIntro vorhanden", typeof step.phaseIntro === "string" && step.phaseIntro.length > 0);
  check("transitionInsight vorhanden", typeof step.transitionInsight === "string" && step.transitionInsight.length > 0);
  check("questions ist nicht-leeres Array", Array.isArray(step.questions) && step.questions.length > 0);
  check("isLastStep ist boolean", typeof step.isLastStep === "boolean");

  let allQuestionsValid = true;
  for (const q of step.questions || []) {
    if (!q.id || !q.type || !q.label || !VALID_TYPES.has(q.type)) {
      allQuestionsValid = false;
    }
    if (q.type === "scale" && (!q.scaleLabels || !q.scaleLabels.low || !q.scaleLabels.high)) {
      allQuestionsValid = false;
    }
  }
  check("alle Fragen haben id/type/label, gültiger type, scale hat scaleLabels", allQuestionsValid);
}

function computeExpectedBenchmark(branche, score) {
  const MEANS = {
    Baugewerbe: 40,
    SHK: 42,
    Elektrohandwerk: 46,
    "Maler & Lackierer": 38,
    "Tischler/Schreiner": 41,
    Metallbau: 43,
    Dachdeckerei: 39,
    Zimmerei: 41,
    Landschaftsbau: 38,
    Gebäudereinigung: 40,
    "KFZ-Gewerbe": 45,
    Sonstige: 42,
  };
  const sigma = 16;
  const mu = MEANS[branche] ?? 42;
  const raw = 1 / (1 + Math.exp(-(score - mu) / (sigma * 0.6)));
  const percentile = Math.min(97, Math.max(5, Math.round(raw * 100)));
  return { percentile, branchenMittel: mu, top10Schwelle: Math.round(mu + 21) };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY fehlt. Bitte `source ~/.synclaro/.env` ausführen.");
    process.exit(1);
  }

  const companyProfile = {
    branche: "SHK",
    mitarbeiter: "11-20",
    umsatz: "1-5 Mio €",
    rolle: "Geschäftsführer",
    vorname: "Thomas",
  };

  const allAnswers = [];
  const latencies = {};

  // --- Runde 1 ---
  section("Runde 1 (stepNumber=1)");
  const { body: step1, ms: ms1 } = await callHandler(generateQuestions, {
    companyProfile,
    previousAnswers: [],
    stepNumber: 1,
  });
  latencies["generate-questions Runde 1"] = ms1;
  console.log(`  Latenz: ${ms1} ms`);
  validateStepSchema(step1);
  check("Runde 1: isLastStep = false", step1.isLastStep === false);

  const round1Answers = step1.questions.map((q) => ({
    questionId: q.id,
    questionLabel: q.label,
    type: q.type,
    answer: pickAnswer(q),
    phase: 1,
  }));
  allAnswers.push(...round1Answers);

  // --- Prefetch-Test: partial:true mit Antworten bis vorletzter Frage ---
  section("Prefetch-Test (Runde 2, partial:true, unvollständige Antworten)");
  const partialAnswers = allAnswers.slice(0, -1); // simuliert "vorletzte Frage beantwortet"
  const { body: step2Partial, ms: msPartial } = await callHandler(generateQuestions, {
    companyProfile,
    previousAnswers: partialAnswers,
    stepNumber: 2,
    partial: true,
  });
  latencies["generate-questions Runde 2 (partial)"] = msPartial;
  console.log(`  Latenz: ${msPartial} ms`);
  validateStepSchema(step2Partial);
  check("Prefetch-Runde: isLastStep = false", step2Partial.isLastStep === false);

  // --- Runde 2 (finale Antworten) ---
  section("Runde 2 (stepNumber=2, vollständige Antworten)");
  const { body: step2, ms: ms2 } = await callHandler(generateQuestions, {
    companyProfile,
    previousAnswers: allAnswers,
    stepNumber: 2,
  });
  latencies["generate-questions Runde 2"] = ms2;
  console.log(`  Latenz: ${ms2} ms`);
  validateStepSchema(step2);
  check("Runde 2: isLastStep = false", step2.isLastStep === false);

  const round2Answers = step2.questions.map((q) => ({
    questionId: q.id,
    questionLabel: q.label,
    type: q.type,
    answer: pickAnswer(q),
    phase: 2,
  }));
  allAnswers.push(...round2Answers);

  // --- Runde 3 ---
  section("Runde 3 (stepNumber=3)");
  const { body: step3, ms: ms3 } = await callHandler(generateQuestions, {
    companyProfile,
    previousAnswers: allAnswers,
    stepNumber: 3,
  });
  latencies["generate-questions Runde 3"] = ms3;
  console.log(`  Latenz: ${ms3} ms`);
  validateStepSchema(step3);
  check("Runde 3: isLastStep = true (Hard-Enforcement)", step3.isLastStep === true);

  const round3Answers = step3.questions.map((q) => ({
    questionId: q.id,
    questionLabel: q.label,
    type: q.type,
    answer: pickAnswer(q),
    phase: 3,
  }));
  allAnswers.push(...round3Answers);

  // --- Analyse ---
  section("Analyse (analyze.js)");
  const { body: result, ms: msAnalyze } = await callHandler(analyze, {
    companyProfile,
    answers: allAnswers,
  });
  latencies["analyze"] = msAnalyze;
  console.log(`  Latenz: ${msAnalyze} ms`);

  check("scores.total vorhanden", result.scores && typeof result.scores.total.percent === "number");
  for (const key of ["digitalisierung", "kommunikation", "ki_bereitschaft", "ki_nutzung"]) {
    check(
      `scores.${key} vollständig (percent 0-100 + summary)`,
      result.scores[key] &&
        typeof result.scores[key].percent === "number" &&
        result.scores[key].percent >= 0 &&
        result.scores[key].percent <= 100 &&
        typeof result.scores[key].summary === "string" &&
        result.scores[key].summary.length > 0
    );
  }
  check(
    "level ist einer der 4 erlaubten Werte",
    ["KI-Einsteiger", "Digital-Grundlage", "Fortgeschritten", "KI-Vorreiter"].includes(result.level)
  );
  check("gesamteinschaetzung vorhanden", typeof result.gesamteinschaetzung === "string" && result.gesamteinschaetzung.length > 0);
  check(
    "zeitPotenzial vollständig",
    result.zeitPotenzial &&
      typeof result.zeitPotenzial.stundenProMonat === "number" &&
      typeof result.zeitPotenzial.begruendung === "string"
  );
  check("genau 3 Empfehlungen", Array.isArray(result.empfehlungen) && result.empfehlungen.length === 3);
  const empfOk =
    Array.isArray(result.empfehlungen) &&
    result.empfehlungen.every(
      (e) => e.titel && e.analyse && e.sozialBeweis && e.naechsterSchritt && e.aufwand && e.wirkung
    );
  check("jede Empfehlung hat alle Felder inkl. aufwand/wirkung", empfOk);
  check(
    "roadmap hat 3 Phasen mit zeitraum/titel/punkte",
    result.roadmap &&
      ["phase1", "phase2", "phase3"].every(
        (p) => result.roadmap[p] && result.roadmap[p].zeitraum && result.roadmap[p].titel && Array.isArray(result.roadmap[p].punkte)
      )
  );
  check("foerderHinweis ist String (ggf. leer)", typeof result.foerderHinweis === "string");

  // Benchmark-Validierung
  section("Benchmark-Validierung (Perzentil-Formel nachrechnen)");
  check("benchmark-Objekt vorhanden", !!result.benchmark);
  if (result.benchmark) {
    const expected = computeExpectedBenchmark(companyProfile.branche, result.scores.total.percent);
    check(
      `percentile korrekt (erwartet ${expected.percentile}, erhalten ${result.benchmark.percentile})`,
      result.benchmark.percentile === expected.percentile
    );
    check(
      `branchenMittel korrekt (erwartet ${expected.branchenMittel}, erhalten ${result.benchmark.branchenMittel})`,
      result.benchmark.branchenMittel === expected.branchenMittel
    );
    check(
      `top10Schwelle korrekt (erwartet ${expected.top10Schwelle}, erhalten ${result.benchmark.top10Schwelle})`,
      result.benchmark.top10Schwelle === expected.top10Schwelle
    );
    check("percentile im Bereich 5-97", result.benchmark.percentile >= 5 && result.benchmark.percentile <= 97);
  }

  // --- Zusammenfassung ---
  section("Latenzen (ms)");
  for (const [label, ms] of Object.entries(latencies)) {
    console.log(`  ${label}: ${ms} ms`);
  }

  section("Beispiel-Output aus dem echten Lauf");
  console.log(`  transitionInsight (Runde 2): "${step2.transitionInsight}"`);
  console.log(`  gesamteinschaetzung: "${result.gesamteinschaetzung}"`);
  console.log(`  score total: ${result.scores.total.percent} / benchmark: ${JSON.stringify(result.benchmark)}`);

  section("Ergebnis");
  console.log(`  ${passCount} Checks bestanden, ${failCount} fehlgeschlagen.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nTestlauf abgebrochen mit Fehler:", err);
  process.exit(1);
});

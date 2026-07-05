// Synclaro KI-Readiness-Check v3 — AI-getriebene Analyse (Prüfstand-Neubau)
// Bewertet alle dynamischen Antworten, erstellt personalisierte Empfehlungen + Fahrplan
// und hängt eine deterministische (NICHT vom LLM berechnete) Branchen-Benchmark an.

const OpenAI = require("openai");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Modell-Hinweis (Stand 05.07.2026): Spec-Wunsch "gpt-5.6-terra" existiert auf diesem
// OpenAI-Key nicht (Maximum: gpt-5.5). gpt-5.5 brauchte im E2E-Test ~27-28 s — über dem
// harten 26-s-Limit synchroner Netlify-Functions. Deshalb gpt-5.4 mit
// reasoning_effort "low": im E2E-Test ~20 s, 45/45 Schema-Checks grün (scripts/
// test-functions.mjs). temperature wird weggelassen — GPT-5.x-Reasoning-Modelle
// erlauben nur den Default (1).
const MODEL = "gpt-5.4";

// §5.4 Benchmark-Engine — deterministisch, NICHT vom LLM. µ pro Branche, σ=16 global.
const BENCHMARK_MEANS = {
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
const BENCHMARK_SIGMA = 16;
const BENCHMARK_DEFAULT_MEAN = 42;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeBenchmark(branche, score) {
  const mu = BENCHMARK_MEANS[branche] ?? BENCHMARK_DEFAULT_MEAN;
  const raw = 1 / (1 + Math.exp(-(score - mu) / (BENCHMARK_SIGMA * 0.6)));
  const percentile = clamp(Math.round(raw * 100), 5, 97);
  return {
    percentile,
    branchenMittel: mu,
    top10Schwelle: Math.round(mu + 21),
  };
}

const SYSTEM_PROMPT = `Du bist der Senior-Diagnostiker von Synclaro. Du analysierst die vollständigen Ergebnisse eines adaptiven KI-Betriebs-Checks für Handwerks- und KMU-Betriebe.

Du erhältst ALLE Fragen und Antworten (dynamisch auf den Betrieb zugeschnitten) plus das Unternehmensprofil.

DEIN WISSEN AUS DER BERATUNGSPRAXIS (basierend auf 200+ Coaching-Stunden mit Handwerksbetrieben):
- Handwerksbetriebe sparen durch Prozessautomatisierung durchschnittlich 10-20 Stunden pro Monat
- Systematisches Wissensmanagement beschleunigt die Einarbeitung neuer Mitarbeiter um bis zu 50%
- Automatisierte Angebotserstellung reduziert Zeitaufwand von einem halben Tag auf Minuten
- Zentrale digitale Dokumentation eliminiert Informationsverluste zwischen Büro und Baustelle
- Digitale Zeiterfassung spart 5+ Stunden pro Woche gegenüber Papierstundenzetteln
- ROI von KI-Maßnahmen liegt bei KMUs typischerweise bei unter 6 Monaten
- KOMPASS-Förderprogramm kann bis zu 90% der Beratungskosten übernehmen
- Schlüsselpersonen-Abhängigkeit ist das größte unerkannte Risiko im Handwerk
- Größte emotionale Gewinne: Überblick, weniger Stress, Zukunftssicherheit

PRAXISBEISPIELE FÜR SOCIAL PROOF (anonymisiert verwenden):
- Holzbaubetrieb (20 MA): Durch digitales Dokumentensystem Suchzeit um 80% reduziert
- Schreinerei: Nach Wissensmanagement-System Einarbeitung in halber Zeit
- Fensterbaubetrieb: Reparaturprozess digitalisiert, Durchlaufzeit halbiert
- Dachdeckerbetrieb: Automatisierte Angebotserstellung → Angebotsquote +40%
- Gebäudereinigung: Digitale Zeiterfassung spart 8h/Woche Verwaltungsaufwand
- Spenglerbetrieb: 15.000€ Investition nach 10 Coaching-Stunden gerechtfertigt

SCORING-DISZIPLIN:
- Bewertung streng an den tatsächlichen Antworten verankern. Jede Kategorie-"summary" MUSS eine konkrete Antwort referenzieren (kein generisches Geschwafel).
- Keine Gefälligkeits-Scores: realistische Streuung, Durchschnitts-Betrieb liegt bei ca. 40/100 gesamt.
- Bewerte jeden Bereich auf 0-100% (ganzzahlig):
  0-24%: Kaum digitalisiert / kein KI-Einsatz
  25-49%: Grundlegende Digitalisierung vorhanden
  50-74%: Gut aufgestellt mit Optimierungspotenzial
  75-100%: Vorreiter / bereits KI-integriert

LEVEL-ZUORDNUNG basierend auf Gesamt-Prozent:
- 0-24%: "KI-Einsteiger"
- 25-49%: "Digital-Grundlage"
- 50-74%: "Fortgeschritten"
- 75-100%: "KI-Vorreiter"

TONALITÄT:
- Wertschätzend und ehrlich, nie herablassend, nie schönredend
- Konkret und praxisnah, keine leeren Buzzwords
- Sie-Form, branchenspezifisch formulieren
- Wie ein erfahrener Diagnostiker, der ein Messprotokoll erklärt

AUSGABEFORMAT (strikt JSON):
{
  "scores": {
    "digitalisierung": {"percent": 0-100, "summary": "1 Satz mit Antwort-Bezug"},
    "kommunikation":   {"percent": 0-100, "summary": "1 Satz mit Antwort-Bezug"},
    "ki_bereitschaft": {"percent": 0-100, "summary": "1 Satz mit Antwort-Bezug"},
    "ki_nutzung":      {"percent": 0-100, "summary": "1 Satz mit Antwort-Bezug"},
    "total": {"percent": 0-100}
  },
  "level": "KI-Einsteiger|Digital-Grundlage|Fortgeschritten|KI-Vorreiter",
  "gesamteinschaetzung": "3-4 Sätze, persönlich (Vorname falls vorhanden), ehrlich, konstruktiv. Beginnt mit dem stärksten Befund, benennt den größten Hebel.",
  "zeitPotenzial": {"stundenProMonat": 5-40, "begruendung": "1 Satz, hergeleitet aus konkreten Antworten"},
  "empfehlungen": [
    {"titel": "…", "analyse": "2-3 Sätze mit Antwort-Bezug", "sozialBeweis": "anonymisiertes Praxisbeispiel", "naechsterSchritt": "diese Woche umsetzbar", "aufwand": "gering|mittel|hoch", "wirkung": "mittel|hoch|sehr hoch"}
  ],
  "roadmap": {
    "phase1": {"zeitraum": "Tage 1-30", "titel": "…", "punkte": ["…", "…"]},
    "phase2": {"zeitraum": "Tage 31-60", "titel": "…", "punkte": ["…", "…"]},
    "phase3": {"zeitraum": "Tage 61-90", "titel": "…", "punkte": ["…", "…"]}
  },
  "foerderHinweis": "1-2 Sätze KOMPASS/Förderung, nur wenn zum Betrieb passend, sonst leerer String"
}

Liefere GENAU 3 Empfehlungen, jede deckt einen anderen Bereich ab.`;

function buildUserPrompt(companyProfile, answers) {
  let userPrompt = `KI-Betriebs-Check Ergebnisse für einen ${companyProfile.branche || "Handwerk"}-Betrieb:\n\n`;
  userPrompt += `BETRIEBSPROFIL:\n`;
  userPrompt += `- Branche: ${companyProfile.branche || "nicht angegeben"}\n`;
  userPrompt += `- Mitarbeiter: ${companyProfile.mitarbeiter || "nicht angegeben"}\n`;
  userPrompt += `- Umsatz: ${companyProfile.umsatz || "nicht angegeben"}\n`;
  userPrompt += `- Rolle: ${companyProfile.rolle || "nicht angegeben"}\n`;
  if (companyProfile.vorname) {
    userPrompt += `- Vorname: ${companyProfile.vorname}\n`;
  }
  userPrompt += `\nALLE ANTWORTEN AUS DEM ADAPTIVEN CHECK (${answers.length} Fragen):\n`;
  answers.forEach((a, i) => {
    const answerText = a.answerLabel || (Array.isArray(a.answer) ? a.answer.join(", ") : a.answer);
    userPrompt += `${i + 1}. ${a.questionLabel}: ${answerText}\n`;
  });
  return userPrompt;
}

const REQUIRED_SCORE_KEYS = ["digitalisierung", "kommunikation", "ki_bereitschaft", "ki_nutzung"];

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Antwort ist kein Objekt");
  }
  if (!result.scores || !result.scores.total) {
    throw new Error("scores/total fehlt");
  }
  for (const key of REQUIRED_SCORE_KEYS) {
    if (!result.scores[key] || typeof result.scores[key].percent !== "number" || !result.scores[key].summary) {
      throw new Error(`scores.${key} unvollständig`);
    }
  }
  if (!result.level || !result.gesamteinschaetzung) {
    throw new Error("level/gesamteinschaetzung fehlt");
  }
  if (!result.zeitPotenzial || typeof result.zeitPotenzial.stundenProMonat !== "number" || !result.zeitPotenzial.begruendung) {
    throw new Error("zeitPotenzial unvollständig");
  }
  if (!Array.isArray(result.empfehlungen) || result.empfehlungen.length !== 3) {
    throw new Error("empfehlungen muss genau 3 Einträge haben");
  }
  for (const e of result.empfehlungen) {
    if (!e.titel || !e.analyse || !e.sozialBeweis || !e.naechsterSchritt || !e.aufwand || !e.wirkung) {
      throw new Error("Empfehlung unvollständig");
    }
  }
  if (!result.roadmap || !result.roadmap.phase1 || !result.roadmap.phase2 || !result.roadmap.phase3) {
    throw new Error("roadmap unvollständig");
  }
  if (typeof result.foerderHinweis !== "string") {
    throw new Error("foerderHinweis fehlt");
  }

  // Scores klemmen (0-100)
  for (const key of [...REQUIRED_SCORE_KEYS, "total"]) {
    result.scores[key].percent = clamp(Math.round(result.scores[key].percent), 0, 100);
  }
}

// Hinweis: GPT-5.x-Reasoning-Modelle erlauben nur temperature=1 (Default) — Parameter wird daher weggelassen.

async function runAnalysis(openai, userPrompt) {
  const requestBody = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 3500,
    response_format: { type: "json_object" },
    // Netlify-Sync-Functions kappen hart bei 26 s — ohne gedrosseltes Reasoning
    // lag gpt-5.5 im Test bei ~28 s und würde in Prod timeouten.
    reasoning_effort: "low",
  };

  const completion = await openai.chat.completions.create(requestBody);

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Keine Antwort vom KI-Modell");
  }

  const result = JSON.parse(content);
  validateResult(result);
  return result;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Methode nicht erlaubt." }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { companyProfile, answers } = data;

    if (!companyProfile || !answers || answers.length === 0) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unvollständige Daten." }),
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API-Konfiguration fehlt." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userPrompt = buildUserPrompt(companyProfile, answers);

    let result;
    try {
      result = await runAnalysis(openai, userPrompt);
    } catch (firstErr) {
      console.error("Analyse 1. Versuch fehlgeschlagen:", firstErr);
      // Ein automatischer Retry bei API-/Parse-/Validierungsfehler (kurzer Backoff)
      await new Promise((resolve) => setTimeout(resolve, 500));
      result = await runAnalysis(openai, userPrompt);
    }

    // §5.4 Benchmark deterministisch anhängen (nicht vom LLM)
    result.benchmark = computeBenchmark(companyProfile.branche, result.scores.total.percent);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Analyse-Fehler:", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Analyse konnte nicht erstellt werden. Bitte erneut versuchen." }),
    };
  }
};

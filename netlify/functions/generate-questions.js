// Synclaro KI-Readiness-Check v3 — Adaptive Fragen-Generierung (Prüfstand-Neubau)
// Generiert genau EINE Fragerunde (Phase) im Ein-Frage-pro-Screen-Format.
// Unterstützt Prefetch (partial:true) und erzwingt harte Phasen-Grenzen serverseitig.

const OpenAI = require("openai");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Modell-Hinweis: Die Spec (§5.2) verlangt "gpt-5.6-luna". Dieses Modell existiert
// nicht auf dem verfügbaren OpenAI-Account (404). Verfügbare Modelle wurden per
// openai.models.list() geprüft. gpt-5.4-mini wurde gewählt: unterstützt temperature
// (gpt-5.5/gpt-5-mini erzwingen temperature=1) und ist mit ~4.3s spürbar schneller
// als gpt-5.4/gpt-5.5 (~6-10s) — passend zum Latenz-Anspruch dieser Function.
const MODEL = "gpt-5.4-mini";

const SYSTEM_PROMPT = `Du bist der KI-Diagnose-Berater von Synclaro und führst einen adaptiven Betriebs-Check für Handwerks- und KMU-Betriebe durch. Der Check hat GENAU 3 Fragerunden (Phasen). Du generierst jeweils die nächste Phase.

PHASEN-DRAMATURGIE (verbindlich):
- Phase 1 „Ihr Betrieb heute": IST-Aufnahme. Mischung aus: wie laufen Kernprozesse (Anfragen, Angebote, Doku, Zeiterfassung), welche digitalen Werkzeuge existieren, wird bereits KI genutzt (welche Tools, durch wen, wofür). 4 Fragen.
- Phase 2 „Wo Zeit verloren geht": Bohre gezielt dort, wo Phase 1 Schwächen, Widersprüche oder spannende Signale zeigt. Frage nach konkreten Zeitfressern, Fehlerquellen, Personalabhängigkeit, Doppelarbeit. Mindestens eine Frage MUSS sich erkennbar auf eine konkrete vorherige Antwort beziehen. 3-4 Fragen.
- Phase 3 „Ihr KI-Hebel": Zukunft. Was soll KI im Betrieb bewirken, Budgetrahmen, Zeithorizont, Bedenken (Datenschutz, Team-Akzeptanz), größter Wunsch als Freitext. 3 Fragen. Setze isLastStep=true.

FRAGE-DESIGN (fürs Ein-Frage-pro-Screen-UI):
1. Jede Frage muss ohne Kontext der anderen verständlich sein — sie steht allein auf dem Bildschirm.
2. Bevorzugte Typen: "radio" mit 3-5 griffigen Optionen, "scale" (Bewertung 1-4 mit scaleLabels für beide Pole), "checkbox" (3-6 Optionen). Maximal EINE "textarea"-Frage pro Phase, IMMER required=false, mit einladendem placeholder.
3. Optionstexte konkret und alltagsnah formulieren („Zettel und Zuruf", „WhatsApp-Gruppe", „Software mit App"), nie abstrakt.
4. Sprache der Branche verwenden (Baustelle, Werkstatt, Praxis, Objekt …). Sie-Form. Kein Fachjargon.
5. Keine Frage wiederholen, die inhaltlich schon beantwortet ist. Wenn Antworten aus der laufenden Runde fehlen (Vorab-Generierung), plane robust: frage nichts, was direkt davon abhängt.
6. Radio-Optionen mit Bewertungscharakter: value "1" bis "4" (schwach bis stark). Scale: value 1-4.
7. Jede Frage bekommt eine eindeutige snake_case id.

ZUSÄTZLICH lieferst du pro Runde:
- "transitionInsight": 2 Sätze persönlicher Befund über die bisherigen Antworten dieses Betriebs — wie ein Berater, der laut denkt. Konkret auf mindestens eine Antwort eingehen, eine Spannung oder einen Hebel benennen. KEINE Plattitüde. (Bei Phase 1: Befund aus dem Steckbrief.)
- "phaseTitle" und "phaseIntro" (1 Satz, warum diese Phase jetzt kommt).

AUSGABEFORMAT (strikt JSON):
{
  "phaseTitle": "…",
  "phaseIntro": "…",
  "transitionInsight": "…",
  "questions": [
    {"id": "…", "type": "radio|scale|checkbox|textarea", "label": "…", "required": true,
     "placeholder": "nur textarea", "scaleLabels": {"low": "…", "high": "…"},
     "options": [{"value": "…", "label": "…"}]}
  ],
  "isLastStep": false
}`;

const VALID_TYPES = new Set(["radio", "scale", "checkbox", "textarea"]);

function buildUserPrompt(companyProfile, previousAnswers, stepNumber, partial) {
  let prompt = `UNTERNEHMENSPROFIL:\n`;
  prompt += `- Branche: ${companyProfile.branche || "nicht angegeben"}\n`;
  prompt += `- Mitarbeiter: ${companyProfile.mitarbeiter || "nicht angegeben"}\n`;
  prompt += `- Umsatz: ${companyProfile.umsatz || "nicht angegeben"}\n`;
  prompt += `- Rolle des Ausfüllers: ${companyProfile.rolle || "nicht angegeben"}\n`;
  if (companyProfile.vorname) {
    prompt += `- Vorname: ${companyProfile.vorname}\n`;
  }
  prompt += `\nAKTUELLE RUNDE (Phase): ${stepNumber}\n\n`;

  if (previousAnswers && previousAnswers.length > 0) {
    prompt += `BISHERIGE ANTWORTEN:\n`;
    previousAnswers.forEach((a) => {
      const answerText = a.answerLabel || (Array.isArray(a.answer) ? a.answer.join(", ") : a.answer);
      prompt += `- ${a.questionLabel}: ${answerText}\n`;
    });
    prompt += `\n`;
  }

  if (partial) {
    prompt += `HINWEIS: Die Antworten der laufenden Runde können unvollständig sein (Vorab-Generierung).\n\n`;
  }

  prompt += `Generiere jetzt Phase ${stepNumber}.`;
  return prompt;
}

function validateStepData(stepData) {
  if (!stepData || typeof stepData !== "object") {
    throw new Error("Antwort ist kein Objekt");
  }
  if (!Array.isArray(stepData.questions) || stepData.questions.length === 0) {
    throw new Error("KI hat keine gültigen Fragen generiert");
  }
  for (const q of stepData.questions) {
    if (!q.id || !q.type || !q.label) {
      throw new Error("Frage ohne id/type/label");
    }
    if (!VALID_TYPES.has(q.type)) {
      throw new Error(`Unbekannter Fragetyp: ${q.type}`);
    }
    if (q.type === "scale" && (!q.scaleLabels || !q.scaleLabels.low || !q.scaleLabels.high)) {
      throw new Error("scale-Frage ohne scaleLabels");
    }
  }
}

async function generateStep(openai, userPrompt) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 2000,
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Keine Antwort vom KI-Modell");
  }

  const stepData = JSON.parse(content);
  validateStepData(stepData);
  return stepData;
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
    const { companyProfile, previousAnswers, stepNumber, partial } = JSON.parse(event.body);

    if (!companyProfile) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unternehmensprofil fehlt." }),
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
    const step = stepNumber || 1;
    const userPrompt = buildUserPrompt(companyProfile, previousAnswers || [], step, !!partial);

    let stepData;
    try {
      stepData = await generateStep(openai, userPrompt);
    } catch (firstErr) {
      console.error("Fragen-Generierung 1. Versuch fehlgeschlagen:", firstErr);
      // Ein automatischer Retry bei API-/Parse-Fehler (kurzer Backoff)
      await new Promise((resolve) => setTimeout(resolve, 500));
      stepData = await generateStep(openai, userPrompt);
    }

    // Hard-Enforcement unabhängig vom LLM: ab Phase 3 immer isLastStep=true
    if (step >= 3) {
      stepData.isLastStep = true;
    } else {
      stepData.isLastStep = !!stepData.isLastStep;
    }

    // internalNotes nicht ans Frontend senden
    delete stepData.internalNotes;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(stepData),
    };
  } catch (err) {
    console.error("Fragen-Generierung fehlgeschlagen:", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Fragen konnten nicht generiert werden. Bitte erneut versuchen." }),
    };
  }
};

// Synclaro KI-Readiness-Check — Adaptive Fragen-Generierung
// Generiert die nächste Runde individueller Fragen basierend auf bisherigen Antworten

const OpenAI = require("openai");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SYSTEM_PROMPT = `Du bist der KI-Assessment-Berater von Synclaro. Du führst einen adaptiven KI-Readiness-Check für Betriebe durch.

DEINE AUFGABE:
Du erhältst das Unternehmensprofil und alle bisherigen Antworten. Generiere die nächste Runde von 3-5 gezielten Fragen, die tiefer in die relevantesten Bereiche eindringen.

DOMAIN-ABDECKUNG (decke im Laufe des Assessments alle ab):

1. DIGITALISIERUNGSSTAND
   - Kundenanfragen-Management (CRM, Ticketing, Nachverfolgung)
   - Angebotserstellung (manuell vs. automatisiert)
   - Projektdokumentation (Papier vs. digital)
   - Wissensmanagement & Wissenstransfer
   - Rechnungsstellung & Buchhaltung
   - Zeiterfassung

2. KOMMUNIKATION & PROZESSE
   - Büro-Außendienst/Baustelle-Kommunikation
   - Materialbeschaffung & Lagerverwaltung
   - Personalabhängigkeit / Schlüsselpersonen-Risiko
   - Terminplanung & Koordination

3. KI-NUTZUNG (besonders wichtig — hier tief bohren!)
   - Welche KI-Tools werden genutzt? (ChatGPT, Claude, Copilot, branchenspezifische KI, keine)
   - WER nutzt KI? (Chef, Büro, Außendienst, Produktion, niemand)
   - Wie oft und wofür konkret?
   - Wo spart KI bereits Zeit? Wo enttäuscht sie?
   - KI-Kompetenz: Chef vs. Team — wer ist weiter?
   - Wurden schon KI-Schulungen gemacht?

4. KI-BEREITSCHAFT & ERWARTUNGEN
   - Budget-Vorstellung für Digitalisierung/KI
   - Zeitrahmen für Veränderungen
   - Was erhoffen sie sich von KI?
   - Welche Bedenken/Ängste gibt es? (Datenschutz, Jobverlust, Komplexität)

5. SCHMERZPUNKTE & HERAUSFORDERUNGEN
   - Größte Zeitfresser im Alltag
   - Häufigste Fehlerquellen
   - Was würden sie sofort automatisieren, wenn sie könnten?
   - Fachkräftemangel / Einarbeitungsprobleme

REGELN FÜR DIE FRAGESTELLUNG:
1. Erste Runde (stepNumber=1): Starte mit einer Mischung aus Digitalisierung und KI-Nutzung. Frage nach konkreten Tools, Erfahrungen und den größten Zeitfressern.
2. Folgende Runden: Bohre dort nach, wo Antworten auf Schwächen, Chancen oder interessante Muster hindeuten.
3. Wenn jemand KI bereits nutzt: Frage nach Details — welche Tools, wie oft, wofür, was funktioniert, was nicht.
4. Wenn jemand keine KI nutzt: Frage nach Erwartungen, Bedenken, manuellen Prozessen die sie frustrieren.
5. KEINE Frage stellen, die inhaltlich bereits beantwortet wurde.
6. MISCHE Fragetypen: Nicht nur radio! Nutze 1-2 textarea-Fragen für qualitative Einblicke pro Runde.
7. 3-5 Fragen pro Runde.
8. Nach 3-5 Runden (wenn alle Domains ausreichend abgedeckt): Setze isLastStep auf true. In der letzten Runde fokussiere auf Erwartungen und Bereitschaft.
9. Jede Frage MUSS eine eindeutige snake_case ID haben.
10. Bei radio-Fragen mit Bewertungscharakter: Verwende values "1" bis "4" (niedrig bis hoch).
11. Passe die Sprache der Branche an (z.B. "Baustelle" für Bau, "Werkstatt" für KFZ, "Praxis" für Gesundheit).

PROGRESS-STEUERUNG:
- Runde 1: progress = 20
- Runde 2: progress = 40
- Runde 3: progress = 60
- Runde 4: progress = 80
- Letzte Runde: progress = 95

TONALITÄT:
- Fragen wie ein erfahrener Berater stellen, nicht wie ein Formular
- Verständlich, ohne Fachjargon
- Bei textarea-Fragen: Platzhalter als Inspiration mitgeben
- Kein "Du", immer "Sie"

AUSGABEFORMAT (strikt JSON):
{
  "stepTitle": "Kurzer Titel für diesen Fragenblock",
  "stepDescription": "Ein erklärender Satz, warum diese Fragen jetzt kommen.",
  "questions": [
    {
      "id": "eindeutige_snake_case_id",
      "type": "radio|checkbox|textarea|select",
      "label": "Die Frage",
      "required": true,
      "placeholder": "Nur für textarea — Beispielantwort",
      "options": [
        {"value": "wert", "label": "Anzeige-Text"}
      ]
    }
  ],
  "progress": 40,
  "isLastStep": false
}`;

function buildUserPrompt(companyProfile, previousAnswers, stepNumber) {
  let prompt = `UNTERNEHMENSPROFIL:\n`;
  prompt += `- Branche: ${companyProfile.branche || "nicht angegeben"}\n`;
  prompt += `- Mitarbeiter: ${companyProfile.mitarbeiter || "nicht angegeben"}\n`;
  prompt += `- Umsatz: ${companyProfile.umsatz || "nicht angegeben"}\n`;
  prompt += `- Rolle des Ausfüllers: ${companyProfile.rolle || "nicht angegeben"}\n`;
  if (companyProfile.vorname) {
    prompt += `- Vorname: ${companyProfile.vorname}\n`;
  }
  prompt += `\nAKTUELLE RUNDE: ${stepNumber}\n\n`;

  if (previousAnswers && previousAnswers.length > 0) {
    prompt += `BISHERIGE ANTWORTEN:\n`;
    previousAnswers.forEach((a) => {
      const answerText = Array.isArray(a.answer) ? a.answer.join(", ") : a.answer;
      prompt += `- ${a.questionLabel}: ${answerText}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Generiere jetzt die nächste Fragenrunde.`;
  return prompt;
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
    const { companyProfile, previousAnswers, stepNumber } = JSON.parse(event.body);

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

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(companyProfile, previousAnswers || [], stepNumber || 1) },
      ],
      max_completion_tokens: 1500,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Keine Antwort vom KI-Modell");
    }

    const stepData = JSON.parse(content);

    // Validierung
    if (!stepData.questions || !Array.isArray(stepData.questions) || stepData.questions.length === 0) {
      throw new Error("KI hat keine gültigen Fragen generiert");
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

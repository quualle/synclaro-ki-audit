// Synclaro KI-Readiness-Check — AI-getriebene Analyse
// Bewertet alle dynamischen Antworten und erstellt personalisierte Empfehlungen

const OpenAI = require("openai");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SYSTEM_PROMPT = `Du bist der Senior KI-Berater von Synclaro. Du analysierst die vollständigen Ergebnisse eines adaptiven KI-Readiness-Checks.

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

SCORING-METHODE:
Bewerte jeden Bereich auf 0-100% basierend auf den relevanten Antworten:
- 0-24%: Kaum digitalisiert / kein KI-Einsatz
- 25-49%: Grundlegende Digitalisierung vorhanden
- 50-74%: Gut aufgestellt mit Optimierungspotenzial
- 75-100%: Vorreiter / bereits KI-integriert

LEVEL-ZUORDNUNG basierend auf Gesamt-Prozent:
- 0-24%: "KI-Einsteiger"
- 25-49%: "Digital-Grundlage"
- 50-74%: "Fortgeschritten"
- 75-100%: "KI-Vorreiter"

TONALITÄT:
- Wertschätzend und ermutigend, nie herablassend
- Konkret und praxisnah, keine leeren Buzzwords
- Sie-Form
- Branchenspezifisch formulieren
- Wie ein erfahrener Berater auf Augenhöhe

AUSGABEFORMAT (strikt JSON):
{
  "scores": {
    "digitalisierung": {"percent": 45, "summary": "Kurze Einordnung in 1 Satz"},
    "kommunikation": {"percent": 35, "summary": "Kurze Einordnung in 1 Satz"},
    "ki_bereitschaft": {"percent": 60, "summary": "Kurze Einordnung in 1 Satz"},
    "ki_nutzung": {"percent": 20, "summary": "Kurze Einordnung in 1 Satz"},
    "total": {"percent": 40}
  },
  "level": "Digital-Grundlage",
  "gesamteinschaetzung": "2-3 Sätze persönliche Einschätzung. Konstruktiv und motivierend.",
  "empfehlungen": [
    {
      "titel": "Kurzer, prägnanter Titel",
      "analyse": "2-3 Sätze, warum dieser Bereich für diesen Betrieb wichtig ist.",
      "sozialBeweis": "Ein konkreter Satz: 'Ein [Branche]-Betrieb mit ähnlicher Ausgangslage konnte durch [Maßnahme] [messbares Ergebnis] erzielen.'",
      "naechsterSchritt": "Konkreter, sofort umsetzbarer erster Schritt."
    }
  ]
}

Liefere GENAU 3 Empfehlungen. Jede soll einen anderen Bereich abdecken.`;

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

    // User-Prompt mit allen Q&A-Paaren
    let userPrompt = `KI-Readiness-Check Ergebnisse für einen ${companyProfile.branche || "Handwerk"}-Betrieb:\n\n`;
    userPrompt += `BETRIEBSPROFIL:\n`;
    userPrompt += `- Branche: ${companyProfile.branche || "nicht angegeben"}\n`;
    userPrompt += `- Mitarbeiter: ${companyProfile.mitarbeiter || "nicht angegeben"}\n`;
    userPrompt += `- Umsatz: ${companyProfile.umsatz || "nicht angegeben"}\n`;
    userPrompt += `- Rolle: ${companyProfile.rolle || "nicht angegeben"}\n`;
    if (companyProfile.vorname) {
      userPrompt += `- Vorname: ${companyProfile.vorname}\n`;
    }
    userPrompt += `\nALLE ANTWORTEN AUS DEM ADAPTIVEN ASSESSMENT (${answers.length} Fragen):\n`;
    answers.forEach((a, i) => {
      const answerText = Array.isArray(a.answer) ? a.answer.join(", ") : a.answer;
      userPrompt += `${i + 1}. ${a.questionLabel}: ${answerText}\n`;
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 2500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Keine Antwort vom KI-Modell");
    }

    const result = JSON.parse(content);

    // Validierung
    if (!result.scores || !result.gesamteinschaetzung || !result.empfehlungen) {
      throw new Error("KI-Analyse hat unvollständiges Format");
    }

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

// Synclaro KI-Readiness-Check — Scoring & Analyse
// Berechnet KI-Readiness-Scores und gibt Quick-Win-Empfehlungen

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Empfehlungen für jede Frage bei niedrigem Score (1 oder 2)
const EMPFEHLUNGEN = {
  kundenanfragen: {
    title: "Digitales Anfragenmanagement",
    text: "Implementieren Sie ein einfaches CRM oder Ticketsystem, um keine Kundenanfrage mehr zu verlieren.",
  },
  angebote: {
    title: "Automatisierte Angebotserstellung",
    text: "Nutzen Sie KI-gestützte Vorlagen, um Angebote in Minuten statt Stunden zu erstellen.",
  },
  dokumentation: {
    title: "Digitale Projektdokumentation",
    text: "Fotos, Notizen und Fortschritte zentral und mobil erfassen — kein Papierkram mehr.",
  },
  wissen: {
    title: "Wissensmanagement digitalisieren",
    text: "Erfahrungswissen Ihrer Mitarbeiter in einer durchsuchbaren Wissensdatenbank sichern.",
  },
  buero_baustelle: {
    title: "Echtzeitkommunikation Büro ↔ Baustelle",
    text: "Mit einer App-Lösung Missverständnisse und Doppelarbeit eliminieren.",
  },
  zeiterfassung: {
    title: "Digitale Zeiterfassung",
    text: "Stundenzettel durch eine mobile App ersetzen — spart 5+ Stunden pro Woche.",
  },
  rechnungen: {
    title: "Automatische Rechnungsstellung",
    text: "Von der Zeiterfassung direkt zur Rechnung — ohne Medienbruch.",
  },
  beschaffung: {
    title: "Intelligente Materialbeschaffung",
    text: "Automatische Bestellvorschläge basierend auf Projektplanung und Bestandsdaten.",
  },
  erfahrung: {
    title: "KI-Grundlagen aufbauen",
    text: "Mit ChatGPT oder Claude erste Erfahrungen sammeln — für Textarbeit, E-Mails, Planung.",
  },
  budget: {
    title: "Fördermittel nutzen",
    text: "Bis zu 90% Ihrer Digitalisierungskosten können durch KOMPASS oder Landesförderung gedeckt werden.",
  },
  timeline: {
    title: "Sofort starten",
    text: "Der beste Zeitpunkt für KI-Integration war gestern. Der zweitbeste ist heute.",
  },
};

// Score-Stufen
function getLevel(percent) {
  if (percent < 25) return "KI-Einsteiger";
  if (percent < 50) return "Digital-Grundlage";
  if (percent < 75) return "Fortgeschritten";
  return "KI-Vorreiter";
}

// Kategorie-Score berechnen
function calcCategoryScore(values, max) {
  const score = Object.values(values).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const percent = Math.round((score / max) * 100);
  return { score, max, percent };
}

// Top-3-Empfehlungen aus den niedrigsten Scores ermitteln
function getRecommendations(answers) {
  const allQuestions = [];

  // Alle Fragen mit ihren Scores sammeln
  for (const [key, value] of Object.entries(answers.digitalisierung || {})) {
    allQuestions.push({ key, score: Number(value) || 0 });
  }
  for (const [key, value] of Object.entries(answers.kommunikation || {})) {
    allQuestions.push({ key, score: Number(value) || 0 });
  }
  for (const [key, value] of Object.entries(answers.ki_bereitschaft || {})) {
    allQuestions.push({ key, score: Number(value) || 0 });
  }

  // Nach Score aufsteigend sortieren (niedrigste zuerst)
  allQuestions.sort((a, b) => a.score - b.score);

  // Top 3 mit Score <= 2 nehmen (nur dort wo Handlungsbedarf besteht)
  const recommendations = [];
  for (const q of allQuestions) {
    if (recommendations.length >= 3) break;
    if (q.score <= 2 && EMPFEHLUNGEN[q.key]) {
      recommendations.push(EMPFEHLUNGEN[q.key]);
    }
  }

  // Falls weniger als 3 gefunden: auch Score 3 berücksichtigen
  if (recommendations.length < 3) {
    for (const q of allQuestions) {
      if (recommendations.length >= 3) break;
      if (q.score === 3 && EMPFEHLUNGEN[q.key]) {
        const existing = recommendations.find((r) => r.title === EMPFEHLUNGEN[q.key].title);
        if (!existing) {
          recommendations.push(EMPFEHLUNGEN[q.key]);
        }
      }
    }
  }

  return recommendations;
}

exports.handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Nur POST erlauben
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Methode nicht erlaubt. Bitte POST verwenden." }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Eingabevalidierung
    if (!data.digitalisierung || !data.kommunikation || !data.ki_bereitschaft) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Unvollständige Daten. Bitte alle Bereiche ausfüllen (digitalisierung, kommunikation, ki_bereitschaft).",
        }),
      };
    }

    // Scores berechnen
    const digitalisierung = calcCategoryScore(data.digitalisierung, 16);
    const kommunikation = calcCategoryScore(data.kommunikation, 16);
    const ki_bereitschaft = calcCategoryScore(data.ki_bereitschaft, 12);

    const totalScore = digitalisierung.score + kommunikation.score + ki_bereitschaft.score;
    const totalMax = 44;
    const totalPercent = Math.round((totalScore / totalMax) * 100);

    // Empfehlungen ermitteln
    const recommendations = getRecommendations(data);

    const result = {
      scores: {
        digitalisierung,
        kommunikation,
        ki_bereitschaft,
        total: { score: totalScore, max: totalMax, percent: totalPercent },
      },
      level: getLevel(totalPercent),
      recommendations,
    };

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Analyse-Fehler:", err);
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Ungültige Anfrage. Bitte prüfen Sie das Datenformat.",
      }),
    };
  }
};

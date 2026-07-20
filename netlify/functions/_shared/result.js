"use strict";

const { DIMENSIONS } = require("./assessment");
const { buildAdvisory } = require("./advisory");

const RESULT_VERSION = "2026-07-19.v5";

function dimensionSummary(label, score) {
  if (score < 25) return `${label} braucht vor einem KI-Pilot zuerst einen klaren, verlässlichen Grundrahmen.`;
  if (score < 50) return `${label} ist im Aufbau: erste Grundlagen bestehen, tragen aber noch nicht durchgängig.`;
  if (score < 75) return `${label} ist bereits eine tragfähige Basis für einen klar begrenzten Pilot.`;
  return `${label} ist eine belastbare Stärke und kann einen anspruchsvolleren Pilot gut stützen.`;
}

function buildDeterministicResult(baseline, profile = {}, answers = []) {
  const solo = profile.mitarbeiter === "solo";
  const advisory = buildAdvisory(baseline, profile, answers);
  const developing = {
    prozesse_daten: ["Einen Kernprozess messbar machen", "Ihre Antworten zeigen, dass Informationen und Arbeitsschritte noch nicht durchgängig verlässlich zusammenlaufen.", "Wählen Sie einen häufigen Ablauf und halten Sie Eingang, Schritte, Prüfpunkte und Ergebnis auf einer Seite fest."],
    team_wissen: solo
      ? ["Arbeitswissen verlässlich sichern", "Wissen und digitale Arbeitsweisen sind noch nicht robust genug im eigenen Alltag verankert.", "Dokumentieren Sie fünf wiederkehrende Entscheidungen oder Rückfragen zu einem zentralen Ablauf an einem festen Ort."]
      : ["Schlüsselwissen verlässlich sichern", "Wissen und digitale Arbeitsweisen sind noch nicht robust genug im Arbeitsalltag verteilt.", "Dokumentieren Sie die fünf häufigsten Rückfragen zu einem zentralen Ablauf an einem gemeinsamen Ort."],
    ki_praxis: ["Einen sicheren KI-Anwendungsfall definieren", "KI-Nutzung, Zielbild und Leitplanken greifen noch nicht belastbar ineinander.", "Definieren Sie einen Anwendungsfall ohne sensible Daten mit Ziel, Testumfang und Prüfschritt."],
    umsetzungskraft: solo
      ? ["Verbindliche Umsetzungszeit reservieren", "Der Engpass liegt weniger bei Ideen als bei Priorität, Zeitrahmen und Messung.", "Reservieren Sie ein festes wöchentliches Zeitfenster und einen Zielwert für einen vierwöchigen Test."]
      : ["Verantwortung und Erfolgskriterium festlegen", "Der Engpass liegt weniger bei Ideen als bei Verantwortung, Tempo und Messung.", "Benennen Sie eine verantwortliche Person und einen Zielwert für einen vierwöchigen Test."],
  };
  const mature = {
    prozesse_daten: ["Stabile Abläufe gezielt erweitern", "Die Prozess- und Datengrundlage trägt bereits. Zusätzliche KI sollte deshalb nur in einem klar begrenzten Ablauf getestet werden, ohne die bestehende Verlässlichkeit zu verschlechtern.", "Wählen Sie einen stabilen Ablauf und definieren Sie vor dem Test einen Zielwert sowie ein Qualitätskriterium."],
    team_wissen: solo
      ? ["Bewährte eigene Arbeitsweisen ausbauen", "Wissen und digitale Arbeitsweisen bilden bereits eine belastbare Grundlage. Der nächste Schritt ist, eine bewährte eigene Routine messbar weiterzuentwickeln.", "Wählen Sie eine gut funktionierende eigene Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll."]
      : ["Bewährte Arbeitsweisen gezielt ausbauen", "Wissen und digitale Arbeitsweisen bilden bereits eine belastbare Grundlage. Der nächste Schritt ist, eine bewährte Routine messbar weiterzuentwickeln.", "Wählen Sie eine gut funktionierende Routine und dokumentieren Sie, welchen zusätzlichen Nutzen ein kleiner KI-Test bringen soll."],
    ki_praxis: ["Sichere KI-Praxis vertiefen", "KI-Nutzung, Zielbild und Leitplanken sind bereits gut aufeinander abgestimmt. Jetzt zählt ein Vergleich, der zusätzlichen Nutzen nachvollziehbar belegt.", "Vergleichen Sie einen klar abgegrenzten KI-Anwendungsfall vier Wochen lang mit dem bisherigen Ablauf."],
    umsetzungskraft: ["Umsetzung systematisch skalieren", "Priorität, Tempo und Erfolgsmessung sind bereits tragfähig. Ein nächster Test sollte deshalb vor allem die Entscheidung über eine sinnvolle Skalierung vorbereiten.", "Legen Sie für den nächsten Test vorab Fortführen-, Anpassen- und Stoppen-Kriterien fest."],
  };
  const copyFor = (key) => {
    const score = baseline.scores[key].percent;
    if (score < 65) return developing[key];
    const copy = [...mature[key]];
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
    ? ["Nächsten messbaren KI-Test auswählen", allMature
      ? "Die vier Teilwerte liegen auf einem durchgängig hohen Niveau. Der größte Nutzen entsteht jetzt durch einen kleinen Vergleichstest mit klarer Qualitäts- und Wirkungsmessung."
      : "Die Teilwerte sind ausgewogen. Statt einen vermeintlichen Schwachpunkt zu behandeln, sollte der nächste Test nach messbarem Nutzen und geringem Risiko ausgewählt werden."]
    : copyFor(weakest);
  const recommendations = ranked.slice(0, 3).map((key, index) => {
    const copy = copyFor(key);
    return { titel: copy[0], beobachtung: copy[1], naechsterSchritt: copy[2], aufwand: index ? "mittel" : "gering", wirkung: index ? "hoch" : "sehr hoch" };
  });
  const primary = advisory.opportunities[0];
  const industryLabel = advisory.industry.entered || advisory.industry.label;
  const scores = Object.fromEntries(Object.entries(baseline.scores).map(([key, value]) => {
    if (key === "total") return [key, value];
    return [key, { ...value, summary: dimensionSummary(DIMENSIONS[key].label, value.percent) }];
  }));
  return {
    ...baseline,
    resultVersion: RESULT_VERSION,
    scores,
    advisory,
    gesamteinschaetzung: `Für Ihr Unternehmen im Bereich „${industryLabel}“ ergibt sich ein Readiness-Score von ${baseline.scores.total.percent} von 100 Punkten. ${comparison} Auf Basis Ihrer Ziele und Antworten ist „${primary.title}“ der konkret passendste erste Prüfpunkt — mit menschlicher Freigabe und einer vorher festgelegten Messgröße.`,
    groessterHebel: { titel: primary.title || leverage[0], begruendung: `${primary.fitReason} ${primary.status.explanation}` },
    empfehlungen: recommendations,
    roadmap: {
      phase1: { zeitraum: "Tage 1–30", titel: "Pilot sauber abgrenzen", punkte: [primary.nextStep, primary.prerequisite] },
      phase2: { zeitraum: "Tage 31–60", titel: "Mit echten Fällen testen", punkte: [solo ? "Den Ablauf mit einer kleinen Serie eigener realer Fälle vergleichen" : "Den Ablauf mit einer kleinen Testgruppe und realen Fällen vergleichen", `Vorher und nachher messen: ${primary.metric}`] },
      phase3: { zeitraum: "Tage 61–90", titel: "Wirkung bewusst entscheiden", punkte: ["Ergebnisse und Fehler gemeinsam auswerten", "Fortführen, anpassen oder stoppen — erst danach über eine Ausweitung entscheiden"] },
    },
    diagnosticNote: "Adaptive Selbsteinschätzung mit festen Messankern; keine Zertifizierung oder Erfolgsgarantie.",
  };
}

module.exports = { RESULT_VERSION, buildDeterministicResult, dimensionSummary };

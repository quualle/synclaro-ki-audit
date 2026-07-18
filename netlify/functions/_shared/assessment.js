"use strict";

const ASSESSMENT_VERSION = "2026-07-18.v2";

const DIMENSIONS = {
  prozesse_daten: {
    label: "Prozesse & Daten",
    weight: 0.3,
    short: "Wie verlässlich Abläufe, Systeme und Informationen zusammenspielen.",
  },
  team_wissen: {
    label: "Wissen & Arbeitsweise",
    weight: 0.25,
    short: "Wie gut Wissen verfügbar ist und Veränderungen im Alltag ankommen.",
  },
  ki_praxis: {
    label: "KI-Praxis & Sicherheit",
    weight: 0.25,
    short: "Wie gezielt, wiederholbar und verantwortungsvoll KI eingesetzt wird.",
  },
  umsetzungskraft: {
    label: "Umsetzungskraft",
    weight: 0.2,
    short: "Wie klar Verantwortung, Priorität und Erfolgsmessung geregelt sind.",
  },
};

const PHASES = [
  {
    phaseTitle: "Prozesse & Daten",
    phaseIntro: "Zuerst prüfen wir, wie belastbar das Fundament Ihres Unternehmens ist.",
    questions: [
      {
        id: "prozess_standardisierung",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie verlässlich laufen Ihre wichtigsten Abläufe heute?",
        options: [
          { value: "1", label: "Meist nach Erfahrung, Zuruf oder Einzelwissen" },
          { value: "2", label: "Teilweise dokumentiert, je nach Person unterschiedlich" },
          { value: "3", label: "Überwiegend klar und digital unterstützt" },
          { value: "4", label: "Durchgängig standardisiert und messbar" },
        ],
      },
      {
        id: "daten_zugriff",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie gut finden Sie die Informationen, die Sie für Entscheidungen brauchen?",
        options: [
          { value: "1", label: "Über Ordner, Postfächer und Köpfe verteilt" },
          { value: "2", label: "Es gibt zentrale Orte, aber mit spürbaren Lücken" },
          { value: "3", label: "Meist zentral, aktuell und gut auffindbar" },
          { value: "4", label: "Zentral, strukturiert und direkt auswertbar" },
        ],
      },
      {
        id: "system_brueche",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie oft werden Informationen zwischen Programmen oder Listen von Hand übertragen?",
        options: [
          { value: "1", label: "Mehrmals täglich" },
          { value: "2", label: "Regelmäßig im Wochenverlauf" },
          { value: "3", label: "Nur an einzelnen Stellen" },
          { value: "4", label: "Kaum — die wichtigsten Systeme greifen ineinander" },
        ],
      },
      {
        id: "routineaufgaben",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie stark bindet wiederkehrende Verwaltung Ihre Arbeitszeit?",
        options: [
          { value: "1", label: "Sehr stark — sie verdrängt wichtigere Arbeit" },
          { value: "2", label: "Spürbar — jede Woche bleiben Stunden liegen" },
          { value: "3", label: "Überschaubar — einzelne Zeitfresser sind noch da" },
          { value: "4", label: "Kaum — Routinen laufen weitgehend effizient" },
        ],
      },
    ],
  },
  {
    phaseTitle: "Wissen & KI-Praxis",
    phaseIntro: "Jetzt geht es darum, wie Wissen, Arbeitsweise und KI im Alltag zusammenspielen.",
    questions: [
      {
        id: "wissen_verteilung",
        dimension: "team_wissen",
        type: "radio",
        required: true,
        label: "Was passiert, wenn eine Schlüsselperson spontan ausfällt?",
        options: [
          { value: "1", label: "Wichtige Abläufe geraten ins Stocken" },
          { value: "2", label: "Das Team kommt weiter, aber mit vielen Rückfragen" },
          { value: "3", label: "Das meiste Wissen ist dokumentiert und auffindbar" },
          { value: "4", label: "Aufgaben und Wissen sind bewusst redundant organisiert" },
        ],
      },
      {
        id: "team_digital",
        dimension: "team_wissen",
        type: "radio",
        required: true,
        label: "Wie gut werden neue digitale Arbeitsweisen im Unternehmen angenommen?",
        options: [
          { value: "1", label: "Sie scheitern häufig an Skepsis oder Überlastung" },
          { value: "2", label: "Einzelne ziehen mit, andere bleiben bei alten Wegen" },
          { value: "3", label: "Mit guter Einführung werden sie zuverlässig genutzt" },
          { value: "4", label: "Das Team testet und verbessert neue Wege aktiv" },
        ],
      },
      {
        id: "ki_nutzung",
        dimension: "ki_praxis",
        type: "radio",
        required: true,
        label: "Wie wird KI heute in Ihrem Unternehmen genutzt?",
        options: [
          { value: "1", label: "Noch gar nicht oder nur privat ausprobiert" },
          { value: "2", label: "Punktuell für einzelne Aufgaben" },
          { value: "3", label: "Für mehrere klare Aufgaben im Arbeitsalltag" },
          { value: "4", label: "Als fester, dokumentierter Bestandteil wichtiger Abläufe" },
        ],
      },
      {
        id: "ki_leitplanken",
        dimension: "ki_praxis",
        type: "radio",
        required: true,
        label: "Wie klar sind Regeln für Datenschutz, Qualität und Freigaben bei KI?",
        options: [
          { value: "1", label: "Dazu gibt es noch keine gemeinsamen Regeln" },
          { value: "2", label: "Es gibt mündliche Absprachen, aber keine klare Linie" },
          { value: "3", label: "Die wichtigsten Leitplanken sind definiert" },
          { value: "4", label: "Regeln, Verantwortliche und Kontrollen sind etabliert" },
        ],
      },
    ],
  },
  {
    phaseTitle: "Umsetzungskraft",
    phaseIntro: "Zum Schluss prüfen wir, ob aus Potenzial auch messbare Umsetzung wird.",
    questions: [
      {
        id: "ki_zielbild",
        dimension: "ki_praxis",
        type: "radio",
        required: true,
        label: "Wie klar ist, welches konkrete Problem KI zuerst lösen soll?",
        options: [
          { value: "1", label: "Noch unklar — wir wollen zunächst verstehen, was möglich ist" },
          { value: "2", label: "Es gibt mehrere Ideen, aber noch keine Priorität" },
          { value: "3", label: "Ein erster Anwendungsfall ist klar umrissen" },
          { value: "4", label: "Nutzen, Zielgruppe und erwarteter Effekt sind definiert" },
        ],
      },
      {
        id: "verantwortung",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Wer treibt KI- und Automatisierungsthemen verbindlich voran?",
        options: [
          { value: "1", label: "Aktuell niemand mit klarer Verantwortung" },
          { value: "2", label: "Das Thema läuft nebenbei bei interessierten Personen" },
          { value: "3", label: "Eine verantwortliche Person hat Zeit und Rückendeckung" },
          { value: "4", label: "Verantwortung, Budget und Entscheidungspfad sind fest geregelt" },
        ],
      },
      {
        id: "umsetzungstempo",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Wie schnell kann Ihr Unternehmen einen kleinen KI-Test starten?",
        options: [
          { value: "1", label: "Vermutlich später als in sechs Monaten" },
          { value: "2", label: "In den nächsten drei bis sechs Monaten" },
          { value: "3", label: "Innerhalb der nächsten vier bis acht Wochen" },
          { value: "4", label: "Innerhalb von zwei Wochen mit klarer Testgruppe" },
        ],
      },
      {
        id: "erfolgsmessung",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Woran würden Sie erkennen, dass sich eine KI-Lösung wirklich lohnt?",
        options: [
          { value: "1", label: "Dafür haben wir noch keine Messgröße" },
          { value: "2", label: "Am allgemeinen Eindruck im Arbeitsalltag" },
          { value: "3", label: "An Zeit, Qualität oder Durchlaufzeit" },
          { value: "4", label: "An einem vorher festgelegten Ziel mit Ausgangswert" },
        ],
      },
      {
        id: "haupthebel",
        type: "textarea",
        required: false,
        label: "Wenn Sie in den nächsten 90 Tagen eine Sache verbessern könnten — welche wäre das?",
        placeholder: "Zum Beispiel: Angebote schneller erstellen, Anfragen sauberer bearbeiten, Wissen auffindbar machen …",
      },
    ],
  },
];

const QUESTION_BY_ID = new Map(
  PHASES.flatMap((phase) => phase.questions).map((question) => [question.id, question])
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value, max = 500) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function answerMap(answers) {
  const map = new Map();
  for (const answer of Array.isArray(answers) ? answers : []) {
    const id = cleanText(answer && answer.questionId, 80);
    if (QUESTION_BY_ID.has(id)) map.set(id, answer);
  }
  return map;
}

function levelFor(score) {
  if (score < 25) return { key: "fundament", label: "KI-Fundament aufbauen" };
  if (score < 50) return { key: "startklar", label: "KI-Startklar" };
  if (score < 75) return { key: "umsetzungsbereit", label: "KI-Umsetzungsbereit" };
  return { key: "skalierbar", label: "KI-Skalierbar" };
}

function timePotential(answerLookup, employeeBand) {
  const routineValue = Number(answerLookup.get("routineaufgaben")?.answer || 2);
  if (routineValue <= 1) return {
    label: "Hohes Entlastungspotenzial",
    note: "Ihre Selbsteinschätzung zeigt starke Belastung durch wiederkehrende Arbeit. Das Potenzial muss an einem konkreten Ablauf gemessen werden.",
  };
  if (routineValue === 2) return {
    label: "Klares Entlastungspotenzial",
    note: "Wiederkehrende Arbeit bindet spürbar Zeit. Ein abgegrenzter Prozess eignet sich für einen messbaren Test.",
  };
  if (routineValue === 3) return {
    label: "Gezieltes Entlastungspotenzial",
    note: "Einzelne Zeitfresser sind erkennbar. Priorisieren Sie nach Häufigkeit, Risiko und messbarem Nutzen.",
  };
  return {
    label: "Selektives Optimierungspotenzial",
    note: "Routinen laufen bereits effizient. KI sollte nur dort getestet werden, wo ein zusätzlicher messbarer Nutzen plausibel ist.",
  };
}

function scoreAssessment(answers, profile = {}) {
  const lookup = answerMap(answers);
  const buckets = Object.fromEntries(Object.keys(DIMENSIONS).map((key) => [key, []]));
  const missing = [];

  for (const [id, question] of QUESTION_BY_ID.entries()) {
    if (!question.dimension) continue;
    const raw = Number(lookup.get(id)?.answer);
    if (!Number.isFinite(raw) || raw < 1 || raw > 4) {
      missing.push(id);
      continue;
    }
    buckets[question.dimension].push(((raw - 1) / 3) * 100);
  }

  const dimensions = {};
  let weighted = 0;
  let usedWeight = 0;
  for (const [key, config] of Object.entries(DIMENSIONS)) {
    const values = buckets[key];
    const percent = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;
    dimensions[key] = { percent, label: config.label, short: config.short };
    if (values.length) {
      weighted += percent * config.weight;
      usedWeight += config.weight;
    }
  }

  const total = usedWeight ? Math.round(weighted / usedWeight) : 0;
  const level = levelFor(total);
  return {
    assessmentVersion: ASSESSMENT_VERSION,
    scores: { ...dimensions, total: { percent: clamp(total, 0, 100) } },
    level: level.label,
    levelKey: level.key,
    timePotential: timePotential(lookup, cleanText(profile.mitarbeiter, 20)),
    complete: missing.length === 0,
    missingQuestionIds: missing,
  };
}

function phaseInsight(stepNumber, previousAnswers, profile = {}) {
  const lookup = answerMap(previousAnswers);
  if (stepNumber === 1) {
    const branch = cleanText(profile.branche, 80) || "Ihr Unternehmen";
    return `${branch} wird mit derselben festen Bewertungslogik geprüft wie jedes andere Unternehmen — die Branche verändert nur die spätere Einordnung.`;
  }
  if (stepNumber === 2) {
    const routine = cleanText(lookup.get("routineaufgaben")?.answerLabel, 180);
    return routine
      ? `Bei der wiederkehrenden Verwaltung lautet Ihre Einordnung „${routine}“. Jetzt prüfen wir, ob gesichertes Arbeitswissen und KI-Praxis diesen Engpass verstärken oder bereits entlasten.`
      : "Das Prozessfundament ist erfasst. Jetzt prüfen wir, wie Wissen, Arbeitsweise und KI-Praxis im Alltag zusammenspielen.";
  }
  const aiUse = cleanText(lookup.get("ki_nutzung")?.answerLabel, 180);
  return aiUse
    ? `Ihre bisherige KI-Nutzung: „${aiUse}“. Entscheidend ist jetzt, ob daraus ein verantworteter und messbarer nächster Schritt werden kann.`
    : "Zum Abschluss zählt nicht die Zahl der Ideen, sondern ob Verantwortung, Tempo und Erfolgsmessung zusammenpassen.";
}

function questionForProfile(question, profile = {}) {
  const result = JSON.parse(JSON.stringify(question));
  if (cleanText(profile.mitarbeiter, 20) !== "solo") return result;
  if (result.id === "prozess_standardisierung") {
    result.options = [
      { value: "1", label: "Meist nach Erfahrung oder aus dem Gedächtnis" },
      { value: "2", label: "Teilweise dokumentiert, je nach Zeitdruck unterschiedlich" },
      { value: "3", label: "Überwiegend klar und digital unterstützt" },
      { value: "4", label: "Durchgängig standardisiert und messbar" },
    ];
  } else if (result.id === "daten_zugriff") {
    result.options = [
      { value: "1", label: "Über Ordner, Postfächer und einzelne Notizen verteilt" },
      { value: "2", label: "Es gibt zentrale Orte, aber mit spürbaren Lücken" },
      { value: "3", label: "Meist zentral, aktuell und gut auffindbar" },
      { value: "4", label: "Zentral, strukturiert und direkt auswertbar" },
    ];
  } else if (result.id === "wissen_verteilung") {
    result.label = "Wie gut bleibt Ihr Arbeitswissen verfügbar, wenn Sie unter Zeitdruck stehen oder eine Aufgabe später wieder aufnehmen?";
    result.options = [
      { value: "1", label: "Wichtiges steckt vor allem im Kopf und geht im Alltag leicht verloren" },
      { value: "2", label: "Einige Notizen oder Vorlagen existieren, aber noch nicht verlässlich" },
      { value: "3", label: "Wichtige Abläufe und Wissen sind gut dokumentiert und auffindbar" },
      { value: "4", label: "Wissen ist systematisch in Vorlagen, Checklisten und Systemen gesichert" },
    ];
  } else if (result.id === "team_digital") {
    result.label = "Wie konsequent verankern Sie neue digitale Arbeitsweisen in Ihrem eigenen Alltag?";
    result.options = [
      { value: "1", label: "Neue Wege versanden häufig unter Zeitdruck" },
      { value: "2", label: "Ich probiere punktuell aus, falle aber oft in alte Abläufe zurück" },
      { value: "3", label: "Mit klarer Einführung nutze ich neue Wege zuverlässig" },
      { value: "4", label: "Ich teste, dokumentiere und verbessere neue Wege systematisch" },
    ];
  } else if (result.id === "ki_leitplanken") {
    result.options = [
      { value: "1", label: "Dafür habe ich noch keine festen Regeln" },
      { value: "2", label: "Einige Grundsätze sind klar, aber noch nicht dokumentiert" },
      { value: "3", label: "Die wichtigsten Leitplanken sind dokumentiert" },
      { value: "4", label: "Regeln, Prüfschritte und Freigaben sind fest verankert" },
    ];
  } else if (result.id === "ki_zielbild") {
    result.options = [
      { value: "1", label: "Noch unklar — ich möchte zunächst verstehen, was möglich ist" },
      { value: "2", label: "Es gibt mehrere Ideen, aber noch keine Priorität" },
      { value: "3", label: "Ein erster Anwendungsfall ist klar umrissen" },
      { value: "4", label: "Nutzen, Einsatzbereich und erwarteter Effekt sind definiert" },
    ];
  } else if (result.id === "verantwortung") {
    result.label = "Wie verbindlich planen Sie Zeit für KI- und Automatisierungsthemen ein?";
    result.options = [
      { value: "1", label: "Aktuell ohne festen Platz in meinem Arbeitsalltag" },
      { value: "2", label: "Nebenbei, wenn gerade Zeit übrig bleibt" },
      { value: "3", label: "Mit festen Zeitfenstern und klarer Priorität" },
      { value: "4", label: "Mit festem Budget, Zeitrahmen und Entscheidungskriterien" },
    ];
  } else if (result.id === "umsetzungstempo") {
    result.options = [
      { value: "1", label: "Vermutlich später als in sechs Monaten" },
      { value: "2", label: "In den nächsten drei bis sechs Monaten" },
      { value: "3", label: "Innerhalb der nächsten vier bis acht Wochen" },
      { value: "4", label: "Innerhalb von zwei Wochen mit klar begrenztem Testumfang" },
    ];
  } else if (result.id === "erfolgsmessung") {
    result.options = [
      { value: "1", label: "Dafür habe ich noch keine Messgröße" },
      { value: "2", label: "Am allgemeinen Eindruck im Arbeitsalltag" },
      { value: "3", label: "An Zeit, Qualität oder Durchlaufzeit" },
      { value: "4", label: "An einem vorher festgelegten Ziel mit Ausgangswert" },
    ];
  }
  return result;
}

function getQuestion(questionId, profile = {}) {
  const question = QUESTION_BY_ID.get(cleanText(questionId, 80));
  return question ? questionForProfile(question, profile) : null;
}

function getPhase(stepNumber, previousAnswers, profile) {
  const index = clamp(Number(stepNumber || 1), 1, PHASES.length) - 1;
  const phase = JSON.parse(JSON.stringify(PHASES[index]));
  phase.questions = phase.questions.map((question) => questionForProfile(question, profile));
  phase.transitionInsight = phaseInsight(index + 1, previousAnswers, profile);
  phase.isLastStep = index === PHASES.length - 1;
  phase.assessmentVersion = ASSESSMENT_VERSION;
  return phase;
}

function publicQuestionList() {
  return PHASES.flatMap((phase) => phase.questions).map((question) => ({
    id: question.id,
    label: question.label,
    type: question.type,
    dimension: question.dimension || null,
  }));
}

module.exports = {
  ASSESSMENT_VERSION,
  DIMENSIONS,
  PHASES,
  QUESTION_BY_ID,
  cleanText,
  getPhase,
  getQuestion,
  publicQuestionList,
  scoreAssessment,
};

"use strict";

const ASSESSMENT_VERSION = "2026-07-19.v5";
const ADAPTIVE_CORE_COUNT = 8;
const ADAPTIVE_QUESTIONS_PER_DIMENSION = 2;

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
        label: "Wie klar und einheitlich sind Ihre wichtigsten Abläufe geregelt?",
        help: "Denken Sie an einen häufigen Ablauf, etwa Anfrage → Leistung → Rechnung. Entscheidend ist der tatsächliche Alltag.",
        options: [
          { value: "1", label: "Situationsabhängig — Erfahrung, Zuruf oder Gedächtnis bestimmen den Ablauf" },
          { value: "2", label: "Teilweise geregelt — einige Schritte sind dokumentiert, andere variieren" },
          { value: "3", label: "Weitgehend einheitlich — die meisten Schritte sind klar und digital unterstützt" },
          { value: "4", label: "Durchgängig geregelt — Schritte, Zuständigkeiten und Ergebnisse sind messbar" },
        ],
      },
      {
        id: "daten_zugriff",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie schnell finden Sie verlässliche Informationen für eine Entscheidung?",
        help: "Denken Sie an aktuelle Kunden-, Auftrags-, Finanz- oder Prozessinformationen.",
        options: [
          { value: "1", label: "Aufwendig — über Ordner, Postfächer oder Einzelnotizen verteilt" },
          { value: "2", label: "Mit Suche — zentrale Orte bestehen, aber mit Lücken" },
          { value: "3", label: "Schnell — meist zentral, aktuell und auffindbar" },
          { value: "4", label: "Direkt — strukturiert und ohne Nacharbeit auswertbar" },
        ],
      },
      {
        id: "system_brueche",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie oft übertragen Sie Informationen von Hand zwischen Programmen, Listen oder E-Mails?",
        help: "Dazu zählen Kopieren, Abtippen, CSV-Exporte und doppelte Eingaben.",
        options: [
          { value: "1", label: "Sehr häufig — mehrmals täglich" },
          { value: "2", label: "Regelmäßig — mindestens wöchentlich" },
          { value: "3", label: "Selten — nur an einzelnen Stellen" },
          { value: "4", label: "Nie oder fast nie — die wichtigsten Systeme greifen ineinander" },
        ],
      },
      {
        id: "routineaufgaben",
        dimension: "prozesse_daten",
        type: "radio",
        required: true,
        label: "Wie viel Arbeitszeit bindet wiederkehrende Verwaltung?",
        help: "Zum Beispiel Vorbereitung, Übertragung, Abstimmung, Erinnerungen oder Dokumentation.",
        options: [
          { value: "1", label: "Sehr viel — sie bestimmt große Teile des Arbeitstags" },
          { value: "2", label: "Spürbar — jede Woche mehrere Stunden" },
          { value: "3", label: "Begrenzt — einzelne Zeitfresser bestehen noch" },
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
        label: "Wie verlässlich bleibt wichtiges Arbeitswissen verfügbar?",
        help: "Bewerten Sie, ob eine Aufgabe nach einer Unterbrechung ohne Wissensverlust fortgeführt werden kann.",
        options: [
          { value: "1", label: "Kaum — entscheidendes Wissen steckt in einzelnen Köpfen" },
          { value: "2", label: "Teilweise — Notizen bestehen, Suchen oder Rückfragen bleiben häufig" },
          { value: "3", label: "Meist — wichtiges Wissen ist dokumentiert und auffindbar" },
          { value: "4", label: "Systematisch — Wissen ist in Vorlagen, Checklisten und Systemen gesichert" },
        ],
      },
      {
        id: "team_digital",
        dimension: "team_wissen",
        type: "radio",
        required: true,
        label: "Wie konsequent werden neue digitale Arbeitsweisen nach der Einführung genutzt?",
        help: "Denken Sie an die zuletzt eingeführte digitale Arbeitsweise – nicht an die allgemeine Technikoffenheit.",
        options: [
          { value: "1", label: "Kaum — neue Wege versanden meist unter Zeitdruck" },
          { value: "2", label: "Unregelmäßig — alte Wege bleiben parallel bestehen" },
          { value: "3", label: "Überwiegend — nach klarer Einführung werden sie verlässlich genutzt" },
          { value: "4", label: "Konsequent — neue Wege werden genutzt, dokumentiert und verbessert" },
        ],
      },
      {
        id: "ki_nutzung",
        dimension: "ki_praxis",
        type: "radio",
        required: true,
        label: "Wie fest ist KI heute in Ihren Arbeitsabläufen verankert?",
        help: "Bewerten Sie die betriebliche Nutzung, nicht einzelne private Versuche.",
        options: [
          { value: "1", label: "Gar nicht — noch keine betriebliche Nutzung" },
          { value: "2", label: "Punktuell — spontan für einzelne Aufgaben" },
          { value: "3", label: "Regelmäßig — für mehrere klar definierte Aufgaben" },
          { value: "4", label: "Systematisch — dokumentierter Bestandteil wichtiger Abläufe" },
        ],
      },
      {
        id: "ki_leitplanken",
        dimension: "ki_praxis",
        type: "radio",
        required: true,
        label: "Wie verbindlich sind Regeln für Datenschutz, Ergebniskontrolle und Freigaben bei KI?",
        help: "Denken Sie an sensible Daten, fehlerhafte KI-Antworten und die Freigabe wichtiger Ergebnisse.",
        options: [
          { value: "1", label: "Keine — noch keine festen Regeln" },
          { value: "2", label: "Informell — einzelne Absprachen oder Grundsätze" },
          { value: "3", label: "Definiert — die wichtigsten Regeln sind dokumentiert" },
          { value: "4", label: "Verankert — Verantwortung, Prüfung und Freigabe werden angewendet" },
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
        label: "Wie klar ist der erste konkrete KI-Anwendungsfall festgelegt?",
        help: "Ein Anwendungsfall beginnt mit einem wiederkehrenden Problem, nicht mit einem gewünschten Tool.",
        options: [
          { value: "1", label: "Unklar — noch kein Problem ausgewählt" },
          { value: "2", label: "Mehrere Ideen — noch ohne Priorität" },
          { value: "3", label: "Eingegrenzt — ein konkreter Anwendungsfall ist gewählt" },
          { value: "4", label: "Messbar — Ablauf, gewünschter Nutzen und Kennzahl stehen fest" },
        ],
      },
      {
        id: "verantwortung",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Wie verbindlich sind Verantwortung und Zeit für KI-Vorhaben geregelt?",
        help: "Solo-Selbstständige bewerten hier die eigene fest reservierte Umsetzungszeit.",
        options: [
          { value: "1", label: "Offen — weder Verantwortung noch Zeit sind festgelegt" },
          { value: "2", label: "Nebenbei — das Thema läuft ohne reservierte Zeit" },
          { value: "3", label: "Verbindlich — Verantwortung und feste Zeit sind benannt" },
          { value: "4", label: "Fest verankert — Verantwortung, Zeit und Entscheidungspfad sind geregelt" },
        ],
      },
      {
        id: "umsetzungstempo",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Wann könnten Sie organisatorisch einen kleinen KI-Pilot starten?",
        help: "Gemeint ist ein wiederkehrender Ablauf, höchstens ein bis drei Beteiligte, etwa vier Wochen Testdauer, ein klarer Zielwert und keine große Systemumstellung.",
        options: [
          { value: "1", label: "Später — in mehr als sechs Monaten" },
          { value: "2", label: "Mittelfristig — in drei bis sechs Monaten" },
          { value: "3", label: "Kurzfristig — in drei bis zwölf Wochen" },
          { value: "4", label: "Startklar — innerhalb von zwei Wochen" },
        ],
      },
      {
        id: "erfolgsmessung",
        dimension: "umsetzungskraft",
        type: "radio",
        required: true,
        label: "Wie konkret könnten Sie den Erfolg eines KI-Piloten messen?",
        help: "Wählen Sie, was Sie heute tatsächlich festlegen könnten – nicht die ideale Antwort.",
        options: [
          { value: "1", label: "Noch nicht — keine Messgröße vorhanden" },
          { value: "2", label: "Subjektiv — nach dem allgemeinen Eindruck" },
          { value: "3", label: "Per Kennzahl — etwa Zeit, Qualität oder Fehlerquote" },
          { value: "4", label: "Per Vergleich — Zielwert und Ausgangswert stehen vorher fest" },
        ],
      },
      {
        id: "haupthebel",
        type: "textarea",
        required: false,
        label: "Welcher Arbeitsablauf soll in den nächsten 90 Tagen spürbar besser laufen?",
        help: "Optional: Nennen Sie möglichst Ablauf und gewünschten Effekt. Bitte keine Personen- oder Kundendaten eingeben.",
        placeholder: "Zum Beispiel: Angebote schneller erstellen oder Terminausfälle reduzieren …",
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

function scoreAdaptiveAssessment(answers, profile = {}) {
  const lookup = answerMap(answers);
  const buckets = Object.fromEntries(Object.keys(DIMENSIONS).map((key) => [key, []]));
  const answeredQuestionIds = [];

  for (const [id, question] of QUESTION_BY_ID.entries()) {
    if (!question.dimension) continue;
    const raw = Number(lookup.get(id)?.answer);
    if (!Number.isFinite(raw) || raw < 1 || raw > 4) continue;
    buckets[question.dimension].push(((raw - 1) / 3) * 100);
    answeredQuestionIds.push(id);
  }

  const coverage = Object.fromEntries(Object.entries(buckets).map(([key, values]) => [key, values.length]));
  const complete = answeredQuestionIds.length === ADAPTIVE_CORE_COUNT
    && Object.values(coverage).every((count) => count === ADAPTIVE_QUESTIONS_PER_DIMENSION);
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
    adaptiveVersion: "adaptive-v1",
    scores: { ...dimensions, total: { percent: clamp(total, 0, 100) } },
    level: level.label,
    levelKey: level.key,
    timePotential: timePotential(lookup, cleanText(profile.mitarbeiter, 20)),
    complete,
    answeredQuestionIds,
    coverage,
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
  if (result.id === "wissen_verteilung") {
    result.options = [
      { value: "1", label: "Kaum — entscheidendes Wissen steckt vor allem in meinem Gedächtnis" },
      { value: "2", label: "Teilweise — Notizen bestehen, Suchen oder erneutes Einarbeiten bleibt häufig" },
      { value: "3", label: "Meist — wichtiges Wissen ist dokumentiert und auffindbar" },
      { value: "4", label: "Systematisch — Wissen ist in Vorlagen, Checklisten und Systemen gesichert" },
    ];
  } else if (result.id === "verantwortung") {
    result.options = [
      { value: "1", label: "Offen — weder feste Zeit noch Priorität sind festgelegt" },
      { value: "2", label: "Nebenbei — das Thema läuft nur, wenn Zeit übrig bleibt" },
      { value: "3", label: "Verbindlich — feste Zeit und klare Priorität sind eingeplant" },
      { value: "4", label: "Fest verankert — Zeit, Budget und Entscheidungskriterien sind geregelt" },
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
  ADAPTIVE_CORE_COUNT,
  ADAPTIVE_QUESTIONS_PER_DIMENSION,
  ASSESSMENT_VERSION,
  DIMENSIONS,
  PHASES,
  QUESTION_BY_ID,
  cleanText,
  getPhase,
  getQuestion,
  publicQuestionList,
  scoreAdaptiveAssessment,
  scoreAssessment,
};

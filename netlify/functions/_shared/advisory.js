"use strict";

const { DIMENSIONS, cleanText } = require("./assessment");

const ADVISORY_VERSION = "use-cases.v1";

const GOAL_LABELS = {
  zeit: "wiederkehrende Arbeit zu reduzieren",
  wachstum: "mehr Geschäft ohne mehr Chaos zu bewältigen",
  qualitaet: "Qualität und Verlässlichkeit zu erhöhen",
  wissen: "Wissen besser zu sichern und verfügbar zu machen",
  klarheit: "den wirtschaftlich sinnvollen KI-Einstieg zu finden",
};

const CATALOG = [
  {
    key: "reinigung",
    label: "Reinigungsunternehmen",
    pattern: /(?:\b(?:gebaude|gebaeude|unterhalts|buro|buero|industrie|glas|fassaden)reinigung(?:sfirma|sunternehmen|sbetrieb)?\b|\breinigungs?(?:firma|unternehmen|betrieb|dienst|service)?\b|\bfacility[-\s]+services?\b|\bhausmeister(?:service|dienst)?\b|\b(?:gebaude|gebaeude)service\b)/i,
    cases: [
      {
        id: "cleaning-job-report",
        goals: ["zeit", "qualitaet", "wissen"],
        signals: ["routineaufgaben", "system_brueche", "wissen_verteilung"],
        keywords: ["bericht", "dokument", "einsatz", "qualität", "qualitaet"],
        title: "Einsatzberichte aus kurzen Notizen vorstrukturieren",
        today: "Objekt-, Leistungs- und Abweichungsnotizen kommen uneinheitlich im Büro an.",
        assist: "Eine feste Vorlage ordnet Sprachnotizen oder Stichpunkte nach Objekt, Leistung, Abweichung und Folgeaufgabe.",
        human: "Objektleitung oder Büro prüft Inhalt und gibt den Bericht frei.",
        effect: "Vollständigere Berichte, weniger Rückfragen und weniger erneutes Abtippen.",
        metric: "Minuten je Bericht und Rückfragen pro Woche",
        prerequisite: "Ein verbindliches Berichtsformat und klare Regeln für zulässige Daten.",
        nextStep: "Ein Berichtsformat festlegen und mit zehn bereinigten Beispielen testen.",
      },
      {
        id: "cleaning-request-brief",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["daten_zugriff", "system_brueche", "routineaufgaben"],
        keywords: ["anfrage", "angebot", "objekt", "kalkulation"],
        title: "Anfragen in ein kalkulierbares Objekt-Briefing überführen",
        today: "Fläche, Reinigungsart, Intervall und Starttermin fehlen häufig oder stehen in verschiedenen Nachrichten.",
        assist: "KI extrahiert vorhandene Angaben und markiert fehlende Pflichtinformationen für die Rückfrage.",
        human: "Die verantwortliche Person ergänzt Besonderheiten und entscheidet über die Kalkulation.",
        effect: "Weniger Rückfrageschleifen und ein sauberer Übergang von Anfrage zu Angebot.",
        metric: "Rückfragen je Anfrage und Zeit bis zur Kalkulationsreife",
        prerequisite: "Eine kurze Pflichtfeldliste für qualifizierte Objektanfragen.",
        nextStep: "Die zehn Angaben definieren, ohne die kein Reinigungsangebot kalkuliert wird.",
      },
      {
        id: "cleaning-payment-reminder",
        goals: ["zeit", "qualitaet"],
        signals: ["system_brueche", "routineaufgaben", "daten_zugriff"],
        keywords: ["rechnung", "zahlung", "mahnung", "erinnerung", "buchhaltung"],
        title: "Zahlungserinnerungen aus bestätigten Rechnungsständen vorbereiten",
        today: "Fälligkeiten werden manuell geprüft und Erinnerungen einzeln formuliert.",
        assist: "Fällige, unbestrittene Rechnungen werden nach festen Regeln erkannt und als Erinnerung vorbereitet.",
        human: "Buchhaltung oder Inhaber prüft Zahlungseingang, Ton und Versand.",
        effect: "Erinnerungen werden verlässlich vorbereitet, ohne offene Sonderfälle blind zu versenden.",
        metric: "Überfällige Rechnungen ohne Bearbeitung und Minuten je Prüflauf",
        prerequisite: "Aktuelle Rechnungs- und Zahlungsdaten sowie eine verbindliche Freigaberegel.",
        nextStep: "Eine sichere Liste aus Fälligkeit, Zahlungseingang, Streitstatus und Ansprechpartner definieren.",
      },
    ],
  },
  {
    key: "handwerk",
    label: "Handwerks- und Baubetriebe",
    pattern: /(?:\bhandwerk(?:s(?:betrieb(?:e)?|unternehmen|firma|firmen|dienst(?:leister)?))?\b|\b(?:bau|baubetrieb|bauunternehmen|baugewerbe|hochbau|tiefbau|hausbau|holzbau|gartenbau|galabau|metallbau|schlosserei)\b|\bshk\b|\b(?:sanitar|sanitaer|heizung|elektro)(?:sbau|stechnik|installation|betrieb|handwerk)?\b|\b(?:schreiner(?:ei)?|tischler(?:ei)?|zimmerer(?:ei)?|dachdecker(?:betrieb)?|maler(?:betrieb)?|kfz(?:werkstatt|betrieb)?|werkstatt|installateur)\b)/i,
    cases: [
      {
        id: "craft-site-note",
        goals: ["zeit", "qualitaet", "wachstum"],
        signals: ["routineaufgaben", "system_brueche", "wissen_verteilung"],
        keywords: ["angebot", "bericht", "baustelle", "service", "dokument"],
        title: "Baustellennotizen in einen prüfbaren Leistungsentwurf verwandeln",
        today: "Fotos, Sprachnotizen und Mengenangaben erreichen das Büro unstrukturiert.",
        assist: "KI ordnet die Angaben nach Leistung, Material, Abweichung und offenem Punkt vor.",
        human: "Büro oder Inhaber prüft Mengen, Positionen und technische Richtigkeit.",
        effect: "Vollständigere Serviceberichte oder Angebotsgrundlagen ohne erneutes Zusammensuchen.",
        metric: "Nachfragen pro Vorgang und Zeit bis zum prüfbaren Entwurf",
        prerequisite: "Eine freigegebene Vorlage und eindeutige Auftrags- oder Baustellenkennungen.",
        nextStep: "Eine typische Auftragsart auswählen und die nötigen Pflichtangaben festlegen.",
      },
      {
        id: "craft-request-triage",
        goals: ["wachstum", "zeit"],
        signals: ["daten_zugriff", "system_brueche", "routineaufgaben"],
        keywords: ["anfrage", "termin", "notdienst", "qualifizieren"],
        title: "Kundenanfragen nach Gewerk, Dringlichkeit und Vollständigkeit sortieren",
        today: "Anfragen kommen über Telefon, E-Mail und Formulare mit sehr unterschiedlicher Qualität.",
        assist: "Die Angaben werden in eine feste Struktur überführt und fehlende Informationen werden markiert.",
        human: "Disposition oder Inhaber priorisiert und bestätigt den nächsten Schritt.",
        effect: "Schnellere Erstreaktion und weniger unnötige Rückfragen vor der Terminierung.",
        metric: "Zeit bis zur Erstreaktion und Rückfragen je Anfrage",
        prerequisite: "Klare Prioritätsregeln und Pflichtangaben pro Auftragsart.",
        nextStep: "Drei typische Anfragearten mit Pflichtfeldern und Priorität definieren.",
      },
      {
        id: "craft-knowledge-assistant",
        goals: ["wissen", "qualitaet"],
        signals: ["wissen_verteilung", "daten_zugriff", "ki_leitplanken"],
        keywords: ["wissen", "anleitung", "hersteller", "einarbeitung", "checkliste"],
        title: "Herstellerunterlagen und interne Checklisten quellengebunden durchsuchen",
        today: "Wichtige Vorgaben liegen in PDFs, Ordnern und dem Erfahrungswissen Einzelner.",
        assist: "Ein Assistent beantwortet Fragen nur aus freigegebenen Unterlagen und nennt seine Quelle.",
        human: "Fachverantwortliche prüfen sicherheits- und entscheidungsrelevante Antworten.",
        effect: "Schnellerer Wissenszugriff bei nachvollziehbarer Herkunft der Information.",
        metric: "Suchzeit und unbeantwortete Rückfragen pro Woche",
        prerequisite: "Aktuelle, freigegebene Dokumente und klare Grenzen für technische Entscheidungen.",
        nextStep: "Zwanzig häufig genutzte Unterlagen sammeln und veraltete Versionen aussortieren.",
      },
    ],
  },
  {
    key: "beratung",
    label: "Beratung und professionelle Dienstleistungen",
    pattern: /(?:\b[a-z]*beratung(?:sunternehmen|sgesellschaft)?\b|\bconsult(?:ing|ancy)?\b|\bsteuer(?:berat(?:ung|er)?|kanzlei|buro|buero|fach)\b|\b(?:kanzlei|anwalt|rechtsanwalt|buchhaltung|wirtschaftsprufung|wirtschaftspruefung|coach|coaching|finanzberatung|versicherungsberatung)\b)/i,
    cases: [
      {
        id: "consulting-follow-up",
        goals: ["zeit", "qualitaet", "wachstum"],
        signals: ["routineaufgaben", "system_brueche", "wissen_verteilung"],
        keywords: ["gespräch", "gespraech", "crm", "follow", "protokoll", "aufgabe"],
        title: "Gesprächsnotizen in CRM-Aufgaben und Follow-up-Entwürfe überführen",
        today: "Entscheidungen, Zusagen und nächste Schritte werden nach Gesprächen manuell übertragen.",
        assist: "KI strukturiert Notizen in Entscheidungen, Aufgaben, Fristen und einen Antwortentwurf.",
        human: "Sie prüfen Inhalt, Verantwortlichkeiten und Ton vor Speicherung oder Versand.",
        effect: "Weniger verlorene Zusagen und ein aktuellerer Vertriebs- oder Projektstand.",
        metric: "Nachbereitungszeit und offene Zusagen ohne Aufgabe",
        prerequisite: "Ein einheitliches Notizformat und klar definierte CRM-Felder.",
        nextStep: "Ein Gesprächsformat wählen und die fünf benötigten CRM-Ausgaben festlegen.",
      },
      {
        id: "consulting-offer-draft",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["daten_zugriff", "routineaufgaben", "prozess_standardisierung"],
        keywords: ["angebot", "qualifizierung", "briefing", "akquise"],
        title: "Aus einem Qualifikationsbogen einen Angebotsentwurf vorbereiten",
        today: "Bedarf, Ziel, Umfang und Rahmenbedingungen werden wiederholt zusammengesucht.",
        assist: "Ein strukturiertes Briefing wird in Leistungsbausteine, offene Punkte und einen Entwurf überführt.",
        human: "Berater oder Geschäftsführung prüft Leistungsversprechen, Preis und Passung.",
        effect: "Konsistentere Angebote und weniger Zeit zwischen qualifiziertem Gespräch und Entwurf.",
        metric: "Zeit bis zum Erstentwurf und Korrekturschleifen",
        prerequisite: "Freigegebene Leistungsbausteine und ein verbindlicher Qualifikationsbogen.",
        nextStep: "Die Pflichtinformationen eines guten Angebots an fünf realen Fällen prüfen.",
      },
      {
        id: "consulting-knowledge-reuse",
        goals: ["wissen", "qualitaet", "zeit"],
        signals: ["wissen_verteilung", "daten_zugriff", "ki_leitplanken"],
        keywords: ["wissen", "briefing", "vorlage", "recherche", "deliverable"],
        title: "Eigenes Fachwissen für Briefings und erste Entwürfe wiederverwenden",
        today: "Gute Vorlagen, Analysen und Entscheidungen sind vorhanden, aber schwer gezielt wiederzufinden.",
        assist: "Ein quellengebundener Assistent findet passende Bausteine und erstellt einen referenzierten Erstentwurf.",
        human: "Sie prüfen fachliche Richtigkeit, Aktualität und Mandatsbezug.",
        effect: "Mehr Wiederverwendung ohne unkontrolliertes Kopieren alter Inhalte.",
        metric: "Suchzeit und Anteil wiederverwendbarer, geprüfter Bausteine",
        prerequisite: "Freigegebene Wissensquellen mit Aktualitäts- und Zugriffskonzept.",
        nextStep: "Die drei häufigsten Deliverables und ihre verlässlichen Quellen bestimmen.",
      },
    ],
  },
  {
    key: "agentur",
    label: "Agenturen und kreative Dienstleistungen",
    pattern: /(?:\bagentur\b|\b(?:marketing|design|werbe|kreativ|content|social[-\s]?media|recruiting)(?:agentur|studio|dienstleistung|produktion|marketing|beratung)\b|\b(?:marketing|design|recruiting)\b(?![-\s]?(?:software|plattform|tool|system))|\bwerbung\b|\bpersonalvermittlung\b)/i,
    cases: [
      {
        id: "agency-briefing",
        goals: ["qualitaet", "zeit", "wachstum"],
        signals: ["system_brueche", "routineaufgaben", "wissen_verteilung"],
        keywords: ["briefing", "kunde", "kampagne", "projekt"],
        title: "Kundenbriefings in klare Aufgaben und offene Fragen überführen",
        today: "Ziele, Freigaben und Randbedingungen verteilen sich über Calls, Chats und E-Mails.",
        assist: "KI verdichtet die Quellen in Ziel, Zielgruppe, Deliverables, Freigaben und offene Punkte.",
        human: "Projektverantwortliche bestätigen Prioritäten und kreative Leitplanken.",
        effect: "Weniger Missverständnisse und ein belastbarer Startpunkt für die Umsetzung.",
        metric: "Rückfragen vor Produktionsstart und Korrekturschleifen",
        prerequisite: "Ein verbindliches Briefing-Schema und geklärte Zugriffsrechte.",
        nextStep: "Ein bestehendes Briefing auf die zehn wirklich entscheidenden Felder reduzieren.",
      },
      {
        id: "agency-content-qa",
        goals: ["zeit", "qualitaet"],
        signals: ["routineaufgaben", "ki_nutzung", "ki_leitplanken"],
        keywords: ["content", "text", "freigabe", "qualität", "qualitaet"],
        title: "Entwürfe gegen Tonalität, Pflichtangaben und Freigaberegeln prüfen",
        today: "Wiederkehrende Qualitätschecks erfolgen manuell und uneinheitlich.",
        assist: "Ein Prüfschritt markiert Abweichungen von freigegebenen Regeln und erstellt Korrekturvorschläge.",
        human: "Redaktion oder Beratung entscheidet über jede inhaltliche Änderung.",
        effect: "Konstantere Qualität und weniger vermeidbare Freigabeschleifen.",
        metric: "Korrekturschleifen und gefundene Regelabweichungen",
        prerequisite: "Dokumentierte Tonalität, Pflichtangaben und No-Go-Regeln.",
        nextStep: "Eine kompakte Prüfliste aus zehn objektiven Kriterien erstellen.",
      },
      {
        id: "agency-reporting",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["daten_zugriff", "system_brueche", "erfolgsmessung"],
        keywords: ["report", "kennzahl", "performance", "dashboard"],
        title: "Kampagnendaten in einen erklärbaren Kundenbericht überführen",
        today: "Kennzahlen werden aus mehreren Systemen zusammengetragen und manuell kommentiert.",
        assist: "Freigegebene Daten werden zusammengefasst; Auffälligkeiten und offene Fragen werden markiert.",
        human: "Strategie oder Account Management prüft Ursache, Kontext und Empfehlung.",
        effect: "Schnellere Berichte mit klarer Trennung zwischen Zahl, Beobachtung und Interpretation.",
        metric: "Erstellungszeit und Rückfragen zum Bericht",
        prerequisite: "Definierte Datenquellen, Kennzahlen und ein einheitlicher Berichtszeitraum.",
        nextStep: "Einen Monatsbericht in Daten, Beobachtung und Empfehlung zerlegen.",
      },
    ],
  },
  {
    key: "handel",
    label: "Handel und E-Commerce",
    pattern: /\b(?:handel|onlinehandel|e-?commerce|online[-\s]?shop|web[-\s]?shop|shop|einzelhandel|grosshandel|retail)\b/i,
    cases: [
      {
        id: "commerce-inquiry",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["routineaufgaben", "daten_zugriff", "system_brueche"],
        keywords: ["anfrage", "produkt", "support", "kunde"],
        title: "Produktanfragen mit geprüften Informationen vorqualifizieren",
        today: "Verfügbarkeit, Spezifikation und Rückfragen werden über mehrere Systeme geprüft.",
        assist: "KI strukturiert die Anfrage und schlägt eine Antwort ausschließlich aus freigegebenen Produktdaten vor.",
        human: "Service oder Vertrieb prüft Verfügbarkeit, Sonderfall und Versand.",
        effect: "Schnellere, konsistentere Antworten ohne erfundene Produktangaben.",
        metric: "Antwortzeit und Rückfragen je Vorgang",
        prerequisite: "Aktuelle Produkt-, Bestands- und Lieferinformationen mit klarer Quelle.",
        nextStep: "Die zwanzig häufigsten Anfragen mit ihrer verlässlichen Datenquelle sammeln.",
      },
      {
        id: "commerce-return",
        goals: ["zeit", "qualitaet"],
        signals: ["system_brueche", "prozess_standardisierung", "routineaufgaben"],
        keywords: ["retoure", "reklamation", "rückgabe", "rueckgabe"],
        title: "Retouren und Reklamationen nach Ursache und nächstem Schritt ordnen",
        today: "Freitexte, Fotos und Bestelldaten müssen manuell zugeordnet werden.",
        assist: "Der Fall wird strukturiert, fehlende Nachweise werden markiert und eine Regelroute vorgeschlagen.",
        human: "Service entscheidet über Erstattung, Ersatz oder technische Prüfung.",
        effect: "Weniger Sortierarbeit und einheitlichere Bearbeitung nachvollziehbarer Fälle.",
        metric: "Bearbeitungszeit und falsch geroutete Fälle",
        prerequisite: "Klare Reklamationsgründe, Beleganforderungen und Entscheidungsgrenzen.",
        nextStep: "Die häufigsten fünf Retourengründe mit ihrer Standardroute definieren.",
      },
      {
        id: "commerce-payment",
        goals: ["zeit", "qualitaet"],
        signals: ["routineaufgaben", "daten_zugriff", "system_brueche"],
        keywords: ["rechnung", "zahlung", "erinnerung", "forderung"],
        title: "Offene B2B-Rechnungen regelbasiert zur Prüfung vorlegen",
        today: "Fälligkeiten, Zahlungseingänge und Sonderfälle werden wiederholt abgeglichen.",
        assist: "Das System markiert bestätigte offene Posten und bereitet den passenden Erinnerungstext vor.",
        human: "Buchhaltung prüft Streitfälle, Zahlung und Versand.",
        effect: "Verlässlichere Nachverfolgung ohne automatischen Versand ungeprüfter Mahnungen.",
        metric: "Offene Fälle ohne Bearbeitung und Minuten je Prüflauf",
        prerequisite: "Aktuelle Offene-Posten-Daten und dokumentierte Eskalationsstufen.",
        nextStep: "Die Datenfelder und Ausschlussgründe für eine sichere Erinnerung festlegen.",
      },
    ],
  },
  {
    key: "gastgewerbe",
    label: "Gastgewerbe und Tourismus",
    pattern: /(?:\bgastronomie\b|\bgastro(?:nomie)?betrieb\b|\brestaurant\b|\bhotel(?:betrieb|lerie)?\b|\bpension\b|\btourismus\b|\bcafe\b|\bcatering\b|\bferien(?:wohnung|haus|anlage)?\b)/i,
    cases: [
      {
        id: "hospitality-guest-inquiry",
        goals: ["zeit", "wachstum", "qualitaet"],
        signals: ["routineaufgaben", "daten_zugriff", "system_brueche"],
        keywords: ["gast", "anfrage", "buchung", "reservierung"],
        title: "Gästeanfragen aus freigegebenen Informationen beantworten",
        today: "Wiederkehrende Fragen zu Verfügbarkeit, Regeln und Leistungen binden Zeit.",
        assist: "Ein Antwortentwurf nutzt nur aktuelle, freigegebene Haus- und Angebotsinformationen.",
        human: "Rezeption oder Inhaber prüft Verfügbarkeit, Sonderwünsche und Ton.",
        effect: "Schnellere Antworten bei konsistenter Information.",
        metric: "Antwortzeit und wiederholte Rückfragen",
        prerequisite: "Aktuelle Informationen zu Leistungen, Regeln und Eskalationsfällen.",
        nextStep: "Die dreißig häufigsten Gästeanfragen mit gültiger Antwortquelle sammeln.",
      },
      {
        id: "hospitality-handover",
        goals: ["qualitaet", "wissen", "zeit"],
        signals: ["wissen_verteilung", "prozess_standardisierung", "system_brueche"],
        keywords: ["übergabe", "uebergabe", "schicht", "checkliste"],
        title: "Schichtübergaben in offene Punkte und klare Zuständigkeiten ordnen",
        today: "Besonderheiten und offene Aufgaben gehen in Chats oder mündlichen Übergaben verloren.",
        assist: "Notizen werden nach Gast, Bereich, Dringlichkeit und nächstem Schritt strukturiert.",
        human: "Die übergebende Person prüft und bestätigt kritische Punkte.",
        effect: "Weniger Informationsverlust zwischen Schichten.",
        metric: "Offene Punkte ohne Zuständigkeit und Rückfragen je Übergabe",
        prerequisite: "Ein kurzes Übergabeformat und klare Regeln für sensible Gästedaten.",
        nextStep: "Eine Übergabe-Checkliste mit Pflichtfeldern und Dringlichkeitsstufen festlegen.",
      },
      {
        id: "hospitality-feedback",
        goals: ["qualitaet", "wachstum"],
        signals: ["erfolgsmessung", "daten_zugriff", "umsetzungstempo"],
        keywords: ["bewertung", "feedback", "qualität", "qualitaet"],
        title: "Gästefeedback nach wiederkehrenden Ursachen bündeln",
        today: "Bewertungen und direkte Rückmeldungen werden einzeln gelesen, aber selten systematisch verdichtet.",
        assist: "Feedback wird nach Thema und Dringlichkeit gruppiert; Belegstellen bleiben sichtbar.",
        human: "Leitung bewertet Ursache und entscheidet über Maßnahmen.",
        effect: "Wiederkehrende Qualitätsprobleme werden schneller sichtbar.",
        metric: "Häufigkeit je Thema und Zeit bis zur Maßnahme",
        prerequisite: "Einheitliche Themenliste und regelmäßiger Review-Termin.",
        nextStep: "Feedback der letzten vier Wochen in fünf nachvollziehbare Themen ordnen.",
      },
    ],
  },
  {
    key: "gesundheit",
    label: "Gesundheit und soziale Dienstleistungen",
    pattern: /(?:\bgesundheits(?:wesen|betrieb|dienst)?\b|\b(?:arzt|zahnarzt|tierarzt)?prax(?:is|en)\b|\b(?:arzt|zahnarzt|therapeut|therapie|pflege(?:dienst|heim|betrieb)?|medizin|apotheke|physio(?:therapie)?|sozial(?:dienst|betrieb|einrichtung)?|ergotherapie)\b)/i,
    cases: [
      {
        id: "health-intake",
        goals: ["zeit", "qualitaet"],
        signals: ["routineaufgaben", "system_brueche", "prozess_standardisierung"],
        keywords: ["aufnahme", "anamnese", "dokument", "formular"],
        title: "Administrative Aufnahmeangaben auf Vollständigkeit prüfen",
        today: "Formulare und Rückfragen müssen vor dem Termin manuell auf fehlende Angaben geprüft werden.",
        assist: "Ein Prüfschritt markiert fehlende administrative Felder und bereitet Rückfragen vor.",
        human: "Fachpersonal entscheidet; medizinische Bewertung bleibt vollständig beim Menschen.",
        effect: "Vollständigere Unterlagen und weniger administrative Rückfragen im Termin.",
        metric: "Fehlende Pflichtangaben und Nachbearbeitungszeit",
        prerequisite: "Strikte Trennung administrativer und medizinischer Daten sowie freigegebene Verarbeitung.",
        nextStep: "Die rein administrativen Pflichtfelder und Ausschlussgrenzen dokumentieren.",
      },
      {
        id: "health-appointment-comms",
        goals: ["zeit", "qualitaet"],
        signals: ["routineaufgaben", "system_brueche", "daten_zugriff"],
        keywords: ["termin", "erinnerung", "absage", "kommunikation"],
        title: "Terminbezogene Standardkommunikation sicher vorbereiten",
        today: "Erinnerungen, Unterlagenhinweise und Nachfragen werden einzeln erstellt.",
        assist: "Freigegebene Vorlagen werden anhand des Terminstatus zur Prüfung vorgeschlagen.",
        human: "Praxis oder Einrichtung prüft Empfänger, Inhalt und Versand.",
        effect: "Weniger manuelle Standardkommunikation bei klarer Kontrolle.",
        metric: "Minuten je Termin und fehlende Unterlagen",
        prerequisite: "Freigegebene Vorlagen, aktueller Terminstatus und Datenschutzprüfung.",
        nextStep: "Drei häufige Terminsituationen mit verbindlicher Vorlage abgrenzen.",
      },
      {
        id: "health-sop",
        goals: ["wissen", "qualitaet"],
        signals: ["wissen_verteilung", "daten_zugriff", "ki_leitplanken"],
        keywords: ["wissen", "sop", "leitlinie", "checkliste", "einarbeitung"],
        title: "Freigegebene Abläufe und Checklisten quellengebunden auffindbar machen",
        today: "Interne Standards liegen in Ordnern, PDFs und dem Wissen Einzelner.",
        assist: "Ein Assistent findet ausschließlich freigegebene interne Anweisungen und nennt die Quelle.",
        human: "Fachverantwortliche prüfen Aktualität und alle entscheidungsrelevanten Antworten.",
        effect: "Schnellerer Zugriff auf gültige Abläufe ohne diagnostische oder medizinische Empfehlung.",
        metric: "Suchzeit und Rückfragen zu Standardabläufen",
        prerequisite: "Versionierte, freigegebene Dokumente und ein strikter Nicht-Diagnose-Rahmen.",
        nextStep: "Die zwanzig am häufigsten benötigten internen Standards versioniert zusammenstellen.",
      },
    ],
  },
  {
    key: "immobilien",
    label: "Immobilien und Hausverwaltung",
    pattern: /(?:\bimmobilien(?:verwaltung|makler|unternehmen|wirtschaft)?\b|\bhausverwaltung\b|\bmakler(?:buro|buero)?\b|\bproperty[-\s]?(?:management|service)\b|\bwohnungs(?:verwaltung|wirtschaft|unternehmen)\b|\bfacility[-\s]+management\b)/i,
    cases: [
      {
        id: "realestate-inquiry",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["routineaufgaben", "system_brueche", "daten_zugriff"],
        keywords: ["anfrage", "interessent", "exposé", "expose", "besichtigung"],
        title: "Interessentenanfragen strukturiert vorqualifizieren",
        today: "Anfragen enthalten unterschiedliche Angaben und werden über mehrere Kanäle bearbeitet.",
        assist: "Vorhandene Informationen werden geordnet und fehlende, zulässige Angaben markiert.",
        human: "Makler oder Verwaltung entscheidet über Antwort und nächsten Schritt.",
        effect: "Schnellere, konsistentere Bearbeitung ohne automatische Auswahlentscheidung.",
        metric: "Zeit bis zur Erstreaktion und unvollständige Anfragen",
        prerequisite: "Zulässige Pflichtangaben und diskriminierungsfreie Bearbeitungsregeln.",
        nextStep: "Einen neutralen Qualifikationsbogen und klare Eskalationsfälle definieren.",
      },
      {
        id: "realestate-damage-ticket",
        goals: ["zeit", "qualitaet"],
        signals: ["prozess_standardisierung", "system_brueche", "wissen_verteilung"],
        keywords: ["schaden", "ticket", "handwerker", "mangel"],
        title: "Schadensmeldungen in vollständige Vorgänge überführen",
        today: "Ort, Dringlichkeit, Foto und Zuständigkeit müssen aus Freitexten zusammengesucht werden.",
        assist: "Die Meldung wird strukturiert; fehlende Angaben und eine mögliche Zuständigkeitsroute werden markiert.",
        human: "Verwaltung bewertet Dringlichkeit und beauftragt den passenden Dienstleister.",
        effect: "Weniger Rückfragen und nachvollziehbarere Übergaben an Dienstleister.",
        metric: "Rückfragen je Meldung und Zeit bis zur Beauftragung",
        prerequisite: "Objektkennungen, Dringlichkeitsregeln und Dienstleister-Zuständigkeiten.",
        nextStep: "Ein Pflichtfeldschema für die häufigsten drei Schadenarten erstellen.",
      },
      {
        id: "realestate-document-check",
        goals: ["qualitaet", "zeit"],
        signals: ["daten_zugriff", "routineaufgaben", "ki_leitplanken"],
        keywords: ["dokument", "unterlage", "abrechnung", "vertrag"],
        title: "Vorgangsunterlagen auf Vollständigkeit und Version prüfen",
        today: "Dokumente werden manuell gegen Listen und Fristen abgeglichen.",
        assist: "Ein Prüfschritt markiert fehlende Dokumenttypen, widersprüchliche Versionen und offene Fristen.",
        human: "Verwaltung prüft rechtliche Bedeutung und entscheidet über Nachforderung.",
        effect: "Weniger unvollständige Vorgänge und klarere Nachforderung fehlender Unterlagen.",
        metric: "Fehlende Unterlagen je Vorgang und Prüfzeit",
        prerequisite: "Eine aktuelle Dokumentenliste und eindeutige Objekt- und Vorgangskennungen.",
        nextStep: "Für einen Vorgangstyp die verbindliche Dokumenten- und Fristenliste festlegen.",
      },
    ],
  },
  {
    key: "logistik",
    label: "Logistik und Mobilität",
    pattern: /(?:\blogistik(?:unternehmen|dienstleister)?\b|\bspedition\b|\btransport(?:unternehmen|dienstleister)?\b|\bkurier(?:dienst)?\b|\bfuhrpark(?:management)?\b|\bmobilitat\b|\bliefer(?:dienst|service|logistik)\b)/i,
    cases: [
      {
        id: "logistics-status",
        goals: ["zeit", "qualitaet", "wachstum"],
        signals: ["routineaufgaben", "daten_zugriff", "system_brueche"],
        keywords: ["status", "liefer", "kunde", "anfrage"],
        title: "Statusanfragen aus bestätigten Auftragsdaten vorbereiten",
        today: "Mitarbeitende prüfen mehrere Systeme und formulieren wiederkehrende Statusantworten.",
        assist: "Der aktuelle, bestätigte Status wird in einen Antwortentwurf mit offenen Punkten überführt.",
        human: "Disposition oder Service prüft Ausnahmen und Versand.",
        effect: "Schnellere Statuskommunikation ohne erfundene Lieferzusagen.",
        metric: "Antwortzeit und manuelle Systemwechsel je Anfrage",
        prerequisite: "Eindeutige Auftragsnummern und eine verlässliche Statusquelle.",
        nextStep: "Die häufigsten Statusfragen und ihre jeweils verbindliche Datenquelle abbilden.",
      },
      {
        id: "logistics-exception",
        goals: ["qualitaet", "zeit"],
        signals: ["prozess_standardisierung", "wissen_verteilung", "system_brueche"],
        keywords: ["abweichung", "schaden", "verspätung", "verspaetung", "nachweis"],
        title: "Lieferabweichungen in einen vollständigen Klärfall überführen",
        today: "Fotos, Zustellnachweise und Freitexte werden manuell zusammengeführt.",
        assist: "Der Vorgang wird nach Auftrag, Abweichung, Nachweis und nächster Klärung strukturiert.",
        human: "Disposition oder Qualität entscheidet über Ursache und Maßnahme.",
        effect: "Weniger unvollständige Fälle und schnellerer Übergang zur Klärung.",
        metric: "Rückfragen je Abweichung und Zeit bis zur Zuständigkeit",
        prerequisite: "Klare Abweichungstypen, Nachweisanforderungen und Zuständigkeiten.",
        nextStep: "Die fünf häufigsten Abweichungen mit Pflichtnachweisen und Route festlegen.",
      },
      {
        id: "logistics-handover",
        goals: ["wissen", "qualitaet"],
        signals: ["wissen_verteilung", "team_digital", "system_brueche"],
        keywords: ["übergabe", "uebergabe", "disposition", "schicht"],
        title: "Dispositionsübergaben nach Dringlichkeit und Verantwortlichkeit ordnen",
        today: "Offene Aufträge und Sonderfälle gehen in mündlichen oder freien Übergaben unter.",
        assist: "Notizen werden in offenen Punkt, Frist, Risiko und Verantwortlichkeit strukturiert.",
        human: "Die übergebende Person bestätigt kritische Fälle.",
        effect: "Weniger Informationsverlust zwischen Zeitfenstern oder Schichten.",
        metric: "Offene Punkte ohne Eigentümer und Rückfragen je Übergabe",
        prerequisite: "Ein einheitliches Übergabeformat und eindeutige Auftragskennungen.",
        nextStep: "Eine kompakte Übergabevorlage an drei echten Schichtwechseln testen.",
      },
    ],
  },
  {
    key: "fertigung",
    label: "Produktion und Fertigung",
    pattern: /(?:\bproduktion(?:sbetrieb|sunternehmen)?\b|\bfertigung(?:sbetrieb|sunternehmen)?\b|\bindustrie\b|\bindustrie(?:betrieb|unternehmen)\b|\bmaschinenbau\b|\bhersteller\b|\bmanufaktur\b|\bwerk(?:e)?\b|\bmontage(?:betrieb|unternehmen)?\b)/i,
    cases: [
      {
        id: "manufacturing-quality",
        goals: ["qualitaet", "zeit"],
        signals: ["prozess_standardisierung", "daten_zugriff", "erfolgsmessung"],
        keywords: ["qualität", "qualitaet", "abweichung", "fehler", "prüf", "pruef"],
        title: "Qualitätsabweichungen nach Muster und Ursache vorsortieren",
        today: "Prüfnotizen, Fehlercodes und Fotos werden einzeln bewertet und schwer vergleichbar dokumentiert.",
        assist: "Fälle werden nach freigegebenen Fehlerklassen gruppiert; ähnliche Belegstellen bleiben nachvollziehbar.",
        human: "Qualitätssicherung bewertet Ursache, Freigabe und Maßnahme.",
        effect: "Wiederkehrende Abweichungen werden früher sichtbar und konsistenter dokumentiert.",
        metric: "Zeit bis zur Klassifikation und Wiederholungen je Fehlerklasse",
        prerequisite: "Definierte Fehlerklassen, verlässliche Prüfdaten und menschliche Freigabe.",
        nextStep: "Die häufigsten zehn Abweichungstypen mit Beispiel und Entscheidungspfad beschreiben.",
      },
      {
        id: "manufacturing-maintenance",
        goals: ["wissen", "qualitaet", "zeit"],
        signals: ["wissen_verteilung", "daten_zugriff", "ki_leitplanken"],
        keywords: ["wartung", "störung", "stoerung", "anleitung", "maschine"],
        title: "Wartungswissen und Störungsdokumente quellengebunden durchsuchen",
        today: "Handbücher, Wartungsprotokolle und Erfahrungswissen sind verteilt.",
        assist: "Ein Assistent findet relevante freigegebene Stellen und nennt Dokument sowie Version.",
        human: "Fachpersonal entscheidet über jeden Eingriff und sicherheitsrelevante Maßnahme.",
        effect: "Schnellerer Wissenszugriff bei nachvollziehbarer Quelle.",
        metric: "Suchzeit und Eskalationen wegen fehlender Information",
        prerequisite: "Versionierte Unterlagen und ein strikter Sicherheits- und Freigaberahmen.",
        nextStep: "Für eine Anlage die gültigen Handbücher, Protokolle und Sicherheitsgrenzen bündeln.",
      },
      {
        id: "manufacturing-order",
        goals: ["wachstum", "zeit", "qualitaet"],
        signals: ["system_brueche", "routineaufgaben", "prozess_standardisierung"],
        keywords: ["auftrag", "bestellung", "angebot", "stückliste", "stueckliste"],
        title: "Bestell- und Anfragedaten in einen prüfbaren Auftrag überführen",
        today: "Positionen, Mengen, Termine und Zeichnungsstände werden manuell aus Dokumenten übertragen.",
        assist: "Die Angaben werden extrahiert, versioniert zugeordnet und auf fehlende Pflichtfelder geprüft.",
        human: "Arbeitsvorbereitung oder Vertrieb prüft Preis, Machbarkeit und Version.",
        effect: "Weniger Übertragungsfehler und schnellere Klärung unvollständiger Anfragen.",
        metric: "Nachfragen je Auftrag und manuelle Übertragungszeit",
        prerequisite: "Eindeutige Pflichtfelder und Regeln für Dokument- und Zeichnungsversionen.",
        nextStep: "Eine Auftragsart mit ihren Pflichtfeldern und Versionsregeln abbilden.",
      },
    ],
  },
  {
    key: "bildung",
    label: "Bildung, Training und Coaching",
    pattern: /(?:\bbildung(?:strager|straeger|seinrichtung)?\b|\bbildungsakademie\b|\bschule\b|\bakademie\b|\btraining(?:sanbieter)?\b|\bweiterbildung(?:sanbieter)?\b|\bweiterbildungs(?:akademie|institut|anbieter)\b|\bseminar(?:anbieter)?\b|\bcoaching\b|\blehr(?:institut|gang|angebot)?\b|\bkurs(?:anbieter)?\b)/i,
    cases: [
      {
        id: "education-participant-support",
        goals: ["zeit", "qualitaet", "wachstum"],
        signals: ["routineaufgaben", "wissen_verteilung", "daten_zugriff"],
        keywords: ["teilnehmer", "frage", "kurs", "support"],
        title: "Teilnehmerfragen aus freigegebenen Kursinhalten beantworten",
        today: "Wiederkehrende organisatorische und inhaltliche Fragen werden einzeln beantwortet.",
        assist: "Ein Assistent erstellt eine Antwort aus gültigen Kursunterlagen und nennt die Quelle.",
        human: "Training oder Support prüft individuelle und fachlich sensible Fälle.",
        effect: "Schnellere Antworten bei konsistenter Kursinformation.",
        metric: "Antwortzeit und wiederholte Fragen",
        prerequisite: "Aktuelle Kursunterlagen, klare Zugriffsrechte und Eskalationsregeln.",
        nextStep: "Die dreißig häufigsten Fragen mit gültiger Quelle und Eskalationsfall erfassen.",
      },
      {
        id: "education-session-followup",
        goals: ["zeit", "qualitaet", "wissen"],
        signals: ["routineaufgaben", "system_brueche", "wissen_verteilung"],
        keywords: ["session", "zusammenfassung", "aufgabe", "follow"],
        title: "Sessions in Zusammenfassung, Aufgaben und nächsten Lernschritt überführen",
        today: "Notizen, Aufgaben und Materialien werden nach Terminen manuell aufbereitet.",
        assist: "KI strukturiert freigegebene Notizen in Kernaussage, Aufgabe und Materialhinweis.",
        human: "Trainer prüft Didaktik, Richtigkeit und individuelle Zuordnung.",
        effect: "Schnellere, konsistentere Nachbereitung mit klaren nächsten Schritten.",
        metric: "Nachbereitungszeit und fehlende Aufgaben",
        prerequisite: "Ein festes Ausgabeformat und geklärte Einwilligung bei Aufzeichnungen.",
        nextStep: "Ein Nachbereitungsformat an drei vorhandenen Sessions rückwirkend testen.",
      },
      {
        id: "education-admin",
        goals: ["zeit", "wachstum"],
        signals: ["system_brueche", "routineaufgaben", "daten_zugriff"],
        keywords: ["einladung", "erinnerung", "zertifikat", "organisation"],
        title: "Kursadministration aus bestätigten Statusdaten vorbereiten",
        today: "Einladungen, Erinnerungen, Unterlagen und Teilnahmebestätigungen werden manuell abgeglichen.",
        assist: "Der nächste administrative Schritt wird aus bestätigten Statusfeldern vorgeschlagen.",
        human: "Organisation prüft Sonderfälle und Versand.",
        effect: "Weniger vergessene Standardschritte und weniger Listenabgleich.",
        metric: "Manuelle Prüfschritte je Teilnehmer und fehlende Statusaktionen",
        prerequisite: "Eindeutige Teilnehmer-, Termin- und Versandstatusfelder.",
        nextStep: "Den Standardweg von Anmeldung bis Abschluss als Statusfolge dokumentieren.",
      },
    ],
  },
  {
    key: "it",
    label: "IT- und Software-Dienstleistungen",
    pattern: /(?:\b[a-z-]*software(?:entwicklung|unternehmen|dienstleister|haus)?\b|\bit\b|\bsaas\b|\bwebentwicklung\b|\bsystemhaus\b|\bmanaged[-\s]+services?\b|\bdigitalagentur\b|\btechnologie(?:unternehmen|dienstleister)?\b)/i,
    cases: [
      {
        id: "it-ticket-triage",
        goals: ["zeit", "qualitaet", "wachstum"],
        signals: ["routineaufgaben", "system_brueche", "wissen_verteilung"],
        keywords: ["ticket", "support", "incident", "anfrage"],
        title: "Support-Tickets nach Produkt, Dringlichkeit und fehlenden Daten ordnen",
        today: "Freitext-Tickets werden manuell klassifiziert und für Rückfragen vorbereitet.",
        assist: "Der Fall wird strukturiert, fehlende Diagnosedaten werden markiert und eine Route vorgeschlagen.",
        human: "Support bestätigt Priorität, Zuständigkeit und Antwort.",
        effect: "Schnellere Erstbearbeitung und weniger falsch geroutete Tickets.",
        metric: "Zeit bis zur Triage und Routing-Korrekturen",
        prerequisite: "Klare Kategorien, Prioritätsregeln und Eskalationsgrenzen.",
        nextStep: "Fünfzig vergangene Tickets gegen eine kompakte Zielklassifikation prüfen.",
      },
      {
        id: "it-knowledge",
        goals: ["wissen", "zeit", "qualitaet"],
        signals: ["wissen_verteilung", "daten_zugriff", "ki_leitplanken"],
        keywords: ["dokumentation", "wissen", "runbook", "lösung", "loesung"],
        title: "Runbooks und gelöste Fälle quellengebunden verfügbar machen",
        today: "Lösungen liegen in Wikis, Tickets und dem Wissen Einzelner.",
        assist: "Ein Assistent findet relevante freigegebene Stellen und nennt Ticket oder Dokumentversion.",
        human: "Fachpersonal prüft sicherheits- und produktionsrelevante Schritte.",
        effect: "Schnellerer Wissenszugriff ohne unbelegte Lösungsvorschläge.",
        metric: "Suchzeit und wiederholt gelöste Standardfälle",
        prerequisite: "Bereinigte Quellen, Zugriffsrechte und klare Produktionsgrenzen.",
        nextStep: "Die zwanzig häufigsten Lösungswege mit gültiger Quelle kuratieren.",
      },
      {
        id: "it-postmortem",
        goals: ["qualitaet", "wissen"],
        signals: ["erfolgsmessung", "wissen_verteilung", "prozess_standardisierung"],
        keywords: ["incident", "postmortem", "ursache", "störung", "stoerung"],
        title: "Incident-Daten in einen prüfbaren Postmortem-Entwurf überführen",
        today: "Zeitlinie, Entscheidungen und Maßnahmen werden nach Störungen manuell rekonstruiert.",
        assist: "Freigegebene Logs und Notizen werden in Zeitlinie, Auswirkung, Ursache-Hypothese und Maßnahmen strukturiert.",
        human: "Technische Verantwortliche prüfen Ursache und verbindliche Maßnahmen.",
        effect: "Konsistentere Nachbereitung und sichtbarere offene Präventionsaufgaben.",
        metric: "Zeit bis zum Review und Maßnahmen ohne Eigentümer",
        prerequisite: "Verlässliche Quellen, Rollen und ein standardisiertes Postmortem-Format.",
        nextStep: "Ein vergangenes Incident-Review in Pflichtfelder und Quellen zerlegen.",
      },
    ],
  },
  {
    key: "allgemein",
    label: "Dienstleistungsunternehmen",
    pattern: /.*/,
    cases: [
      {
        id: "generic-inquiry-brief",
        goals: ["wachstum", "zeit", "qualitaet", "klarheit"],
        signals: ["routineaufgaben", "system_brueche", "daten_zugriff"],
        keywords: ["anfrage", "angebot", "auftrag", "kunde"],
        title: "Anfragen in ein vollständiges Auftrags-Briefing überführen",
        today: "Bedarf, Rahmen und offene Punkte stehen in verschiedenen Nachrichten oder Notizen.",
        assist: "KI ordnet vorhandene Angaben und markiert fehlende Pflichtinformationen.",
        human: "Die verantwortliche Person prüft Passung, Priorität und nächsten Schritt.",
        effect: "Weniger Rückfragen und ein sauberer Übergang von Anfrage zu Bearbeitung.",
        metric: "Rückfragen je Anfrage und Zeit bis zur Bearbeitungsreife",
        prerequisite: "Ein kurzer Pflichtfeldkatalog für qualifizierte Anfragen.",
        nextStep: "Zehn gute und zehn unvollständige Anfragen vergleichen und Pflichtfelder ableiten.",
      },
      {
        id: "generic-follow-up",
        goals: ["zeit", "qualitaet", "wissen"],
        signals: ["routineaufgaben", "wissen_verteilung", "system_brueche"],
        keywords: ["gespräch", "gespraech", "aufgabe", "protokoll", "follow"],
        title: "Gesprächsnotizen in Entscheidungen und nächste Schritte überführen",
        today: "Zusagen, Aufgaben und Fristen werden nach Gesprächen manuell sortiert.",
        assist: "Ein Entwurf strukturiert Notizen in Entscheidung, Aufgabe, Frist und offene Frage.",
        human: "Sie prüfen Inhalt und Verantwortlichkeit vor Speicherung oder Versand.",
        effect: "Weniger verlorene Zusagen und schneller verfügbare nächste Schritte.",
        metric: "Nachbereitungszeit und offene Zusagen ohne Aufgabe",
        prerequisite: "Ein einheitliches Notiz- und Aufgabenformat.",
        nextStep: "Ein häufiges Gesprächsformat und seine gewünschten Ausgaben definieren.",
      },
      {
        id: "generic-payment",
        goals: ["zeit", "qualitaet"],
        signals: ["routineaufgaben", "daten_zugriff", "system_brueche"],
        keywords: ["rechnung", "zahlung", "erinnerung", "buchhaltung"],
        title: "Zahlungserinnerungen aus bestätigten Daten vorbereiten",
        today: "Fälligkeiten und Zahlungseingänge werden manuell geprüft und Texte einzeln erstellt.",
        assist: "Bestätigte offene Posten werden nach Regeln erkannt und als Erinnerung vorbereitet.",
        human: "Buchhaltung oder Inhaber prüft Sonderfall, Ton und Versand.",
        effect: "Verlässlichere Bearbeitung offener Rechnungen ohne ungeprüften Automatikversand.",
        metric: "Offene Fälle ohne Bearbeitung und Minuten je Prüflauf",
        prerequisite: "Aktuelle Offene-Posten-Daten und dokumentierte Ausnahmen.",
        nextStep: "Fälligkeit, Zahlung, Streitstatus und Freigabe als Mindestdaten festlegen.",
      },
    ],
  },
];

function normalize(value) {
  return cleanText(value, 700)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function redactFreeText(value) {
  return cleanText(value, 240)
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/gi, "[E-Mail entfernt]")
    .replace(/(?:\+?\d[\s()./-]*){7,}/g, "[Telefonnummer entfernt]");
}

function answerLookup(answers) {
  return new Map((Array.isArray(answers) ? answers : []).map((answer) => [answer.questionId, answer]));
}

function numericAnswer(lookup, id, fallback = 0) {
  const value = Number(lookup.get(id)?.answer);
  return Number.isFinite(value) ? value : fallback;
}

function classifyIndustry(industry) {
  const normalized = normalize(industry);
  const fallback = CATALOG[CATALOG.length - 1];
  const match = CATALOG
    .slice(0, -1)
    .map((entry, catalogIndex) => {
      const found = entry.pattern.exec(normalized);
      return found ? { entry, catalogIndex, position: found.index, length: found[0].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position || b.length - a.length || a.catalogIndex - b.catalogIndex)[0]?.entry || fallback;
  return {
    entered: cleanText(industry, 80) || match.label,
    key: match.key,
    label: match.label,
    fallback: match.key === "allgemein",
    cases: match.cases,
  };
}

function signalSentence(id, value, solo) {
  const map = {
    routineaufgaben: {
      1: "Wiederkehrende Verwaltung bindet nach Ihrer Einschätzung sehr viel Arbeitszeit.",
      2: "Wiederkehrende Verwaltung bindet bei Ihnen jede Woche spürbar Zeit.",
      3: "Bei einzelnen Routinen bestehen noch erkennbare Zeitfresser.",
      4: "Ihre Routinen laufen bereits weitgehend effizient.",
    },
    system_brueche: {
      1: "Informationen werden mehrmals täglich von Hand zwischen Systemen übertragen.",
      2: "Manuelle Übertragungen gehören bei Ihnen zum Wochenverlauf.",
      3: "Manuelle Übergaben bestehen nur noch an einzelnen Stellen.",
      4: "Ihre wichtigsten Systeme greifen bereits weitgehend ineinander.",
    },
    daten_zugriff: {
      1: "Entscheidungsinformationen sind über mehrere Orte verteilt.",
      2: "Zentrale Ablagen bestehen, weisen aber noch spürbare Lücken auf.",
      3: "Entscheidungsinformationen sind meist schnell auffindbar.",
      4: "Ihre Informationen sind strukturiert und direkt auswertbar.",
    },
    wissen_verteilung: {
      1: solo ? "Wichtiges Arbeitswissen steckt noch stark im Gedächtnis." : "Entscheidendes Wissen hängt noch stark an einzelnen Personen.",
      2: "Arbeitswissen ist teilweise dokumentiert, erzeugt aber noch Suche oder Rückfragen.",
      3: "Wichtiges Wissen ist überwiegend dokumentiert und auffindbar.",
      4: "Arbeitswissen ist systematisch in Vorlagen, Checklisten und Systemen gesichert.",
    },
    prozess_standardisierung: {
      1: "Wichtige Abläufe sind noch stark situationsabhängig.",
      2: "Einige Ablaufschritte sind geregelt, andere variieren noch.",
      3: "Die meisten Abläufe sind bereits klar und einheitlich.",
      4: "Ihre wichtigsten Abläufe sind durchgängig geregelt und messbar.",
    },
    ki_leitplanken: {
      1: "Verbindliche Regeln für KI-Nutzung fehlen noch.",
      2: "Erste KI-Grundsätze bestehen, sind aber noch nicht vollständig verankert.",
      3: "Die wichtigsten KI-Leitplanken sind bereits definiert.",
      4: "KI-Regeln, Prüfung und Freigabe sind verankert.",
    },
  };
  return map[id]?.[value] || "";
}

function statusFor(baseline, lookup, solo) {
  const process = baseline.scores.prozesse_daten.percent;
  const ai = baseline.scores.ki_praxis.percent;
  const implementation = baseline.scores.umsetzungskraft.percent;
  const speed = numericAnswer(lookup, "umsetzungstempo", 1);
  if (process < 25 || ai < 25) {
    return {
      key: "foundation_first",
      label: "Erst Grundlage schaffen",
      explanation: "Der Anwendungsfall ist relevant, sollte aber erst nach einem klaren Daten-, Prozess- oder Freigabeschritt getestet werden.",
    };
  }
  if (baseline.scores.total.percent >= 50 && implementation >= 50 && speed >= 3) {
    return {
      key: "pilot_ready",
      label: "Als Pilot prüfbar",
      explanation: "Ihre Antworten sprechen dafür, diesen Fall klein, kontrolliert und mit festem Zielwert zu testen.",
    };
  }
  return {
    key: "prepare",
    label: "Nach kurzer Vorbereitung",
    explanation: solo
      ? "Der Fall ist plausibel, braucht aber vor dem Pilot einen klaren Ablauf, fest reservierte Umsetzungszeit und einen Ausgangswert."
      : "Der Fall ist plausibel, braucht aber vor dem Pilot einen klaren Ablauf, eine verantwortliche Person und einen Ausgangswert.",
  };
}

function pilotWindow(value) {
  return ({
    1: { value: "> 6 Monate", label: "genanntes Startfenster" },
    2: { value: "3–6 Monate", label: "genanntes Startfenster" },
    3: { value: "3–12 Wochen", label: "genanntes Startfenster" },
    4: { value: "≤ 2 Wochen", label: "genanntes Startfenster" },
  })[value] || { value: "noch offen", label: "Startfenster" };
}

function buildAdvisoryContext(baseline, profile = {}, answers = []) {
  const lookup = answerLookup(answers);
  const ranked = Object.keys(DIMENSIONS).sort((a, b) => {
    const delta = baseline.scores[a].percent - baseline.scores[b].percent;
    return delta || a.localeCompare(b);
  });
  const weakest = ranked[0];
  const strongest = [...ranked].reverse()[0];
  const weakestScore = baseline.scores[weakest].percent;
  const strongestScore = baseline.scores[strongest].percent;
  const industry = classifyIndustry(profile.branche);
  const focus = redactFreeText(lookup.get("haupthebel")?.answer || "");
  return {
    lookup,
    industry,
    focus,
    focusNormalized: normalize(focus),
    goal: cleanText(profile.hauptziel, 40),
    goalLabel: GOAL_LABELS[profile.hauptziel] || GOAL_LABELS.klarheit,
    solo: cleanText(profile.mitarbeiter, 20) === "solo",
    strongest,
    weakest,
    balanced: strongestScore - weakestScore <= 5,
    scoreSpread: strongestScore - weakestScore,
    status: statusFor(baseline, lookup, cleanText(profile.mitarbeiter, 20) === "solo"),
    pilotWindow: pilotWindow(numericAnswer(lookup, "umsetzungstempo")),
  };
}

function opportunityScore(item, context, index) {
  let score = 100 - index;
  if (item.goals.includes(context.goal)) score += 12;
  for (const id of item.signals) {
    const value = numericAnswer(context.lookup, id, 4);
    if (value <= 2) score += 4;
    else if (value === 3) score += 1;
  }
  const keywordMatch = context.focusNormalized && item.keywords.some((keyword) => context.focusNormalized.includes(normalize(keyword)));
  if (keywordMatch) score += 18;
  return { score, keywordMatch };
}

function fitReason(item, context, keywordMatch) {
  const reasons = [];
  if (keywordMatch) reasons.push("Ihr freiwillig genanntes 90-Tage-Ziel weist genau in diese Richtung.");
  if (item.goals.includes(context.goal)) reasons.push(`Ihr Hauptziel ist, ${context.goalLabel}.`);
  const signal = item.signals
    .map((id) => ({ id, value: numericAnswer(context.lookup, id, 0) }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => a.value - b.value)[0];
  const sentence = signal ? signalSentence(signal.id, signal.value, context.solo) : "";
  if (sentence) reasons.push(sentence);
  return reasons.slice(0, 2).join(" ") || "Der Fall verbindet einen häufigen Ablauf mit einem klar prüfbaren Ergebnis.";
}

function selectUseCases(context) {
  return context.industry.cases
    .map((item, index) => ({ item, index, ...opportunityScore(item, context, index) }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, 3)
    .map(({ item, keywordMatch }, index) => ({
      id: item.id,
      role: index === 0 ? "primary" : "secondary",
      status: context.status,
      title: item.title,
      fitReason: fitReason(item, context, keywordMatch),
      today: item.today,
      assist: item.assist,
      human: context.solo ? "Sie prüfen Inhalt, fachliche Richtigkeit und Freigabe vor der weiteren Verwendung." : item.human,
      effect: item.effect,
      metric: item.metric,
      prerequisite: item.prerequisite,
      nextStep: item.nextStep,
    }));
}

function buildAdvisory(baseline, profile = {}, answers = []) {
  const context = buildAdvisoryContext(baseline, profile, answers);
  const opportunities = selectUseCases(context);
  const strongest = {
    key: context.strongest,
    label: DIMENSIONS[context.strongest].label,
    score: baseline.scores[context.strongest].percent,
  };
  const weakest = {
    key: context.weakest,
    label: DIMENSIONS[context.weakest].label,
    score: baseline.scores[context.weakest].percent,
  };
  return {
    version: ADVISORY_VERSION,
    industry: {
      entered: context.industry.entered,
      key: context.industry.key,
      label: context.industry.label,
      fallback: context.industry.fallback,
    },
    goal: { key: context.goal || "klarheit", label: context.goalLabel },
    focusNote: context.focus || null,
    diagnosis: {
      balanced: context.balanced,
      spread: context.scoreSpread,
      strongest: context.balanced ? null : strongest,
      weakest: context.balanced ? null : weakest,
    },
    pilotWindow: context.pilotWindow,
    opportunities,
  };
}

module.exports = {
  ADVISORY_VERSION,
  CATALOG,
  buildAdvisory,
  buildAdvisoryContext,
  classifyIndustry,
  redactFreeText,
  selectUseCases,
};

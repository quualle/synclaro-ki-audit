# Synclaro AI Readiness – branchenoffene DOI-Nurture-Strecke

Stand: 19.07.2026 · **sendefertig vorbereitet, nicht aktiviert**

## Ziel und Regeln

- Zielgruppe: ausschließlich Kontakte mit bestätigtem, nicht widerrufenem
  E-Mail-Consent aus `v_email_marketing_list` und Quelle `ki-readiness-test`.
- Primäre Wirkung: Die Person priorisiert ihren nächsten KI-Schritt und bucht
  freiwillig eine KI-Potenzialanalyse mit Marco.
- Frequenz: höchstens fünf E-Mails in 20 Tagen einschließlich der automatisch
  vorgemerkten Willkommensmail; danach nur der regulär freigegebene Newsletter.
- Verhältnis: vier klar wertorientierte Impulse und eine direkte Einladung.
  Die erste Mehrwert-Mail bietet zusätzlich eine freiwillige Terminoption;
  jede E-Mail enthält höchstens einen primären CTA.
- Sofort ausschließen: widerrufene oder unzustellbare Adressen. Nach einer
  bestätigten Terminbuchung endet die Readiness-Nurture-Strecke; der Kontakt
  wechselt in die terminbezogene Kommunikation.
- Jede E-Mail enthält den signierten Abmeldelink sowie `List-Unsubscribe` und
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Keine Telefonnummer, keine Rückrufbehauptung, kein künstlicher Zeitdruck und
  keine erfundenen Benchmarks oder Fallzahlen.

## Sequenz

| Zeitpunkt | Zweck | Betreff | Primärer CTA |
|---|---|---|---|
| direkt nach DOI | Orientierung und erster Wert | Vom Readiness-Test zur Umsetzung: drei nächste Schritte | Potenzialanalyse buchen |
| Tag 3 | Score in Fokus übersetzen | Wählen Sie nicht zuerst das KI-Tool | Einen Prozess auswählen |
| Tag 7 | risikoarmer erster Test | Ein KI-Pilot braucht nur eine klare Messgröße | 30-Tage-Pilot definieren |
| Tag 12 | organisatorische Reife | Der häufigste Engpass sitzt vor dem Prompt | Verantwortlichkeit klären |
| Tag 20 | freiwillige persönliche Vertiefung | Welchen Hebel sollten Sie zuerst angehen? | Termin mit Marco ansehen |

## E-Mail 1 · automatisch implementierte Willkommensmail

**Betreff:** Vom Readiness-Test zur Umsetzung: drei nächste Schritte

Aus Ihrem Score wird erst durch Umsetzung ein Vorteil. Für einen belastbaren
Start brauchen Sie keine lange Tool-Liste, sondern eine klare Reihenfolge:

1. Wählen Sie einen wiederkehrenden Prozess, der heute messbar Zeit oder
   Qualität kostet.
2. Klären Sie Daten, Zuständigkeit und Leitplanken, bevor Sie ein KI-Werkzeug
   einführen.
3. Legen Sie ein Erfolgskriterium für 30 Tage fest – etwa Bearbeitungszeit,
   Fehlerquote oder Durchlaufzeit.

Wenn Sie Ihren größten Hebel gemeinsam priorisieren möchten, können Sie die
kostenlose KI-Potenzialanalyse mit Marco buchen. Der Link enthält eine
pseudonyme, signierte Readiness-Zuordnung und eigene Newsletter-UTMs; er
überträgt weder Namen noch E-Mail-Adresse in der URL.

## E-Mail 2 · Tag 3

**Betreff:** Wählen Sie nicht zuerst das KI-Tool

Die wichtigste Frage am Anfang lautet nicht „Welche KI sollen wir kaufen?“,
sondern: „Welcher wiederkehrende Ablauf kostet uns heute unnötig Zeit oder
Qualität?“

Notieren Sie für einen Prozess drei Werte: Wie oft kommt er vor? Wie lange
dauert er? Wo entstehen Rückfragen oder Fehler? Der beste erste KI-Anwendungsfall
ist meist nicht der spektakulärste, sondern derjenige mit klarer Wiederholung,
verfügbaren Informationen und messbarem Ergebnis.

**CTA:** Einen Prozess auswählen und die drei Werte notieren.

## E-Mail 3 · Tag 7

**Betreff:** Ein KI-Pilot braucht nur eine klare Messgröße

Ein guter Pilot beantwortet innerhalb von 30 Tagen eine konkrete Frage. Zum
Beispiel: Verkürzt sich die Bearbeitungszeit? Sinkt die Zahl manueller
Übertragungen? Werden Ergebnisse vollständiger oder konsistenter?

Definieren Sie Ausgangswert, Zielwert, verantwortliche Person und einen festen
Prüftermin. Erst danach lohnt sich die Tool-Entscheidung. So wird aus einem
Test ein belastbarer Lernzyklus statt eines weiteren Softwareprojekts.

**CTA:** Eine Messgröße und einen Prüftermin festlegen.

## E-Mail 4 · Tag 12

**Betreff:** Der häufigste Engpass sitzt vor dem Prompt

Viele KI-Projekte scheitern nicht am Modell, sondern an verstreuten Daten,
unklaren Freigaben und fehlender Verantwortung. Prüfen Sie deshalb drei Dinge:

- Welche Informationen darf der Anwendungsfall verwenden?
- Wer prüft Ergebnisse und entscheidet bei Fehlern?
- Wo wird dokumentiert, was funktioniert und was angepasst werden muss?

Wenn diese Fragen geklärt sind, werden Prompts, Automationen und Werkzeuge
deutlich leichter austauschbar.

**CTA:** Für den ausgewählten Prozess eine verantwortliche Person benennen.

## E-Mail 5 · Tag 20

**Betreff:** Welchen Hebel sollten Sie zuerst angehen?

Ihr Readiness-Score zeigt mehrere Ansatzpunkte. Entscheidend ist, welcher davon
für Ihr Unternehmen gerade den größten praktischen Unterschied macht – und
welcher Schritt realistisch in den nächsten 30 bis 90 Tagen umgesetzt werden
kann.

In einer kostenlosen KI-Potenzialanalyse ordnen Sie gemeinsam mit Marco genau
diese Reihenfolge: Anwendungsfall, Voraussetzungen, erster Pilot und messbares
Ziel. Sie entscheiden anschließend selbst, ob und wie Sie weitergehen.

**CTA:** `https://cal.com/marcoheer/ki-erstgespraech`

## Provider- und Launch-Gate

Die E-Mails 2 bis 5 werden erst aktiviert, wenn Absenderdomain,
Bounce-/Complaint-Verarbeitung, Termin-Suppression, Consent-Synchronisierung
und der One-Click-Abmeldeweg im freigegebenen Zielsystem end-to-end getestet
sind. Bis dahin sendet der Branch nichts; auch die implementierte E-Mail 1 wird
nur über die Production-Outbox nach bestätigtem DOI ausgelöst.

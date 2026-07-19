# KI-Readiness-Funnel – Launch Readiness

Stand: 19.07.2026 · Branch: `feat/meta-ai-readiness-funnel` · **nicht live**

## Status in einem Satz

Der neue Micro-Step-Funnel ist im Repository auf den gewünschten Zielzustand
umgebaut. Datenbank, Netlify-Production, Cal.com, Resend, Telegram, Meta Events
Manager und Meta Ads Manager sind dadurch noch nicht automatisch freigegeben
oder produktiv konfiguriert. Die Geschäftsführung erteilt am Ende dieses
Dokuments eine einzige Go-/No-Go-Entscheidung; die technische Veröffentlichung
erfolgt anschließend in der festgelegten Reihenfolge.

## Externer Read-only-Snapshot

Am 19.07.2026 wurde der sichtbare externe Stand geprüft. Kampagne und
Anzeigengruppe wurden als V2-Entwürfe umbenannt; veröffentlicht wurde nichts:

- Im Meta Ads Manager existiert ein unveröffentlichter Leads-/Website-Draft mit
  Auktion, „Conversions maximieren“, Advantage+ Budget/Audience/Placements,
  25 € Tagesbudget, Deutschland, 18–65+, allen Geschlechtern,
  Zielgruppenvorschlägen „Unternehmertum“ und Arbeitgeber „Selbstständig“ sowie
  Pixel `1497847851628194`. Das Event `Lead` ist noch nicht auswählbar, weil der
  Pixel es noch nicht empfangen hat.
- Als EU-Werbetreibender/Zahlender werden sichtbar `Synclaro.de` und
  `Johannes Jaegers` geführt. Diese Angaben sind keine stillschweigende
  Freigabe und müssen von der Geschäftsführung bestätigt werden.
- Der öffentliche Cal-Termin `/marcoheer/ki-erstgespraech` dauert 20 Minuten und
  nutzt Google Meet. Die Beschreibung duzt; das Buchungsformular verlangt
  derzeit Name, E-Mail, **Telefonnummer** und „Wie sind Sie auf uns aufmerksam
  geworden?“ als Pflichtfelder. Der Anlass ist optional.
- Der URL-Parameter `readiness_ref` bleibt beim öffentlichen Cal-Aufruf
  erhalten. Das dazugehörige verborgene Feld und der event-spezifische Webhook
  konnten nicht im Admin geprüft werden, weil `app.cal.com` ausgeloggt war.
- Der Meta-Creative-Wizard ist auf ein Image Ad umgestellt und mit der
  dokumentierten Copy vorbereitet. Der Upload der lokalen V2-Dateien ist noch
  durch die fehlende Chrome-Erweiterungsberechtigung für lokale Dateien
  blockiert; es wurde kein Ersatz-Creative veröffentlicht.

Dieser Snapshot kann sich ändern und ist unmittelbar vor dem Publish erneut zu
prüfen.

## Lokal verifizierter Stand

Am 19.07.2026 wurden ohne Production-Write und ohne externen Send folgende
Prüfungen erfolgreich abgeschlossen:

- `npm run check`: 31 von 31 Node-Tests, atomare lokale PostgreSQL-Migration
  samt Integrationstest und `npm audit` mit 0 bekannten Schwachstellen;
- `netlify build --context deploy-preview`: alle Readiness-Functions gebündelt;
- Datenschutz-Worktree: `astro check` mit 0 Fehlern und vollständiger Build
  erfolgreich;
- `git diff --check`: Funnel- und Datenschutz-Worktree ohne Whitespace-Fehler;
- reale Browserdurchläufe auf Desktop und 390-px-Mobilansicht über alle
  Micro-Steps, sowohl für notwendige-only als auch für den freiwilligen
  Tracking-Pfad: stets genau eine aktive Ebene, korrekt benannte Eingaben,
  Fokus auf `resultTitle`, zwei sichtbare Termin-CTAs und kein horizontaler
  Overflow;
- Newsletter-Auswahl im Preview: sichtbarer Hinweis, dass absichtlich weder
  eine Bestätigungs-E-Mail versendet noch eine Anmeldung gespeichert wurde;
- frische mobile Browser-Session: 0 Console-Fehler und 0 Console-Warnungen.
- finale UX-/Accessibility-Re-Prüfung: `PASS`; finaler Code-Critic:
  `PASS-WITH-CONCERNS` ausschließlich wegen externer Launch-Gates; zusätzliche
  unabhängige Terra-QA: `GO-WITH-CHANGES` ebenfalls ausschließlich wegen
  dieser externen Gates. Der zwischenzeitlich gefundene Outbox-Claim-Fehler
  und die zu grobe Booking-Deduplizierung wurden vor diesen Verdicts behoben
  und durch reale SQL-Zyklen abgedeckt.

Die vorgeschriebene externe OpenRouter-QA konnte nicht ausgeführt werden, weil
in der dokumentierten Secret-Quelle kein `OPENROUTER_API_KEY` eingerichtet ist.
Das ist kein Codefehler, bleibt aber vor einer Production-Freigabe ein
Qualitätsgate. Eine interne Prüfung darf sie nicht stillschweigend ersetzen.

## Verbindliches Zielbild

- Vier kurze Unternehmensfragen: Größe, Rolle, Hauptziel und Branche.
- Zwölf feste, gewichtete Kernfragen in drei Phasen sowie eine optionale offene
  Hebelfrage. Der Test ist branchenoffen und formuliert Solo-Selbstständige
  ohne Team-Unterstellung.
- Danach vier einzelne Kontakt-Schritte: Vorname, Nachname,
  Unternehmen/selbstständige Tätigkeit und E-Mail-Adresse.
- **Keine Telefonnummer, kein Rückruf-Consent, kein Kaltanruf und keine
  automatische Kontaktaufgabe.** Ein CRM-Eintrag ist keine Werbe- oder
  Kontaktierlaubnis.
- Der Score, die vier Teilwerte, der größte Hebel, drei Empfehlungen und der
  90-Tage-Fahrplan entstehen deterministisch aus der versionierten
  Bewertungslogik. Der Readiness-Test sendet weder Antworten noch Kontaktdaten
  an OpenAI; der frühere Analyse-Endpunkt antwortet dauerhaft mit HTTP 410.
- Primäre gewünschte Folgewirkung: Nach dem vollständigen Ergebnis bucht die
  Person selbst und bewusst eine kostenlose KI-Potenzialanalyse mit Marco.
- Sekundäre Folgewirkung: freiwillige E-Mail-Nurture-Strecke nach separater
  Newsletter-Auswahl und bestätigtem Double-Opt-in. Kein Setter- oder
  Kaltoutreach-Prozess.
- Analyse-Tracking und Meta-Marketing sind getrennte, freiwillige Entscheidungen
  und blockieren den Test nicht.

## Tatsächlicher Daten- und Eventfluss

| Auslöser | Speicherung / Zustellung | Harte Bedingung |
|---|---|---|
| Auswertung angefordert | Kontakt, Assessment, Antworten, deterministisches Ergebnis und CRM-Ereignis werden atomar über `submit_ai_readiness_lead_v2` geschrieben. Eine interne E-Mail ohne kopierte Kontaktdaten wird in die Outbox gestellt. | Gültige Sitzung, vollständige Kernfragen, Datenschutzhinweis bestätigt und aktueller Tracking-Entscheid. |
| Newsletter freiwillig ausgewählt | Eine append-only CRM-Marketing-Consent-Zeile wird zunächst als DOI-pending angelegt. Die Bestätigungs-E-Mail läuft über Resend. Pending-Einträge erscheinen nicht in `v_email_marketing_list`. Bereits aktive historische Consents bleiben aktiv. | Exakter versionierter Einwilligungstext; Link und Bestätigungsseite sind signiert und 24 Stunden gültig. Das Ergebnis weist sichtbar auf Postfach und Spam-Ordner hin. |
| DOI-Seite per GET geöffnet | Der Token wird nur geprüft und eine noindex-Bestätigungsseite angezeigt. | Kein CRM-/Consent-Write; automatische Mail-Scanner-Aufrufe dürfen nichts aktivieren. |
| DOI-Button bewusst per POST bestätigt | Die bestehende Consent-Zeile und das Assessment werden idempotent auf bestätigt gesetzt; erst dann ist der neue Kontakt in der aktiven E-Mail-Liste. | Gültige Signatur, passende Assessment-/Submission-ID, Consent nicht widerrufen. |
| Newsletter ausgewählt | Telegram kann eine rein generische Statusmeldung „neuer Lead / DOI ausstehend oder bereits aktiv“ senden. Name, Firma, E-Mail, Telefonnummer, Antworten, Score, IDs und individuelle CRM-Links werden nicht übertragen. | Nur wenn `TELEGRAM_TRANSFER_APPROVED` exakt `true` ist; sonst fail-closed. |
| Marketing-Tracking erteilt und Lead atomar gespeichert | Browser-Pixel und CAPI senden `Lead` mit derselben `event_id` zur Deduplizierung. CAPI nutzt minimierte Matching-Daten, insbesondere gehashte E-Mail sowie nur bei Consent zulässige Browser-/Netzwerkkennungen. | Aktuell gültiger Marketing-Consent unmittelbar vor Zustellung; kein Score, keine Firma und keine Antworten an Meta. |
| Ergebnis angezeigt | Der Cal-Link erhält UTM-Parameter und eine signierte, 30 Tage gültige `readiness_ref`. | Noch kein `Schedule`-Event; ein CTA-Klick allein zählt nicht als Termin. |
| Cal meldet `BOOKING_CREATED` | Der separate Webhook prüft HMAC, Webhook-Version, Zeitfenster, Event-Type-ID, Slug, Organizer und `readiness_ref`. Danach entstehen idempotent ein CRM-Terminereignis, eine PII-freie Telegram-Buchungsmeldung und – bei weiterhin gültigem Marketing-Consent – ein serverseitiges Meta-`Schedule`. Jede eigenständige Buchungskennung besitzt einen eigenen gehashten Outbox-Schlüssel. | Ausschließlich der definierte Readiness-Termin. Replay mit identischem Body ist idempotent, widersprüchlicher Replay wird abgelehnt; zwei tatsächlich verschiedene Buchungen desselben Assessments bleiben getrennt. |

Die Scheduled Function `process-lead-outbox` läuft alle zwei Minuten. Vor jedem
externen Send werden Lease und erforderlicher Consent erneut geprüft. Temporäre
Fehler werden mit Backoff bis zu acht Versuchen wiederholt. DOI- und
Telegram-Aufträge laufen nach 24 Stunden, Meta-Aufträge nach sieben Tagen ab.
Erledigte oder tote Outbox-Zeilen werden nach 30 Tagen bereinigt.

## Harte Launch-Gates

Keiner dieser Punkte darf stillschweigend als erledigt behandelt werden.

- [x] `npm run check` ist auf dem vorbereiteten finalen Stand erfolgreich.
- [x] `netlify build --context deploy-preview` ist erfolgreich.
- [ ] Der komplette Preview-Durchlauf wurde auf Desktop und Mobil mit
  „nur notwendig“ sowie mit Analyse-/Marketing-Consent geprüft; keine
  Console-, Netzwerk-, Fokus- oder Layoutfehler.
- [ ] Die Datenschutzergänzung ist technisch und rechtlich geprüft und auf
  `https://synclaro.de/datenschutz#ki-readiness-test` veröffentlicht.
- [ ] Auf einer Supabase-Testbranch wurde die atomare Endmigration
  `202607180001_ai_readiness_lead_funnel.sql` angewandt und der SQL-
  Integrationstest ausgeführt. Der frühere v1→v2-Zwischenstand wurde vor jeder
  Production-Anwendung in diese einzelne Transaktion zusammengeführt.
- [ ] Backup/PITR-Stand und Wartungsfenster für die Production-Migration sind
  dokumentiert. Die atomare Endmigration ist derzeit **nicht in Production
  angewandt**.
- [ ] Das tatsächliche RLS-/Grant-Verhalten der betroffenen CRM-Tabellen wurde
  im Zielprojekt mit `anon`, `authenticated` und `service_role` falsifiziert.
  Die neuen Readiness-/Private-Tabellen dürfen nur serverseitig zugänglich sein.
- [ ] Der geplante Purge-Job ist eingerichtet und nachweislich erfolgreich:
  pseudonyme Funnel-Ereignisse und private Booking-Receipts nach 90 Tagen,
  erledigte Zustellinformationen nach 30 Tagen.
- [ ] Für Assessments, CRM-Kontakte und Marketing-Consent-Nachweise ist eine
  verbindliche Lösch-/Aufbewahrungsregel freigegeben. `retention_review_at`
  nach 24 Monaten ist nur ein Prüfmarker, keine automatische Löschung.
- [ ] Alle erforderlichen Production-Umgebungsvariablen sind im richtigen
  Netlify-Scope gesetzt und durch einen Test ohne Secret-Ausgabe geprüft.
- [ ] Resend-Absenderdomain, interner Empfänger, Newsletter-Absender,
  Zustellbarkeit und Abmeldeweg wurden geprüft.
- [ ] Telegram-Transfer und Zielchat sind dokumentiert freigegeben; erst danach
  darf `TELEGRAM_TRANSFER_APPROVED=true` gesetzt werden. Testmeldungen enthalten
  nachweislich keine PII.
- [ ] Cal.com hat beim Event `ki-erstgespraech` ein verborgenes Feld mit dem
  Schlüssel `readiness_ref` und einen ausschließlich auf `BOOKING_CREATED`
  beschränkten Readiness-Webhook. Event-Type-ID, Slug und Organizer entsprechen
  exakt den Netlify-Variablen.
- [ ] Das Cal-Formular verlangt keine Telefonnummer. Name und E-Mail bleiben
  erforderliche Buchungsfelder; „Wie sind Sie auf uns aufmerksam geworden?“
  ist optional oder wird durch die vorhandenen UTM-Parameter ersetzt. Die
  Beschreibung spricht die Zielgruppe konsistent mit „Sie“ an.
- [ ] Ein kontrollierter Cal-Testtermin erzeugt genau ein CRM-Terminereignis,
  genau eine generische Telegram-Buchungsmeldung und – nur mit Marketing-
  Consent – genau ein Meta-`Schedule`.
- [ ] Meta Pixel/CAPI-Deduplizierung für `Lead` ist im Events Manager geprüft;
  `Schedule` erscheint ausschließlich nach einer verifizierten Buchung.
- [ ] Zuerst wurde mit gültigem Marketing-Consent ein klar markiertes
  `Lead`-Testevent an Pixel/CAPI gesendet. Erst nachdem es im Events Manager
  angekommen und als Website-Conversion auswählbar ist, wurde es im Draft als
  Optimierungs-Event gesetzt.
- [ ] Der Meta-Kampagnenentwurf wurde gegen
  [`META_CAMPAIGN_DRAFT.md`](./META_CAMPAIGN_DRAFT.md) geprüft. Budget,
  Startzeit, Zahlender, Ziel-URL, Pixel/Dataset, Ausschlüsse, Placements und
  Creative sind ausdrücklich bestätigt.
- [ ] Im Meta Ads Manager befinden sich keine fremden oder ungeprüften Objekte
  in derselben globalen Veröffentlichungsmenge.
- [ ] EU-Werbetreibender und Zahlender `Synclaro.de` / `Johannes Jaegers` sind
  durch die Geschäftsführung ausdrücklich als korrekt bestätigt.
- [ ] Monitoring für Function-Fehler, tote Outbox-Aufträge, DOI-Zustellung,
  Meta-CAPI-Fehler und Cal-Signaturfehler ist einem Verantwortlichen zugeordnet.

## Netlify-Umgebungsvariablen

Secrets niemals in dieses Dokument, Git, Screenshots oder Chat kopieren. Für den
Funnel sind Production-Variablen ausschließlich für Functions erforderlich.
Deploy Previews laufen absichtlich ohne produktive Lead-, E-Mail-, Telegram-,
Meta- oder Supabase-Writes.

| Variable | Pflicht | Freigaberegel |
|---|---:|---|
| `SUPABASE_URL` | Ja | Exakt das freigegebene Zielprojekt. |
| `SUPABASE_SECRET_KEY` **oder** `SUPABASE_SERVICE_ROLE_KEY` | Ja | Genau einer der beiden serverseitigen Admin-Keys; niemals Anon-/Publishable-Key als Ersatz. |
| `SESSION_HMAC_SECRET` | Ja | Eigener Zufallswert, mindestens 32 Zeichen; nicht wiederverwenden. |
| `LEAD_SIGNING_SECRET` | Ja | Eigener Zufallswert, mindestens 32 Zeichen; signiert DOI- und Booking-Referenzen. |
| `LEAD_RATE_LIMIT_SECRET` | Ja | Eigener Zufallswert, mindestens 32 Zeichen. |
| `LEAD_IP_HASH_SALT` | Ja für den freigegebenen Sollzustand | Getrennt von den übrigen Secrets; dient nur pseudonymer Evidenz. |
| `RESEND_API_KEY` | Ja | Production Functions; DOI- und interne Benachrichtigungen testen. |
| `LEADS_FROM_EMAIL` | Ja | Verifizierter interner Absender. |
| `LEADS_NOTIFICATION_EMAIL` | Ja | Überwachter interner Empfänger. |
| `NEWSLETTER_FROM_EMAIL` | Empfohlen | Verifizierter Newsletter-Absender; ohne Wert fällt der Code auf `LEADS_FROM_EMAIL` zurück. |
| `CRM_BASE_URL` | Ja | Geschützte CRM-Basis-URL; Login-Zwang des Links prüfen. |
| `LEAD_TELEGRAM_BOT_TOKEN` | Für Telegram | Nur in Functions; allein aktiviert der Token keine Übertragung. |
| `LEAD_TELEGRAM_CHAT_ID` | Für Telegram | Freigegebener interner Zielchat. |
| `TELEGRAM_TRANSFER_APPROVED` | Für Telegram | Erst nach dokumentierter Freigabe exakt `true`; sonst absichtlich kein Send. |
| `META_PIXEL_ID` | Für Meta | Richtiges Dataset/Pixel im richtigen Business Manager. Browser und CAPI müssen denselben Wert nutzen. |
| `META_CAPI_ACCESS_TOKEN` | Für Meta | Nur serverseitig; anschließend mit temporärem Test-Event validieren. |
| `META_GRAPH_API_VERSION` | Empfohlen | Beim Launch aktuell unterstützte Version explizit festlegen. |
| `META_TEST_EVENT_CODE` | Nur Test | Kurzzeitig für Events-Manager-Test setzen, vor echten Leads wieder entfernen. |
| `CAL_READINESS_WEBHOOK_SECRET` | Für Booking-Tracking | Gemeinsamer HMAC-Wert in Cal und Netlify, mindestens 32 Zeichen. |
| `CAL_READINESS_EVENT_TYPE_ID` | Für Booking-Tracking | Numerische ID ausschließlich des Readiness-Events. |
| `CAL_READINESS_EVENT_TYPE_SLUG` | Für Booking-Tracking | Explizit `ki-erstgespraech` setzen, auch wenn dies der Code-Default ist. |
| `CAL_READINESS_ORGANIZER_EMAIL` | Für Booking-Tracking | Exakte, normalisierte Organizer-E-Mail des freigegebenen Events. |

`CONTEXT` wird von Netlify gesetzt. `OPENAI_API_KEY` und `SUPABASE_ANON_KEY`
werden von anderen, älteren Premium-/Kampagnenfunktionen im Repository genutzt,
aber nicht vom neuen KI-Readiness-Leadpfad. Ihre Existenz darf nicht als
Readiness-Abhängigkeit oder als Freigabe für externe KI-Verarbeitung verstanden
werden.

## Exakte Cal.com-Konfiguration

1. Nur das Event `https://cal.com/marcoheer/ki-erstgespraech` bearbeiten.
2. Die aktuelle Beschreibung von „du“ auf die formelle „Sie“-Ansprache des
   Funnels umstellen. Telefonnummer vollständig aus dem Buchungsformular
   entfernen. Name und E-Mail bleiben erforderlich; die Quellenfrage wird
   optional oder entfällt zugunsten der automatisch erfassten UTM-Parameter.
3. Unter „Advanced → Booking Questions“ ein verborgenes, nicht erforderliches
   Feld vom Typ „Short Text“ mit stabilem Identifier `readiness_ref` anlegen.
   Der Funnel übergibt diesen Wert als gleichnamigen URL-Parameter; die Person
   muss ihn nicht sehen oder ausfüllen.
4. Einen eigenen Webhook nur für dieses Event und nur für `BOOKING_CREATED`
   konfigurieren:
   `https://ki-check.synclaro.de/.netlify/functions/cal-readiness-webhook`.
5. Den gleichen HMAC-Secret-Wert in Cal und
   `CAL_READINESS_WEBHOOK_SECRET` hinterlegen. Erwarteter Signaturheader ist
   `x-cal-signature-256`, erwartete Webhook-Version `2021-10-20`.
6. Event-Type-ID, Slug und Organizer aus einem echten Testpayload abgleichen,
   ohne Buchungs-PII in Dokumentation oder Logs zu kopieren.
7. Fehlende Referenz, falscher Organizer, falsches Event, alte Payload,
   ungültige Signatur und widersprüchlicher Replay müssen abgelehnt oder
   ignoriert werden; nur der gültige Readiness-Termin darf `Schedule` erzeugen.

Der separate Handler ersetzt **keinen** vorhandenen allgemeinen Cal-Webhook und
darf nicht als Catch-all für andere Termine konfiguriert werden.

Offizielle Cal-Referenzen für die Abnahme:
[verdeckte Custom-Parameter](https://cal.com/help/bookings/utm-tracking),
[Prefill über den Field-Identifier](https://cal.com/help/bookings/prefill-fields)
und [Webhook-Signatur/Payload-Version](https://cal.com/docs/developing/guides/automation/webhooks).

## Freigabe- und Launch-Reihenfolge

1. Finalen Code einfrieren; `npm run check`, Build, visuelle QA, Accessibility-
   und End-to-End-Tests durchführen.
2. Datenschutztext, Auftragsverarbeitung, Transfergrundlagen, Löschfristen und
   Newsletter-Nachweis rechtlich/operativ freigeben.
3. Die atomare Endmigration auf einer isolierten Supabase-Branch anwenden und
   `supabase/tests/lead_funnel_integration.sql` erfolgreich ausführen.
4. Production-Backup/PITR verifizieren. Kampagne und öffentlicher Traffic
   bleiben aus. Die einzelne Migration läuft vollständig in einer Transaktion:
   bei einem Fehler wird der gesamte Readiness-Stand zurückgerollt. Erst nach
   erfolgreichem Commit den kompatiblen Funnel-Deploy veröffentlichen und
   smoke-testen.
5. Core-, Resend-, Telegram-, Meta- und Cal-Variablen setzen. Telegram bleibt
   bis zur separaten Transferfreigabe fail-closed.
6. Einen klar markierten Testlead ohne Newsletter/Tracking prüfen: Kontakt,
   Assessment, Ergebnis, CRM-Ereignis und interne Outbox; keine Marketing-
   Consent-Zeile, kein Telegram, kein Meta.
7. Einen Testlead mit Newsletter prüfen: DOI-pending ist nicht in der aktiven
   E-Mail-Liste; erst der signierte Link aktiviert die Liste. Abmeldeweg prüfen.
8. Einen Testlead mit Marketing-Consent im Meta-Testmodus prüfen: `Lead` wird
   per Pixel/CAPI dedupliziert; ohne Consent entsteht kein Meta-Auftrag. Danach
   `Lead` im Draft als Optimierungs-Event auswählen.
9. Einen echten, anschließend stornierten Cal-Testtermin prüfen: CRM-
   Terminereignis, generische Telegram-Meldung und consent-gebundenes
   `Schedule`; ein CTA-Klick allein erzeugt nichts.
10. Monitoring und Alarmempfänger prüfen. Testdaten kontrolliert gemäß
    freigegebener Regel entfernen.
11. Erst jetzt erteilt die Geschäftsführung unten `GO`. Danach ausschließlich
    die geprüften Meta-Objekte veröffentlichen.

## Definition of Done

### Automatisiert

- [x] `npm run check` ist grün. Der Befehl umfasst Node-Tests, lokale
  PostgreSQL-Migration-/Integrationstests und `npm audit --audit-level=high`.
- [x] Testabdeckung bestätigt mindestens: deterministischer Score, Solo-Copy,
  Pflichtfelder ohne Telefon, versionierte Consent-Texte, deaktivierter
  Analyse-Endpunkt, Attribution-Minimierung, Session-/Origin-Sicherheit,
  PII-freies Telegram, fail-closed Transfergate, Meta-Deduplizierung,
  DOI-Idempotenz, Booking-Replay-Schutz und getrennte Zustellung mehrerer
  legitimer Buchungen desselben Assessments.
- [x] `netlify build --context deploy-preview` ist grün.

### Manuell / extern

- [ ] Landingpage und jeder Micro-Step funktionieren mit Tastatur, Screenreader-
  Fokus, Zurück, Schließen, Fortsetzen und ungültiger E-Mail.
- [ ] Die vier Kontaktfelder erscheinen erst nach den Bewertungsfragen; die
  Newsletter-Auswahl bleibt freiwillig.
- [ ] Die sichtbare Auswertung stimmt mit dem serverseitig gespeicherten
  deterministischen Ergebnis überein.
- [ ] Ergebnis-CTA öffnet den korrekten Marco-Cal-Link mit UTM und
  pseudonymer, signierter Referenz.
- [ ] Notwendige-only erzeugt weder Meta-Pixel/CAPI noch Analytics-Events.
- [ ] Marketing-Widerruf deaktiviert Pixel und verhindert noch nicht gesendete
  Meta-Aufträge.
- [ ] DOI, interner Send, Telegram, Meta Lead, Cal-Buchung und Meta Schedule
  sind jeweils einmal positiv und einmal fail-closed getestet.
- [ ] Ein automatischer GET-Aufruf des DOI-Links verändert keine Einwilligung;
  erst der explizite POST-Button bestätigt idempotent.
- [ ] Es gibt in UI, Payload, CRM-Write und Migration keinen Telefon- oder
  Rückrufpfad und keinen OpenAI-Aufruf für den Readiness-Test.

## Rollback und Incident-Reaktion

- Zuerst Meta-Kampagne pausieren und Funnel-Traffic stoppen. Keine weiteren
  Veröffentlichungen oder manuellen Lead-Sends.
- Telegram lässt sich durch Entfernen bzw. Abweichung von
  `TELEGRAM_TRANSFER_APPROVED=true` fail-closed halten; Cal lässt sich durch
  Deaktivieren des Readiness-Webhooks stoppen; Meta-CAPI durch Tokenentzug.
- Fehlerhafte Outbox-Aufträge nicht manuell mehrfach versenden. CRM und
  Outbox-Status sind die kanonische Quelle; Telegram besitzt keine harte
  Idempotency-Key-Semantik.
- **Keinen alten Deploy gegen die neue v2-Datenbank starten.** Die atomare
  Endmigration entfernt frühere Callback-/Analyse-Funktionen und -Spalten. Ein
  vollständiger Rückbau ist nur als koordinierte Wiederherstellung des
  Datenbank-Snapshots plus passendem alten Deploy zulässig und benötigt eine
  ausdrückliche Freigabe.
- Bei einzelnen Fehlern bevorzugt vorwärts reparieren, erneut automatisiert
  prüfen und erst danach Traffic freigeben. Betroffene Einwilligungen oder
  Zustellungen nicht rekonstruieren oder nachsenden, wenn die Evidenz fehlt.
- Datenschutz- oder Transfervorfall: alle externen Sends stoppen, Zeitfenster
  und Empfänger aus geschützten Systemen sichern, Verantwortliche informieren
  und das freigegebene Incident-Verfahren auslösen. Keine PII in Chat oder
  Tickettext kopieren.

## Geschäftsführer-Prüfung und Freigabe

### Angebot und Nutzerwirkung

- [ ] Das Creative verspricht nur, was der Test liefert: kostenloser Score,
  konkrete nächste Schritte, ca. vier Minuten, branchenoffen.
- [ ] E-Mail als Pflichtfeld vor dem Ergebnis ist geschäftlich gewollt und im
  Datenschutzhinweis transparent erklärt.
- [ ] Der primäre nächste Schritt ist die freiwillige Buchung mit Marco.
- [ ] Es gibt keinen Kaltanruf und keine sonstige Werbeansprache ohne eigene
  Rechtsgrundlage; sekundär wird nur die bestätigte Newsletter-Liste genutzt.

### Kampagne und Wirtschaftlichkeit

- [ ] ICP: Solo-Selbstständige, Inhaber und Geschäftsführungen kleiner
  B2B-Unternehmen mit 0–20 Mitarbeitenden, branchenoffen.
- [ ] Leads → Website, Optimierung zunächst auf `Lead`; `Schedule` bleibt
  sekundäre Qualitätsconversion.
- [ ] Tagesbudget, CPL-/Cost-per-Schedule-Grenze, Startdatum und Zahlender sind
  namentlich bestätigt.
- [ ] `Synclaro.de` und `Johannes Jaegers` sind als EU-Werbetreibender/Zahlender
  tatsächlich korrekt oder wurden vor der Freigabe berichtigt.
- [ ] Creative-Auswahl, Anzeige, mobile Vorschauen, automatische Meta-
  Erweiterungen und Ausschlusslisten sind bestätigt.

### Recht, Betrieb und Daten

- [ ] Datenschutztext, DOI, Meta-Consent, Cal, Resend und Telegram-Transfer sind
  freigegeben.
- [ ] Production-Migration, Backup, Umgebungsvariablen und Monitoring wurden mit
  Nachweis abgenommen.
- [ ] Ein vollständiger Testlead und ein vollständiger Testtermin waren
  erfolgreich; Testdaten wurden kontrolliert behandelt.
- [ ] Im Meta-Publish-Dialog sind ausschließlich die freigegebenen Kampagnen-,
  Anzeigengruppen- und Anzeigenobjekte enthalten.

**Entscheidung:** [ ] GO · [ ] NO-GO<br>
**Name:** ____________________<br>
**Datum/Uhrzeit:** ____________________<br>
**Freigabevermerk / Budget:** ____________________

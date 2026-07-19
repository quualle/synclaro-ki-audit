# KI-Readiness-Funnel – Launch Readiness

Stand: 19.07.2026 · Zielbranch: `feat/readiness-contact-handoff` · **nicht live**

## Status in einem Satz

Der neue Micro-Step-Funnel und die anschließende zweistufige Gesprächs-
vorbereitung sind in den beiden Draft-PRs auf einen gemeinsamen Zielzustand
ausgerichtet. Datenbank, Netlify-Production, Cal.com, Resend, Telegram, Meta Events
Manager und Meta Ads Manager sind dadurch noch nicht automatisch freigegeben
oder produktiv konfiguriert. Die Geschäftsführung erteilt am Ende dieses
Dokuments eine einzige Go-/No-Go-Entscheidung; die technische Veröffentlichung
erfolgt anschließend in der festgelegten Reihenfolge.

## Externer Read-only-Snapshot

Am 19.07.2026 wurde der sichtbare externe Stand geprüft; veröffentlicht wurde
nichts. Die dokumentierten V2-Namen und die V2-Copy sind im Meta-Entwurf
gesetzt. Entscheidend sind die exakten IDs: Kampagne `120251380526880206`,
Anzeigengruppe `120251380526890206`, Anzeige `120251380526870206`.

- Im Meta Ads Manager existiert ein unveröffentlichter Leads-/Website-Draft mit
  Auktion, „Conversions maximieren“, Advantage+ Budget/Audience/Placements,
  25 € Tagesbudget, Deutschland, 18–65+, allen Geschlechtern,
  Zielgruppenvorschlägen „Unternehmertum“, Arbeitgeber „Selbstständig“ und
  Verhalten „Inhaber von Kleinunternehmen“. Der aktive Website-Datensatz
  `1497847851628194` und das Event `Lead` sind im Adset ausgewählt. Meta warnt
  erwartungsgemäß, dass dieses Event in den letzten 14 Tagen keine Aktivität
  hatte; ein consent-basiertes Pixel/CAPI-Testevent bleibt deshalb Launch-Gate.
- Als EU-Werbetreibender/Zahlender werden im Entwurf noch `Synclaro.de` und
  `Johannes Jaegers` geführt. Das ist nach Marcos Bestätigung vom 19.07.2026
  falsch: Zielzustand ist `Synclaro.de` / `Marco Heer`; Marco zahlt für
  Synclaro per Kreditkarte.
- Der öffentliche Cal-Termin `/marcoheer/ki-erstgespraech` dauert 20 Minuten und
  nutzt Google Meet. Die Beschreibung duzt; das Buchungsformular verlangt
  derzeit Name, E-Mail und „Wie sind Sie auf uns aufmerksam geworden?“ als
  Pflichtfelder. Die Telefonnummer ist optional, aber weiterhin sichtbar; der
  Anlass ist optional.
- Der URL-Parameter `readiness_ref` bleibt beim öffentlichen Cal-Aufruf
  erhalten. Das dazugehörige verborgene Feld und der event-spezifische Webhook
  konnten nicht im Admin geprüft werden, weil `app.cal.com` ausgeloggt war.
- Der Meta-Creative-Wizard ist auf ein Image Ad umgestellt. V2-Primärtext,
  Überschrift, Beschreibung, CTA, Ziel-URL und die ältere namensbasierte
  UTM-Vorlage sind gesetzt; keine der fünf automatisch vorgeschlagenen
  KI-Textvarianten ist ausgewählt. Die objektgenaue Campaign-/Adset-/Ad-ID-
  Vorlage ist noch nicht in Meta übernommen. Der
  Text der lokalen V2-Dateien ist inzwischen auf „8 adaptive Fragen“
  korrigiert; alle drei PNG-Formate wurden neu gerendert und visuell geprüft.
  Der Upload ist weiterhin durch
  die fehlende Chrome-Erweiterungsberechtigung für lokale Dateien
  blockiert (`fileChooser.setFiles: Not allowed`); die globale
  Dateiberechtigung wurde bewusst nicht autonom erweitert und es wurde kein
  Ersatz-Creative veröffentlicht.
- Das ursprünglich gelieferte Video liegt wieder vor und wurde geprüft:
  31,53 Sekunden, 1080 × 1920, 9:16. Seine persönliche Hook und der Beleg
  „über 200 Betriebe“ machen es nach einem kleinen Finish zur empfohlenen
  Hauptanzeige. Die Rohfassung bleibt gesperrt, bis Untertitel,
  Synclaro-Kennung/Endkarte und die derzeit widersprüchliche Zeitangabe
  „3 Minuten“ versus „ca. 4 Min.“ bereinigt sind. Static V2 bleibt der einzige
  Challenger im selben Adset.

Dieser Snapshot kann sich ändern und ist unmittelbar vor dem Publish erneut zu
prüfen.

## Lokal verifizierter Stand

Am 19.07.2026 wurden ohne Production-Write und ohne externen Send folgende
Prüfungen erfolgreich abgeschlossen:

- `npm test`: 61 von 61 Node-Tests; atomare lokale PostgreSQL-Migration samt
  Integrationstest erfolgreich; `npm audit` mit 0 bekannten Schwachstellen;
- `netlify build --offline --context deploy-preview`: alle Readiness-Functions
  gebündelt; der Manifest-Test bestätigt Functions API v2, drei Traffic Rules
  und ein isoliertes `submit-lead`-Bundle;
- Datenschutz-Worktree: `astro check` mit 0 Fehlern und vollständiger Build
  erfolgreich;
- `git diff --check`: Funnel- und Datenschutz-Worktree ohne Whitespace-Fehler;
- reale Browserdurchläufe auf Desktop und 390-px-Mobilansicht über alle
  Micro-Steps, sowohl für notwendige-only als auch für den freiwilligen
  Tracking-Pfad: stets genau eine aktive Ebene, korrekt benannte Eingaben,
  Fokus auf `resultTitle`, zwei sichtbare Gesprächs-CTAs und kein horizontaler
  Overflow;
- Newsletter-Auswahl im Preview: sichtbarer Hinweis, dass absichtlich weder
  eine Bestätigungs-E-Mail versendet noch eine Anmeldung gespeichert wurde;
- einheitliche 21-Schritte-Fortschrittslogik ohne Rücksprung, eindeutig als
  optional gekennzeichnete Zusatzfrage, sichtbarer/Escape-fähiger
  Ergebnisabschluss, zum Creative passende initiale Restzeit „ca. 4 Min.“ und
  getrennte Abmelde-Erfolgs-, Fehler- und Preview-Seiten;
- alle fünf ungenutzten, handwerksgeprägten Altbilder wurden aus dem öffentlich
  ausgelieferten Asset-Verzeichnis entfernt; die aktuelle Social-Karte bleibt
  branchenoffen;
- frische mobile Browser-Session: 0 Console-Fehler und 0 Console-Warnungen.
- finale UX-/Accessibility-Re-Prüfung des vorherigen Vollstands: `PASS`;
  nachträglich identifizierte Tracking-Lücken sind lokal behoben: Meta-Grants
  werden erst nach serverseitig bestätigtem Consent aktiviert, Analytics-
  Property-Werte sind streng typisiert und ein nicht unterstütztes adaptives
  Phantom-Event wurde entfernt. Der abschließende isolierte Critic lautet
  `PASS`; die quellenfreie externe Terra-QA lautet `GO-WITH-CHANGES` allein
  wegen der offengelegten Netlify-/Hosted-Gates.

Der dokumentierte `OPENROUTER_API_KEY` ist vorhanden und wurde read-only gegen
den Provider erfolgreich authentifiziert. Frühere Voll- und Delta-Prüfungen
sind unter `docs/reviews/2026-07-19-final-production-qa.md` protokolliert. Für
das letzte Tracking-Delta gilt erst der neue Abschlusscheck als maßgeblich.
Dieser ist unter
[`docs/reviews/2026-07-19-final-tracking-delta-qa.md`](./reviews/2026-07-19-final-tracking-delta-qa.md)
dokumentiert.

## Aktueller Provider-Audit (read-only)

Der folgende Stand wurde ohne Production-Write, Secret-Ausgabe oder externen
Send erhoben:

| Bereich | Verifizierter Stand | Konsequenz vor Launch |
|---|---|---|
| Netlify | CLI authentifiziert und richtige Site-ID dokumentiert. Auch der neueste vorhandene Deploy Preview `6a5d3998654fcbf95ad4f6b1` meldet zwar `production=false`, enthält aber noch den alten Funktionspfad: `/api/readiness-session` liefert dort `404`, während `/.netlify/functions/start-session` antwortet. Der finale V2-Stand ist somit noch nicht gehostet. Zusätzlich zieht die Site-UI derzeit den veralteten Build-Befehl `npm run build` und ein unpassendes Next.js-Plugin; nur der lokale Offline-Build über die Repository-Konfiguration ist grün. | Vor Hosted-QA einen neuen Deploy Preview mit ausschließlich Preview-Secrets erzeugen und die Netlify-Site-Buildkonfiguration korrigieren beziehungsweise ausdrücklich bestätigen. Production bleibt unangetastet. |
| Resend | Production-Zugang read-only erfolgreich authentifiziert; konfigurierte Absenderdomain verifiziert | Provider ist bereit. Echte DOI-, interne und Newsletter-Sends bleiben bis zur gebündelten Testfreigabe aus. |
| Core-Sicherheit | `SESSION_HMAC_SECRET`, `LEAD_SIGNING_SECRET`, `LEAD_RATE_LIMIT_SECRET` und `LEAD_IP_HASH_SALT` sind vorhanden, unterschreiten aber jeweils die geforderte Mindestlänge von 32 Zeichen | Vor Production vier neue, getrennte Werte sicher erzeugen und im Functions-Scope setzen. |
| Supabase | URL vorhanden, aber weder `SUPABASE_SECRET_KEY` noch `SUPABASE_SERVICE_ROLE_KEY` im Production-Functions-Scope. Der read-only Live-Abgleich nennt `20260719050454` als jüngste angewandte Migration; die neue Endmigration `20260719060000` ist dort noch nicht registriert und liegt eindeutig danach. Eine isolierte Cloud-Testbranch würde im aktuellen Tarif reale Kosten auslösen. | Keine kostenpflichtige Branch wurde autonom erzeugt. Kostenfreigabe oder ausdrücklich gewählte Testalternative ist ein Geschäftsführer-Gate. |
| Telegram | Lead-Token und Zielchat sind zwar belegt, aber formal ungültig; die Bot-API lehnt den Zugang ab. `TELEGRAM_TRANSFER_APPROVED` bleibt fail-closed. Andere vorhandene Bots sind für andere Zwecke dokumentiert. | Bot-Identität und Zielchat ausdrücklich festlegen; keinen bestehenden Bot stillschweigend umwidmen. Danach PII-freien Test senden. |
| Meta | Pixel-ID und Graph-Version vorhanden; `META_CAPI_ACCESS_TOKEN` und temporärer Test-Event-Code fehlen | CAPI-Zugang erst nach Freigabe sicher erzeugen/hinterlegen, dann dedupliziertes `Lead`-Testevent prüfen. |
| Cal.com | Sämtliche `CAL_READINESS_*`-Variablen fehlen; die Admin-Sitzung war beim letzten UI-Audit ausgeloggt | Nach Login das öffentliche Event und den event-spezifischen Webhook erst im freigegebenen Aktivierungsfenster ändern. |
| OpenRouter | Dokumentierter Zugang vorhanden und read-only erfolgreich authentifiziert; adaptiver Laufzeitpfad ist ZDR-gebunden, fail-safe und mit Sessionpflicht sowie Netlify-Limits von 20 Fragen- und 6 Ergebnisaufrufen je 180 Sekunden pro IP/Domain geschützt | Nur im Deploy-Preview-Kontext aktivieren, echten Acht-Fragen-Lauf prüfen und vor Production zusätzlich eine harte Provider-Budgetgrenze sowie die rechtliche Transferfreigabe dokumentieren. |

## Verbindliches Zielbild

- Vier kurze Unternehmensfragen: Größe, Rolle, Hauptziel und Branche.
- Acht adaptive Kernfragen aus einem festen Katalog sowie eine optionale offene
  Hebelfrage. GPT-5.5 wählt die nächste Frage und ergänzt einen Branchenkontext;
  Frage, Hilfe, Antworttexte, Reihenfolge und Werte bleiben kanonisch. Der
  Server erzwingt genau zwei Messanker je Dimension. Der Test ist
  branchenoffen und formuliert Solo-Selbstständige ohne Team-Unterstellung.
- Danach vier einzelne Kontakt-Schritte: Vorname, Nachname,
  Unternehmen/selbstständige Tätigkeit und E-Mail-Adresse.
- **Keine Telefonnummer, kein Rückruf-Consent, kein Kaltanruf und keine
  automatische Kontaktaufgabe.** Ein CRM-Eintrag ist keine Werbe- oder
  Kontaktierlaubnis.
- Score, vier Teilwerte und Reifegrad entstehen deterministisch aus der
  versionierten Bewertungslogik. GPT-5.5 vertieft anschließend die
  sprachliche Einordnung und den priorisierten ersten von drei bereits kuratierten Anwendungsfällen, darf aber
  weder Score noch Status, Messgröße, Voraussetzung oder menschliche Freigabe
  verändern. An OpenRouter/OpenAI gehen nur bereinigtes Unternehmensprofil und
  kanonische Testantworten; niemals Kontakt-, Tracking-, Meta- oder
  Attributionsdaten. Der frühere separate Analyse-Endpunkt bleibt HTTP 410.
- Primäre gewünschte Folgewirkung: Nach dem vollständigen Ergebnis bucht die
  Person selbst und bewusst eine kostenlose KI-Potenzialanalyse mit Marco.
- Sekundäre Folgewirkung: freiwillige E-Mail-Nurture-Strecke nach separater
  Newsletter-Auswahl und bestätigtem Double-Opt-in. Kein Setter- oder
  Kaltoutreach-Prozess. Die branchenoffene, auf fünf E-Mails in 20 Tagen
  begrenzte Sequenz liegt sendefertig unter
  [`marketing/ai-readiness-nurture-sequence.md`](../marketing/ai-readiness-nurture-sequence.md);
  aktiviert wird sie erst nach Provider-, Suppression- und Zustelltests.
- Analyse-Tracking und Meta-Marketing sind getrennte, freiwillige Entscheidungen
  und blockieren den Test nicht.

## Tatsächlicher Daten- und Eventfluss

| Auslöser | Speicherung / Zustellung | Harte Bedingung |
|---|---|---|
| Auswertung angefordert | Kontakt, Assessment, Antworten, fester Score und – bei erfolgreichem Modellaufruf – KI-vertiefte Advisory-Texte werden atomar über `submit_ai_readiness_lead_v2` geschrieben. Bei Providerfehler wird das vollständige deterministische Ergebnis gespeichert. Eine interne E-Mail ohne kopierte Kontaktdaten wird in die Outbox gestellt. | Gültige Sitzung, acht vollständige Kernfragen mit zwei Messankern je Dimension, aktueller KI-/Datenschutzhinweis und aktueller Tracking-Entscheid. |
| Newsletter freiwillig ausgewählt | Eine append-only CRM-Marketing-Consent-Zeile wird zunächst als DOI-pending angelegt. Die Bestätigungs-E-Mail läuft über Resend und bleibt wie die spätere Mehrwert-Mail an den im Consent-Nachweis gespeicherten E-Mail-Snapshot gebunden; spätere CRM-Adressänderungen führen nicht zu einem Empfängerwechsel. Pending-Einträge erscheinen nicht in `v_email_marketing_list`. Bereits aktive historische Consents bleiben aktiv. | Exakter versionierter Einwilligungstext; Link und Bestätigungsseite sind signiert und 24 Stunden gültig. Das Ergebnis weist sichtbar auf Postfach und Spam-Ordner hin. |
| DOI-Seite per GET geöffnet | Der Token wird nur geprüft und eine noindex-Bestätigungsseite angezeigt. | Kein CRM-/Consent-Write; automatische Mail-Scanner-Aufrufe dürfen nichts aktivieren. |
| DOI-Button bewusst per POST bestätigt | Die bestehende Consent-Zeile und das Assessment werden idempotent auf bestätigt gesetzt; erst dann ist der neue Kontakt in der aktiven E-Mail-Liste. Genau eine consent-gebundene Mehrwert-Mail wird über die Outbox vorgemerkt. | Gültige Signatur, passende Assessment-/Submission-ID, Consent nicht widerrufen. Deploy Previews leiten ohne Datenbankzugriff auf eine eindeutige Preview-Seite um. |
| Bestätigte Mehrwert-Mail | Resend sendet drei konkrete erste Umsetzungsschritte und die freiwillige Marco-Terminoption. Der Cal-CTA enthält eigene Newsletter-UTMs und die beim ersten erfolgreichen DOI dauerhaft in der Outbox gespeicherte signierte Readiness-Zuordnung; ein Retry erzeugt weder einen abweichenden Link noch eine zweite logische Nachricht. Die E-Mail enthält außerdem einen signierten Abmeldelink sowie standardisierte `List-Unsubscribe`- und One-Click-Header. | Nur nach bestätigtem DOI und erneuter Consent-Prüfung unmittelbar vor dem Send. |
| Newsletter-Abmeldelink per GET geöffnet | Der Token wird nur geprüft und eine noindex-Abmeldeseite angezeigt. | Kein CRM-/Consent-Write; Mail-Scanner und Link-Previews verändern nichts. |
| Abmeldung bewusst per POST oder standardisiertem One-Click bestätigt | Der CRM-Marketing-Consent wird idempotent widerrufen, der Kontakt verschwindet aus `v_email_marketing_list` und alle noch ausstehenden Newsletter- und Telegram-Statusaufträge werden neutralisiert. Das menschliche Formular erhält eine Bestätigungsseite; der RFC-8058-One-Click-POST eine leere `200 OK`-Antwort. | Gültige signierte Zuordnung; Deploy Previews bleiben write-frei. |
| Newsletter ausgewählt | Telegram kann eine rein generische Statusmeldung „neuer Lead / DOI ausstehend oder bereits aktiv“ senden. Name, Firma, E-Mail, Telefonnummer, Antworten, Score, IDs und individuelle CRM-Links werden nicht übertragen. | Nur wenn `TELEGRAM_TRANSFER_APPROVED` exakt `true` ist; sonst fail-closed. |
| Marketing-Tracking erteilt und ein ICP-passender Lead atomar gespeichert | Browser-Pixel und CAPI senden `Lead` mit derselben `event_id` zur Deduplizierung. Als ICP-passend gelten Inhaber/Geschäftsführung mit 0–20 Mitarbeitenden. Alle consent-basierten Teststarts und Abschlüsse bleiben separate Custom Events; sie werden nicht als `Lead` ausgegeben. CAPI nutzt minimierte Matching-Daten, insbesondere gehashte E-Mail sowie nur bei Consent zulässige Browser-/Netzwerkkennungen. | Aktuell gültiger Marketing-Consent unmittelbar vor Zustellung **und** `lead_fit=true`; kein Score, keine Firma und keine Antworten an Meta. |
| Ergebnis angezeigt | Der Handoff zur Synclaro-Kontaktseite erhält die signierte, 30 Tage gültige `readiness_ref`. Nur mit Marketing-Consent werden zusätzlich der kanonische Kampagnenname, Campaign-, Adset- und Ad-ID sowie ein minimiertes Placement übertragen. Die Kontaktseite hält die Referenz tablokal höchstens zwei Stunden, entfernt sie aus der sichtbaren URL, fragt Gesprächsziel und Timing nacheinander ab und übergibt Referenz und Meta-Objekt-IDs strukturiert an Cal. | Noch kein `Schedule`-Event; weder Handoff-Klick noch Kalenderansicht zählen als Termin. |
| Cal meldet `BOOKING_CREATED` | Der separate Webhook prüft HMAC, Webhook-Version, Zeitfenster, Event-Type-ID, Slug, Organizer und `readiness_ref`. Danach entstehen idempotent ein CRM-Terminereignis, eine PII-freie Telegram-Buchungsmeldung und – bei weiterhin gültigem Marketing-Consent – ein serverseitiges Meta-`Schedule`. Jede eigenständige Buchungskennung besitzt einen eigenen gehashten Outbox-Schlüssel. | Ausschließlich der definierte Readiness-Termin. Replay mit identischem Body ist idempotent, widersprüchlicher Replay wird abgelehnt; zwei tatsächlich verschiedene Buchungen desselben Assessments bleiben getrennt. |

Die Scheduled Function `process-lead-outbox` läuft alle zwei Minuten. Vor jedem
externen Send werden Lease und erforderlicher Consent erneut geprüft. Temporäre
Fehler werden mit Backoff bis zu acht Versuchen wiederholt. DOI- und
Telegram-Aufträge laufen nach 24 Stunden, die bestätigte Mehrwert-Mail und
Meta-Aufträge nach sieben Tagen ab.
Erledigte oder tote Outbox-Zeilen werden nach 30 Tagen bereinigt.

## Aufgabenverteilung bis zur Freigabe

### Autonom ohne Marcos Mitwirkung

- externe OpenRouter-QA ausführen, Befunde beheben und Verdict dokumentieren;
- Code-, SQL-, Build-, Preview-, Browser- und Provider-Read-only-Prüfungen
  wiederholen sowie das exakte Production-Change-Manifest vorbereiten;
- den unveröffentlichten Meta-Draft mit der dokumentierten Copy, Zielgruppe,
  Ziel-URL und den lokalen Creatives vervollständigen, soweit keine neue
  Browserberechtigung erforderlich ist;
- Resend-, Telegram-, Meta- und Cal-Testdrehbücher inklusive erwarteter
  fail-closed Ergebnisse vorbereiten;
- alle Änderungen weiterhin ausschließlich in Branches, Deploy Previews und
  lokalen Testsystemen halten.

### Echte Marco-Gates

- Kostenentscheidung für eine Supabase-Cloud-Testbranch oder ausdrückliche
  Freigabe einer dokumentierten Testalternative;
- Festlegung des Lead-Bots und Zielchats oder ausdrückliche Freigabe zur
  Umwidmung eines bestehenden Bots; bei einem neuen Bot gegebenenfalls die
  BotFather-Erstellung;
- Login, 2FA oder neue Browser-/Dateiberechtigung nur dann, wenn die vorhandene
  Sitzung die autonome Konfiguration tatsächlich blockiert;
- Freigabe unmittelbar vor der Erzeugung eines persistenten Meta-CAPI-Zugangs,
  vor Production-Env-Änderungen, Änderungen am öffentlichen Cal-Event sowie
  echten Resend-, Telegram-, Meta- und Cal-Testtransaktionen;
- rechtliche/operative Freigabe, Budget, Zahlender und der abschließende
  Publish-Klick.

## Harte Launch-Gates

Keiner dieser Punkte darf stillschweigend als erledigt behandelt werden.

- [x] `npm run check` ist auf dem vorbereiteten finalen Stand erfolgreich.
- [x] `netlify build --offline --context deploy-preview` und der anschließende
  Manifest-Test sind erfolgreich.
- [ ] Ein neuer Deploy Preview enthält nachweislich den finalen Functions-v2-
  Stand. Der vorhandene Preview ist unveröffentlicht und `production=false`,
  aber nachweislich veraltet (`/api/readiness-session` liefert `404`).
- [ ] Die Netlify-Site-Buildkonfiguration enthält keinen veralteten
  `npm run build`-Befehl und kein unpassendes Next.js-Plugin mehr; ein
  verbundener Deploy-Preview-Build ist danach grün.
- [ ] Der finale Preview-Durchlauf wurde auf Desktop und Mobil mit
  „nur notwendig“ sowie mit Analyse-/Marketing-Consent geprüft; keine
  Console-, Netzwerk-, Fokus- oder Layoutfehler. Insbesondere lädt Meta bei
  gemischter Einwilligung erst nach bestätigtem Server-Consent.
- [x] Die quellenfreie externe OpenRouter-QA wurde mit dem verifizierten Zugang
  ausgeführt und mit `GO-WITH-CHANGES` dokumentiert. Ihre verbleibenden Punkte
  sind die separat offenen Netlify-/Hosted-Gates, keine verdeckten Codefehler.
- [ ] Die Datenschutzergänzung ist technisch und rechtlich geprüft und auf
  `https://synclaro.de/datenschutz#ki-readiness-test` veröffentlicht.
- [ ] Auf einer Supabase-Testbranch wurde die atomare Endmigration
  `20260719060000_ai_readiness_lead_funnel.sql` angewandt und der SQL-
  Integrationstest ausgeführt. Der frühere v1→v2-Zwischenstand wurde vor jeder
  Production-Anwendung in diese einzelne Transaktion zusammengeführt. Da eine
  Cloud-Testbranch im aktuellen Tarif reale Kosten auslöst, wurde sie nicht
  autonom angelegt; Kostenfreigabe oder Testalternative sind noch offen.
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
  Aktuell fehlen der Supabase-Admin-Key, Meta-CAPI und sämtliche Cal-Variablen;
  die vier Core-Sicherheitswerte sind zu kurz.
- [x] Resend-Zugang und konfigurierte Absenderdomain sind read-only erfolgreich
  geprüft.
- [ ] Interner Empfänger, effektiver Newsletter-Absender, Zustellbarkeit sowie
  der implementierte GET→POST-/One-Click-Abmeldeweg wurden durch freigegebene
  Testnachrichten im Zielsystem geprüft.
- [ ] Lead-Bot und Zielchat sind ausdrücklich festgelegt und technisch gültig;
  der aktuell hinterlegte Lead-Zugang ist ungültig und andere Bots dürfen nicht
  stillschweigend umgewidmet werden. Erst danach darf
  `TELEGRAM_TRANSFER_APPROVED=true` gesetzt werden. Testmeldungen enthalten
  nachweislich keine PII.
- [ ] Cal.com hat beim Event `ki-erstgespraech` ein verborgenes Feld mit dem
  Schlüssel `readiness_ref` und einen ausschließlich auf `BOOKING_CREATED`
  beschränkten Readiness-Webhook. Event-Type-ID, Slug und Organizer entsprechen
  exakt den Netlify-Variablen; diese Variablen fehlen aktuell vollständig.
- [ ] Das Cal-Formular verlangt keine Telefonnummer. Name und E-Mail bleiben
  erforderliche Buchungsfelder; „Wie sind Sie auf uns aufmerksam geworden?“
  ist optional oder wird durch die vorhandenen UTM-Parameter ersetzt. Die
  Beschreibung spricht die Zielgruppe konsistent mit „Sie“ an.
- [ ] Ein kontrollierter Cal-Testtermin erzeugt genau ein CRM-Terminereignis,
  genau eine generische Telegram-Buchungsmeldung und – nur mit Marketing-
  Consent – genau ein Meta-`Schedule`.
- [ ] Meta Pixel/CAPI-Deduplizierung für `Lead` ist im Events Manager geprüft;
  `Schedule` erscheint ausschließlich nach einer verifizierten Buchung. Der
  Pixel ist konfiguriert, der serverseitige CAPI-Zugang fehlt aktuell.
- [ ] Zuerst wurde mit gültigem Marketing-Consent und einem klar als ICP-Fit
  markierten Testdatensatz ein `Lead`-Testevent an Pixel/CAPI gesendet. Erst nachdem es im Events Manager
  angekommen und als Website-Conversion auswählbar ist, wurde es im Draft als
  Optimierungs-Event gesetzt.
- [ ] Der Meta-Kampagnenentwurf wurde gegen
  [`META_CAMPAIGN_DRAFT.md`](./META_CAMPAIGN_DRAFT.md) geprüft. Budget,
  Startzeit, Zahlender, Ziel-URL, Pixel/Dataset, Ausschlüsse, Placements und
  Creative sind ausdrücklich bestätigt; die alte Wizard-Copy wurde vollständig
  durch die dokumentierte V2-Copy ersetzt.
- [ ] Im Meta Ads Manager befinden sich keine fremden oder ungeprüften Objekte
  in derselben globalen Veröffentlichungsmenge.
- [ ] EU-Werbetreibender und Zahlender sind im Meta-Entwurf auf
  `Synclaro.de` / `Marco Heer` korrigiert; `Johannes Jaegers` ist entfernt.
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
| `OPENROUTER_API_KEY` | Für adaptive Fragen/Auswertung | Nur serverseitig und zunächst ausschließlich im Deploy-Preview-Kontext. Vor Production rotieren beziehungsweise mit Budgetgrenze absichern. |
| `AI_ADAPTIVE_ENABLED` | Für adaptive Fragen/Auswertung | Muss im freigegebenen Kontext exakt `true` sein; andernfalls nutzt der Test die sichere Basisauswertung. |
| `OPENROUTER_ADAPTIVE_MODEL` | Empfohlen | Explizit `openai/gpt-5.5`; im anonymen Preview-Test war es deutlich latenzstabiler als Sol. Terra wird derzeit von OpenRouter unter der verpflichtenden ZDR-Richtlinie nicht geroutet. |

`CONTEXT` wird von Netlify gesetzt. `OPENAI_API_KEY` und `SUPABASE_ANON_KEY`
werden von anderen, älteren Premium-/Kampagnenfunktionen im Repository genutzt,
aber nicht vom adaptiven KI-Readiness-Leadpfad. Ihre Existenz darf nicht als
Freigabe für diesen externen KI-Verarbeitungspfad verstanden werden.

## Exakte Cal.com-Konfiguration

1. Nur das Event `https://cal.com/marcoheer/ki-erstgespraech` bearbeiten.
2. Die aktuelle Beschreibung von „du“ auf die formelle „Sie“-Ansprache des
   Funnels umstellen. Das derzeit optionale, aber sichtbare Telefonfeld
   vollständig aus dem Buchungsformular entfernen. Name und E-Mail bleiben
   erforderlich; die Quellenfrage wird
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
3. Nach der dokumentierten Kosten-/Testalternativen-Entscheidung die atomare
   Endmigration auf einer isolierten Supabase-Branch anwenden und
   `supabase/tests/lead_funnel_integration.sql` erfolgreich ausführen.
4. Production-Backup/PITR verifizieren. Kampagne und öffentlicher Traffic
   bleiben aus. Die einzelne Migration läuft vollständig in einer Transaktion:
   bei einem Fehler wird der gesamte Readiness-Stand zurückgerollt. Erst nach
   erfolgreichem Commit den kompatiblen Funnel-Deploy veröffentlichen und
   smoke-testen.
5. Die vier zu kurzen Core-Sicherheitswerte ersetzen, den Supabase-Admin-Key
   ergänzen und Telegram-, Meta-CAPI- sowie Cal-Variablen setzen. Der bereits
   verifizierte Resend-Zugang bleibt unverändert; Telegram bleibt bis zur
   separaten Transferfreigabe fail-closed.
6. Einen klar markierten Testlead ohne Newsletter/Tracking prüfen: Kontakt,
   Assessment, Ergebnis, CRM-Ereignis und interne Outbox; keine Marketing-
   Consent-Zeile, kein Telegram, kein Meta.
7. Einen Testlead mit Newsletter prüfen: DOI-pending ist nicht in der aktiven
   E-Mail-Liste; erst der signierte Link aktiviert die Liste und stellt genau
   eine Mehrwert-Mail mit `List-Unsubscribe` bereit. GET des Abmeldelinks darf
   nichts verändern; POST/One-Click muss idempotent widerrufen und alle noch
   ausstehenden Newsletter-Aufträge neutralisieren.
8. Einen ICP-passenden Testlead mit Marketing-Consent im Meta-Testmodus prüfen:
   `Lead` wird per Pixel/CAPI dedupliziert; ohne Consent oder bei `lead_fit=false`
   entsteht kein Meta-`Lead`-Auftrag. Danach `Lead` im Draft als
   Optimierungs-Event auswählen.
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
- [x] Testabdeckung bestätigt mindestens: deterministischer Score,
  adaptive Dimensionsabdeckung, unveränderliche Scoringanker,
  Abbruch veralteter Frage-Requests, OpenRouter-ZDR/Structured-Output,
  Modell-Fallback ohne Leadverlust, Ausschluss von Kontaktdaten aus dem Modellprompt, Solo-Copy,
  Pflichtfelder ohne Telefon, versionierte Consent-Texte, deaktivierter
  Analyse-Endpunkt, Attribution-Minimierung, Session-/Origin-Sicherheit,
  PII-freies Telegram, fail-closed Transfergate, Meta-Deduplizierung,
  DOI-Idempotenz, scanner-sichere und idempotente Newsletter-Abmeldung,
  consent-gebundene Mehrwert-Mail, Booking-Replay-Schutz und getrennte
  Zustellung mehrerer legitimer Buchungen desselben Assessments.
- [x] `netlify build --offline --context deploy-preview` und
  `npm run test:netlify-manifest` sind grün.

### Manuell / extern

- [ ] Landingpage und jeder Micro-Step funktionieren mit Tastatur, Screenreader-
  Fokus, Zurück, Schließen, Fortsetzen und ungültiger E-Mail.
- [ ] Die vier Kontaktfelder erscheinen erst nach den Bewertungsfragen; die
  Newsletter-Auswahl bleibt freiwillig.
- [ ] Die sichtbare Auswertung stimmt mit dem serverseitig gespeicherten
  Ergebnis überein; Score und Sicherheitsanker bleiben auch bei KI-Vertiefung
  exakt unverändert.
- [ ] Der Deploy-Log bestätigt die erkannten Rate-Limits für `generate-questions`
  und `submit-lead`; ein kontrollierter Grenztest liefert anschließend `429`.
- [ ] Ergebnis-CTA öffnet den korrekten Kontakt-Handoff; signierte Referenz,
  Campaign-, Adset- und Ad-ID bleiben bis zur Cal-Konfiguration erhalten,
  während Meta-Parameter ohne Marketing-Consent vollständig fehlen.
- [ ] Notwendige-only erzeugt weder Meta-Pixel/CAPI noch Analytics-Events.
- [ ] Marketing-Widerruf deaktiviert Pixel und verhindert noch nicht gesendete
  Meta-Aufträge.
- [ ] DOI, interner Send, Telegram, Meta Lead, Cal-Buchung und Meta Schedule
  sind jeweils einmal positiv und einmal fail-closed getestet.
- [ ] Ein automatischer GET-Aufruf des DOI-Links verändert keine Einwilligung;
  erst der explizite POST-Button bestätigt idempotent.
- [ ] Ein automatischer GET-Aufruf des Abmeldelinks verändert keine
  Einwilligung; POST und standardisiertes One-Click widerrufen idempotent.
- [ ] Es gibt in UI, Payload, CRM-Write und Migration keinen Telefon- oder
  Rückrufpfad; OpenRouter/OpenAI erhalten nachweislich keine Kontakt-,
  Tracking-, Meta- oder Attributionsdaten.

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
- [ ] `Synclaro.de` und `Marco Heer` stehen als EU-Werbetreibender/Zahlender im
  Entwurf; die bestätigte Korrektur ist vor der Freigabe sichtbar geprüft.
- [ ] Creative-Auswahl, Anzeige, mobile Vorschauen, automatische Meta-
  Erweiterungen und Ausschlusslisten sind bestätigt.
- [ ] Das finalisierte Video läuft als Hauptanzeige und Static V2 als einziger
  Challenger mit identischer Copy/Ziel-URL; die Roh-MOV ist ausgeschlossen.

### Recht, Betrieb und Daten

- [ ] Datenschutztext, DOI, Meta-Consent, Cal, Resend und Telegram-Transfer sind
  freigegeben.
- [ ] Supabase-Branchkosten beziehungsweise die dokumentierte Testalternative
  und die Production-Migration sind ausdrücklich freigegeben.
- [ ] Der Lead-Telegram-Bot und sein interner Zielchat sind namentlich
  festgelegt; kein Bot mit anderer dokumentierter Aufgabe wird still umgewidmet.
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

# KI-Readiness-Funnel — Launch Readiness

Stand: 18.07.2026 · Branch: `feat/meta-ai-readiness-funnel` · **nicht live**

## Freigabestatus

Der neue Funnel ist technisch und visuell als Deploy Preview vorbereitet. Ein
Produktivstart ist absichtlich gesperrt, bis alle folgenden Punkte bestätigt
sind. Kein einzelner Punkt darf stillschweigend übersprungen werden.

## Harte Launch-Gates

- [ ] Das Original-Creative `893c091eaeed43b1bdd03d6b623120b4.MOV` ist wieder
  verfügbar, in Meta hochgeladen und gegen Landingpage, Hook, Untertitel und
  Anzeigen-Text geprüft.
- [ ] Die Migration
  `supabase/migrations/202607180001_ai_readiness_lead_funnel.sql` wurde nach
  ausdrücklicher Freigabe im richtigen Supabase-Projekt angewandt und der
  Integrationstest gegen eine sichere Testumgebung wiederholt.
- [ ] Das bestehende Berechtigungsmodell der CRM- und Tracking-Tabellen wurde
  separat auditiert und gehärtet. Insbesondere darf Lead-PII nicht über
  `anon`/`authenticated` lesbar sein. Der Audit vom 18.07.2026 fand 89
  exponierte Tabellen ohne aktivierte RLS, darunter `crm_contacts`,
  `crm_contact_events` und Behavior-Tabellen; das ist ein Launch-Blocker.
- [ ] Der CRM-Rückrufpfad protokolliert vor der Nutzung der Telefonnummer den
  Kanal, das normalisierte Ziel und den Zeitpunkt atomar über
  `record_ai_readiness_callback_use_v1`. Die Nutzung wird nur bei aktuell
  aktivem Consent akzeptiert; ein E-Mail-Nachfassen setzt einen protokollierten
  Telefonversuch voraus. Direkte `tel:`-/E-Mail-Wege, die diesen Nachweis
  umgehen, sind geschlossen.
- [ ] Der operative Widerrufspfad für die persönliche KI-Auswertung ist an den
  atomaren AI-Consent-Widerruf angebunden. Nach dem Widerruf werden neue
  Analyse-Claims abgelehnt; ein bereits laufender Aufruf darf sein Ergebnis
  nicht mehr in Assessment oder CRM persistieren.
- [ ] Genau einer der serverseitigen Supabase-Schlüssel
  `SUPABASE_SECRET_KEY` oder `SUPABASE_SERVICE_ROLE_KEY` ist im Netlify-Kontext
  `Production` und nur im Scope `Functions` gesetzt; ein Publishable-/Anon-Key
  ist dafür unzulässig.
- [ ] `META_CAPI_ACCESS_TOKEN` ist als serverseitiges Netlify-Secret gesetzt,
  und das `Lead`-Event wurde mit identischer Event-ID in Pixel und CAPI
  dedupliziert getestet.
- [ ] Das `Lead`-Event ist nach dem kontrollierten Test im Meta Event Manager
  sichtbar und als Conversion-Event der Anzeigengruppe auswählbar. Der Draft
  zeigt aktuell weiterhin keine auswählbaren Ergebnisse.
- [ ] `TELEGRAM_TRANSFER_APPROVED=true` ist erst nach dokumentierter
  Datenschutz-/Transferfreigabe gesetzt. Ohne diese Variable bleibt Telegram
  absichtlich fail-closed; E-Mail und CRM funktionieren unabhängig davon.
- [ ] Für die geplante Function `process-lead-outbox` ist in Netlify ein
  Funktionsfehler-Alarm an einen überwachten internen Kanal eingerichtet. Jeder
  unvollständige Zustellversuch beendet den Lauf absichtlich mit Fehler, nachdem
  der Retry-Status atomar gespeichert wurde; endgültig tote Aufträge werden im
  Betriebscheck geprüft.
- [ ] Datenschutzerklärung, Auftragsverarbeitung/Transfergrundlagen und der
  Löschprozess für externe Benachrichtigungen sind rechtlich freigegeben.
- [ ] Tagesbudget (Draft: 25 €), zukünftige Startzeit und der in der
  EU-Werbebibliothek sichtbare Zahlende sind durch die Geschäftsführung
  bestätigt. Im Draft steht derzeit `Johannes Jaegers`; dieser Eintrag darf
  nicht ungeprüft veröffentlicht werden. Die alte Standard-Startzeit muss
  unmittelbar vor der Freigabe auf einen zukünftigen Zeitpunkt gesetzt werden.
- [ ] Die zwei bereits vorgefundenen, fremden Meta-Drafts wurden separat
  geprüft. Der globale Button „Überprüfen und veröffentlichen“ darf nicht
  blind verwendet werden.

## Technischer Sollzustand

- 12 deterministische Score-Fragen in drei Phasen; vier gewichtete Dimensionen.
  Solo-Selbstständige erhalten inhaltlich gleich gewichtete, aber ohne
  Team-Unterstellung formulierte Fragen und Empfehlungen.
- Basisergebnis ohne Kontaktdaten; persönliche Auswertung nur mit Vorname,
  Nachname, Unternehmen/Tätigkeit, E-Mail, Telefonnummer und zwei getrennten
  Pflicht-Consents.
- Kontakt- und Antwortdaten werden serverseitig rekonstruiert, normalisiert und
  atomar in Assessment, CRM, Consent, Attribution und Outbox geschrieben.
- OpenAI verändert den Score nicht und erhält keine Kontaktfelder oder freien
  Texte. Die optionale Freitextantwort wird vollständig ausgeschlossen; die
  freie Branchenangabe wird vor der Analyse ausschließlich auf eine feste,
  grobe Taxonomie abgebildet und nie roh weitergegeben.
- Persönliche KI-Auswertungen werden über einen kurzlebigen, exklusiven
  Analyse-Claim gestartet. Ein atomar gespeicherter AI-Consent-Widerruf sperrt
  neue Aufrufe; ein bereits laufendes Ergebnis wird nach dem Widerruf verworfen
  und nicht in Assessment oder CRM gespeichert. Callback- und AI-Widerrufe
  verwenden für den Audit-Zeitpunkt die Datenbank-Serverzeit; stark rück- oder
  vordatierte Client-Zeitstempel werden abgelehnt.
- Stimmen E-Mail und Telefonnummer mit zwei unterschiedlichen CRM-Kontakten
  überein, wird keiner der Bestandskontakte automatisch verändert. Stattdessen
  entsteht ein isolierter, als `dedupe-review` markierter Prüfkontakt.
- Analytics und Meta-Marketing sind getrennt und freiwillig. Vor Zustimmung
  werden weder Meta noch Attribution-Storage aktiviert.
- Ein neuer Cross-Tab-Consent wird vor dem ersten Ereignis an den aktuellen
  Testlauf gebunden. Das Landing-Ereignis gilt erst nach serverseitiger Annahme
  als erfasst und bleibt bei einem Fehler wiederholbar; verzögerte ältere
  Grant-Antworten können einen neueren Widerruf nicht reaktivieren.
- Pixel und CAPI nutzen dieselbe `event_id`; Meta erhält nur minimierte,
  gehashte Matching-Daten und keine Antworten, Firma, Scores oder Freitexte.
- Die IP-Adresse für CAPI wird nur bei Marketing-Einwilligung in einem privaten
  Zustellauftrag gehalten. Sie wird nach Erfolg oder endgültigem Abbruch sofort
  geleert; ein offener Zustellauftrag läuft spätestens nach sieben Tagen ab.
- Telegram und interne E-Mail enthalten keine Kontaktdaten. Telegram meldet
  nur Score, Level und Kampagne und verlinkt ohne Lead- oder Kontakt-ID auf die
  geschützte CRM-Kontaktübersicht. Nur die interne E-Mail enthält zur gezielten
  Zuordnung Assessment-/Kontakt-ID im geschützten CRM-Link.
- Telegram wird nur nach erfolgreicher CRM-Speicherung und erteiltem
  Rückruf-Consent in die dauerhafte Retry-Outbox gestellt.
- Telegram `sendMessage` bietet keine Idempotency-Key-Semantik. Deshalb ist die
  Zustellung bewusst *at least once*: Ein sehr seltener Prozessabbruch zwischen
  erfolgreichem Telegram-Send und atomarer Outbox-Quittierung kann eine
  Doppelmeldung erzeugen. Das CRM bleibt die kanonische Quelle; Mitarbeitende
  dürfen aus einer Bot-Meldung keinen zweiten Kontaktvorgang ableiten.
- Analyseereignisse werden nach 90 Tagen gelöscht; abgelaufene Rate-Limits und
  alte Outbox-Zustände werden geplant bereinigt.
- Analyse- und Marketing-Entscheidungen einschließlich Ablehnung und Widerruf
  werden in einem privaten pseudonymen Consent-Verlauf mit Textversion und
  Zeitpunkt geführt und grundsätzlich nach 24 Monaten gelöscht. Eine zufällige,
  notwendige lokale Subject-ID ermöglicht die Zuordnung späterer Änderungen;
  serverseitig wird nur eine kryptografisch abgeleitete Kennung gespeichert.
- Ein serverseitig bestätigter Marketing-Widerruf bricht noch ausstehende
  Meta-CAPI-Aufträge für die pseudonyme Kennung ab und leert deren
  Zustelldaten. Die rohe IP-Adresse liegt nur bei Marketing-Einwilligung und
  höchstens bis Erfolg, endgültigem Abbruch oder Ablauf nach sieben Tagen im
  privaten Zustellauftrag.
- Der Kontakt-Consent-Nachweis enthält die bei Erteilung normalisierte
  Rückrufnummer und E-Mail-Adresse. Eine Nutzung ist nur bei aktuell aktivem
  Consent und nur für das exakt gebundene Kontaktziel zulässig; Kanal, Zeitpunkt
  und Bearbeiter werden unmittelbar protokolliert. Seine Aufbewahrung wird nach
  jeder Nutzung bis fünf Jahre nach diesem Nutzungszeitpunkt verlängert, soweit
  § 7a UWG anwendbar ist.
- Deploy Previews führen keine Supabase-, E-Mail-, Meta- oder Telegram-Writes
  aus.

## Netlify-Umgebungsvariablen

Stand der Nur-Lese-Prüfung: 18.07.2026. Secret-Werte werden weder in diesem
Dokument noch in Logs festgehalten. `Production · Functions` bedeutet:
Produktionskontext, ausschließlich Netlify Functions; nicht Builds, Deploy
Previews oder Browser-Code.

| Variable | Aktueller Netlify-Stand | Erforderlicher Funnel-Scope / Freigabe |
|---|---|---|
| `SUPABASE_URL` | gesetzt, alle Kontexte und Scopes | Für den Funnel `Production · Functions`; URL ist nicht geheim, der aktuelle Scope ist dennoch breiter als nötig. |
| `SUPABASE_SECRET_KEY` | fehlt | Bevorzugter Server-Schlüssel: genau hier oder beim folgenden Legacy-Fallback setzen, nur `Production · Functions`. Niemals in Browser- oder Build-Ausgaben. |
| `SUPABASE_SERVICE_ROLE_KEY` | fehlt | Zulässiger Legacy-Fallback, falls kein Secret-Key verwendet wird; nicht zusätzlich setzen und niemals durch `SUPABASE_ANON_KEY` ersetzen. |
| `SUPABASE_ANON_KEY` | gesetzt, alle Kontexte und Scopes | Für die Funnel-Functions nicht verwendet; nur ein Legacy-Kampagnenskript nutzt ihn. Abhängigkeit separat prüfen und Scope anschließend entfernen oder minimieren. |
| `SESSION_HMAC_SECRET` | gesetzt, `Production · Functions` | Beibehalten; eigenständiger Zufallswert mit mindestens 32 Zeichen, nicht mit anderen Secrets wiederverwenden. |
| `LEAD_SIGNING_SECRET` | gesetzt, `Production · Functions` | Beibehalten; eigenständiger Zufallswert mit mindestens 32 Zeichen. |
| `LEAD_RATE_LIMIT_SECRET` | gesetzt, `Production · Functions` | Beibehalten; eigenständiger Zufallswert mit mindestens 32 Zeichen. |
| `LEAD_IP_HASH_SALT` | gesetzt, `Production · Functions` | Beibehalten; getrennt von Signing- und Rate-Limit-Secret. |
| `OPENAI_API_KEY` | gesetzt, alle Kontexte und Scopes | Auf `Production · Functions` begrenzen. Deploy Previews dürfen den Schlüssel nicht nutzen. |
| `OPENAI_ANALYSIS_MODEL` | fehlt; Code-Default `gpt-5.4` | Optional, aber für reproduzierbare Freigabe Modell nach erfolgreichem Test explizit in `Production · Functions` festlegen. |
| `ALLOW_PREVIEW_ANALYSIS` | fehlt | So belassen. Nur für einen kontrollierten Preview-Test vorübergehend auf `true` setzen und danach wieder entfernen. |
| `RESEND_API_KEY` | gesetzt, alle Kontexte und Scopes | Auf `Production · Functions` begrenzen. |
| `LEADS_FROM_EMAIL` | gesetzt, `Production · Functions` | Absenderdomain und Zustellbarkeit mit einem Testlead bestätigen. |
| `LEADS_NOTIFICATION_EMAIL` | gesetzt, `Production · Functions` | Berechtigten internen Empfänger und Löschprozess bestätigen. |
| `CRM_BASE_URL` | gesetzt, `Production · Functions` | Geschützte Produktions-CRM-URL und Login-Zwang des erzeugten Links prüfen. |
| `LEAD_TELEGRAM_BOT_TOKEN` | gesetzt, `Production · Functions` | Beibehalten; allein aktiviert der Token keine Übertragung. |
| `LEAD_TELEGRAM_CHAT_ID` | gesetzt, `Production · Functions` | Berechtigten Zielchat prüfen; keine Kontakt-PII in Test- oder Echtmeldungen. |
| `TELEGRAM_TRANSFER_APPROVED` | fehlt | Absichtlich fail-closed. Erst nach dokumentierter Transfer-/Datenschutzfreigabe als exakt `true` in `Production · Functions` setzen. |
| `META_PIXEL_ID` | gesetzt, `Production · Functions` | Gegen Dataset `1497847851628194` und den richtigen Business Manager prüfen. |
| `META_GRAPH_API_VERSION` | gesetzt, `Production · Functions` | Gegen die beim Test unterstützte Meta-Version prüfen und dokumentieren. |
| `META_CAPI_ACCESS_TOKEN` | fehlt | Harter Launch-Blocker; nur `Production · Functions`, anschließend ausschließlich mit Test-Event validieren. |
| `META_TEST_EVENT_CODE` | fehlt | Für den kontrollierten Event-Manager-Test vorübergehend setzen, vor echten Leads wieder entfernen. |
| `SEVDESK_API_TOKEN` | gesetzt, alle Kontexte und Scopes | Vom Funnel nicht verwendet. Besitzer/Abhängigkeit prüfen und mindestens aus nicht benötigten Scopes/Kontexten entfernen. |
| `GITHUB_PAT` | breit auflösbar | Vom Funnel-Runtime nicht verwendet. Rechte, Besitzer und Notwendigkeit separat prüfen; nicht in Functions oder Deploy Previews exponieren. |

`CONTEXT` stellt Netlify selbst bereit und wird nicht als eigenes Secret gesetzt.
Die lokalen CLI-Variablen `DRY_RUN`, `CAMPAIGN` und `LIMIT` gehören nicht in die
Netlify-Runtime-Matrix.

## Meta-Draft

- Kampagne: `DRAFT | KI Readiness | Leads | DE | 0–20 MA | BUDGETFREIGABE OFFEN | 2026-07`
- Anzeigengruppe: `DRAFT | DE | Advantage+ Broad | Unternehmer 0–20 MA | EVENT · START · ZAHLENDER OFFEN`
- Anzeige: `DRAFT | CREATIVE 893c091e… FEHLT | KI Readiness Video | V1`
- Ziel: Leads auf Website, Deutschland, Advantage+ Audience/Placements.
- Zielgruppensignale: Arbeitgeber „Selbstständig“ und Interesse
  „Entrepreneurship (business & finance)“; die tatsächliche 0–20-MA-
  Qualifikation erfolgt im Test.
- Ziel-URL: `https://ki-check.synclaro.de/`
- UTM: `utm_source=meta&utm_medium=paid_social&utm_campaign=ai_readiness_de_prospecting_v1&utm_content={{ad.name}}&utm_term={{placement}}&placement={{placement}}`
- Website-Pixel: `1497847851628194`; Optimierungs-Event `Lead` erst auswählen,
  sobald der Event Manager es nach dem kontrollierten Test anbietet.

## Freigabereihenfolge

1. Pull Requests und beide Deploy Previews fachlich, mobil und rechtlich prüfen.
2. CRM-/Behavior-RLS-Sicherheitslücken schließen, die Berechtigungen für
   `anon`/`authenticated` verifizieren und direkten PII-Zugriff falsifizieren.
3. Supabase-Migration freigeben/anwenden; Server-Schlüssel setzen; den
   gehärteten Rückruf-/E-Mail-Pfad anbinden. Danach einen klar markierten
   Testlead durchführen und Assessment, CRM, Tracking-Consent, Kontakt-Consent,
   normalisierte Kontaktziele, Rückrufnutzung und Outbox atomar prüfen. Zusätzlich
   den AI-Widerruf vor einem neuen Aufruf sowie während eines laufenden Aufrufs
   testen: kein neuer Claim und keine nachträgliche Ergebnisspeicherung.
4. Telegram-Transferfreigabe dokumentieren, erst dann Gate aktivieren und eine
   Testbenachrichtigung über den normalen Leadpfad prüfen. Netlify-Fehleralarm,
   Retry und den Umgang mit einer möglichen Doppelmeldung ebenfalls testen.
5. Meta Pixel/CAPI-Deduplizierung im Event Manager prüfen und `Lead` als
   Conversion-Event im Draft auswählen.
6. Creative hochladen, Wortlautabgleich durchführen, Vorschauen je Placement
   prüfen und Budget/Start/Zahlenden bestätigen.
7. Fremde Meta-Drafts aus der globalen Veröffentlichungsmenge entfernen oder
   separat freigeben. Danach ausschließlich die freigegebenen drei Objekte
   veröffentlichen.
8. Nach dem Start: erster echter Lead end-to-end prüfen; bei Abweichung Kampagne
   pausieren. Keine Kontaktaufnahme ohne protokollierten Rückruf-Consent.

## Verifikation vor Übergabe

- `npm run check`
- `netlify build --context deploy-preview`
- vollständiger Preview-Durchlauf auf Mobil und Desktop ohne Console-Fehler
- Lighthouse: Performance, Accessibility und Best Practices jeweils 100 im
  geprüften Preview; SEO-Preview erwartungsgemäß durch `noindex` begrenzt
- Datenschutz-Repository: `npm run build` mit 0 Fehlern

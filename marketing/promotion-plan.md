# Promotion-Plan: KI-Readiness-Check (ki-check.synclaro.de)

**Erstellt:** 2026-03-31
**Ziel:** Maximale Reichweite im deutschsprachigen Raum, Fokus Handwerk/KMU
**Tool:** ki-check.synclaro.de (11 Fragen, 3 Minuten, Score + 3 Quick Wins, Premium-Report 29 EUR)

---

## Forschungsergebnisse (Bestandsaufnahme)

### 1. Google Business Profile
**Status: NICHT VORHANDEN**
- In der SEO-Analyse vom 19.03.2026 explizit als "NICHT UMGESETZT" markiert
- War bereits als Maßnahme geplant ("Marco, 15 Minuten")
- Kein Eintrag in SUKMS-Wissensbasis oder Desktop-Dateien gefunden
- **Handlungsbedarf: DRINGEND** -- GBP ist Pflicht für lokale B2B-Sichtbarkeit

### 2. Social-Media-Kanäle
| Kanal | Status | Details |
|-------|--------|---------|
| **LinkedIn (Marcos Profil)** | AKTIV (seit 15.02.2026) | 5 Posts/Woche vollautomatisch via Supabase Edge Functions + GPT-5.2 + gpt-image-1. Person URN: urn:li:person:AvyGN72-7i. Token läuft 16.04.2026 ab |
| **LinkedIn Unternehmensseite** | NICHT VORHANDEN | In SEO-Analyse als "existiert nicht / nicht indexiert" markiert. Empfehlung #10 der SEO-Analyse: erstellen |
| **TikTok** | AKTIV -- mittelerfolgreich | 1-2x täglich, organisch. Hat 2 zahlende Kunden generiert (~4.779 EUR/Kunde). Simeon Weltzien (Marketing Manager) startet 16.04.2026 |
| **Instagram** | GEPLANT | Reels-Strategie identisch zu TikTok (ohne Wasserzeichen). Stories geplant 2-3x/Woche. DB-Tabellen existieren bereits (instagram_posts, instagram_comments etc.) |
| **Facebook** | NUR PAID (pausiert) | Meta Ads komplett gestoppt seit D-021 (25.01.2026). Keine organische Präsenz |
| **Twitter/X** | NICHT VORHANDEN | Keine Erwähnungen im gesamten SUKMS |
| **YouTube** | GEPLANT | Entscheidung über Startformat ausstehend (NOW.md) |
| **Podcast** | GEPLANT | Partner-Identifikation bis 31.03. war Ziel |

### 3. AAA-System (Akquise Automation Agent)
**Status: VORHANDEN, aber nicht für KI-Check-Promotion genutzt**
- **Datenbank:** 6 Tabellen (aaa_organisations, aaa_organisation_research, aaa_organisation_emails, aaa_campaigns, aaa_email_templates, aaa_scheduled_emails, aaa_action_suggestions)
- **Inhalt:** 1.313 Organisationen (1.052 Innungen, 104 IHKs, 90 Verbände, 56 HWKs, 10 Gewerkschaften, 1 Arbeitskreis)
- **Research-Funktion:** GPT-5.2 + Google Custom Search für Ansprechpartner, Events, Struktur
- **E-Mail-Kampagnen-System:** Bereits gebaut! `send-campaign.js` mit Resend API, zwei Templates (Handwerker + Multiplikatoren), personalisiert, Rate-Limited
- **Kontakt-Quellen:** crm_contacts (leads, webinar_leads, bestandskunden), crm_customers, aaa_organisations

### 4. Partner-Websites und Verzeichnisse
| Partner | Kontakt | Status | Link-Potenzial |
|---------|---------|--------|---------------|
| **handwerkdigital.de** (Mittelstand-Digital Zentrum Handwerk) | Matthias Indahl | Aktive Kooperation, Marco ist Hauptredner Werkbank 6 | DR 50-70, KEIN Link auf synclaro.de trotz 6+ Sessions |
| **HWK Frankfurt-Rhein-Main** | -- | Webinar 11.03.2026 ("Referent: Synclaro Marco Heer") | KEIN Link auf synclaro.de |
| **HWK Mittelfranken** | Monika Dietrich (Abteilungsleiterin), Tobias, Roland | Kooperation Expansion, 3+ Events. Monika persönlich begeistert | Kein Online-Eintrag für Marco/Synclaro |
| **HWK OWL Bielefeld** | Henning Horstbrink (henning.horstbrink@hwk-owl.de) | KOOPERATION | Noch nicht verifiziert |
| **Bauwirtschaft BW e.V.** | Maximilian Dudenhöfer (dudenhoeffer@bauwirtschaft-bw.de) | Erstgespräch Nov 2024, Follow-up offen | 1.600 Mitgliedsbetriebe |
| **ZDH** | Stefan Blank (blank@zdh.de, 0152 0840 1736) | Schulungskatalog-Kanal aktiv geöffnet | 800-1.000 Berater bundesweit |
| **IHK München** | Daniel Meyer (meyer@ihk.muenchen.de) | Speaker-Anfrage erhalten, 3-4 Events in Planung | -- |
| **Zukunftszentrum Berlin** | -- | Potenzielle Kooperation | BMAS-gefördert |

### 5. Newsletter/E-Mail-Liste
**Status:** 250-300 E-Mail-Adressen vorhanden (Stand: 23.01.2026, Sascha Zöller Gespräch)
**Tool:** Resend API (RESEND_API_KEY in ~/.synclaro/.env)
**Absender:** Marco Heer | Synclaro <marcoheer@synclaro.de>

---

## Promotion-Plan nach Kanälen

### PHASE 1: SOFORT (KW 14, 31.03. -- 04.04.2026)

#### 1.1 LinkedIn-Post (AUTOMATISIERT)
- **Was:** Launch-Post bereits vorbereitet (marketing/linkedin-post.md)
- **Wie:** Insert in linkedin_posts-Tabelle via Supabase REST API (Option A aus linkedin-post.md) ODER automatische Pipeline-Generierung (Option B)
- **Timing:** Mo 01.04. oder Di 02.04., 09:30 CET
- **Wichtig:** Link in den 1. Kommentar (nicht im Post -- killt Reichweite um 60%)
- **Erwartete Reichweite:** 500-2.000 Impressions (abhängig von aktuellem Follower-Stand)
- **Aufwand:** 5 Min (automatisiert) | **Human Action:** Link-Kommentar manuell posten
- **Status:** Template fertig, scheduled_for setzen

#### 1.2 E-Mail-Kampagne an Bestandskontakte (AUTOMATISIERT)
- **Was:** Personalisierte E-Mails an CRM-Kontakte
- **Wie:** `cd ~/projects/synclaro-ki-audit && source ~/.synclaro/.env && DRY_RUN=false CAMPAIGN=handwerker node scripts/send-campaign.js`
- **Template:** marketing/email-handwerker.html (fertig)
- **Betreff:** "Wie KI-ready ist Ihr Betrieb? Kostenloser Check in 3 Minuten"
- **Timing:** Di 01.04., 08:00 CEST (schedule-morning-campaign.sh vorhanden)
- **Erwartete Reichweite:** 250-300 E-Mails, Open Rate 20-30% = 50-90 Öffnungen, CTR 5-10% = 12-30 Klicks
- **Aufwand:** 2 Min (Befehl ausführen) | **Vollautomatisch**

#### 1.3 E-Mail-Kampagne an Multiplikatoren (AUTOMATISIERT)
- **Was:** HWK/IHK/Verbands-Kontakte aus aaa_organisations informieren
- **Wie:** `CAMPAIGN=multiplikatoren DRY_RUN=false node scripts/send-campaign.js`
- **Template:** marketing/email-multiplikatoren.html (fertig)
- **Betreff:** "Neues kostenloses Tool für Ihre Mitgliedsbetriebe: KI-Readiness-Check"
- **Timing:** Mi 02.04. oder Do 03.04., 08:00 CEST (1 Tag nach Handwerker-Kampagne)
- **Erwartete Reichweite:** Bis zu 65 Kontakte mit E-Mail (von 1.313 Orgs haben 65 eine E-Mail). Bei Weiterleitung an Mitgliedsbetriebe: Multiplikator-Effekt 100-500x
- **Aufwand:** 2 Min | **Vollautomatisch**
- **ACHTUNG:** Vor dem Senden prüfen, welche Organisationen tatsächlich eine E-Mail haben und ob die Beziehung warm genug ist

#### 1.4 Blog-Artikel veröffentlichen (SEMI-AUTOMATISCH)
- **Was:** SEO-optimierter Artikel bereits geschrieben (marketing/blog-artikel-ki-check.md)
- **Wie:** In die Blog-Pipeline (synclaro.de/blog) einspeisen oder manuell als Astro-Page deployen
- **Keywords:** "KI Readiness Check Handwerk", "KI im Handwerk", "Digitalisierung Handwerksbetrieb"
- **Timing:** KW 14 (vor oder zeitgleich mit LinkedIn-Post)
- **Erwartete Reichweite:** Langfristig 100-500 organische Besucher/Monat (basierend auf bestehendem Blog-Traffic-Trend: +70% Klicks, +1.126% Impressions in letzter Periode)
- **Aufwand:** 30 Min (Deployment, Formatierung) | **Human Action:** Marco/Simeon

#### 1.5 TikTok-Video (MANUELL)
- **Was:** Kurzes Video (30-45 Sek) im bestehenden TikTok-Stil: "Pass auf, ich hab da was gebaut"
- **Format:** Hook (0-2s: "90% der Handwerker wissen nicht, wo sie bei KI anfangen") → Value (Demo des Checks) → Soft-CTA ("Link in Bio")
- **Timing:** KW 14, idealerweise am selben Tag wie LinkedIn-Post
- **Erwartete Reichweite:** 5.000-15.000 Views (basierend auf bisheriger Performance mit 10k+ Views)
- **Aufwand:** 15 Min Aufnahme + 20 Min Schnitt | **Human Action:** Marco muss filmen
- **BONUS:** Gleiches Video als Instagram Reel crossposten (wenn Account aktiv)

### PHASE 2: KURZFRISTIG (KW 15-16, 07.04. -- 18.04.2026)

#### 2.1 Google Business Profile einrichten (MANUELL)
- **Was:** GBP für "Synclaro IT Service" anlegen
- **Adresse:** Bahnhofstr. 9, 92364 Deining
- **Kategorie:** IT-Dienstleistungen / Unternehmensberatung
- **Beschreibung:** KI-Beratung und Coaching für Handwerk und Mittelstand
- **Link zum KI-Check:** Als "Service" oder "Produkt" hinterlegen
- **Timing:** KW 15 (Marco, 15-30 Minuten einmalig)
- **Erwartete Wirkung:** Lokale Sichtbarkeit, Vertrauenssignal, Google Maps Präsenz
- **Aufwand:** 15-30 Min | **Human Action:** Marco (Verifizierung per Post dauert 5-14 Tage)

#### 2.2 LinkedIn Unternehmensseite erstellen (MANUELL)
- **Was:** Synclaro-Unternehmensseite auf LinkedIn
- **Warum:** Pflicht für B2B-Sichtbarkeit (SEO-Analyse Empfehlung #10), Ankerpunkt nach Vorträgen
- **Inhalt:** Firmenbeschreibung, KI-Check als Featured Service, Mitarbeiter verknüpfen
- **Timing:** KW 15
- **Erwartete Wirkung:** Backlink von linkedin.com, Professionalisierung, Referenzpunkt für Multiplikatoren
- **Aufwand:** 30-45 Min | **Human Action:** Marco

#### 2.3 Persönliche E-Mails an warme HWK-Kontakte (MANUELL)
- **Was:** Individuelle Nachrichten an die 6+ HWKs mit bestehender Beziehung
- **Empfänger (priorisiert):**
  1. **Monika Dietrich** (HWK Mittelfranken) -- begeistert, Expansion. Bitte: Check an Mitgliedsbetriebe weiterleiten
  2. **Henning Horstbrink** (HWK OWL, henning.horstbrink@hwk-owl.de) -- aktive Kooperation
  3. **Tobias + Roland** (HWK Mittelfranken/Nürnberg) -- Events-Kooperation
  4. **Felix Köber** (HWK Gera) -- sehr angetan
  5. **Michael** (HWK Unterfranken) -- positiv
  6. **Daniel Meyer** (IHK München, meyer@ihk.muenchen.de) -- Speaker-Anfrage
- **Pitch:** "Kostenloses Tool für Ihre Mitgliedsbetriebe -- KI-Readiness in 3 Minuten einschätzen. Neutral, anonym, kein Verkaufstrick. Passt perfekt als Vor-/Nachbereitung zu unseren Veranstaltungen."
- **Timing:** KW 15 (nach Multiplikatoren-E-Mail-Kampagne)
- **Erwartete Wirkung:** HOCH -- warme Kontakte mit Multiplikator-Effekt (jede HWK = 1.000-50.000 Mitgliedsbetriebe)
- **Aufwand:** 60-90 Min für alle 6 E-Mails | **Human Action:** Marco oder Phil

#### 2.4 Backlink-Anfragen bei bestehenden Partnern (MANUELL)
- **Was:** Bei handwerkdigital.de und HWK-Websites um Link auf ki-check.synclaro.de bitten
- **Ziel-Websites:**
  1. **handwerkdigital.de** -- 6+ Werkbank-Sessions, Marco als Hauptredner. Link-Wert: sehr hoch (DR 50-70)
  2. **hwk-rhein-main.de** (+ Kassel, Wiesbaden) -- Webinar 11.03.2026. 3 Domains auf einen Schlag
  3. **HWK Mittelfranken** -- Proaktiv Referenten-Eintrag mit Link einreichen
- **Pitch:** "Neben der Referenten-Info bitte auch unser neues kostenloses KI-Readiness-Tool verlinken -- perfekte Ergänzung zu den Workshops"
- **Timing:** KW 15-16
- **Erwartete Wirkung:** 3-5 hochwertige Backlinks, SEO-Boost, Referral-Traffic
- **Aufwand:** 30-60 Min für E-Mails | **Human Action:** Phil (als Prozess-Owner für Backlinks, SEO-Analyse)

#### 2.5 LinkedIn Follow-up Posts (AUTOMATISIERT)
- **Was:** 2-3 weitere KI-Check-bezogene Posts über die bestehende Pipeline
- **Wie:** linkedin-repurpose-blog Edge Function mit dem Blog-Artikel triggern (7 Posts über 3 Wochen)
- **Timing:** Automatisch nach Blog-Publish (Tag 0, 3, 7, 10, 14, 17, 21)
- **Erwartete Reichweite:** Kumuliert 3.000-10.000 Impressions über 3 Wochen
- **Aufwand:** 5 Min (Pipeline triggern) | **Vollautomatisch**

### PHASE 3: MITTELFRISTIG (KW 17-22, April-Mai 2026)

#### 3.1 Integration in Speaker-Events (MANUELL)
- **Was:** KI-Check als festen Bestandteil in alle Vorträge einbauen
- **Geplante Events:**
  - Speed Dating (Robert Falkenstein), 17.02.2026 -- GEPLANT (ggf. schon vorbei)
  - **Nürnberger Digital Festival**, 22.06.2026 -- Marco als Speaker
  - Answerk-Veranstaltungen (Nürnberg + Ansbach) -- Termin TBD
  - IHK München Speaker-Events (3-4 in Planung mit Daniel Meyer)
- **Umsetzung:** QR-Code auf Slides, Handout mit Check-Link, "Machen Sie den Check bevor Sie heute Abend nach Hause gehen"
- **Erwartete Wirkung:** 10-50 Check-Durchführungen pro Event, warme Leads
- **Aufwand:** 10 Min (QR-Code auf Slides) | **Human Action:** Marco

#### 3.2 ZDH-Schulungskatalog (MANUELL)
- **Was:** KI-Check als Teil des Seminar-Angebots im ZDH-Katalog erwähnen
- **Kontakt:** Stefan Blank (blank@zdh.de, 0152 0840 1736)
- **Idee:** "Vor dem Seminar machen alle Teilnehmer den KI-Readiness-Check. Das ist unsere Baseline."
- **Timing:** Für Katalog 2027 (Dezember 2026 Deadline). Für dieses Jahr: bei einem Test-Seminar einbauen
- **Erwartete Wirkung:** 800-1.000 Berater im ZDH-Netzwerk werden auf den Check aufmerksam
- **Aufwand:** In bestehende Kommunikation mit Stefan einbauen | **Human Action:** Phil

#### 3.3 Bauwirtschaft BW weiter verfolgen (MANUELL)
- **Was:** Follow-up bei Maximilian Dudenhöfer mit KI-Check als konkretem Angebot
- **Kontakt:** dudenhoeffer@bauwirtschaft-bw.de
- **Pitch:** "Wir haben jetzt ein kostenloses Tool das Ihren 1.600 Mitgliedsbetrieben sofort einen Mehrwert bietet -- ohne Kosten für den Verband"
- **Erwartete Wirkung:** Zugang zu 1.600 Handwerksbetrieben in BW
- **Aufwand:** 15 Min (E-Mail) | **Human Action:** Phil oder Marco

#### 3.4 Simeon Weltzien Content-Offensive (AB 16.04.2026)
- **Was:** Professionelle TikTok/Instagram Content-Produktion mit KI-Check als CTA
- **Wer:** Simeon Weltzien (Marketing Manager, Start 16.04.2026, 15h/Woche)
- **Format:** Educational Shorts mit Check-Ergebnissen als Hook ("Diesen Score haben 80% der Handwerker")
- **Timing:** Ab KW 16 aufwärts
- **Erwartete Wirkung:** 3-5x Content-Output, professionellere Auswertung, 20.000-50.000 Views/Monat
- **Aufwand:** Teil von Simeons regulärer Arbeit | **Automatisch durch Onboarding**

#### 3.5 SEO-Optimierung des Blog-Artikels (SEMI-AUTOMATISCH)
- **Was:** Blog-Artikel in bestehende SEO-Cluster integrieren
- **Maßnahmen:**
  1. Interne Verlinkung von bestehenden Pillar Pages (/ki-beratung, /prozessautomatisierung) auf den KI-Check-Artikel
  2. Schema.org FAQPage-Markup hinzufügen
  3. URL in Google Search Console einreichen
- **Timing:** KW 17
- **Erwartete Wirkung:** Langfristig organischer Traffic, Keyword-Rankings für "KI Readiness Check Handwerk"
- **Aufwand:** 30-60 Min | **Human Action:** Simeon oder Claude

### PHASE 4: LANGFRISTIG (Q2-Q3 2026)

#### 4.1 Newsletter-Aufbau mit KI-Check als Lead-Magnet
- **Was:** KI-Check-Ergebnis als Trigger für Newsletter-Anmeldung
- **Umsetzung:** Nach dem Check optionales Feld "E-Mail für detaillierte Tipps" (nicht zwingend)
- **Bestehende Liste:** 250-300 Kontakte als Startbasis
- **Ziel:** 500+ Newsletter-Abonnenten bis Q3 2026
- **Erwartete Wirkung:** Wiederkehrender Kontakt, Conversion zu Coaching

#### 4.2 Meta Ads mit KI-Check als Freebie (STATT Webinar)
- **Was:** Bezahlte Werbung auf Facebook/Instagram mit KI-Check als Lead-Magnet
- **Warum:** Sascha Zöller empfahl "Checkliste" / "Quiz/Test" als Zweites Freebie (MARKETING_SALES_MASTER.md, Kap. 9.5) -- der KI-Check ist genau das
- **Budget:** Test mit 5-10 EUR/Tag (Sascha's Goldene Regel)
- **Timing:** Erst nach organischer Validierung (ab KW 20+)
- **Erwartete Wirkung:** CPL deutlich niedriger als beim gescheiterten Webinar-Funnel (da niedrigere Hürde)

#### 4.3 Branchenverzeichnisse und Marktplatz-Profile
- **Was:** Synclaro + KI-Check auf relevanten Plattformen listen
- **Ziel-Plattformen:**
  - wlw.de (Wer liefert was)
  - ProvenExpert.com (Bewertungsplattform)
  - WKO Firmen A-Z (AT)
  - handwerk.com / handwerksblatt.de (Fachportale)
  - Digitale Zukunft Handwerk (Verzeichnis)
- **Timing:** Q2 2026
- **Erwartete Wirkung:** Backlinks + Referral-Traffic + Vertrauenssignale

#### 4.4 Kooperation mit Zukunftszentren
- **Was:** KI-Check als vorbereitendes Tool bei Zukunftszentrum-Workshops anbieten
- **Ziel:** Zukunftszentrum Berlin (BMAS-gefördert, Laufzeit bis 2028)
- **Pitch:** "Teilnehmer machen vor dem Workshop den Check -- so können wir den Workshop auf das tatsächliche Niveau abstimmen"
- **Erwartete Wirkung:** Institutionelle Empfehlung, qualifizierte Leads

---

## Zusammenfassung: Kanäle nach Priorität

| Prio | Kanal | Reichweite | Aufwand | Automatisierbar? | Timing |
|------|-------|------------|---------|-------------------|--------|
| 1 | **LinkedIn-Post** | 500-2.000 Impr. | 5 Min | JA (Pipeline) | Sofort |
| 2 | **E-Mail Handwerker** | 250-300 Mails | 2 Min | JA (send-campaign.js) | Sofort |
| 3 | **E-Mail Multiplikatoren** | 65 Mails + Multiplikator | 2 Min | JA (send-campaign.js) | Sofort |
| 4 | **TikTok-Video** | 5.000-15.000 Views | 35 Min | NEIN (Marco filmt) | Sofort |
| 5 | **Blog-Artikel** | 100-500/Monat (langfristig) | 30 Min | SEMI (Deployment) | KW 14 |
| 6 | **Persönliche HWK-Mails** | 6 HWKs x 1.000-50.000 Betriebe | 90 Min | NEIN | KW 15 |
| 7 | **Google Business Profile** | Lokale Suche | 15-30 Min | NEIN (einmalig) | KW 15 |
| 8 | **LinkedIn Unternehmensseite** | B2B-Signal | 30-45 Min | NEIN (einmalig) | KW 15 |
| 9 | **Backlink-Anfragen** | SEO-Boost + Referral | 30-60 Min | NEIN | KW 15-16 |
| 10 | **LinkedIn Blog-Repurpose** | 3.000-10.000 Impr. | 5 Min | JA (Pipeline) | KW 14-17 |
| 11 | **Speaker-Event-Integration** | 10-50/Event | 10 Min | NEIN | Laufend |
| 12 | **Simeon Content-Offensive** | 20.000-50.000 Views/Mo | -- | SEMI (Simeon) | Ab 16.04. |
| 13 | **ZDH-Schulungskatalog** | 800-1.000 Berater | 15 Min | NEIN | KW 17+ |
| 14 | **Meta Ads (Test)** | Skalierbar | Budget | JA (nach Setup) | KW 20+ |

---

## Automatisierbar vs. Human Action

### Vollautomatisch (sofort ausführbar)
1. LinkedIn-Post via Pipeline (Supabase INSERT)
2. E-Mail-Kampagne Handwerker (send-campaign.js)
3. E-Mail-Kampagne Multiplikatoren (send-campaign.js)
4. LinkedIn Blog-Repurpose (7 Posts über 3 Wochen)

### Semi-automatisch (einmaliger manueller Anstoß)
5. Blog-Artikel deployen (Astro + Netlify)
6. SEO-Optimierung (interne Links, Schema.org)

### Manuell (Human Action erforderlich)
7. TikTok-Video drehen (Marco)
8. Google Business Profile anlegen (Marco, 15 Min)
9. LinkedIn Unternehmensseite erstellen (Marco, 30 Min)
10. Persönliche E-Mails an HWK-Kontakte (Marco/Phil)
11. Backlink-Anfragen (Phil)
12. Speaker-Slides anpassen (Marco)

---

## Erwarteter Gesamt-Impact (konservativ)

| Zeitraum | Geschätzte Check-Durchführungen | Quelle |
|----------|--------------------------------|--------|
| Woche 1 (KW 14) | 30-80 | LinkedIn + E-Mail + TikTok |
| Woche 2-3 (KW 15-16) | 20-50 | HWK-Mails + Blog-SEO + LinkedIn Repurpose |
| Monat 2 (Mai) | 50-150/Monat | Organisch + Simeon-Content + Events |
| Monat 3+ (Juni+) | 100-300/Monat | SEO + Multiplikatoren + Ads (optional) |

**Premium-Report-Conversion (29 EUR):** Bei 2-5% Conversion = 1-4 Reports in Woche 1, 5-15/Monat ab Monat 3.
**Coaching-Leads:** 1-3% der Check-Absolventen werden zum Discovery Call -- bei 200 Checks/Monat = 2-6 warme Leads.

---

## Offene Fragen / Entscheidungen

1. **Multiplikatoren-Kampagne:** Sollen alle 65 Orgs mit E-Mail angeschrieben werden, oder nur die "warmen" (6-8 mit bestehender Beziehung)?
2. **Instagram:** Soll parallel zu TikTok gestartet werden oder auf Simeon warten (16.04.)?
3. **Meta Ads Budget:** Wann organische Validierung als ausreichend betrachten für Paid-Test?
4. **Newsletter-Opt-in:** Soll im KI-Check ein E-Mail-Feld eingebaut werden (nach Ergebnis)?
5. **LinkedIn Token:** Läuft am 16.04.2026 ab -- Refresh-Mechanismus prüfen (linkedin-refresh-token Edge Function)

---

*Erstellt basierend auf SUKMS-Wissensbasis, bestehenden Marketing-Assets und CRM-Daten.*

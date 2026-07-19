# Meta-Kampagnenentwurf – Synclaro AI Readiness

Stand: 19.07.2026 · **als Entwurf vorbereitet, nicht veröffentlicht**

Dieses Dokument ist die Freigabevorlage für den Meta Ads Manager. Der sichtbare
Draft wurde am 19.07.2026 geprüft und über seine drei exakten Objekt-IDs
eindeutig identifiziert. Die sichtbaren Namen tragen noch den älteren
V2-Namen. Der nachgeschärfte V2-Primärtext, die Überschrift, Beschreibung,
Ziel-URL, die bisherige namensbasierte UTM-Vorlage, der aktive Website-Pixel
und das Optimierungsereignis `Lead` sind im Entwurf gesetzt. Die unten
definierte objektgenaue ID-Vorlage ist noch nicht in Meta übernommen.
Zusätzlich wurde „Inhaber von
Kleinunternehmen“ als unverbindliches Advantage+-Seed-Signal ergänzt. Es wurde
nichts veröffentlicht. Die drei lokalen V2-Rasterdateien sind auf „8 adaptive
Fragen“ korrigiert und visuell geprüft. Das wieder bereitgestellte Video wurde
technisch und inhaltlich geprüft, ist in der Rohfassung aber noch nicht
uploadfertig. Der Creative-Wizard kann erst nach freigeschaltetem Dateiupload
mit den freigegebenen Dateien abgeschlossen werden.
Nicht sichtbare oder nachträglich geänderte Werte gelten nicht als freigegeben;
unmittelbar vor dem Publish müssen alle drei Ebenen erneut gegen diesen Entwurf
geprüft werden.

## Tatsächlicher Draft-Stand

| Bereich | Read-only-Befund | Noch offen |
|---|---|---|
| Exakte Draft-Objekte | Kampagne `120251380526880206` · Anzeigengruppe `120251380526890206` · Anzeige `120251380526870206` | Nur diese drei IDs bearbeiten und später in den Publish-Dialog aufnehmen. |
| Sichtbare Namen | Kampagne `DRAFT | KI Readiness | Leads | DE | 0–20 MA | CBO 25 EUR/Tag | FREIGABE OFFEN | V2` · Anzeigengruppe `DRAFT | DE | Advantage+ Broad | ICP Solo/Unternehmer 0–20 MA | OPT Lead EVENT OFFEN | V2` · Anzeige `DRAFT | STATIC V2 | KI Readiness | 4x5 + 1x1 + 9x16 | FREIGABE OFFEN` | Nach dem echten Lead-Testevent den Anzeigengruppennamen aktualisieren. Für den geplanten Vergleich bleibt diese Static-Anzeige bestehen; das finalisierte Video erhält eine eigene Anzeige im selben Adset. |
| Ziel / Kaufart | Leads · Auktion | Beibehalten. |
| Conversion-Ort / Performance Goal | Website · Conversions maximieren | Beibehalten. |
| Automatisierung | Advantage+ Kampagnenbudget, Audience und Placements | Creative-Adaptionen in jeder Vorschau kontrollieren. |
| Budget | 25 € pro Tag im Draft | Geschäftsführung bestätigt Betrag und Kostenlimits. |
| Zielgruppe | Deutschland · 18–65+ · alle Geschlechter | Beibehalten; nicht künstlich verengen. |
| Audience-Signale | Interesse „Unternehmertum“, Arbeitgeber „Selbstständig“ und Verhalten „Inhaber von Kleinunternehmen“ | Nur als Advantage+-Vorschläge, 0–20 MA über Creative/Test qualifizieren. |
| Pixel | Aktiver Datensatz `Website`, ID `1497847851628194`, im Adset ausgewählt | Richtigen Business Manager/Dataset vor Publish nochmals bestätigen. |
| Optimierungs-Event | Standardevent `Lead` im Adset ausgewählt; Meta warnt erwartungsgemäß vor fehlender Aktivität in den letzten 14 Tagen | Consent-basiertes, dedupliziertes Pixel/CAPI-Testevent senden und im Events Manager prüfen, bevor der Entwurf veröffentlichbar ist. |
| EU-Werbetreibender / Zahlender | Aktuell sichtbar: `Synclaro.de` / `Johannes Jaegers` – falsch | Vor Publish auf `Synclaro.de` / `Marco Heer` korrigieren. Marco hat am 19.07.2026 bestätigt, dass er für Synclaro per Kreditkarte zahlt. |
| Anzeigen-Copy im Wizard | V2-Primärtext, Überschrift `Wie KI-ready ist Ihr Unternehmen?`, Beschreibung `Kostenloser Score + 90-Tage-Fahrplan.`, CTA `Mehr dazu`, Ziel-URL und die ältere namensbasierte UTM-Vorlage gesetzt | Die UTM-Vorlage auf die unten dokumentierten Objekt-ID-Makros umstellen und danach jede Placement-Vorschau prüfen. Keine der fünf automatisch vorgeschlagenen KI-Textvarianten ist ausgewählt. |
| Creative-Upload | Image-Ad-Wizard vorbereitet; die lokalen 4:5-, 1:1- und 9:16-Dateien sind auf „8 adaptive Fragen“ korrigiert und geprüft. Das 31,53-sekündige 9:16-Video ist wieder vorhanden und geprüft. Der direkte lokale Upload wurde von der Chrome-Erweiterung mit `Not allowed` blockiert. | Browser-Verbindung und lokalen Dateizugriff bewusst freigeben. Static ausschließlich aus den drei V2-PNGs bestücken. Video erst nach Untertiteln, Synclaro-Kennung/Endkarte und konsistenter Zeitangabe hochladen. |

## Kampagnenziel und Funnel-Logik

- Meta-Ziel: **Leads**.
- Conversion-Ort: **Website**.
- Ziel-URL: `https://ki-check.synclaro.de/`.
- Optimierung zu Beginn: Standardevent **`Lead`**, weil es nach erfolgreicher,
  atomarer Speicherung eines vollständigen, ICP-passenden Tests entsteht und
  früher als eine Terminbuchung ausreichend Lernsignale liefern kann.
- Sekundäre Qualitätsconversion: **`Schedule`** nach einer tatsächlich
  verifizierten Cal-Buchung. Nicht auf CTA-Klick und nicht bloß auf
  Kalenderansicht feuern.
- Primäre gewünschte Geschäftswirkung: Die Person sieht zuerst ihren
  hochwertigen Score und bucht anschließend selbst einen kostenlosen Call mit
  Marco.
- Sekundäre Wirkung: freiwillige, per Double-Opt-in bestätigte Newsletter-
  Liste für nützliches E-Mail-Nurturing und angemessenes Retargeting.
- Kein Kaltanruf, kein Setter-Prozess und keine sonstige Werbeansprache allein
  aufgrund des CRM-Eintrags.
- Keine Awareness-/Reichweiten- oder Traffic-Kampagne als Ersatz. Reichweite
  ist nur dann wertvoll, wenn sie qualifizierte Testabschlüsse erzeugt.

## ICP

Entscheiderinnen und Entscheider in Deutschland, die selbstständig sind oder
ein kleines B2B-Unternehmen mit 0–20 Mitarbeitenden führen:

- Solo-Selbstständige, Inhaberinnen/Inhaber und Geschäftsführungen;
- branchenoffen – ausdrücklich nicht nur Handwerk;
- operativ nah am Tagesgeschäft und mit wiederkehrender Administration,
  Medienbrüchen, Wissensengpässen oder unklarem KI-Einstieg;
- grundsätzlich offen für Produktivitäts- und Qualitätsverbesserung, aber ohne
  zwingend technisches Vorwissen;
- bereit, etwa vier Minuten in eine belastbare Selbsteinschätzung zu
  investieren.

Die Größenklasse 0–20 Mitarbeitende wird nicht zuverlässig über ein einzelnes
Meta-Interesse erzwungen. Creative, Copy und die erste Testfrage
selbstqualifizieren; die Kampagnenauswertung segmentiert anschließend nach
`employee_band`. Nicht priorisiert sind große Unternehmen, reine Beschäftigte
ohne Entscheidungsmandat, private KI-Unterhaltung und Personen auf der Suche
nach einer allgemeinen Tool-Liste.

Der kostenlose Test selbst besitzt bewusst kein hartes 20-Mitarbeitenden- oder
Rollen-Gate: Auch eine größere Firma oder eine vorbereitende Fachperson erhält
das versprochene Ergebnis, statt nach vier Minuten abgewiesen zu werden. Das
CRM kennzeichnet nur Inhaber/Geschäftsführung mit Solo bis 20 Mitarbeitenden als
`lead_fit=true`. Nur ein solcher Abschluss darf bei gültigem Marketing-Consent
als dedupliziertes Meta-`Lead`-Event ausgegeben werden. Consent-basierte Starts
und Testabschlüsse außerhalb des ICP bleiben separate Custom Events und
verunreinigen das Optimierungsziel nicht. Verifizierte Terminbuchungen werden
zusätzlich als `Schedule` ausgewertet.

## Empfohlene Struktur

| Ebene | Sollwert |
|---|---|
| Kampagne | `DRAFT | KI Readiness | Leads | DE | 0–20 MA | CBO 25 EUR/Tag | FREIGABE OFFEN | V2` |
| Kaufart | Auktion |
| Budget | Vorschlag 25 € pro Tag; vor Publish durch Geschäftsführung bestätigen |
| Gebot | Höchstes Volumen / Conversions maximieren; keine Cost-Cap ohne belastbare Ausgangsdaten |
| Anzeigengruppe | `DRAFT | DE | Advantage+ Broad | ICP Solo/Unternehmer 0–20 MA | OPT Lead EVENT OFFEN | V2` |
| Ort / Sprache | Deutschland; Deutsch |
| Alter | 18–65+ wie im geprüften Draft; breit belassen, sofern Daten später keine sachliche Änderung belegen |
| Audience | Advantage+ beziehungsweise breit; vorhandene Vorschläge „Unternehmertum“ und Arbeitgeber „Selbstständig“ beibehalten. Weitere Signale nur als Vorschläge, nicht als enge Ausschlusslogik. |
| Ausschlüsse | Bestehende Kundschaft sowie bereits bestätigte Leads/Termine nur mit zulässiger Custom-Audience-Grundlage; mindestens jüngste `Lead`-/`Schedule`-Konvertierende gegen Doppelakquise ausschließen |
| Placements | Advantage+ nur nach manueller Vorschau aller Placements. Unbrauchbare Auto-Crops oder Texteingriffe ausschließen. Ohne akzeptable 9:16-Adaption Stories/Reels nicht blind freigeben. |
| Conversion | Pixel `1497847851628194`; Optimierungsereignis `Lead` erst nach dem consent-basierten Events-Manager-Test auswählen |
| Start | Zukünftiger Zeitpunkt erst nach End-to-End-Freigabe; keine alte Draft-Startzeit übernehmen |
| Ende | Kein fixes Ende für den Basistest; Budget- und Qualitätsgrenzen vorab festlegen |

Meta kann Bezeichnungen und verfügbare Attributionseinstellungen ändern. Im
Publish-Dialog die aktuell angebotene Einstellung prüfen und dokumentieren,
statt einen alten Default ungeprüft zu übernehmen.

Offizielle Meta-Referenzen für die Abnahme:
[Website-Form unter dem Leads-Ziel](https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-forms),
[Advantage+ Leads](https://www.facebook.com/business/ads/meta-advantage-plus/leads),
[Advantage+ Audience](https://www.facebook.com/business/ads/meta-advantage-plus/audience)
und [Advantage+ Placements](https://www.facebook.com/business/ads/meta-advantage-plus/placements).

## Event-Leiter

| Event | Quelle | Bedeutung | Nutzung |
|---|---|---|---|
| `PageView` | Pixel | Landingpage nach Marketing-Consent geladen | Diagnose |
| `StartAIReadinessTest` | Pixel, Custom Event | Test gestartet | Funnel-Diagnose |
| `AIReadinessCompleted` | Pixel, Custom Event | Bewertungsfragen abgeschlossen, Kontaktphase beginnt | Funnel-Diagnose |
| `Lead` | Pixel + CAPI, gemeinsame `event_id` | ICP-passender Test von Inhaber/Geschäftsführung mit 0–20 Mitarbeitenden atomar gespeichert | Primäre Adset-Optimierung |
| `Schedule` | Nur CAPI nach verifiziertem Cal-Webhook | Tatsächlicher Marco-Termin gebucht | Sekundäre Qualitätsconversion |

Ohne Marketing-Consent werden diese Meta-Ereignisse nicht gesendet. Meta
erhält keine Antworten, Firma, Score oder offene Texte. Erst wenn `Schedule`
über einen längeren Zeitraum genügend stabile, korrekt zugeordnete Conversions
liefert, darf ein separater Test zur Optimierung auf `Schedule` erwogen werden;
die ursprüngliche Lead-Kampagne wird nicht ohne Vergleich umgestellt.

## Creative V2

Vorhandene, lokal geprüfte statische Varianten:

- Feed 4:5, PNG:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-4x5-v2.png`
- Feed 4:5, editierbare SVG-Quelle:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-4x5-v2.svg`
- Quadrat 1:1, PNG:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-1x1-v2.png`
- Quadrat 1:1, editierbare SVG-Quelle:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-1x1-v2.svg`
- Stories/Reels 9:16, PNG:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-9x16-v2.png`
- Stories/Reels 9:16, editierbare SVG-Quelle:
  `/Users/marcoheer/Desktop/Synclaro/werbemittel/ai-readiness/synclaro-ai-readiness-meta-9x16-v2.svg`

Creative-Versprechen: „Wie bereit ist Ihr Unternehmen für echten KI-Nutzen?“,
„8 adaptive Fragen“, „ca. 4 Min.“, „konkrete nächste Schritte“, kostenlos,
für Selbstständige, Inhaber und kleine Unternehmen mit 0–20 Mitarbeitenden,
branchenoffen. Das entspricht dem Funnelvertrag.

Die ältere Datei `synclaro-ai-readiness-meta-4x5-upload.jpg` sowie sämtliche
V1-Dateien bleiben ausdrücklich vom Upload ausgeschlossen; sie enthalten
veraltete Aussagen zum Test.

Das Video
`/Users/marcoheer/Downloads/893c091eaeed43b1bdd03d6b623120b4.MOV`
liegt wieder vor: 31,53 Sekunden, 1080 × 1920, 9:16, 60 fps, HEVC/AAC. Es hat
die stärkere persönliche Werbeidee: direkte Hook, Marco als sichtbarer
Absender, der Beleg „über 200 Betriebe“ und ein kostenloser Test als klarer
nächster Schritt. Die Rohfassung ist noch nicht uploadfertig:

- keine sichtbaren Untertitel für tonlose Nutzung;
- keine Synclaro-Kennung und keine klare Endkarte;
- gesprochene Zeitangabe „3 Minuten“ gegenüber „ca. 4 Min.“ im tatsächlichen
  Funnel;
- die Aussage „über 200 Betriebe“ muss intern belegbar bleiben.

Nach einem kleinen, inhaltlich unveränderten Finish wird das Video als
Hauptanzeige eingesetzt. Static V2 bleibt als einzige Challenger-Anzeige im
gleichen Adset. Copy, Zielgruppe und Ziel-URL bleiben gleich, damit nur die
Creative-Wirkung verglichen wird. Bewertet wird auf qualifizierte `Lead`- und
`Schedule`-Ergebnisse, nicht auf günstige Klicks.

## Anzeigen-Copy V2

**Primärtext**

> Viele Unternehmen testen KI – ohne zu wissen, ob Prozesse, Daten und
> Verantwortlichkeiten dafür bereit sind. Der kostenlose Synclaro AI Readiness
> Test zeigt Ihnen in ca. 4 Minuten Ihren nachvollziehbaren Score, den größten
> Hebel, drei klare Prioritäten und einen konkreten 90-Tage-Fahrplan. Für
> Selbstständige, Inhaber und Unternehmen bis 20 Mitarbeitende – branchenoffen.

**Headline**

> Wie KI-ready ist Ihr Unternehmen?

**Beschreibung**

> Kostenloser Score + 90-Tage-Fahrplan.

**Meta-CTA**

> Mehr dazu

Der Ad-CTA führt bewusst in den kostenlosen Test, nicht direkt in den Call. Der
Call wird erst nach dem gelieferten Ergebnis als sinnvoller nächster Schritt
angeboten. Keine unbelegten Einspar-, Umsatz- oder Erfolgsgarantien verwenden.

## URL und Attribution

Soll-Ziel inklusive noch einzutragender Vorlage:

```text
https://ki-check.synclaro.de/?utm_source=meta&utm_medium=paid_social&utm_campaign=ai_readiness_de_prospecting_v1&utm_id={{campaign.id}}&utm_term={{adset.id}}&utm_content={{ad.id}}&placement={{placement}}
```

Damit bleiben Kampagne, Anzeigengruppe und Anzeige auch nach Umbenennungen
objektgenau zuordenbar; `placement` bleibt separat erhalten. Vor Publish muss
Meta alle vier Makros in einer echten Anzeigenvorschau auflösen. Die Landingpage
entfernt Trackingparameter nach der Erfassung aus der sichtbaren Browser-URL
und persistiert Attribution nur mit Marketing-Consent.

`marketing/promotion-plan.md` beschreibt einen früheren Handwerks-/Premium-
Ansatz und ist keine Freigabequelle für diese Kampagne. Maßgeblich ist
ausschließlich dieses Dokument.

## Messplan

Nicht nur CPM oder Reichweite bewerten. Die entscheidende Kette lautet:

1. Ausgehende Klickrate und Landingpage-Aufrufe;
2. Startquote des Tests;
3. Abschlussquote der acht adaptiven Kernfragen;
4. Quote von Kontaktphase zu gespeichertem, ICP-passendem `Lead`;
5. Kosten pro `Lead`, getrennt nach Solo / 1–5 / 6–10 / 11–20;
6. freiwillige Newsletter-Auswahl und tatsächliche DOI-Bestätigung;
7. Klickrate vom Ergebnis zur Gesprächsvorbereitung sowie Abschlussquote der
   zwei Handoff-Fragen bis zur Kalenderansicht;
8. verifizierte `Schedule`-Rate und Kosten pro gebuchtem Call;
9. später: Show-up- und Opportunity-Qualität aus dem CRM, ohne sie voreilig an
   Meta zu senden.

Vor Start verbindlich festlegen: maximales Tagesbudget, akzeptabler CPL,
akzeptable Kosten pro `Schedule`, Mindestqualität eines Leads und harte
Stopgründe. Sofort pausieren bei defektem Tracking, fehlerhafter Landingpage,
falschem Ziel, Datenschutzabweichung oder unbeabsichtigter Veröffentlichung
fremder Drafts.

## Publish-Checkliste

- [ ] Objective `Leads`, Conversion-Ort `Website`, Event `Lead`.
- [ ] Richtiger Ad Account, Business Manager, Pixel/Dataset und Zahlender.
- [ ] Im Meta-Entwurf steht `Synclaro.de` / `Marco Heer` als
  EU-Werbetreibender/Zahlender; `Johannes Jaegers` ist vollständig entfernt.
- [ ] Deutschland, branchenoffener ICP, keine ungewollte enge
  Interessenbeschränkung.
- [ ] 25-€-Tagesbudget oder abweichend schriftlich freigegebener Betrag.
- [ ] Zukünftige Startzeit; keine automatische rückwirkende Draft-Zeit.
- [ ] Ziel-URL und UTM in Vorschau funktionieren.
- [ ] Static 4:5 und 1:1 in jedem vorgesehenen Placement sauber; automatische
  Meta-Optimierungen verändern weder Aussage noch Marke.
- [ ] Video nur nach geprüften Untertiteln, Synclaro-Kennung/Endkarte und einer
  zum Funnel passenden Zeitangabe verwenden; Roh-MOV nicht hochladen.
- [ ] Video-Hauptanzeige und Static-Challenger nutzen identische Copy,
  Zielgruppe und Ziel-URL; Gewinner nach qualifiziertem `Lead`/`Schedule`,
  nicht nach Klickpreis bestimmen.
- [ ] Primärtext, Headline, Beschreibung und CTA entsprechen dieser Freigabe.
- [ ] Pixel/CAPI-`Lead` dedupliziert; Cal-CAPI-`Schedule` verifiziert.
- [ ] Consent-basiertes `Lead`-Testevent im Events Manager empfangen; danach
  `Lead` im Draft tatsächlich als Optimierungs-Event gesetzt.
- [ ] Bestehende Kontakte/Conversions sind nur mit gültiger Grundlage
  ausgeschlossen; keine unzulässige Liste hochgeladen.
- [ ] In „Überprüfen und veröffentlichen“ befinden sich ausschließlich diese
  freigegebene Kampagne, Anzeigengruppe und Anzeigen.
- [ ] Geschäftsführerfreigabe in `LAUNCH_READINESS.md` steht auf `GO`.

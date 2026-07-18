# ARCHIVIERT — KI-Readiness-Check v3 — Neubau-Spezifikation (Fable 5)

> **Nicht mehr umsetzen.** Diese historische Handwerks-Spezifikation wurde am
> 18.07.2026 durch den branchenoffenen Lead-Funnel ersetzt. Der aktuelle,
> prüfbare Stand und alle Launch-Gates stehen in
> [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md).

**Autor:** SPRINT-11F (Fable 5) · **Datum:** 05.07.2026 · **Branch:** `neubau/fable-v3`
**Auftrag:** Marco, 05.07.: Komplett-Überarbeitung Design + Inhalt, 3/10 → mindestens 9/10. „Leute müssen das Gefühl haben, dass die Zeit vergeht wie nichts. Optisch eine absolute Mega-Hammer-Seite."
**Gates:** Kein Prod-Deploy ohne Marco-Abnahme. Score-Card nur Richtung 2 (Benchmark/Vergleich), kein Challenge-Zusatz.

---

## 1. Diagnose des Ist-Zustands (warum 3/10)

1. **Latenz-Löcher töten den Sog.** Nach jeder Fragerunde 5–15 s blockierender Spinner („Bitte warten Sie einen Moment"). Genau an den Stellen, wo Momentum entstehen müsste, steht der Nutzer vor einer Sanduhr.
2. **Formular-Feeling.** 3–5 Fragen untereinander pro Seite = Behördenfragebogen. Keine Einzelmomente, kein Rhythmus, keine Belohnung pro Antwort.
3. **Generisches Design.** Warm-cream Tailwind-Template, Emoji-Icons (🆓🔒🎯), kein einziges Bild, keine Marken-Identität. Nichts, woran man sich erinnert.
4. **Ergebnis ohne Substanz.** 4 Balken + 3 Textkarten. Das Landing verspricht „Benchmarking" — die Ergebnisseite liefert keinen einzigen Vergleichswert. Kein teilbares Artefakt (nur Text-Link).
5. **Unehrlicher Fortschritt.** Prozentzahl springt LLM-gesteuert, „Schritt 2" ohne Kontext, keine Antwort auf „wie lange noch?".
6. **Technische Altlasten.** Tailwind-CDN (Prod-Warnung, FOUC), Modell gpt-5.4 (veraltet), kein Fallback wenn die KI-API hakt → Check bricht hart ab.

## 2. Konzept-These

> **Aus einem Formular wird ein Betriebs-Prüfstand.**

Die Leitmetapher ist die **Diagnose in der Meisterwerkstatt**: ein Messprotokoll, das den Betrieb durchleuchtet — präzise, ehrlich, mit Messwerten statt Marketing-Floskeln. Der Nutzer legt seinen Betrieb „auf den Prüfstand" und bekommt am Ende ein Messergebnis mit Benchmark, Hebel-Analyse und Fahrplan.

Drei Sog-Prinzipien:
1. **Null sichtbare Latenz innerhalb einer Phase.** Eine Frage pro Screen; die Fragen einer Runde sind bereits geladen → jede Antwort führt **sofort** zur nächsten Frage. Tap → weiter. Tap → weiter.
2. **Wartezeit wird zu Erkenntnis.** Zwischen den Phasen kein Spinner, sondern ein **Insight-Interstitial**: eine personalisierte Beobachtung der KI zur bisherigen Antwortlage plus ein Branchen-Benchmark-Fakt. Der Nutzer liest gerade etwas über sich, während im Hintergrund die nächste Runde generiert wird. Zusätzlich **Prefetch**: die nächste Runde wird schon angefordert, sobald die vorletzte Frage der laufenden Runde beantwortet ist.
3. **Dramaturgie auf ein Finale hin.** Der Score wird nicht angezeigt, er wird **enthüllt**: Mess-Sequenz → Odometer-Score → Benchmark-Einordnung → Hebel → Fahrplan → teilbare Karte.

## 3. Informationsarchitektur & Dramaturgie (4 Akte)

### Akt 0 — Landing (Dark, monumental, 1 Ziel: Start)
- **Hero:** Vollflächig dunkel, KI-generiertes Werkstatt-Bild (fotoreal, orange Lichtakzente) mit langsamem Ken-Burns. Headline: **„Wo steht Ihr Betrieb wirklich?"** Subline: „Der KI-Betriebs-Check für das Handwerk: 5 Minuten, ein ehrliches Messergebnis — mit Vergleich zu Betrieben Ihrer Branche." CTA: **„Check starten — kostenlos"** + Meta-Zeile „ca. 5 Min · Sofort-Ergebnis · keine E-Mail nötig".
- **Mess-Leiste (Proof statt Partikel):** 3 Kennwerte im Mono-Stil: `200+ Betriebe analysiert` · `Ø 42/100 Ausgangswert` · `10–20 Std./Monat typisches Sparpotenzial`.
- **So läuft die Messung:** 3 Schritte als Diagnose-Protokoll (01 Steckbrief 30 Sek · 02 Analyse: KI stellt Fragen, die sich Ihrem Betrieb anpassen · 03 Messergebnis mit Benchmark + Fahrplan).
- **Was Sie mitnehmen:** 4 Karten — Score & Benchmark · Zeitfresser-Analyse · 90-Tage-Fahrplan · teilbare Ergebnis-Karte.
- **Vertrauens-Block:** Marco/Synclaro in einem Satz (Inhaber zu Inhaber, 67 % Handwerkskunden), DSGVO-Zeile (keine E-Mail-Pflicht, keine Weitergabe), FAQ-3-Zeiler (Warum kostenlos? Weil der Check unser Schaufenster ist.).
- **Abschluss-CTA** + Footer (Impressum/Datenschutz wie gehabt).

### Akt 1 — Steckbrief (≤ 30 Sekunden, 5 Taps)
One-per-Screen, große Tap-Chips, keine Tastatur nötig außer optional Vorname:
1. Branche (12 Chips)
2. Mitarbeiterzahl (5 Chips)
3. Rolle (5 Chips)
4. Jahresumsatz (5 Chips + „keine Angabe")
5. Vorname (optional, Skip-Link prominent)
Nach Tap 5: **Interstitial „Messung startet"** — zeigt sofort einen statischen Branchen-Fakt aus dem lokalen Benchmark-Datensatz (z. B. „SHK-Betriebe Ihrer Größe starten im Schnitt bei 39/100 — die Spitze liegt bei 81."), während Runde 1 generiert wird.

### Akt 2 — Die Messung (3 Phasen à 3–4 Fragen, adaptiv)
- **Phase 1 · „Ihr Betrieb heute"** — IST: Prozesse, Werkzeuge, bestehende KI-Nutzung.
- **Phase 2 · „Wo Zeit verloren geht"** — bohrt adaptiv dort, wo Phase 1 Schwächen zeigt.
- **Phase 3 · „Ihr KI-Hebel"** — Ziele, Budgetrahmen, Bereitschaft, größter Wunsch.
- UI: Phasen-Anzeige `Phase 2/3 · Frage 2 von 4` + segmentierte Fortschrittsleiste (ehrlich, ein Segment pro Frage) + „noch ca. 2 Min". Fragen erscheinen mit präziser Slide-Animation; Tap-Antworten springen automatisch weiter (350 ms Bestätigungs-Puls), Freitext/Multi-Select mit „Weiter"-Button. Zurück-Pfeil dezent oben links.
- **Zwischen den Phasen:** Insight-Interstitial (siehe 5.2) — personalisierter KI-Befund der letzten Phase + Benchmark-Fakt + Phasen-Vorschau. Mindest-Anzeigedauer 2,5 s (damit es nie „wegblitzt"), maximal bis Prefetch fertig.
- **Resume:** Antworten in localStorage; bei Rückkehr „Weitermachen, wo Sie waren?".

### Akt 3 — Das Messergebnis (Reveal-Dramaturgie)
1. **Mess-Sequenz (maskiert die analyze-Latenz, ~8–12 s):** Vollbild „Messprotokoll wird erstellt" — die 4 Kategorien rasten nacheinander sichtbar ein (Digitalisierung ✓ … KI-Einsatz ✓), Mono-Ticker mit echten Zwischenschritten. Kein generischer Spinner.
2. **Score-Reveal:** Gauge/Tacho-Element (Halbkreis, Nadel + Odometer-Zahl 0→Score), Level-Label, ein Satz Gesamteinschätzung mit Vorname.
3. **Benchmark-Block (Herzstück, Richtung 2):** „Besser als **62 %** vergleichbarer Betriebe" + Verteilungskurve mit Marker „Ihr Betrieb" vs. „Branchenschnitt" vs. „Top 10 %". Pro Kategorie Balken mit Branchen-Ø-Marker.
4. **Zeit-Hebel:** „Geschätztes Potenzial: **14 Std./Monat**" mit 1-Satz-Herleitung aus den Antworten.
5. **Top-3-Empfehlungen:** Karten mit Aufwand/Wirkung-Tags, Analyse, anonymisiertem Praxisbeleg, konkretem erstem Schritt.
6. **90-Tage-Fahrplan:** 3 Etappen als Zeitstrahl (Tage 1–30, 31–60, 61–90).
7. **Score-Card teilen (Richtung 2):** Vorschau der Canvas-Karte + „Karte teilen" (Web Share API mit Datei) / „Herunterladen" / Text-Shares (LinkedIn, WhatsApp, E-Mail, Link kopieren).
8. **Übergabe an Synclaro:** dunkler CTA-Block wie bisher inhaltlich (Gruppencoaching + cal.com/marcoheer/ki-erstgespraech), Ton nüchtern-ehrlich, „Kein Verkaufsdruck"-Zeile bleibt.

## 4. Design-System „Prüfstand"

**Farben (CSS Custom Properties):**
- `--bg0 #0B0B0C` (Canvas) · `--bg1 #131316` (Sektion) · `--card #1A1A1E` · `--line rgba(255,255,255,.08)`
- `--ink #F4F3F0` · `--ink2 #A8A6A0` · `--ink3 #6E6C66`
- `--accent #FF4F00` (NUR Akzent: CTAs, Marker, Nadel, aktive Zustände) · `--accent-soft rgba(255,79,0,.12)`
- Score-Ampel: `--bad #E5484D` · `--mid #F5A524` · `--good #46A758` (gedimmt, nie neon)
- Heller Kontrast-Abschnitt auf der Landing erlaubt (Papier-Weiß `#F7F5F1`) für das „Protokoll"-Gefühl — Wechsel dunkel/hell als Rhythmus.

**Typografie:**
- Display: **Archivo** (700/800/900, expanded wo verfügbar) — industriell, laut, ingenieurhaft.
- Text: **Inter** (400/500/600).
- Messwerte/Labels/Ticker: **IBM Plex Mono** (500) — alles was Zahl, Einheit oder Protokoll ist, läuft in Mono mit `tabular-nums`. Das ist der Signature-Move des Designs.
- Skala clamp-basiert; H1 Landing `clamp(2.6rem, 7vw, 5.5rem)`, Fragen `clamp(1.5rem, 4vw, 2.4rem)`.

**Komponenten:**
- **Tap-Chip:** dunkle Karte, 1px `--line`, Hover: Kante orange, Auswahl: orange Kante + `--accent-soft` Füllung + Haken-Puls. Min-Höhe 56 px (Daumen).
- **Skalen-Frage (1–4):** 4 beschriftete Stufen als horizontale Mess-Skala mit Zeiger.
- **Gauge:** SVG-Halbkreis ~240°, Skalenstriche wie Drehzahlmesser, Nadel mit Feder-Easing, Odometer-Zahl Mono.
- **Verteilungskurve:** SVG-Fläche (statische Pfaddaten), Marker-Pin „Ihr Betrieb" orange, gestrichelte Linie Branchenschnitt.
- **Interstitial:** Vollbild dunkel, KI-Bild der Phase als dezenter Hintergrund (10–15 % Opacity), Mono-Ticker oben (`ANALYSE PHASE 2/3 …`), Insight-Zitatblock, Benchmark-Fakt-Zeile.
- **Grain:** feines SVG-Noise-Overlay (2–3 % Opacity) gegen Flat-Look. Keine Partikel, kein Glassmorphism-Kitsch.

**Motion:** 150–400 ms, `cubic-bezier(.2,.7,.2,1)`. Fragenwechsel: 24 px Slide + Fade. Reveal-Elemente: gestaffeltes Einrasten. `prefers-reduced-motion` respektieren. Ken-Burns nur Hero + Interstitials (30 s Loop, subtil).

**Bilder (KI-generiert, whiteboard CLI, --style raw):**
1. `hero.jpg` (16:9, 2K): dunkle moderne Werkstatt, Handwerker mit Tablet, orange Arbeitslicht, kinematisch.
2. `phase1.jpg` / `phase2.jpg` / `phase3.jpg` (16:9): Motivreihe — Werkbank-Detail / Zeit-Motiv / Zukunftswerkstatt.
3. `og.jpg` (1200×630): Marken-Karte „Wo steht Ihr Betrieb wirklich?" + Gauge-Motiv.
Alle dunkel abgestimmt, damit Text darüber funktioniert. Optimierte JPEGs ≤ 300 KB je Bild (WebP-Konvertierung optional als späteres Feintuning; sips auf macOS schreibt kein WebP).

**Stack:** Eine `public/index.html`, handgeschriebenes CSS im `<style>`-Block (kein Tailwind, kein CDN-JS), Vanilla JS. Fonts via Google Fonts (preconnect + `display=swap`). Alles andere self-contained.

## 5. Content-Spezifikation

### 5.1 Microcopy-Grundsätze
Sie-Form, Handwerker-Augenhöhe, keine Buzzwords („disruptiv", „revolutionär" verboten). Kurz, konkret, Zahlen in Mono. Button-Texte ≤ 3 Wörter wo möglich („Check starten", „Weiter", „Karte teilen"). Echte Umlaute. Der Ton: ein erfahrener Meister, der ein Messprotokoll erklärt — nicht ein Marketer.

### 5.2 generate-questions — neuer System-Prompt (wörtlich übernehmen)

```
Du bist der KI-Diagnose-Berater von Synclaro und führst einen adaptiven Betriebs-Check für Handwerks- und KMU-Betriebe durch. Der Check hat GENAU 3 Fragerunden (Phasen). Du generierst jeweils die nächste Phase.

PHASEN-DRAMATURGIE (verbindlich):
- Phase 1 „Ihr Betrieb heute": IST-Aufnahme. Mischung aus: wie laufen Kernprozesse (Anfragen, Angebote, Doku, Zeiterfassung), welche digitalen Werkzeuge existieren, wird bereits KI genutzt (welche Tools, durch wen, wofür). 4 Fragen.
- Phase 2 „Wo Zeit verloren geht": Bohre gezielt dort, wo Phase 1 Schwächen, Widersprüche oder spannende Signale zeigt. Frage nach konkreten Zeitfressern, Fehlerquellen, Personalabhängigkeit, Doppelarbeit. Mindestens eine Frage MUSS sich erkennbar auf eine konkrete vorherige Antwort beziehen. 3-4 Fragen.
- Phase 3 „Ihr KI-Hebel": Zukunft. Was soll KI im Betrieb bewirken, Budgetrahmen, Zeithorizont, Bedenken (Datenschutz, Team-Akzeptanz), größter Wunsch als Freitext. 3 Fragen. Setze isLastStep=true.

FRAGE-DESIGN (fürs Ein-Frage-pro-Screen-UI):
1. Jede Frage muss ohne Kontext der anderen verständlich sein — sie steht allein auf dem Bildschirm.
2. Bevorzugte Typen: "radio" mit 3-5 griffigen Optionen, "scale" (Bewertung 1-4 mit scaleLabels für beide Pole), "checkbox" (3-6 Optionen). Maximal EINE "textarea"-Frage pro Phase, IMMER required=false, mit einladendem placeholder.
3. Optionstexte konkret und alltagsnah formulieren („Zettel und Zuruf", „WhatsApp-Gruppe", „Software mit App"), nie abstrakt.
4. Sprache der Branche verwenden (Baustelle, Werkstatt, Praxis, Objekt …). Sie-Form. Kein Fachjargon.
5. Keine Frage wiederholen, die inhaltlich schon beantwortet ist. Wenn Antworten aus der laufenden Runde fehlen (Vorab-Generierung), plane robust: frage nichts, was direkt davon abhängt.
6. Radio-Optionen mit Bewertungscharakter: value "1" bis "4" (schwach bis stark). Scale: value 1-4.
7. Jede Frage bekommt eine eindeutige snake_case id.

ZUSÄTZLICH lieferst du pro Runde:
- "transitionInsight": 2 Sätze persönlicher Befund über die bisherigen Antworten dieses Betriebs — wie ein Berater, der laut denkt. Konkret auf mindestens eine Antwort eingehen, eine Spannung oder einen Hebel benennen. KEINE Plattitüde. (Bei Phase 1: Befund aus dem Steckbrief.)
- "phaseTitle" und "phaseIntro" (1 Satz, warum diese Phase jetzt kommt).

AUSGABEFORMAT (strikt JSON):
{
  "phaseTitle": "…",
  "phaseIntro": "…",
  "transitionInsight": "…",
  "questions": [
    {"id": "…", "type": "radio|scale|checkbox|textarea", "label": "…", "required": true,
     "placeholder": "nur textarea", "scaleLabels": {"low": "…", "high": "…"},
     "options": [{"value": "…", "label": "…"}]}
  ],
  "isLastStep": false
}
```

User-Prompt wie bisher (Profil + bisherige Antworten + Rundennummer), ergänzt um die Zeile `HINWEIS: Die Antworten der laufenden Runde können unvollständig sein (Vorab-Generierung).` wenn das Frontend `partial: true` sendet.

**Modell:** `gpt-5.6-luna` (Latenz ist hier das Produkt), `max_completion_tokens: 2000`, `temperature: 0.6`, `response_format: json_object`. Ein Retry bei Parse-/API-Fehler.

### 5.3 analyze — neuer System-Prompt (Kernpunkte)

Persona „Senior-Diagnostiker von Synclaro", Wissensbasis wie bisher (200+ Coaching-Stunden, Praxisbeispiele, KOMPASS bis 90 %) — bleibt erhalten, plus:
- **Scoring-Disziplin:** Bewertung streng an Antworten verankern; jede Kategorie-summary muss eine konkrete Antwort referenzieren. Keine Gefälligkeits-Scores: realistische Streuung (Ø-Betrieb ≈ 40).
- **Neues Ausgabe-Schema (strikt JSON):**

```
{
  "scores": {
    "digitalisierung": {"percent": 0-100, "summary": "1 Satz mit Antwort-Bezug"},
    "kommunikation":   {"percent": 0-100, "summary": "…"},
    "ki_bereitschaft": {"percent": 0-100, "summary": "…"},
    "ki_nutzung":      {"percent": 0-100, "summary": "…"},
    "total": {"percent": 0-100}
  },
  "level": "KI-Einsteiger|Digital-Grundlage|Fortgeschritten|KI-Vorreiter",
  "gesamteinschaetzung": "3-4 Sätze, persönlich (Vorname falls vorhanden), ehrlich, konstruktiv. Beginnt mit dem stärksten Befund, benennt den größten Hebel.",
  "zeitPotenzial": {"stundenProMonat": 5-40, "begruendung": "1 Satz, hergeleitet aus konkreten Antworten"},
  "empfehlungen": [3 Stück: {"titel", "analyse" (2-3 Sätze mit Antwort-Bezug), "sozialBeweis" (anonymisiertes Praxisbeispiel), "naechsterSchritt" (diese Woche umsetzbar), "aufwand": "gering|mittel|hoch", "wirkung": "mittel|hoch|sehr hoch"}],
  "roadmap": {
    "phase1": {"zeitraum": "Tage 1-30", "titel": "…", "punkte": ["…", "…"]},
    "phase2": {"zeitraum": "Tage 31-60", "titel": "…", "punkte": ["…", "…"]},
    "phase3": {"zeitraum": "Tage 61-90", "titel": "…", "punkte": ["…", "…"]}
  },
  "foerderHinweis": "1-2 Sätze KOMPASS/Förderung, nur wenn zum Betrieb passend, sonst leerer String"
}
```

**Modell:** `gpt-5.6-terra` (ein Call, Qualität zählt, Latenz wird von der Mess-Sequenz maskiert), `max_completion_tokens: 3500`, `temperature: 0.6`.

### 5.4 Benchmark-Engine (deterministisch, NICHT LLM)

Statischer Datensatz `BENCHMARK` in `analyze.js` (und als Kopie im Frontend für Interstitial-Fakten): pro Branche Mittelwert + Streuung (Basis: Synclaro-Beratungserfahrung + öffentliche Digitalisierungsindizes; Default µ=42, σ=16, branchen-spezifisch ±6 justiert). Perzentil = logistische CDF: `p = 1/(1+exp(-(score-µ)/(σ*0.6)))`, gerundet, geklemmt auf 5–97. Ausgabe im analyze-Response zusätzlich als `benchmark: {percentile, branchenMittel, top10Schwelle}` (von der Function berechnet und angehängt, nicht vom LLM). Formulierung überall: „besser als rund X % vergleichbarer Betriebe" — Fußnote auf Karte und Ergebnisseite: „Einordnung auf Basis von 200+ Analysen und Branchendaten, Selbsteinschätzungs-basiert".

### 5.5 Score-Card (Richtung 2 — Benchmark/Vergleich)

Client-Canvas, **1080×1350** (4:5 — ideal für LinkedIn/WhatsApp-Feed). Aufbau:
- Kopf: `SYNCLARO · KI-BETRIEBS-CHECK` (Mono, klein), Datum.
- Zentrum: Score groß (Archivo 900, ~280 px) + `/100`, Level-Label, darunter Benchmark-Zeile: „Besser als 62 % vergleichbarer Betriebe" + Mini-Verteilungskurve mit orangenem Marker.
- 4 Kategorie-Mini-Balken mit Branchen-Ø-Strich.
- Kontext-Zeile: `SHK · 11–20 Mitarbeiter` (keine personenbezogenen Daten!).
- Fuß: `ki-check.synclaro.de` + Fußnote „Selbsteinschätzung · 200+ Vergleichsanalysen".
- Dunkler Grund #0B0B0C, orange Akzente, Fonts zum Canvas-Zeitpunkt geladen (`document.fonts.ready`).
Buttons: „Karte teilen" (navigator.share mit File; Fallback Download), „PNG herunterladen", daneben Text-Share-Buttons (Text enthält Score + Perzentil + URL). **Kein Challenge-Text.**

### 5.6 Fallback-Resilienz (Pflicht für 9/10)

- `generate-questions` scheitert (Timeout/5xx/Parse) nach 1 Retry → Frontend nutzt **statische Fallback-Phase** (3 fest einprogrammierte Fragensätze in gleicher Schema-Form, branchen-neutral gut). Der Check bricht NIE ab.
- `analyze` scheitert → 1 Retry → sonst regelbasierter Notfall-Score aus Antwort-Werten (values 1–4 gemittelt) + generische, aber saubere Empfehlungen + Hinweis „Detail-Analyse gerade nicht verfügbar".
- Interstitial-Mindestdauer 2,5 s; Maximaldauer 20 s, dann Fallback.

## 6. Technische Kontrakte & Konventionen

- **Frontend-State:** `profile`, `answers[]` (questionId, label, type, answer, phase), `phases[]` Cache, `prefetchPromise`, localStorage-Key `kicheck_v3_state` (Resume), `?demo=1` → **Demo-Mode:** komplette Strecke mit eingebauten Beispieldaten ohne einen einzigen API-Call (für Sichtung + Design-Review).
- **Prefetch-Regel:** Beim Beantworten von Frage n−1 einer Phase → `POST generate-questions` mit `partial: true` und allen bis dahin vorhandenen Antworten. Die Antwort auf die letzte Frage ändert den Prefetch nicht (bewusster Trade-off).
- **Events:** Meilenstein-Pings an `/.netlify/functions/track-pageview` (bestehende Signatur, fire-and-forget): `start`, `phase1..3_done`, `result`, `share_card`, `cta_click`.
- **CORS/Headers:** wie bisher. `netlify.toml`: Timeouts beibehalten; order-premium-Functions NICHT anfassen (chirurgisch — bleiben ungenutzt liegen).
- **SEO/OG:** Title „KI-Betriebs-Check für Handwerker | Wo steht Ihr Betrieb? | Synclaro", neue Description, `og:image` → `/assets/og.jpg`, JSON-LD aktualisiert.
- **A11y:** Fokus-Ringe (orange), aria-live für Fragenwechsel, Kontraste ≥ 4.5:1, komplette Tastatur-Bedienbarkeit, `prefers-reduced-motion`.
- **Performance:** LCP < 2,5 s (Hero-Bild `fetchpriority=high`, optimiertes JPEG), kein Layout-Shift beim Fragenwechsel (fixe Min-Höhen), HTML+CSS+JS < 200 KB ohne Bilder.

## 7. Akzeptanzkriterien (Selbst-Verifikation vor Sichtung)

1. Demo-Mode: kompletter Durchlauf Landing → Steckbrief → 3 Phasen → Reveal → Karte ohne API, ohne Konsolen-Fehler.
2. Echtmodus lokal: 3 Runden generiert (Schema-valide), Analyse-Schema vollständig, Perzentil deterministisch korrekt.
3. Innerhalb einer Phase: Fragenwechsel < 100 ms. Zwischen Phasen: nie ein leerer Spinner — immer Insight-Inhalt.
4. Score-Card-PNG: 1080×1350, Fonts korrekt gerendert, Share + Download funktionieren (Desktop-Fallback Download).
5. Mobil 390 px + Desktop 1440 px pixel-sauber (Screenshots), keine offensichtlichen Performance-Sünden.
6. Kein 29-€-Element, kein toter Link, cal.com-CTA = `cal.com/marcoheer/ki-erstgespraech`.
7. Kein Push auf main, kein Prod-Deploy — nur Branch + Netlify-Draft.

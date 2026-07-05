# CRITIC ENGINE — Falsifikationsmodus v3

## Verdict: **FAIL**

Ein Blocker verhindert den Release. Consent-Mechanik hat ein strukturelles Loch, das eine versehentliche Einwilligung ermöglicht.

---

## BLOCKER

### B1 · Consent-Checkbox: `<a>` im `<label>` toggelt die Checkbox unbeabsichtigt

**Stelle:** `renderSteckbrief()`, Branch `item.type==="vorname"`, HTML-Template:

```js
html += '<label class="consent"><input type="checkbox" id="consentChk"...>'
      + '<span>...Es gelten unsere <a href="https://synclaro.de/datenschutz" target="_blank" rel="noopener">Datenschutzhinweise</a>...</span></label>';
```

**Bruch:** Der `<a>`-Link liegt **innerhalb** des `<label>`. Klickt der User auf „Datenschutzhinweise" (um die Erklärung zu lesen, bevor er zustimmt), bubblt das `click`-Event zum `<label>` hoch → Label-Default-Action → **Checkbox wird getoggelt**. Da `target="_blank"` die Seite nicht verlässt, bleibt der User auf dem Screen, die Buttons werden enabled, `consentTs` wird geschrieben, `saveState()` persistiert.

Der User hat **niemals aktiv das Häkchen gesetzt** — und trotzdem ist `state.profile.consent === true` mit Timestamp. Das ist eine **unbeabsichtigte Einwilligung** und verstößt gegen Art. 4 Nr. 11 DSGVO („eindeutig bestätigende Handlung") sowie Art. 7(1) DSGVO (Nachweisbarkeit).

**Fix:**
```js
// Option A: stopPropagation auf dem Link
'<a href="..." target="_blank" rel="noopener" onclick="event.stopPropagation()">Datenschutzhinweise</a>'

// Option B (sauberer): Link aus dem <label> herauslösen
html += '<label class="consent"><input type="checkbox" id="consentChk"...>'
      + '<span>...Es gelten unsere Datenschutzhinweise.</span></label>';
html += '<p style="margin-top:8px;font-size:.78rem"><a href="https://synclaro.de/datenschutz" target="_blank" rel="noopener">→ Datenschutzhinweise lesen</a></p>';
```

---

## MAJOR

### M1 · Cal.com-Notes-Übermittlung: Rechtsgrundlage im Consent-Text nicht abgebildet

**Stelle:** Consent-Checkbox-Text + `calLink()` + Datenschutz-Vorlage

Der Consent-Text sagt: *„meine Angaben zur automatischen Auswertung an unseren KI-Dienstleister OpenAI (Server in den USA) übermittelt werden"*. Das deckt **nur OpenAI** ab.

Die `calLink()`-Funktion übergibt aber Score, Level, Perzentil, Branche, Mitarbeiter an **Cal.com** (Drittland USA/EU-Mix). Das ist eine **separate Datenübermittlung** an einen **anderen Empfänger** — und wird im Consent-Text mit keinem Wort erwähnt.

Die DSGVO-Vorlage erwähnt Cal.com zwar im Abschnitt „Terminbuchung", aber:
- Die Rechtsgrundlage dort ist unklar. Art. 6(1)(b) (Vertragsanbahnung) ist fragwürdig, weil die Notes (Score, Perzentil, Level) für die Terminbuchung **nicht notwendig** sind — der User könnte auch ohne Notes buchen.
- Art. 6(1)(f) (berechtigtes Interesse) wäre möglicherweise haltbarer, erfordert aber eine Interessenabwägung, die in der Vorlage fehlt.

**Fix:**
1. Im Consent-Text ergänzen: *„Wenn Sie im Anschluss ein Strategiegespräch buchen, wird Ihr Ergebnis (Score, Branche, Größe) als Vorbereitung an Cal.com übermittelt."*
2. In der DSGVO-Vorlage die Rechtsgrundlage für Cal.com explizit benennen (Art. 6(1)(b) mit Begründung ODER Art. 6(1)(f) mit Interessenabwägung).
3. Alternativ: Notes-Übermittlung erst nach **separatem** Opt-in im Top-CTA (z.B. zweites Häkchen: *„Mein Ergebnis darf als Vorbereitung an Cal.com übermittelt werden"*).

---

### M2 · Top-CTA: „30 Min" vs. mögliche 15-Min-Event-Dauer

**Stelle:** `section.r-cta-top` HTML + `cta-note`

```html
<p class="cta-lead">...30 Minuten, kostenlos und unverbindlich.</p>
<p class="cta-note">30 Min · kostenlos · unverbindlich</p>
```

Der cal.com-Link zeigt auf `/ki-erstgespraech`. Wenn das cal.com-Event tatsächlich 15 Minuten dauert (was bei Erstgesprächen üblich ist), ist die Angabe „30 Min" **irreführend** und potenziell wettbewerbsrechtlich problematisch (UWG §5).

**Fix:** Event-Dauer in cal.com prüfen und Text angleichen. Falls 15 Min: *„15 Minuten, kostenlos und unverbindlich"*.

---

### M3 · DSGVO-Vorlage: Local Storage unvollständig beschrieben

**Stelle:** Datenschutz-Vorlage, Abschnitt „Speicherung"

> *„Ihre Antworten und Ihr Ergebnis werden in Ihrem Browser gespeichert (Local Storage)"*

Tatsächlich speichert der Local Storage auch:
- `vorname` (personenbezogen)
- `consentTs` (Nachweis der Einwilligung)
- `branche`, `mitarbeiter`, `rolle`, `umsatz` (Steckbrief-Daten)

Die Vorlage erwähnt nur „Antworten und Ergebnis". Der Vorname und die Consent-Metadaten fehlen.

**Fix:** Ergänzen: *„Ihre Antworten, Ihr Vorname, der Zeitpunkt Ihrer Einwilligung und Ihr Ergebnis werden in Ihrem Browser gespeichert (Local Storage)..."*

---

## MINOR

### m1 · Tracking-Duplikat: Beide CTAs feuern identisches Event

**Stelle:** `init()`

```js
$("#ctaCalTop").addEventListener("click",()=>track("cta_click"));
$("#ctaCal").addEventListener("click",()=>track("cta_click"));
```

Beide Buttons tracken `cta_click` ohne Unterscheidung. Wenn ein User beide klickt (z.B. scrollt zurück), entstehen Duplikate.

**Fix:**
```js
$("#ctaCalTop").addEventListener("click",()=>track("cta_click_top"));
$("#ctaCal").addEventListener("click",()=>track("cta_click_bottom"));
```

---

### m2 · Share-Button: Anonyme Wrapper-Funktion

**Stelle:** `init()`

```js
$("#btnShareCard2").addEventListener("click",()=>{ shareCard(); });
```

Unnötige anonyme Funktion. Direkt referenzieren:

```js
$("#btnShareCard2").addEventListener("click", shareCard);
```

---

### m3 · JavaScript-deaktiviert-Fallback: calLink()-Parameter fehlen im HTML

**Stelle:** `#ctaCalTop` und `#ctaCal` im HTML

```html
<a class="btn btn-primary" id="ctaCalTop" href="https://cal.com/marcoheer/ki-erstgespraech" ...>
```

Der `href` wird dynamisch durch `calLink()` überschrieben. Bei deaktiviertem JavaScript fehlt die `notes`- und `name`-Übergabe. Die `cta-note` behauptet aber: *„Ihr Ergebnis wird zur Vorbereitung automatisch übergeben"*.

**Fix:** Im HTML einen sinnvollen Fallback-`href` setzen (z.B. mit statischen UTM-Parametern), oder den Hinweis bei JS-deaktiviert ausblenden.

---

## Was sauber ist (Bestätigung)

| Prüfpunkt | Status |
|---|---|
| Enter-Taste im Vorname-Input → `guard()` blockiert | ✓ |
| Resume aus localStorage → Consent-Status wird korrekt wiederhergestellt | ✓ |
| Zurück-Navigation → Consent bleibt erhalten | ✓ |
| Demo-Mode → keine OpenAI-Calls, Consent-UI trotzdem aktiv (UX-Geschmacksache, aber kein DS-Verstoß) | ✓ |
| `calLink()` → `encodeURIComponent()` kodiert `·`, `%`, `&`, `–`, Umlaute korrekt | ✓ |
| XSS über notes → `encodeURIComponent()` verhindert Injection | ✓ |
| Score-Card-Canvas-Kontraste → alle Textwerte ≥ WCAG AA (4.5:1) | ✓ |
| Hero-Opacity `.5→.62` → kein Layout-Bruch, Gradient-Werte plausibel | ✓ |
| Share-Button trackt `share_card`, nicht `cta_click` | ✓ |
| `consentTs` wird bei erstem Setzen geschrieben, bei Re-Check nicht überschrieben | ✓ |

---

## Zusammenfassung

| Schwere | Anzahl | Kernproblem |
|---|---|---|
| **BLOCKER** | 1 | Consent-Checkbox: Link-Klick togglt Häkchen → unbeabsichtigte Einwilligung |
| **MAJOR** | 3 | Cal.com-Rechtsgrundlage unklar · 30-Min-Angabe evtl. falsch · Local-Storage-Beschreibung unvollständig |
| **MINOR** | 3 | Tracking-Duplikat · anonyme Wrapper-Funktion · JS-deaktiviert-Fallback |

**Empfehlung:** B1 sofort fixen (5 Zeilen Code). M1–M3 vor dem Anwalt-Review klären. Dann Re-Review.
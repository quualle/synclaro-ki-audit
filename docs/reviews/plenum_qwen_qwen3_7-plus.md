```json
{
  "scores": {
    "A": 8,
    "B": 8,
    "C": 8,
    "D": 7,
    "E": 8
  },
  "gesamt": 8,
  "verdict": "GO-WITH-CHANGES",
  "befunde": [
    {
      "schwere": "BLOCKER",
      "stelle": "index.html <img src=\"/assets/hero.jpg\"> (Zeile ~preload), JS const pImg = \"/assets/phase\"+...+\".jpg\" (Funktion showInterstitial), Spec §4 fordert durchgängig .webp",
      "problem": "Die Spec verlangt explizit WebP-Assets (hero.webp, phase1–3.webp, ≤300 KB). Der Code referenziert durchgängig .jpg. Werden die Assets gemäß Spec als .webp ausgeliefert, laden Hero-Bild und alle drei Interstitial-Hintergründe nicht. Dank onerror=\"this.style.display='none'\" crasht die Seite zwar nicht, aber das monumentale Hero-Visual und die phasenspezifischen Interstitial-Stimmungen fallen komplett weg — der „optisch Weltklasse"-Anspruch ist ohne diese Bilder nicht erreichbar. Gleiches gilt für das OG-Bild (siehe MAJOR #4).",
      "fix": "Entweder (a) alle Image-Referenzen im Code auf .webp umstellen (hero.webp, phase1.webp … og.webp) oder (b) in der Spec und im Asset-Pipeline auf .jpg统一en. Empfehlung: (a), weil WebP für die Performance (LCP < 2,5 s) essenziell ist. Zusätzlich ein <picture>-Fallback mit .jpg einbauen, falls ältere Browser WebP nicht unterstützen."
    },
    {
      "schwere": "MAJOR",
      "stelle": "analyze.js: Kommentarblock über MODEL-Konstante sagt „gpt-5.5 verwendet", Code setzt const MODEL = \"gpt-5.4\"; zusätzlich reasoning_effort: \"low\" im requestBody von runAnalysis()",
      "problem": "Zwei Probleme in einer Function: (1) Der ausführliche Kommentar begründet die Wahl von gpt-5.5 (mit temperature=1-Constraint), aber der Code nutzt gpt-5.4 — das ist ein direkter Widerspruch, der zukünftige Maintainer in die Irre führt. (2) reasoning_effort: \"low\" ist ein Parameter ausschließlich für o-Series-Reasoning-Modelle (o1, o3, o4-mini). Für gpt-5.4 (kein Reasoning-Modell) wird dieser Parameter entweder stillschweigend ignoriert oder — wahrscheinlicher bei strikter API-Validierung — mit einem 400-Fehler quittiert. Im Fehlerfall greift zwar der Retry und danach emergencyAnalysis(), aber damit ist der Kernwertversprechen („KI-getriebene Analyse") faktisch immer außer Kraft gesetzt. Der Nutzer bekommt dann eine generische regelbasierte Auswertung mit dem Hinweis „Detail-Analyse gerade nicht verfügbar" — das ist unter dem 9/10-Anspruch inakzeptabel.",
      "fix": "(1) Kommentar und Code in Einklang bringen: entweder Modell auf gpt-5.5 ändern (wenn verfügbar) oder Kommentar korrigieren. (2) reasoning_effort: \"low\" aus dem requestBody entfernen, da es für das gewählte Modell nicht gültig ist. (3) In generate-questions.js steht im Kommentar ebenfalls ein anderes Modell (gpt-5.4-mini) als in der Spec (gpt-5.6-luna) — auch hier Kommentar und Code angleichen und dokumentieren, welches Modell produktiv läuft."
    },
    {
      "schwere": "MAJOR",
      "stelle": "CSS :root --ink3: #6E6C66 auf --bg0: #0B0B0C (Verwendung u.a. in .q-hint, .scale-poles, .eta, .inter-next, .footnote, .no-pressure, .cb-sum, .meas-ticker)",
      "problem": "Der Kontrast zwischen #6E6C66 (L ≈ 0.148) und #0B0B0C (L ≈ 0.003) beträgt rechnerisch nur ca. 3.7:1. WCAG AA verlangt für normalen Text ≥ 4.5:1. Damit sind alle in --ink3 gesetzten Texte auf dunklem Grund nicht barrierefrei — betroffen sind u.a. die Skalen-Pole-Beschriftungen (für Nutzer entscheidend), die ETA-Anzeige, die Mess-Ticker und die Fußnoten. Auf dem hellen .paper-Abschnitt (--paper #F7F5F1) passt der Kontrast (~4.8:1), aber im dunklen App-Flow ist er kritisch. Die Spec fordert explizit „Kontraste ≥ 4.5:1".",
      "fix": "--ink3 von #6E6C66 auf mindestens #7D7B75 anheben (ergibt ca. 4.6:1) oder für die betroffenen UI-Elemente --ink2 (#A8A6A0, ~8:1) verwenden. Alternativ: --ink3 nur für große Texte (≥ 18px / 14px bold) belassen, wo WCAG AA nur 3:1 verlangt, und für kleine Texte --ink2 nutzen. Schnell-Test: alle .q-hint, .scale-poles, .eta-Elemente im Browser-DevTools auf Lesbarkeit prüfen."
    },
    {
      "schwere": "MAJOR",
      "stelle": "index.html <meta property=\"og:image\" content=\"https://ki-check.synclaro.de/assets/og.jpg\"> und <meta name=\"twitter:image\" …> ebenfalls og.jpg; Spec §4 und §6 fordern og.png (1200×630)",
      "problem": "Wenn das OG-Bild gemäß Spec als og.png gebaut und ausgeliefert wird, zeigen LinkedIn, WhatsApp, Facebook und Twitter keine Vorschau-Karte beim Teilen — der Link erscheint als nackter URL ohne Bild. Das schwächt die virale Share-Mechanik der Score-Card erheblich, die in der Spec als zentrales Conversion-Element (Richtung 2) ausgewiesen ist. Der Mismatch zwischen Spec (.png) und Code (.jpg) muss aufgelöst werden.",
      "fix": "Code auf og.png umstellen (oder Spec auf og.jpg korrigieren, je nach tatsächlichem Asset). Zusätzlich og:image:secure_url und twitter:image:src prüfen. Empfohlen: PNG für OG (bessere Kompatibilität mit allen Social Plattformen), WebP nur für Seitenbilder."
    },
    {
      "schwere": "MAJOR",
      "stelle": "index.html: <div id=\"interstitial\"> und <div id=\"measuring\"> ohne role/aria-Attribute; .chip-Buttons ohne aria-pressed; Scale-Steps ohne role=\"radio\" oder aria-checked",
      "problem": "Drei A11y-Defizite: (1) Interstitial und Mess-Sequenz sind Vollbild-Overlays, die den gesamten Fokus kapern, aber weder role=\"dialog\" noch aria-modal=\"true\" noch ein aria-label haben. Screen-Reader-Nutzer erkennen nicht, dass sie sich in einem modalen Kontext befinden, und können nicht zurück navigieren. (2) Die Tap-Chips (.chip) ändern ihren visuellen Selected-Status, setzen aber kein aria-pressed=\"true/false\" — für Screen-Reader ist nicht erkennbar, welche Option aktiv ist. (3) Die Skalen-Fragen (.scale-step) sind <button>-Elemente ohne role=\"radio\" und ohne aria-checked, obwohl sie sich wie Radio-Buttons verhalten. Die Spec fordert explizit „komplette Tastatur-Bedienbarkeit" und A11y. Zwar gibt es Fokus-Ringe und aria-live auf #app, aber die modalen Overlays und interaktiven Elemente sind unvollständig ausgezeichnet.",
      "fix": "(1) #interstitial und #measuring: role=\"dialog\" aria-modal=\"true\" aria-label=\"Analyse läuft\" (bzw. „Messprotokoll wird erstellt") hinzufügen; beim Schließen Fokus auf den Auslöser zurücksetzen. (2) .chip: aria-pressed=\"true/false\" dynamisch setzen (in wireQuestion und renderSteckbrief). (3) .scale-step: role=\"radio\" aria-checked=\"true/false\" und die .scale-track als role=\"radiogroup\" mit aria-label der Frage auszeichnen. (4) Zusätzlich: tabindex=\"-1\" auf die Overlay-Container und Fokus beim Öffnen automatisch auf den ersten fokussierbaren Inhalt setzen."
    }
  ]
}
```
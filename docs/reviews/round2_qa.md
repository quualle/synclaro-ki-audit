Let me systematically verify the implementation quality of the new components against the code. I'll create a comprehensive test case list for each feature, mark whether each test passes or fails with code evidence, check German language quality and Sie-form, and verify the privacy template against the code.

Let me go through each feature:

## 1. DSGVO-Consent (Steckbrief Step 5)

### Test Cases:

**TC-CONSENT-01: Checkbox present on Steckbrief step 5 (vorname screen)**
- Given: User reaches Steckbrief step 5 (vorname)
- When: The vorname screen renders
- Then: A consent checkbox should be displayed
- Code evidence: In `renderSteckbrief()`, when `item.type==="vorname"`, the HTML includes `<label class="consent"><input type="checkbox" id="consentChk"...>...`
- **BESTEHT** ✅

**TC-CONSENT-02: Buttons disabled until checkbox is checked**
- Given: User is on Steckbrief step 5
- When: Consent checkbox is not checked
- Then: Both "Los geht's" and "Überspringen" buttons should be disabled
- Code evidence: `'<button class="btn btn-primary" id="vornameNext"'+(state.profile.consent?'':' disabled')+'>Los geht\'s</button>'` and `'<button class="skip-link" id="vornameSkip"'+(state.profile.consent?'':' disabled')+'>Überspringen</button>'`
- **BESTEHT** ✅

**TC-CONSENT-03: Buttons enabled when checkbox is checked**
- Given: User is on Steckbrief step 5
- When: User checks the consent checkbox
- Then: Both buttons should become enabled
- Code evidence: `if(chk.checked){ $("#vornameNext").removeAttribute("disabled"); $("#vornameSkip").removeAttribute("disabled"); }`
- **BESTEHT** ✅

**TC-CONSENT-04: Buttons disabled again when checkbox is unchecked**
- Given: User is on Steckbrief step 5 with consent checked
- When: User unchecks the consent checkbox
- Then: Both buttons should become disabled again
- Code evidence: `else { $("#vornameNext").setAttribute("disabled",""); $("#vornameSkip").setAttribute("disabled",""); }`
- **BESTEHT** ✅

**TC-CONSENT-05: consentTs is locally logged**
- Given: User checks the consent checkbox for the first time
- When: The change event fires
- Then: `state.profile.consentTs` should be set to ISO timestamp
- Code evidence: `if(chk.checked && !state.profile.consentTs){ state.profile.consentTs = new Date().toISOString(); }`
- **BESTEHT** ✅

**TC-CONSENT-06: consentTs not overwritten on re-check**
- Given: User has already checked consent (consentTs is set)
- When: User unchecks and re-checks the checkbox
- Then: consentTs should retain its original value
- Code evidence: `if(chk.checked && !state.profile.consentTs)` — the guard prevents overwriting
- **BESTEHT** ✅

**TC-CONSENT-07: OpenAI/USA hint in consent text**
- Given: User is on Steckbrief step 5
- When: The consent label renders
- Then: Text should mention OpenAI and USA
- Code evidence: `"Ich bin einverstanden, dass meine Angaben zur automatischen Auswertung an unseren KI-Dienstleister OpenAI (Server in den USA) übermittelt werden."`
- **BESTEHT** ✅

**TC-CONSENT-08: Warning about third-party personal data in free text**
- Given: User is on Steckbrief step 5
- When: The consent label renders
- Then: Text should warn against entering names of customers/employees in free text fields
- Code evidence: `"Die Auswertung läuft anonym — bitte schreiben Sie keine Namen von Kunden oder Mitarbeitern in Freitextfelder."`
- **BESTEHT** ✅

**TC-CONSENT-09: Link to datenschutz in consent text**
- Given: User is on Steckbrief step 5
- When: The consent label renders
- Then: There should be a link to synclaro.de/datenschutz
- Code evidence: `<a href="https://synclaro.de/datenschutz" target="_blank" rel="noopener">Datenschutzhinweise</a>`
- **BESTEHT** ✅

**TC-CONSENT-10: Guard prevents advancing without consent**
- Given: User is on Steckbrief step 5 without consent checked
- When: User clicks "Los geht's" or "Überspringen"
- Then: Action should be blocked with a toast message
- Code evidence: `const guard = () => { if(!state.profile.consent){ toast("Bitte bestätigen Sie kurz die Datenverarbeitung."); return false; } return true; };`
- **BESTEHT** ✅

**TC-CONSENT-11: Guard on Enter key in vorname input**
- Given: User is on Steckbrief step 5 without consent checked
- When: User presses Enter in the vorname input
- Then: Action should be blocked with a toast message
- Code evidence: `inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); if(!guard()) return; ...`
- **BESTEHT** ✅

**TC-CONSENT-12: Consent state persisted in localStorage**
- Given: User checks consent and state is saved
- When: `saveState()` is called
- Then: `state.profile.consent` and `state.profile.consentTs` should be in the saved state
- Code evidence: `saveState()` saves `profile:state.profile` which includes `consent` and `consentTs`
- **BESTEHT** ✅

**TC-CONSENT-13: Consent state restored on resume**
- Given: User has a saved state with consent checked
- When: User resumes the check
- Then: The consent checkbox should be pre-checked and buttons enabled
- Code evidence: In `renderSteckbrief()`, the checkbox HTML uses `(state.profile.consent?' checked':'')` and buttons use `(state.profile.consent?'':' disabled')`. `resumeFrom()` restores `state.profile` from saved state.
- **BESTEHT** ✅

**TC-CONSENT-14: Consent is required BEFORE first data transmission**
- Given: User hasn't checked consent
- When: User tries to advance past step 5
- Then: They cannot proceed
- Code evidence: The guard function blocks all advancement paths. The first API call happens in `startMeasurementFlow()` → `fetchPhase(1, false)`, which is only called after `advanceSteckbrief()` succeeds, which requires consent.
- **BESTEHT** ✅

Wait, let me check more carefully. The `advanceSteckbrief()` function is called from the vorname step's buttons, which are guarded. But what about the back button? If a user goes back from step 5 to step 4, then somehow... no, the consent is only on step 5. The first API call is in `startMeasurementFlow()`, which is called after step 5 is completed with consent. So yes, consent is required before any data transmission.

Actually, wait. Let me check if there's any API call before step 5. Looking at the code... `startPrefetch` is called in `maybePrefetch()`, which is called during the measurement phase, not during steckbrief. So no API calls happen before consent. ✅

**TC-CONSENT-15: CSS styling for disabled buttons**
- Given: Buttons are disabled
- When: They render
- Then: They should have reduced opacity and no pointer events
- Code evidence: `.btn[disabled],.skip-link[disabled]{opacity:.4;pointer-events:none}`
- **BESTEHT** ✅

## 2. Hero-Bild heller (opacity .5→.62, Overlay-Gradient abgesenkt)

**TC-HERO-01: Hero image opacity is .62**
- Given: The hero section renders
- When: The hero background image is displayed
- Then: Opacity should be .62
- Code evidence: `.hero-bg img{...opacity:.62;...}`
- **BESTEHT** ✅

**TC-HERO-02: Overlay gradient adjusted**
- Given: The hero section renders
- When: The overlay gradient is applied
- Then: The gradient should be "abgesenkt" (reduced)
- Code evidence: `.hero-bg::after{...background:linear-gradient(180deg,rgba(11,11,12,.48) 0%,rgba(11,11,12,.36) 40%,rgba(11,11,12,.9) 100%),...}`
- I can't compare to the old values since only the new code is provided, but the values .48, .36, .9 are present. The spec says "Overlay-Gradient abgesenkt" which means reduced. Without the old values to compare, I'll note this as implemented.
- **BESTEHT** ✅ (can't verify delta, but values are present)

## 3. Score-Card-Canvas: Kontraste erhöht

**TC-CANVAS-01: Date rendered with appropriate contrast**
- Given: Score card canvas renders
- When: The date is drawn
- Then: Date should be visible with good contrast
- Code evidence: `ctx.fillStyle="#A8A6A0"; ctx.font="500 26px 'IBM Plex Mono',monospace"; ctx.fillText(dstr, W-80, 110);`
- **BESTEHT** ✅

**TC-CANVAS-02: /100 rendered with appropriate contrast**
- Given: Score card canvas renders
- When: The "/100" text is drawn
- Then: It should be visible
- Code evidence: `ctx.fillStyle="#A8A6A0"; ctx.font="500 60px 'IBM Plex Mono',monospace"; ctx.fillText("/100", W/2+150, 460);`
- **BESTEHT** ✅

**TC-CANVAS-03: Footnote rendered**
- Given: Score card canvas renders
- When: The footnote is drawn
- Then: Footnote text should be present
- Code evidence: `ctx.fillStyle="#98968F"; ctx.font="500 24px 'IBM Plex Mono',monospace"; ctx.fillText("Selbsteinschätzung · 200+ Vergleichsanalysen", W/2, H-70);`
- **BESTEHT** ✅

**TC-CANVAS-04: Bar background is #2B2B31**
- Given: Score card canvas renders category bars
- When: The bar track is drawn
- Then: Background should be #2B2B31
- Code evidence: `ctx.fillStyle="#2B2B31"; roundRect(ctx,bx,cy,bw,bh,7); ctx.fill();`
- **BESTEHT** ✅

**TC-CANVAS-05: Glow is .2**
- Given: Score card canvas renders
- When: The radial gradient glow is drawn
- Then: The glow opacity should be .2
- Code evidence: `rg.addColorStop(0,"rgba(255,79,0,.2)");`
- **BESTEHT** ✅

## 4. Top-CTA-Block (section.r-cta-top)

**TC-CTA-TOP-01: Section exists after score reveal**
- Given: The result page renders
- When: The page structure is examined
- Then: There should be a section.r-cta-top after the r-hero section
- Code evidence: `<section class="r-cta-top">` appears after `<div class="r-hero">...</div>`
- **BESTEHT** ✅

**TC-CTA-TOP-02: Personalized headline with Vorname**
- Given: User provided a vorname
- When: The result page renders
- Then: The CTA headline should include the vorname
- Code evidence: `if(state.profile.vorname){ $("#ctaTopTitle").textContent = state.profile.vorname+", nehmen Sie Ihr Ergebnis mit ins Gespräch."; }`
- **BESTEHT** ✅

**TC-CTA-TOP-03: Default headline without Vorname**
- Given: User did not provide a vorname
- When: The result page renders
- Then: The CTA headline should show the default text
- Code evidence: The default HTML is `<h3 id="ctaTopTitle">Nehmen Sie Ihr Ergebnis mit ins Gespräch.</h3>` — this is only changed if vorname exists.
- **BESTEHT** ✅

**TC-CTA-TOP-04: "30 Min Strategiegespräch kostenlos+unverbindlich" mentioned**
- Given: The top CTA section renders
- When: The text content is examined
- Then: It should mention 30 minutes, kostenlos, and unverbindlich
- Code evidence: `"Marco Heer, Gründer von Synclaro, geht Ihr Messergebnis persönlich mit Ihnen durch — 30 Minuten, kostenlos und unverbindlich."` and `<p class="cta-note">30 Min · kostenlos · unverbindlich<br>Ihr Ergebnis wird zur Vorbereitung automatisch übergeben</p>`
- **BESTEHT** ✅

**TC-CTA-TOP-05: Three benefit points listed**
- Given: The top CTA section renders
- When: The bullet points are examined
- Then: There should be exactly 3 benefit points
- Code evidence: `<ul class="cta-points"><li>Ihre Hebel aus diesem Check, vom KI-Experten geprüft</li><li>Die potenzialreichste Maßnahme für Ihren Betrieb</li><li>Ehrliche Einschätzung: wo KI sich bei Ihnen zuerst lohnt</li></ul>`
- **BESTEHT** ✅

**TC-CTA-TOP-06: Button links to cal.com**
- Given: The top CTA section renders
- When: The button is examined
- Then: It should link to cal.com
- Code evidence: `<a class="btn btn-primary" id="ctaCalTop" href="https://cal.com/marcoheer/ki-erstgespraech" target="_blank" rel="noopener">Strategiegespräch buchen</a>`
- **BESTEHT** ✅

## 5. calLink() Prefill

**TC-CALLINK-01: UTM parameters included**
- Given: calLink() is called
- When: The URL is constructed
- Then: It should include utm_source=ki-check&utm_medium=result
- Code evidence: `let u = "https://cal.com/marcoheer/ki-erstgespraech?utm_source=ki-check&utm_medium=result";`
- **BESTEHT** ✅

**TC-CALLINK-02: Notes prefill with Score**
- Given: calLink() is called with a result
- When: The URL is constructed
- Then: Notes should include the score
- Code evidence: `let notes = "Kommt über den KI-Readiness-Check (ki-check.synclaro.de) · Ergebnis: "+r.scores.total.percent+"/100"`
- **BESTEHT** ✅

**TC-CALLINK-03: Notes prefill with Level**
- Given: calLink() is called with a result that has a level
- When: The URL is constructed
- Then: Notes should include the level
- Code evidence: `+ (r.level ? " ("+r.level+")" : "")`
- **BESTEHT** ✅

**TC-CALLINK-04: Notes prefill with Perzentil**
- Given: calLink() is called with benchmark data
- When: The URL is constructed
- Then: Notes should include the percentile
- Code evidence: `if(b && typeof b.percentile === "number") notes += " · besser als rund "+b.percentile+" %";`
- **BESTEHT** ✅

**TC-CALLINK-05: Notes prefill with Branche**
- Given: calLink() is called with profile data
- When: The URL is constructed
- Then: Notes should include the branche
- Code evidence: `notes += " · "+(state.profile.branche||"Branche unbekannt")+", "+(state.profile.mitarbeiter||"?")+" Mitarbeiter";`
- **BESTEHT** ✅

**TC-CALLINK-06: Notes prefill with Größe (Mitarbeiter)**
- Given: calLink() is called with profile data
- When: The URL is constructed
- Then: Notes should include the mitarbeiter count
- Code evidence: Same as above — `+(state.profile.mitarbeiter||"?")+" Mitarbeiter"`
- **BESTEHT** ✅

**TC-CALLINK-07: Name prefill with Vorname**
- Given: calLink() is called and user provided a vorname
- When: The URL is constructed
- Then: The name parameter should be set
- Code evidence: `if(state.profile.vorname) u += "&name="+encodeURIComponent(state.profile.vorname);`
- **BESTEHT** ✅

**TC-CALLINK-08: Both CTAs use calLink()**
- Given: The result page renders
- When: Both cal.com CTAs are examined
- Then: Both should use the calLink() function
- Code evidence: `$("#ctaCalTop").href = calLink();` and `$("#ctaCal").href = calLink();`
- **BESTEHT** ✅

**TC-CALLINK-09: Notes URL-encoded**
- Given: calLink() constructs the URL
- When: The notes parameter is added
- Then: It should be URL-encoded
- Code evidence: `u += "&notes="+encodeURIComponent(notes);`
- **BESTEHT** ✅

**TC-CALLINK-10: Name URL-encoded**
- Given: calLink() constructs the URL with a vorname
- When: The name parameter is added
- Then: It should be URL-encoded
- Code evidence: `u += "&name="+encodeURIComponent(state.profile.vorname);`
- **BESTEHT** ✅

## 6. Share-Button trackt nicht mehr fälschlich cta_click

**TC-SHARE-01: Share card button does NOT track cta_click**
- Given: User clicks the share card button
- When: The event handler fires
- Then: It should track "share_card", not "cta_click"
- Code evidence: `async function shareCard(){ track("share_card"); ...`
- **BESTEHT** ✅

**TC-SHARE-02: Download card button does NOT track cta_click**
- Given: User clicks the download card button
- When: The event handler fires
- Then: It should not track cta_click
- Code evidence: `$("#btnDownloadCard").addEventListener("click",()=>downloadCard(null));` — no track call at all
- **BESTEHT** ✅ (no false cta_click)

**TC-SHARE-03: Text share buttons do NOT track cta_click**
- Given: User clicks a text share button (LinkedIn, WhatsApp, etc.)
- When: The event handler fires
- Then: It should not track cta_click
- Code evidence: `document.querySelectorAll("[data-sh]").forEach(b=>b.addEventListener("click",()=>textShare(b.dataset.sh)));` — textShare doesn't call track at all
- **BESTEHT** ✅

**TC-SHARE-04: Cal.com CTAs DO track cta_click**
- Given: User clicks a cal.com CTA
- When: The event handler fires
- Then: It should track "cta_click"
- Code evidence: `$("#ctaCalTop").addEventListener("click",()=>track("cta_click"));` and `$("#ctaCal").addEventListener("click",()=>track("cta_click"));`
- **BESTEHT** ✅

**TC-SHARE-05: btnShareCard2 does NOT track cta_click**
- Given: User clicks the second share card button (in handover section)
- When: The event handler fires
- Then: It should not track cta_click
- Code evidence: `$("#btnShareCard2").addEventListener("click",()=>{ shareCard(); });` — shareCard tracks "share_card"
- **BESTEHT** ✅

## German Language Quality & Sie-Form Check

Let me check all new German texts:

1. **Consent text**: "Ich bin einverstanden, dass meine Angaben zur automatischen Auswertung an unseren KI-Dienstleister OpenAI (Server in den USA) übermittelt werden. Es gelten unsere Datenschutzhinweise. Die Auswertung läuft anonym — bitte schreiben Sie keine Namen von Kunden oder Mitarbeitern in Freitextfelder."
   - Sie-form: Not applicable (first person "Ich"), but the warning uses imperative "bitte schreiben Sie" — correct Sie-form ✅
   - Grammar: Correct ✅
   - "Datenschutzhinweise" — should this be "Datenschutzhinweise" with a link? Yes, it's linked. ✅

2. **Toast message**: "Bitte bestätigen Sie kurz die Datenverarbeitung."
   - Sie-form: "Sie" ✅
   - Grammar: Correct ✅

3. **CTA Top Title (default)**: "Nehmen Sie Ihr Ergebnis mit ins Gespräch."
   - Sie-form: "Sie", "Ihr" ✅
   - Grammar: Correct ✅

4. **CTA Top Title (personalized)**: `state.profile.vorname+", nehmen Sie Ihr Ergebnis mit ins Gespräch."`
   - Sie-form: "Sie", "Ihr" ✅
   - Grammar: Correct ✅

5. **CTA lead**: "Marco Heer, Gründer von Synclaro, geht Ihr Messergebnis persönlich mit Ihnen durch — 30 Minuten, kostenlos und unverbindlich."
   - Sie-form: "Ihr", "Ihnen" ✅
   - Grammar: Correct ✅

6. **CTA points**:
   - "Ihre Hebel aus diesem Check, vom KI-Experten geprüft" — "Ihre" ✅
   - "Die potenzialreichste Maßnahme für Ihren Betrieb" — "Ihren" ✅
   - "Ehrliche Einschätzung: wo KI sich bei Ihnen zuerst lohnt" — "Ihnen" ✅

7. **CTA button**: "Strategiegespräch buchen" — no pronoun needed ✅

8. **CTA note**: "30 Min · kostenlos · unverbindlich\nIhr Ergebnis wird zur Vorbereitung automatisch übergeben" — "Ihr" ✅

9. **Eyebrow in CTA**: "Der direkte Weg" — no pronoun ✅

All new texts use consistent Sie-form. ✅

## Datenschutz-Vorlage vs. Code — Widerspruchsprüfung

Let me check each claim in the privacy template against the code:

1. **"Beim KI-Betriebs-Check beantworten Sie Fragen zu Ihrem Betrieb (z. B. Branche, Betriebsgröße, Arbeitsabläufe)."**
   - Code: Steckbrief collects branche, mitarbeiter, rolle, umsatz, vorname. Measurement questions about workflows. ✅ MATCH

2. **"Zur automatischen Auswertung und zur Erstellung Ihrer individuellen Fragen und Ihres Ergebnisses übermitteln wir Ihre Antworten an unseren technischen Dienstleister OpenAI, L.L.C. (USA)."**
   - Code: `fetchPhase()` calls `/.netlify/functions/generate-questions` with `companyProfile` and `previousAnswers`. `runAnalyze()` calls `/.netlify/functions/analyze` with `companyProfile` and `answers`. These are server-side functions that presumably call OpenAI. ✅ MATCH (assumption: server functions use OpenAI)

3. **"Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie vor dem Start des Checks aktiv erteilen"**
   - Code: Consent checkbox on step 5, required before proceeding. ✅ MATCH

4. **"jederzeit mit Wirkung für die Zukunft widerrufen können"**
   - Code: No explicit widerruf mechanism implemented. The user can uncheck the checkbox before proceeding, but once they've proceeded, there's no way to revoke consent. ⚠️ PARTIAL MATCH — The code doesn't implement a revocation mechanism after the check has started. However, since no data is stored server-side (per the template), this is less critical. But the template claims widerruf is possible, and the code doesn't provide a way to do so after data has been sent.

5. **"Die Übermittlung in die USA erfolgt auf Grundlage des EU-U.S. Data Privacy Framework bzw. der EU-Standardvertragsklauseln"**
   - Code: No way to verify from code alone. This is a legal claim. N/A for code review.

6. **"laut OpenAI-API-Bedingungen werden API-Daten nicht zum Training der Modelle verwendet"**
   - Code: No way to verify from code alone. N/A for code review.

7. **"Ihre Antworten im Check sowie — freiwillig — Ihr Vorname zur persönlichen Ansprache."**
   - Code: Vorname is optional (input has placeholder "Ihr Vorname (optional)", skip button exists). ✅ MATCH

8. **"Der Check erfordert keine E-Mail-Adresse und keine Kontaktdaten."**
   - Code: No email field exists in the steckbrief or measurement. ✅ MATCH

9. **"Bitte geben Sie in Freitextfeldern keine Namen von Kunden, Mitarbeitern oder andere personenbezogene Daten Dritter ein."**
   - Code: The consent text includes this warning. ✅ MATCH

10. **"Ihre Antworten und Ihr Ergebnis werden in Ihrem Browser gespeichert (Local Storage), damit Sie einen unterbrochenen Check fortsetzen können"**
    - Code: `saveState()` uses `localStorage.setItem(LS_KEY, JSON.stringify({...}))`. ✅ MATCH

11. **"Sie können dies durch Löschen Ihrer Browserdaten jederzeit entfernen."**
    - Code: Standard browser behavior. ✅ MATCH (implicit)

12. **"Auf unseren Servern speichern wir aus dem Check-Durchlauf keine personenbezogenen Profile"**
    - Code: The client sends data to server functions, but we can't verify what the server stores from this code alone. However, the tracking function only sends page/event/referrer/ts/ua/screen — no personal data from the check. ⚠️ CANNOT VERIFY from client code alone, but no evidence of server-side storage of personal profiles.

13. **"zur Reichweitenmessung erfassen wir technische Nutzungsereignisse (z. B. Seitenaufruf, Check abgeschlossen) ohne Bildung von Nutzerprofilen."**
    - Code: `track()` function sends `{ page, event, referrer, ts, ua, screen }` — technical events, no personal data from the check. Events tracked: "start", "phase1_done", "phase2_done", "phase3_done" (wait, let me check... actually "phase"+(state.curPhaseIdx+1)+"_done"), "result", "cta_click", "share_card". ✅ MATCH

14. **"Wenn Sie im Anschluss ein Strategiegespräch buchen, geschieht das über den Dienst Cal.com"**

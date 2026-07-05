Let me carefully analyze this code against the specification, looking for falsification-oriented issues across all dimensions.

Let me go through each dimension systematically.

## A) UX-Dramaturgie & Sog-Effekt

**Positive:**
- One-per-screen question flow is implemented
- Interstitial screens between phases with insights and benchmark facts
- Measuring sequence masks analyze latency
- Score reveal with gauge animation
- Prefetch mechanism for next phase
- Progress bar with segments
- Transition animations between questions

**Issues:**
- The interstitial between Steckbrief and Phase 1 shows a generic quote ("Wir stellen Ihren Betrieb jetzt auf den Prüfstand...") rather than a personalized insight from the profile answers. The spec says "Bei Phase 1: Befund aus dem Steckbrief" but the code uses a hardcoded string.
- The `transitionInsight` from the generated phase is shown in the interstitial between phases, but the first interstitial (before Phase 1) doesn't use any AI-generated insight - it's hardcoded.
- The measuring sequence has a fixed timing pattern that doesn't adapt to actual API completion - it waits up to 14s after the visual sequence completes, but the `analyzePromise` could resolve much earlier, and the visual sequence always takes ~6-8s regardless.
- The `ensureMinInterstitial()` function only ensures 2.5s minimum, but the spec says "maximal bis Prefetch fertig" - the code does wait for prefetch but doesn't have a 20s max for interstitials (only for the prefetch race).
- No Ken Burns on interstitial backgrounds in the actual implementation - the CSS has the animation but the images might not exist.
- The "noch ca. X Min" ETA calculation is very rough and doesn't account for actual progress well.

**Score: 7/10** - Good structure but some dramaturgy gaps.

## B) Inhaltliche Qualität

**Positive:**
- System prompts are detailed and well-structured
- Fallback phases are well-crafted with good handwerker language
- Demo data is realistic and substantive
- Benchmark engine is deterministic and honest
- Emergency analysis provides reasonable fallback

**Issues:**
- The spec requires `gpt-5.6-luna` for generate-questions and `gpt-5.6-terra` for analyze, but the code uses `gpt-5.4-mini` and `gpt-5.4` respectively. The comments explain why, but this is a deviation.
- The analyze function uses `reasoning_effort: "low"` which isn't in the spec and could reduce quality.
- The spec says temperature should be 0.6 for both, but the analyze function omits temperature entirely (comment says gpt-5.5 forces temperature=1, but the model is actually gpt-5.4).
- The `transitionInsight` for the first interstitial (before Phase 1) is hardcoded rather than AI-generated from the steckbrief.
- The benchmark footnote text on the score card says "Selbsteinschätzung · 200+ Vergleichsanalysen" which matches the spec.
- The spec requires "besser als rund X % vergleichbarer Betriebe" but the code uses "Besser als X % vergleichbarer Betriebe" (missing "rund").

**Score: 7/10**

## C) Design-Eindruck aus dem Code

**Positive:**
- Comprehensive CSS custom properties matching the spec
- Dark theme with orange accent consistently applied
- Three font families (Archivo, Inter, IBM Plex Mono) as specified
- Grain overlay
- Tap chips with proper styling
- Gauge SVG implementation
- Distribution curve SVG
- Score card canvas rendering
- Responsive breakpoints
- prefers-reduced-motion support

**Issues:**
- The spec mentions a light/dark rhythm on the landing ("Heller Kontrast-Abschnitt auf der Landing erlaubt (Papier-Weiß #F7F5F1)") - this IS implemented with the `.paper` section.
- The spec mentions Ken Burns on hero and interstitials - implemented in CSS.
- Missing: The spec says "Keine Partikel, kein Glassmorphism-Kitsch" - code complies.
- The og:image references `/assets/og.jpg` but the spec says `/assets/og.png` - minor mismatch.
- The hero image is referenced as `/assets/hero.jpg` but the spec says `hero.webp`.
- Phase images are `/assets/phase1.jpg` etc. but spec says `phase1.webp`.

**Score: 8/10** - Strong design implementation with minor asset naming issues.

## D) Technische Robustheit

Let me check for contract mismatches carefully:

**Frontend → generate-questions:**
- Frontend sends: `{ companyProfile, previousAnswers, stepNumber, partial }`
- Backend expects: `{ companyProfile, previousAnswers, stepNumber, partial }` ✓
- Backend returns: the phase JSON object directly ✓
- Frontend `normalizePhase()` handles missing fields ✓

**Frontend → analyze:**
- Frontend sends: `{ companyProfile, answers }`
- Backend expects: `{ companyProfile, answers }` ✓
- Backend returns: result with `benchmark` appended ✓
- Frontend `buildBenchmark()` checks for `result.benchmark.percentile` ✓

**Contract Mismatch Issue:**
- The frontend `buildPrevAnswers()` creates objects with `{questionId, questionLabel, questionType, answer, phase}`
- The backend `buildUserPrompt()` accesses `a.questionLabel` and `a.answer` ✓
- But the frontend `recordAnswer()` stores `{questionId, questionLabel, questionType, answer, label, phase}` - note the extra `label` field which is the option label text, not the question label. This is fine since the backend only uses `questionLabel` and `answer`.

**Critical Issue - analyze response contract:**
- The backend `validateResult()` checks for `result.scores[key].percent` and `result.scores[key].summary`
- The frontend accesses `r.scores[c.key].percent` and `r.scores[c.key].summary` ✓
- The backend appends `result.benchmark = computeBenchmark(...)` which returns `{percentile, branchenMittel, top10Schwelle}`
- The frontend `buildBenchmark()` checks `result.benchmark.percentile` ✓

**Error handling:**
- Frontend has retry logic via `apiWithRetry()` ✓
- Frontend has fallback phases ✓
- Frontend has emergency analysis ✓
- Backend has retry logic ✓
- Backend has validation ✓

**Issues:**
1. The `apiWithRetry` function doesn't distinguish between different error types - it retries on any error including 400 (bad request), which shouldn't be retried.
2. The `normalizePhase` function in the frontend is less strict than the backend validation - it silently fixes issues rather than rejecting bad data.
3. The `emergencyAnalysis()` function computes `total` from answer values, but the formula `((avg-1)/3)*100` could produce negative values if avg < 1 (though unlikely given the input validation).
4. The `buildPrevAnswers()` function sends `phase` in the answer objects, but the backend doesn't use it - not a bug but unnecessary data.
5. The `prefetchPromise` is set to the result of `fetchPhase()` which could be null (from the `.catch(()=>null)`), but `goToNextPhase()` handles this with a null check ✓

**A11y:**
- `aria-live="polite"` on the app container ✓
- Focus visible styles ✓
- `prefers-reduced-motion` ✓
- But: The question transitions use animations that might not be announced to screen readers
- The gauge and distribution SVGs have `aria-hidden="true"` but no text alternatives for the score value
- The interstitial doesn't have proper ARIA announcements

**Score: 7/10**

## E) Conversion

**Positive:**
- Clear CTA flow: Check starten → Steckbrief → Messung → Ergebnis → Cal.com
- "Keine E-Mail nötig" prominently displayed
- Score card sharing with Web Share API
- Multiple share options (LinkedIn, WhatsApp, Email, Copy)
- Download card option
- "Kein Verkaufsdruck" line
- Trust block with DSGVO info

**Issues:**
- The `btnShareCard2` in the handover section fires `track("cta_click")` then `shareCard()`, but the spec says the CTA click tracking should be for the cal.com link. The share button in the handover shouldn't track as `cta_click`.
- The share text doesn't include a compelling hook - it's just "Mein Betrieb im KI-Betriebs-Check: 61/100 — besser als 62 % vergleichbarer Betriebe."
- No email capture anywhere (by design, per spec), but also no soft ask for contact info at any point.
- The LinkedIn share URL uses `share-offsite` which just shares the URL, not the text.
- The WhatsApp share uses `wa.me/?text=` which is correct.
- The "Erstgespräch buchen" CTA links to cal.com correctly ✓

**Score: 7/10**

## Detailed Befunde

Let me identify the top 5 most important issues:

### 1. BLOCKER: Spec requires "besser als rund X %" but code says "Besser als X %"
The spec (§5.4) explicitly states: "Formulierung überall: 'besser als rund X % vergleichbarer Betriebe'". The word "rund" is legally important because it signals approximation. Without it, the claim could be seen as a precise measurement, which is legally problematic for a self-assessment tool.

Location: Multiple places in the HTML - the benchmark display, the score card canvas rendering, and the share text.

### 2. MAJOR: Model mismatch - spec requires gpt-5.6-luna/terra, code uses gpt-5.4-mini/gpt-5.4
The spec explicitly states the models to use. While the comments explain the deviation, this affects quality. More importantly, the analyze function uses `reasoning_effort: "low"` which isn't in the spec and could significantly reduce analysis quality.

Location: generate-questions.js line `const MODEL = "gpt-5.4-mini"` and analyze.js line `const MODEL = "gpt-5.4"`

### 3. MAJOR: First interstitial uses hardcoded insight instead of steckbrief-based insight
The spec says "Bei Phase 1: Befund aus dem Steckbrief" for the transitionInsight, but the code uses a generic hardcoded string: "Wir stellen Ihren Betrieb jetzt auf den Prüfstand. Drei kurze Runden — jede Frage passt sich Ihren vorherigen Antworten an."

Location: `startMeasurementFlow()` function, the `quote` parameter passed to `showInterstitial()`

### 4. MAJOR: analyze.js omits temperature parameter
The spec requires `temperature: 0.6` for the analyze call. The code comment says gpt-5.5 forces temperature=1, but the actual model used is gpt-5.4, which should support temperature=0.6. The temperature parameter is simply omitted, which means it defaults to 1.0, reducing output consistency.

Location: analyze.js `runAnalysis()` function

### 5. MAJOR: og:image references og.jpg but spec says og.png
Also, hero image references hero.jpg but spec says hero.webp, and phase images reference .jpg but spec says .webp. These are asset naming mismatches that could cause 404s.

Location: HTML meta tags and JS image paths

Wait, let me re-examine more carefully for contract mismatches...

Actually, let me look more carefully at the frontend-backend contract:

**Frontend fetch for generate-questions:**
```javascript
const body = { companyProfile: state.profile, previousAnswers: buildPrevAnswers(), stepNumber, partial: !!partial };
```

**Backend generate-questions expects:**
```javascript
const { companyProfile, previousAnswers, stepNumber, partial } = JSON.parse(event.body);
```

This matches ✓

**Frontend fetch for analyze:**
```javascript
const body = { companyProfile: state.profile, answers: buildPrevAnswers() };
```

**Backend analyze expects:**
```javascript
const { companyProfile, answers } = JSON.parse(event.body);
```

This matches ✓

**Backend analyze returns:**
The result object with `benchmark` appended. The frontend checks for this in `buildBenchmark()`.

Wait, there's an issue. The frontend `runAnalyze()` function:
```javascript
const r = await apiWithRetry("/.netlify/functions/analyze", body, 26000);
if(!r || !r.scores || !r.scores.total) throw new Error("schema");
return r;
```

But if the backend returns a 500 error with `{ error: "..." }`, the `apiWithRetry` will throw because `!res.ok`. So the frontend will fall back to `emergencyAnalysis()`. This is correct behavior.

But wait - the `apiWithRetry` function:
```javascript
async function apiWithRetry(path, body, timeoutMs){
  try{ return await apiCall(path, body, timeoutMs); }
  catch(e){ return await apiCall(path, body, timeoutMs); }
}
```

This retries on ANY error, including:
- 400 Bad Request (shouldn't retry)
- Network errors (should retry) ✓
- Timeout (should retry) ✓
- 500 Server Error (should retry) ✓

The 400 case is problematic because it means a bad request will be sent twice. But in practice, the frontend constructs the request body correctly, so 400 shouldn't happen.

Let me also check for the `benchmark` field in the analyze response more carefully:

Backend:
```javascript
result.benchmark = computeBenchmark(companyProfile.branche, result.scores.total.percent);
```

`computeBenchmark` returns:
```javascript
{
  percentile,
  branchenMittel: mu,
  top10Schwelle: Math.round(mu + 21),
}
```

Frontend `buildBenchmark()`:
```javascript
if(result.benchmark && typeof result.benchmark.percentile==="number"){
  state.benchmark = result.benchmark;
} else {
  state.benchmark = { percentile: percentile(total, branche), branchenMittel: benchMu(branche), top10Schwelle: top10(branche) };
}
```

This handles both cases ✓

Now let me check the score card rendering more carefully:

The canvas rendering uses `document.fonts.ready` which is good. But there's a potential issue: the fonts might not be loaded when the canvas is rendered if the user reaches the result page very quickly (e.g., in demo mode). The `await document.fonts.ready` should handle this, but it depends on the fonts being requested by the browser first.

Actually, looking at the code more carefully, the `renderScoreCard()` function is async and awaits `document.fonts.ready`, so this should be fine.

Let me check for German language errors:

- "Messprotokoll wird erstellt" - correct
- "Ihre Antworten werden ausgewertet." - correct
- "Besser als 62 % vergleichbarer Betriebe" - should be "besser als rund 62 % vergleichbarer Betriebe" per spec
- "KI-Betriebs-Check" - consistent throughout ✓
- "Steckbrief" - correct ✓
- "Erstgespräch buchen" - correct ✓

Let me check for contrast issues:

The spec requires "Kontraste ≥ 4.5:1". Let me check some key combinations:
- `--ink #F4F3F0` on `--bg0 #0B0B0C`: Very high contrast ✓
- `--ink2 #A8A6A0` on `--bg0 #0B0B0C`: Let me calculate... #A8A6A0 is approximately rgb(168,166,160) on #0B0B0C which is approximately rgb(11,11,12). The relative luminance of #A8A6A0 is about 0.38, and #0B0B0C is about 0.005. Contrast ratio ≈ (0.38+0.05)/(0.005+0.05) = 0.43/0.055 ≈ 7.8:1 ✓
- `--ink3 #6E6C66` on `--bg0 #0B0B0C`: #6E6C66 is approximately rgb(110,108,102). Luminance ≈ 0.14. Contrast ≈ (0.14+0.05)/(0.005+0.05) = 0.19/0.055 ≈ 3.5:1. This FAILS the 4.5:1 requirement for normal text!
- `--ink3 #6E6C66` on `--card #1A1A1E`: #1A1A1E is approximately rgb(26,26,30). Luminance ≈ 0.01. Contrast ≈ (0.14+0.05)/(0.01+0.05) = 0.19/0.06 ≈ 3.2:1. Also FAILS!

This is a significant accessibility issue. The `--ink3` color is used for:
- `.eyebrow` text
- `.eta` text
- `.q-hint` text
- `.inter-next` text
- Various labels and secondary information

Wait, let me recalculate more carefully.

#6E6C66 = rgb(110, 108, 102)
sRGB relative luminance:
R: 110/255 = 0.431 → linearized: 0.431^2.2 ≈ 0.155 (roughly)
Actually, for sRGB:
if C <= 0.04045: C/12.92
else: ((C+0.055)/1.055)^2.4

R = 110/255 = 0.4314 → ((0.4314+0.055)/1.055)^2.4 = (0.4614/1.055)^2.4 = 0.4373^2.4 ≈ 0.163
G = 108/255 = 0.4235 → ((0.4235+0.055)/1.055)^2.4 = 0.4535^2.4 ≈ 0.175... wait, let me be more careful.

Actually, let me just estimate. #6E6C66 is a medium gray. On a near-black background, the contrast ratio is probably around 4.5:1 or slightly below. Let me check with a more precise calculation.

Relative luminance of #6E6C66:
R: 110/255 = 0.4314 → linear ≈ 0.155
G: 108/255 = 0.4235 → linear ≈ 0.149
B: 102/255 = 0.4000 → linear ≈ 0.133

L = 0.2126 * 0.155 + 0.7152 * 0.149 + 0.0722 * 0.133 = 0.033 + 0.107 + 0.010 = 0.150

Relative luminance of #0B0B0C:
R: 11/255 = 0.0431 → linear ≈ 0.0017
G: 11/255 = 0.0431 → linear ≈ 0.0017
B: 12/255 = 0.0471 → linear ≈ 0.0020

L = 0.2126 * 0.0017 + 0.7152 * 0.0017 + 0.0722 * 0.0020 = 0.00036 + 0.00122 + 0.00014 = 0.00172

Contrast ratio = (0.150 + 0.05) / (0.00172 + 0.05) = 0.200 / 0.05172 = 3.87:1

This is below 4.5:1 for normal text. It passes for large text (3:1 requirement) but fails for normal text.

However, `--ink3` is used for eyebrow text (which is uppercase, small, and could be considered "incidental"), hint text, and other secondary information. Some of these are small text that needs 4.5:1.

This is a real accessibility issue but might be considered MINOR since it's only for decorative/secondary text. But the spec explicitly requires "Kontraste ≥ 4.5:1".

Let me also check `--ink2 #A8A6A0` on `--bg0 #0B0B0C`:
R: 168/255 = 0.6588 → linear ≈ 0.395
G: 166/255 = 0.6510 → linear ≈ 0.385
B: 160/255 = 0.6275 → linear ≈ 0.356

L = 0.2126 * 0.395 + 0.7152 * 0.385 + 0.0722 * 0.356 = 0.084 + 0.275 + 0.026 = 0.385

Contrast ratio = (0.385 + 0.05) / (0.00172 + 0.05) = 0.435 / 0.05172 = 8.41:1 ✓

OK so `--ink2` is fine, but `--ink3` fails for normal text.

Now let me look for more issues...

### Legal/Ethical Issues:

1. The benchmark claim "200+ Betriebe analysiert" - is this verifiable? If it's based on coaching hours rather than actual check completions, this could be misleading. The spec says "200+ Analysen und Branchendaten" which is slightly different from "200+ Betriebe analysiert". The landing page says "200+ Betriebe analysiert & ausgewertet" which is a stronger claim.

2. The score card footnote says "Selbsteinschätzung · 200+ Vergleichsanalysen" which is good - it discloses the self-assessment nature.

3. The "10–20 Std./Monat typisches Sparpotenzial" claim on the landing page - this is presented as a general statistic, which is fine, but the individual result's "Geschätztes Potenzial: 14 Std./Monat" could be seen as a specific promise. The spec says to use "Geschätztes Potenzial" which includes the qualifier "geschätzt".

4. Missing "rund" before the percentile - as mentioned above, this is legally relevant.

### Dead Code Paths:

1. The `usedFallbackPhase` variable is incremented but never read or displayed to the user. It's not used for any logic.

2. The `phaseIntro` field from the generated phases is never displayed in the UI. The spec says each phase has a `phaseIntro` (1 Satz, warum diese Phase jetzt kommt), but the code only shows `phaseTitle` as the kicker and never displays `phaseIntro`.

3. The `interImg` element's `onerror` handler sets `display:none` but doesn't provide a fallback background color for the interstitial.

### More Contract Issues:

Looking at the `recordAnswer` function:
```javascript
const entry = { questionId:q.id, questionLabel:q.label, questionType:q.type, answer:value, label:label, phase:phase };
```

The `label` field stores the human-readable answer text. But in `buildPrevAnswers()`:
```javascript
return state.answers.map(a=>({questionId:a.questionId,questionLabel:a.questionLabel,questionType:a.questionType,answer:a.answer,phase:a.phase}));
```

The `label` field is NOT sent to the backend. The backend's `buildUserPrompt` uses `a.questionLabel` and `a.answer`. For checkbox answers, `a.answer` is an array of values (not labels), so the backend would show something like "anfragen, doku" instead of "Anfragen und Angebote, Dokumentation und Ablage". This reduces the LLM's ability to understand the answers contextually.

Wait, let me check more carefully. For checkbox answers:
```javascript
const vals = chosen.map(c=>c.dataset.value);
const labels = chosen.map(c=>c.querySelector(".chip-label").textContent);
recordAnswer(q, vals, labels.join(", "));
```

So `answer` is an array of values like `["anfragen", "doku"]` and `label` is a string like "Anfragen und Angebote, Dokumentation und Ablage".

In `buildPrevAnswers()`, only `answer` is sent, not `label`. The backend then does:
```javascript
const answerText = Array.isArray(a.answer) ? a.answer.join(", ") : a.answer;
```

So it would show "anfragen, doku" which is not very readable for the LLM. This could reduce the quality of follow-up questions and analysis.

This is a MAJOR issue because it directly affects the quality of adaptive questioning and analysis.

Actually wait, let me re-read the backend code more carefully:

```javascript
previousAnswers.forEach((a) => {
  const answerText = Array.isArray(a.answer) ? a.answer.join(", ") : a.answer;
  prompt += `- ${a.questionLabel}: ${answerText}\n`;
});
```

For checkbox answers with value arrays like `["anfragen", "doku"]`, this would produce:
"- Wo geht bei Ihnen am meisten Zeit verloren?: anfragen, doku"

The LLM would need to infer what "anfragen" and "doku" mean from context. This is suboptimal but not catastrophic since the LLM has the context of the question.

However, for the analyze function, the same issue exists. The analysis quality could be reduced because the LLM sees cryptic value codes instead of human-readable labels.

### Another issue: The `phaseIntro` is never displayed

The spec says each phase has a `phaseIntro` (1 Satz, warum diese Phase jetzt kommt), but the code only shows `phaseTitle` as the kicker text and never displays `phaseIntro`. This is a content gap.

### The `btnShareCard2` tracking issue

In the handover section:
```javascript
$("#btnShareCard2").addEventListener("click",()=>{ track("cta_click"); shareCard(); });
```

This tracks "cta_click" for the share button, but the spec says `cta_click` should be for the cal.com CTA. The share button should track `share_card` instead. This conflates conversion tracking.

Wait, actually `shareCard()` already calls `track("share_card")` internally. So this would fire both `cta_click` and `share_card` events, which is wrong. The `cta_click` event should only fire for the cal.com link.

### The `etaLabel` function

```javascript
function etaLabel(){
  const remaining = Math.max(0, (3 - (state.curPhaseIdx+1)))*1.2 + 0.6;
  const m = Math.max(1, Math.round(remaining));
  return "noch ca. "+m+" Min";
}
```

This doesn't account for the current question within the phase. If you're on the last question of phase 3, it still shows "noch ca. 1 Min" even though you're about to finish. The spec says
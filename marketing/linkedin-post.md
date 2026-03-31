# LinkedIn Post: KI-Readiness-Check Launch

**Pillar:** edutainment (Promotion-Anteil: 20%)
**Zielgruppe:** ICP-B (GFs Handwerk & KMU, 35-55)
**Geplant für:** KW 14/2026

---

## Post-Text

90% der Handwerksbetriebe, mit denen ich spreche, haben das gleiche Problem: Sie wissen, dass KI irgendwie wichtig ist — aber nicht, wo sie anfangen sollen.

Pass auf, ich hab da was gebaut.

Einen kostenlosen KI-Readiness-Check. 11 Fragen, 3 Minuten. Danach weißt du genau, wo dein Betrieb steht — und wo die Quick Wins liegen.

Keine Theorie. Keine 40-Seiten-Studie. Sondern: Digitalisierung, Kommunikation, KI-Bereitschaft. Drei Bereiche, ein Score, drei konkrete Empfehlungen.

Warum ich das gemacht hab? Weil ich in über 30 Coaching-Stunden mit Handwerksbetrieben gemerkt hab: Die größte Hürde ist nicht die Technik. Es ist der Überblick. Daniela aus dem Holzbau wusste nicht, dass sie ihr Zettel-Chaos mit einer Sprachnotiz-KI in 10 Stunden selbst lösen kann. Andreas im Fensterbau hatte keine Ahnung, dass ein Foto-Upload seinen Reklamationsprozess halbieren würde.

Die wussten es einfach nicht. Und genau dafür ist der Check da.

Du beantwortest die Fragen ehrlich, bekommst deinen Score und siehst sofort: Hier brennt's, hier ist der Hebel, hier fängst du an.

Kein Coding nötig. Kein Berater nötig. Einfach machen.

Den Link pack ich in den ersten Kommentar.

Wo steht ihr gerade beim Thema KI — habt ihr schon einen Plan, oder ist es noch eher "müsste man mal"?

#KIimHandwerk #Digitalisierung #Automatisierung #Mittelstand #KI

---

## Hinweise für die Veröffentlichung

- **Link in den 1. Kommentar** posten (nicht in den Post selbst — killt Reichweite um 60%)
- **URL:** synclaro.de/lp/ki-audit (oder dedizierte Netlify-URL, je nach Deployment-Status)
- **Bild:** Optional — flat_illustration Archetyp mit Hint "KI-Readiness-Check für Handwerksbetriebe, Checkliste mit Score-Balken"
- **Zeichenzahl Post-Text:** ~1.280 Zeichen (im Sweet Spot für edutainment)

---

## Programmatisch in die LinkedIn-Queue einfügen

Die LinkedIn-Automation läuft über Supabase Edge Functions auf dem Projekt `ouqhysemcldamthpuqqq` (SEO-Marketing). Es gibt zwei Wege, diesen Post in die Queue zu bringen:

### Option A: Direkt in die `linkedin_posts`-Tabelle inserten (empfohlen)

```bash
source ~/.synclaro/.env

curl -X POST "https://ouqhysemcldamthpuqqq.supabase.co/rest/v1/linkedin_posts" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "content": "90% der Handwerksbetriebe, mit denen ich spreche, haben das gleiche Problem: Sie wissen, dass KI irgendwie wichtig ist — aber nicht, wo sie anfangen sollen.\n\nPass auf, ich hab da was gebaut.\n\nEinen kostenlosen KI-Readiness-Check. 11 Fragen, 3 Minuten. Danach weißt du genau, wo dein Betrieb steht — und wo die Quick Wins liegen.\n\nKeine Theorie. Keine 40-Seiten-Studie. Sondern: Digitalisierung, Kommunikation, KI-Bereitschaft. Drei Bereiche, ein Score, drei konkrete Empfehlungen.\n\nWarum ich das gemacht hab? Weil ich in über 30 Coaching-Stunden mit Handwerksbetrieben gemerkt hab: Die größte Hürde ist nicht die Technik. Es ist der Überblick. Daniela aus dem Holzbau wusste nicht, dass sie ihr Zettel-Chaos mit einer Sprachnotiz-KI in 10 Stunden selbst lösen kann. Andreas im Fensterbau hatte keine Ahnung, dass ein Foto-Upload seinen Reklamationsprozess halbieren würde.\n\nDie wussten es einfach nicht. Und genau dafür ist der Check da.\n\nDu beantwortest die Fragen ehrlich, bekommst deinen Score und siehst sofort: Hier brennt'\''s, hier ist der Hebel, hier fängst du an.\n\nKein Coding nötig. Kein Berater nötig. Einfach machen.\n\nDen Link pack ich in den ersten Kommentar.\n\nWo steht ihr gerade beim Thema KI — habt ihr schon einen Plan, oder ist es noch eher \"müsste man mal\"?\n\n#KIimHandwerk #Digitalisierung #Automatisierung #Mittelstand #KI",
    "hook": "90% der Handwerksbetriebe, mit denen ich spreche, haben das gleiche Problem.",
    "pillar": "edutainment",
    "hashtags": ["KIimHandwerk", "Digitalisierung", "Automatisierung", "Mittelstand", "KI"],
    "character_count": 1280,
    "source_type": "original",
    "scheduled_for": "2026-04-01T08:30:00Z",
    "linkedin_author_urn": "urn:li:person:AvyGN72-7i",
    "status": "scheduled"
  }'
```

**Hinweis:** `scheduled_for` auf den gewünschten Zeitpunkt setzen (UTC). Der Cron-Job `linkedin-publish-post` läuft Mo-Fr um 08:00 UTC und publiziert alle Posts mit `status=scheduled` und `scheduled_for <= jetzt`. Es gibt einen Duplikat-Check: maximal 1 Post pro Tag.

### Option B: Pipeline triggern mit Topic-Hint (generiert neuen Post via KI)

```bash
source ~/.synclaro/.env

curl -X POST "https://ouqhysemcldamthpuqqq.supabase.co/functions/v1/linkedin-start-pipeline" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "pillar": "edutainment",
    "topic_hint": "Ankündigung des neuen kostenlosen KI-Readiness-Checks für Handwerksbetriebe. 11 Fragen, 3 Minuten, Score + 3 konkrete Empfehlungen. Daniela und Andreas als Beispiele verwenden. CTA: Link im ersten Kommentar."
  }'
```

**Achtung bei Option B:** Die KI generiert einen eigenen Post basierend auf dem Hint. Das Ergebnis weicht vom obigen Text ab. Nutze Option A, wenn du den exakten Text kontrollieren willst.

### Wichtig: 1. Kommentar mit Link

Nach der Veröffentlichung muss manuell (oder via LinkedIn API) ein Kommentar mit dem Link zum KI-Readiness-Check gepostet werden. Die Publish-Function macht das aktuell nicht automatisch.

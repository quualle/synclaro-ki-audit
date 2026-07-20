# Finaler Tracking-Delta-Check

Stand: 20.07.2026 · Zielbranches `feat/readiness-contact-handoff` und
`feat/contact-funnel-attribution` · nicht live

## Prüfgegenstand

Geprüft wurde ausschließlich das letzte Delta für Consent, Analytics-
Properties, objektgenaue Meta-Attribution, die korrigierten Creatives, den
sequenziellen Kontakt-Handoff und die ehrliche Launch-Übergabe.

## Builder-Nachweise

- Readiness-Repo `npm test`: 62/62 bestanden.
- `npm run test:migration`: lokale Migration und Lead-Funnel-Integration
  bestanden.
- `npm audit --audit-level=high`: 0 bekannte Schwachstellen.
- `netlify build --offline --context deploy-preview`: bestanden.
- `npm run test:netlify-manifest`: Functions API v2, drei Traffic Rules und
  isoliertes `submit-lead`-Bundle bestätigt.
- `git diff --check`: bestanden.
- Drei Creative-PNGs mit „8 adaptive Fragen“ neu gerendert, Maße und RGB-
  Ausgabe geprüft sowie visuell abgenommen.
- PR #2 wurde in den gegen `main` gerichteten PR #3 integriert. Der
  Kontakt-Handoff reicht Campaign-, Adset- und Ad-ID nur nach Marketing-
  Consent weiter; freie Identifikatoren werden verworfen und PII-verdächtige
  Placement-Suffixe auf die Plattform reduziert.
- Website-Repo: vollständige Playwright-Suite mit 60 bestandenen und einem
  absichtlich gesperrten Live-Cleanup-Test; die 10 Kontaktfunnel-Tests sind
  vollständig grün. Astro-Check: 0 Fehler und 0 Warnungen, ausschließlich
  bestehende Hinweise.
- Website-Repo: frische Netlify-Builds für `deploy-preview` und `production`
  bestanden. Das gepackte Preview-Artefakt enthält `previewMode = true` und
  beendet die Kontakt-API vor CRM/E-Mail; das gepackte Production-Artefakt
  enthält `previewMode = false` und keinen Preview-Frühreturn.
- Readiness-Referenz sowie Campaign-, Adset- und Anzeigen-ID wurden im Browser
  über URL-Bereinigung, Reload, zwei sequenzielle Fragen und Cal-Konfiguration
  verfolgt. Generische Google-UTMs erzeugen nachweislich keine Meta-Metadaten
  und werden in den Cal-Notizen nicht als Meta-IDs bezeichnet.

## Interner Critic

Verdict: **PASS**.

Der isolierte Falsifikationslauf bestätigte nach einer ersten Fehlerfindung und
gezielten Korrektur:

- Cross-Tab- und gemischte Consent-Pfade können Meta/Analytics nicht vor der
  Serverbestätigung neu aktivieren.
- Unbestätigte Storage-Grants fallen auf `false/false`; bestätigte positive
  Entscheidungen werden für den aktuellen Run erneut synchronisiert.
- Freie Analytics-Werte und PII-codierte Placement-Suffixe gelangen nicht in
  die Event-Properties.
- Lead-Attribution und Analytics teilen denselben Placement-Sanitizer;
  Kampagne, Adset und Anzeige akzeptieren nur Meta-Objekt-IDs.
- `phase_completed` zählt exakt die acht bewerteten Kernfragen; das zuvor
  wirkungslose Phantom-Event wurde entfernt.

Der abschließende integrierte Critic über beide Repositories urteilte
**PASS-WITH-CONCERNS**, ohne Code-Blockade. Seine verbleibende P2-Grenze ist
bewusst dokumentiert: Die Prüfung auf exakt 18 Ziffern ist ein pragmatischer
Formfilter, aber kein semantischer Beweis, dass jede solche Zahl tatsächlich
eine Meta-Objekt-ID ist. Eine absolute Garantie erfordert nach finaler Meta-
Konfiguration eine exakte ID-Allowlist oder serverseitig signierte Attribution.

## Externe QA

Modell: `openai/gpt-5.6-terra` über OpenRouter, ZDR und
`data_collection=deny`.

Verdict: **GO-WITH-CHANGES**.

Tenant-Policy untersagte den Export des privaten Quellcode-Diffs. Deshalb war
die externe Stufe bewusst quellenfrei und prüfte Sicherheitsvertrag,
Änderungsbeschreibung und Testergebnisse. Sie bestätigte die bedingte Eignung
für zwei strikt write-freie Deploy Previews und markierte die verbleibenden
Grenzen korrekt:

1. Die tatsächlich wirksame Netlify-Site-Konfiguration muss vor einer
   aussagekräftigen Hosted-Abnahme den Astro-Build und den Preview-Kontext
   verwenden; ein alter UI-Override oder ein Next.js-Plugin darf den
   Repository-Build nicht ersetzen.
2. Hosted müssen Safe-off, Cross-Origin-Handoff, Header und fehlende Provider-
   beziehungsweise Datenbankwrites beobachtbar geprüft werden. Ein write-freier
   Preview beweist absichtlich nicht die spätere Providerkette.
3. Vor Production bleiben Consent-/Attributions-Negativtests, CAPI-Testevent,
   Cal-Webhook-Konfiguration und Telegram-Zugang eigenständige Gates.

## Abschlussurteil

Das lokale, integrierte Code- und Creative-Delta ist für zwei neue, isolierte,
write-freie Deploy Previews freigegeben. Es ist **keine Production- oder
Kampagnenfreigabe**. Die Netlify-Site-Konfiguration, Hosted-Netzwerkprüfung,
exakte Meta-ID-Abnahme, CAPI, Cal und Telegram bleiben harte Launch-Gates.

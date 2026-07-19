# Finaler Tracking-Delta-Check

Stand: 19.07.2026 · Zielbranch `feat/funnel-preview-refinement` · nicht live

## Prüfgegenstand

Geprüft wurde ausschließlich das letzte Delta für Consent, Analytics-
Properties, objektgenaue Meta-Attribution, die korrigierten Creatives und die
ehrliche Launch-Übergabe.

## Builder-Nachweise

- `npm test`: 58/58 bestanden.
- `npm run test:migration`: lokale Migration und Lead-Funnel-Integration
  bestanden.
- `npm audit --audit-level=high`: 0 bekannte Schwachstellen.
- `netlify build --offline --context deploy-preview`: bestanden.
- `npm run test:netlify-manifest`: Functions API v2, drei Traffic Rules und
  isoliertes `submit-lead`-Bundle bestätigt.
- `git diff --check`: bestanden.
- Drei Creative-PNGs mit „8 adaptive Fragen“ neu gerendert, Maße und RGB-
  Ausgabe geprüft sowie visuell abgenommen.

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

## Externe QA

Modell: `openai/gpt-5.6-terra` über OpenRouter, ZDR und
`data_collection=deny`.

Verdict: **GO-WITH-CHANGES**.

Tenant-Policy untersagte den Export des privaten Quellcode-Diffs. Deshalb war
die externe Stufe bewusst quellenfrei und prüfte Sicherheitsvertrag,
Änderungsbeschreibung und Testergebnisse. Sie bestätigte die konzeptionelle
Eignung für einen neuen nichtproduktiven Preview, markierte aber zwei bereits
offengelegte Grenzen:

1. Die Netlify-Site-UI enthält noch den veralteten Build-Befehl
   `npm run build` und ein unpassendes Next.js-Plugin; der finale Hosted Preview
   fehlt.
2. Eine quellenfreie externe Prüfung ersetzt weder Codeeinsicht noch Hosted-
   Netzwerkspuren. Diese Evidenz muss vor Production aus internem Critic,
   Preview-Logs, Browser-Netzwerkprüfung und Events Manager zusammengesetzt
   werden.

## Abschlussurteil

Das lokale Code- und Creative-Delta ist für einen neuen, isolierten Deploy
Preview freigegeben. Es ist **keine Production- oder Kampagnenfreigabe**. Die
Netlify-Konfiguration, Preview-Secrets, Hosted-Netzwerkprüfung und externen
Provider-E2Es bleiben harte Launch-Gates.

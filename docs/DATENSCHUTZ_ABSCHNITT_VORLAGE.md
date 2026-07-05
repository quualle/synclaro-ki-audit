# Vorlage: Abschnitt für synclaro.de/datenschutz — „KI-Betriebs-Check"

**Zweck:** Der Check (ki-check.synclaro.de) verlinkt seit v3 im Einwilligungs-Häkchen auf die Datenschutzerklärung. Dort sollte dieser Abschnitt ergänzt werden. Einbau über die Website-Session/Marco — NICHT Teil dieses Repos.

**Wichtiger Hinweis:** Ich bin kein Rechtsanwalt. Diese Vorlage bildet den technischen Ist-Zustand korrekt ab und folgt gängiger DSGVO-Praxis (Art. 13 Informationspflicht, Einwilligung Art. 6 Abs. 1 lit. a, Drittlandtransfer Kap. V). Für eine belastbare Rechtsauskunft bitte kurz vom Anwalt/Datenschutzbeauftragten gegenlesen lassen.

---

## KI-Betriebs-Check (ki-check.synclaro.de)

**Was passiert mit Ihren Angaben?**
Beim KI-Betriebs-Check beantworten Sie Fragen zu Ihrem Betrieb (z. B. Branche, Betriebsgröße, Arbeitsabläufe). Zur automatischen Auswertung und zur Erstellung Ihrer individuellen Fragen und Ihres Ergebnisses übermitteln wir Ihre Antworten an unseren technischen Dienstleister **OpenAI, L.L.C.** (USA). Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie vor dem Start des Checks aktiv erteilen und jederzeit mit Wirkung für die Zukunft widerrufen können; die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt davon unberührt. Die Übermittlung in die USA erfolgt auf Grundlage des EU-U.S. Data Privacy Framework bzw. der EU-Standardvertragsklauseln; laut OpenAI-API-Bedingungen werden API-Daten nicht zum Training der Modelle verwendet.

**Welche Daten sind betroffen?**
Ihre Antworten im Check sowie — freiwillig — Ihr Vorname zur persönlichen Ansprache. Der Check erfordert keine E-Mail-Adresse und keine Kontaktdaten. Bitte geben Sie in Freitextfeldern keine Namen von Kunden, Mitarbeitern oder andere personenbezogene Daten Dritter ein.

**Speicherung**
Ihre Antworten, Ihr freiwillig angegebener Vorname, der Zeitpunkt Ihrer Einwilligung und Ihr Ergebnis werden in Ihrem Browser gespeichert (Local Storage), damit Sie einen unterbrochenen Check fortsetzen können; Sie können dies durch Löschen Ihrer Browserdaten jederzeit entfernen. Auf unseren Servern speichern wir aus dem Check-Durchlauf keine personenbezogenen Profile; zur Reichweitenmessung erfassen wir technische Nutzungsereignisse (z. B. Seitenaufruf, Check abgeschlossen) ohne Bildung von Nutzerprofilen.

**Terminbuchung**
Wenn Sie im Anschluss ein Strategiegespräch buchen, geschieht das über den Dienst Cal.com; dabei wird Ihr Check-Ergebnis (Punktzahl, Branche, Betriebsgröße) zur Vorbereitung des Gesprächs in die Buchungsnotiz übernommen. Diese Übernahme erfolgt erst durch Ihren aktiven Klick auf den Buchungslink und ist vorvertragliche Maßnahme auf Ihre Anfrage (Art. 6 Abs. 1 lit. b DSGVO); Sie können die Notiz im Buchungsformular vor dem Absenden einsehen und löschen. Es gelten ergänzend die Datenschutzhinweise von Cal.com.

**Hosting**
Die Seite wird bei Netlify, Inc. (USA) gehostet; dabei fallen übliche Server-Logdaten an (z. B. IP-Adresse, Zeitpunkt des Abrufs) — Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb).

---

## Checkliste Umsetzung (Stand v3-Neubau, 05.07.2026)

- [x] Aktives Einwilligungs-Häkchen VOR der ersten Datenübermittlung (Steckbrief Schritt 5, Buttons bis dahin gesperrt), Einwilligungszeitpunkt wird lokal protokolliert
- [x] Klartext-Hinweis auf OpenAI/USA + Warnung vor Fremd-Personendaten in Freitext
- [x] Link auf synclaro.de/datenschutz im Häkchen-Text
- [x] Keine E-Mail-Pflicht, keine serverseitige Antwort-Speicherung
- [ ] Diesen Abschnitt in synclaro.de/datenschutz einpflegen (Website-Repo, Marco/andere Session)
- [ ] Optional: Anwalt/DSB-Gegencheck

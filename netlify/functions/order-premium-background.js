// Synclaro KI-Readiness Premium Report — Bestellung & Lieferung
// 1. KI-Report generieren (OpenAI GPT-4o)
// 2. sevDesk-Rechnung erstellen
// 3. Lead in Supabase speichern
// 4. Report per E-Mail versenden (Resend)

const OpenAI = require("openai");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─────────────────────────────────────────────
// OpenAI Report-Generierung
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Du bist ein KI-Strategie-Berater von Synclaro, spezialisiert auf die KI-Transformation von Handwerksbetrieben. Du erstellst detaillierte, praxisnahe KI-Implementierungsberichte.

Schreibe den Bericht auf Deutsch, professionell aber verständlich. Vermeide Buzzwords. Fokussiere auf konkrete, sofort umsetzbare Maßnahmen.

Der Bericht soll folgende Struktur haben:

1. EXECUTIVE SUMMARY (2-3 Absätze)
- KI-Readiness-Score und Einordnung
- Wichtigste Erkenntnisse
- Größtes Potenzial

2. DETAILANALYSE PRO BEREICH
Für jeden der 3 Bereiche (Digitalisierung, Kommunikation, KI-Bereitschaft):
- Aktueller Stand (basierend auf Antworten)
- Konkrete Schwachstellen
- Spezifische Verbesserungsmaßnahmen
- Erwarteter ROI/Zeitersparnis

3. BRANCHENSPEZIFISCHE KI-EMPFEHLUNGEN
Basierend auf der Branche des Unternehmens:
- 5 KI-Tools die sofort eingesetzt werden können (mit konkreten Produktnamen)
- Für jedes Tool: Was es löst, Kosten, Einführungszeit

4. IMPLEMENTIERUNGS-ROADMAP
- Monat 1-3: Quick Wins (sofort umsetzbar, kein Budget nötig)
- Monat 4-6: Kernprojekte (moderate Investition, hoher Impact)
- Monat 7-12: Transformation (strategische KI-Integration)

5. ROI-PROJEKTION
Basierend auf Unternehmensgröße und Branche:
- Geschätzte Zeitersparnis pro Woche
- Geschätzte Kostenreduktion pro Jahr
- Erwarteter Produktivitätsgewinn

6. 10 SOFORT NUTZBARE PROMPT-VORLAGEN
Branchenspezifische Prompts für:
- Angebotserstellung
- Kundenkommunikation
- Projektplanung
- Qualitätskontrolle
- Mitarbeiter-Onboarding
- Materialkalkulation
- Reklamationsbearbeitung
- Social Media / Marketing
- Dokumentation
- Wissenstransfer

7. NÄCHSTE SCHRITTE
- 3 konkrete Aktionen für diese Woche
- Hinweis auf Synclaro Gruppencoaching (4.779€, 24 Wochen)
- KOMPASS-Förderung erwähnen (90% Förderung möglich)
- Link: https://synclaro.de/kontakt

Formatiere den gesamten Bericht als sauberes HTML mit Inline-Styles für E-Mail-Kompatibilität.
Verwende folgendes Farbschema:
- Primärfarbe: #FF4F00 (Orange, für Überschriften und Akzente)
- Dunkel: #1A1A1A (für Texte)
- Hell: #FFFBF5 (für Hintergründe)
- Weiß: #FFFFFF (für Karten/Boxen)

Verwende keine externen CSS-Dateien oder <style>-Tags. Alles muss inline sein.
Verwende klare Typografie, ausreichend Weißraum und visuelle Hierarchie.`;

async function generateReport(company, answers, scores) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `Erstelle einen detaillierten KI-Readiness Premium Report für folgendes Unternehmen:

UNTERNEHMEN:
- Name: ${company.name}
- Branche: ${answers.company?.branche || "Handwerk"}
- Mitarbeiter: ${answers.company?.mitarbeiter || "unbekannt"}
- Umsatz: ${answers.company?.umsatz || "unbekannt"}
- Ansprechpartner: ${company.ansprechpartner}
- Ort: ${company.plz} ${company.ort}

FRAGEBOGEN-ERGEBNISSE:

Digitalisierung (${scores.digitalisierung.score}/${scores.digitalisierung.max} Punkte, ${scores.digitalisierung.percent}%):
- Kundenanfragen-Management: ${answers.digitalisierung?.kundenanfragen}/4
- Angebotserstellung: ${answers.digitalisierung?.angebote}/4
- Projektdokumentation: ${answers.digitalisierung?.dokumentation}/4
- Wissensmanagement: ${answers.digitalisierung?.wissen}/4

Kommunikation (${scores.kommunikation.score}/${scores.kommunikation.max} Punkte, ${scores.kommunikation.percent}%):
- Büro-Baustelle-Kommunikation: ${answers.kommunikation?.buero_baustelle}/4
- Zeiterfassung: ${answers.kommunikation?.zeiterfassung}/4
- Rechnungsstellung: ${answers.kommunikation?.rechnungen}/4
- Materialbeschaffung: ${answers.kommunikation?.beschaffung}/4

KI-Bereitschaft (${scores.ki_bereitschaft.score}/${scores.ki_bereitschaft.max} Punkte, ${scores.ki_bereitschaft.percent}%):
- KI-Erfahrung: ${answers.ki_bereitschaft?.erfahrung}/4
- Budget-Bereitschaft: ${answers.ki_bereitschaft?.budget}/4
- Timeline/Dringlichkeit: ${answers.ki_bereitschaft?.timeline}/4

GESAMTSCORE: ${scores.total.score}/${scores.total.max} (${scores.total.percent}%)
LEVEL: ${scores.level || getLevel(scores.total.percent)}

SCHMERZPUNKTE:
- Größter Zeitfresser: ${answers.schmerzpunkte?.zeitfresser || "nicht angegeben"}
- Häufigste Fehlerquelle: ${answers.schmerzpunkte?.fehlerquelle || "nicht angegeben"}
- Wunsch-Automatisierung: ${answers.schmerzpunkte?.automatisieren || "nicht angegeben"}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 8000,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

function getLevel(percent) {
  if (percent < 25) return "KI-Einsteiger";
  if (percent < 50) return "Digital-Grundlage";
  if (percent < 75) return "Fortgeschritten";
  return "KI-Vorreiter";
}

// ─────────────────────────────────────────────
// sevDesk Rechnungserstellung
// ─────────────────────────────────────────────

async function createSevdeskInvoice(company) {
  const token = process.env.SEVDESK_API_TOKEN;
  if (!token) {
    console.warn("SEVDESK_API_TOKEN nicht gesetzt — Rechnung wird übersprungen.");
    return null;
  }

  const baseUrl = "https://my.sevdesk.de/api/v1";
  const headers = {
    Authorization: token,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    // 1. Kontakt suchen
    let contactId = null;
    const searchRes = await fetch(
      `${baseUrl}/Contact?search=${encodeURIComponent(company.name)}&depth=1`,
      { headers }
    );
    const searchData = await searchRes.json();

    if (searchData.objects && searchData.objects.length > 0) {
      contactId = searchData.objects[0].id;
      console.log(`sevDesk: Bestehender Kontakt gefunden (ID: ${contactId})`);
    } else {
      // 2. Kontakt anlegen (als Unternehmen)
      const contactRes = await fetch(`${baseUrl}/Contact`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerNumber: null,
          name: company.name,
          category: { id: 3, objectName: "Category" }, // 3 = Kunde
          description: `KI-Audit Lead — ${company.ansprechpartner || ""} — ${company.email}`,
        }),
      });
      const contactData = await contactRes.json();
      contactId = contactData.objects?.id;
      console.log(`sevDesk: Neuer Kontakt erstellt (ID: ${contactId})`);

      // Adresse anlegen
      if (contactId && company.strasse) {
        await fetch(`${baseUrl}/ContactAddress`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            contact: { id: contactId, objectName: "Contact" },
            street: company.strasse,
            zip: company.plz,
            city: company.ort,
            country: { id: 1, objectName: "StaticCountry" }, // 1 = Deutschland
            category: { id: 47, objectName: "Category" }, // 47 = Rechnungsadresse
          }),
        });
      }

      // E-Mail anlegen
      if (contactId && company.email) {
        await fetch(`${baseUrl}/CommunicationWay`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            contact: { id: contactId, objectName: "Contact" },
            type: "EMAIL",
            key: { id: 2, objectName: "CommunicationWayKey" }, // 2 = Arbeit
            value: company.email,
          }),
        });
      }
    }

    if (!contactId) {
      console.error("sevDesk: Kontakt konnte nicht erstellt werden.");
      return null;
    }

    // 3. Rechnung erstellen (application/x-www-form-urlencoded)
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 14);

    const invoiceBody = new URLSearchParams();

    // Invoice-Daten
    invoiceBody.append("invoice[objectName]", "Invoice");
    invoiceBody.append("invoice[mapAll]", "true");
    invoiceBody.append("invoice[contact][id]", contactId);
    invoiceBody.append("invoice[contact][objectName]", "Contact");
    invoiceBody.append("invoice[contactPerson][id]", "1440240");
    invoiceBody.append("invoice[contactPerson][objectName]", "SevUser");
    invoiceBody.append("invoice[invoiceDate]", today.toISOString().split("T")[0]);
    invoiceBody.append("invoice[discount]", "0");
    invoiceBody.append("invoice[deliveryDate]", today.toISOString().split("T")[0]);
    invoiceBody.append("invoice[deliveryDateUntil]", today.toISOString().split("T")[0]);
    invoiceBody.append("invoice[status]", "100"); // 100 = Entwurf
    invoiceBody.append("invoice[header]", "KI-Readiness Premium Report");
    invoiceBody.append("invoice[headText]", `Vielen Dank für Ihr Vertrauen in die KI-Analyse von Synclaro.`);
    invoiceBody.append("invoice[footText]", "Zahlbar innerhalb von 14 Tagen ohne Abzug.");
    invoiceBody.append("invoice[taxType]", "default");
    invoiceBody.append("invoice[currency]", "EUR");
    invoiceBody.append("invoice[invoiceType]", "RE");
    invoiceBody.append("invoice[timeToPay]", "14");
    invoiceBody.append(
      "invoice[address]",
      `${company.name}\n${company.ansprechpartner || ""}\n${company.strasse || ""}\n${company.plz || ""} ${company.ort || ""}`
    );

    // Rechnungsposition
    invoiceBody.append("invoicePosSave[0][objectName]", "InvoicePos");
    invoiceBody.append("invoicePosSave[0][mapAll]", "true");
    invoiceBody.append("invoicePosSave[0][quantity]", "1");
    invoiceBody.append("invoicePosSave[0][price]", "29");
    invoiceBody.append(
      "invoicePosSave[0][name]",
      `KI-Readiness Premium Report — Detaillierte KI-Analyse und Implementierungsplan für ${company.name}`
    );
    invoiceBody.append("invoicePosSave[0][unity][id]", "1");
    invoiceBody.append("invoicePosSave[0][unity][objectName]", "Unity");
    invoiceBody.append("invoicePosSave[0][taxRate]", "19");
    invoiceBody.append("invoicePosSave[0][priceNet]", "29");

    const invoiceRes = await fetch(`${baseUrl}/Invoice/Factory/saveInvoice`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: invoiceBody.toString(),
    });

    const invoiceData = await invoiceRes.json();
    const invoiceId = invoiceData.objects?.invoice?.id;

    if (!invoiceId) {
      console.error("sevDesk: Rechnung konnte nicht erstellt werden:", JSON.stringify(invoiceData));
      return null;
    }

    console.log(`sevDesk: Rechnung erstellt (ID: ${invoiceId})`);

    // 4. Rechnung als versendet markieren
    await fetch(`${baseUrl}/Invoice/${invoiceId}/sendBy`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        sendType: "VM",
        sendDraft: false,
      }),
    });

    console.log(`sevDesk: Rechnung ${invoiceId} als versendet markiert.`);
    return invoiceId;
  } catch (err) {
    console.error("sevDesk-Fehler:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Supabase Lead-Speicherung
// ─────────────────────────────────────────────

async function storeLeadInSupabase(company, answers, scores) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase-Credentials nicht gesetzt — Lead-Speicherung übersprungen.");
    return null;
  }

  try {
    const supabase = createClient(url, key);

    const { data, error } = await supabase.from("ki_audit_leads").insert([
      {
        company_name: company.name,
        email: company.email,
        ansprechpartner: company.ansprechpartner,
        telefon: company.telefon || null,
        strasse: company.strasse || null,
        plz: company.plz || null,
        ort: company.ort || null,
        branche: answers.company?.branche || null,
        mitarbeiter: answers.company?.mitarbeiter || null,
        umsatz: answers.company?.umsatz || null,
        answers: answers,
        scores: scores,
        level: scores.level || getLevel(scores.total.percent),
        total_percent: scores.total.percent,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase-Fehler:", error.message);
      return null;
    }

    console.log("Supabase: Lead gespeichert.");
    return data;
  } catch (err) {
    console.error("Supabase-Fehler:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// E-Mail-Versand via Resend
// ─────────────────────────────────────────────

function wrapReportInEmailTemplate(reportHtml, company) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KI-Readiness Premium Report — ${company.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1A1A1A;">
  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A;">
    <tr>
      <td style="padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #FF4F00; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SYNCLARO</h1>
        <p style="margin: 8px 0 0 0; color: #FFFFFF; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">KI-Readiness Premium Report</p>
      </td>
    </tr>
  </table>

  <!-- Begrüßung -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 32px 24px 16px 24px; max-width: 680px; margin: 0 auto;">
        <p style="font-size: 16px; line-height: 1.6; color: #1A1A1A;">
          Hallo ${company.ansprechpartner || ""},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #1A1A1A;">
          vielen Dank für Ihre Bestellung des KI-Readiness Premium Reports für <strong>${company.name}</strong>.
          Nachfolgend finden Sie Ihre detaillierte Analyse mit konkreten Handlungsempfehlungen.
        </p>
      </td>
    </tr>
  </table>

  <!-- Report-Inhalt -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 0 24px 32px 24px;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          ${reportHtml}
        </div>
      </td>
    </tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 16px 24px 32px 24px; text-align: center;">
        <p style="font-size: 18px; font-weight: 600; color: #1A1A1A; margin-bottom: 16px;">
          Bereit für den nächsten Schritt?
        </p>
        <a href="https://synclaro.de/kontakt"
           style="display: inline-block; background-color: #FF4F00; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
          Kostenloses Erstgespräch buchen
        </a>
        <p style="font-size: 14px; color: #666666; margin-top: 12px;">
          30 Minuten — unverbindlich — konkrete nächste Schritte
        </p>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A;">
    <tr>
      <td style="padding: 32px 24px; text-align: center;">
        <p style="color: #FF4F00; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">SYNCLARO</p>
        <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0;">
          KI-Beratung für das Handwerk<br>
          Marco Heer — marcoheer@synclaro.de<br>
          <a href="https://synclaro.de" style="color: #FF4F00; text-decoration: none;">synclaro.de</a>
        </p>
        <hr style="border: none; border-top: 1px solid #333333; margin: 16px 0;">
        <p style="color: #666666; font-size: 11px; line-height: 1.5; margin: 0;">
          Synclaro — Marco Heer<br>
          Diese E-Mail wurde automatisch generiert. Der Bericht ist urheberrechtlich geschützt.<br>
          Eine Rechnung über 34,51 € (29,00 € zzgl. 19% MwSt.) wird separat zugestellt.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendReportEmail(company, reportHtml) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY nicht gesetzt — E-Mail-Versand übersprungen.");
    return null;
  }

  try {
    const resend = new Resend(apiKey);
    const emailHtml = wrapReportInEmailTemplate(reportHtml, company);

    const { data, error } = await resend.emails.send({
      from: "Synclaro KI-Audit <audit@synclaro.de>",
      to: [company.email],
      subject: `Ihr KI-Readiness Premium Report — ${company.name}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend-Fehler:", error);
      return null;
    }

    console.log("Resend: E-Mail versendet an", company.email);
    return data;
  } catch (err) {
    console.error("Resend-Fehler:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Hauptfunktion
// ─────────────────────────────────────────────

exports.handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Nur POST erlauben
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Methode nicht erlaubt. Bitte POST verwenden." }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { company, answers, scores } = data;

    // Eingabevalidierung
    if (!company?.name || !company?.email) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Firmenname und E-Mail-Adresse sind Pflichtfelder.",
        }),
      };
    }

    if (!answers || !scores) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Fragebogen-Antworten und Scores sind erforderlich.",
        }),
      };
    }

    console.log(`Premium-Bestellung von: ${company.name} (${company.email})`);

    // 1. KI-Report generieren (kritisch — bei Fehler abbrechen)
    let reportHtml;
    try {
      reportHtml = await generateReport(company, answers, scores);
      console.log("OpenAI: Report erfolgreich generiert.");
    } catch (err) {
      console.error("OpenAI-Fehler:", err.message);
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Report-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        }),
      };
    }

    // 2-4. Parallel: sevDesk, Supabase, E-Mail
    // sevDesk und Supabase dürfen fehlschlagen, E-Mail ist wichtig
    const results = await Promise.allSettled([
      createSevdeskInvoice(company),
      storeLeadInSupabase(company, answers, scores),
      sendReportEmail(company, reportHtml),
    ]);

    const [invoiceResult, leadResult, emailResult] = results;

    const invoiceId =
      invoiceResult.status === "fulfilled" ? invoiceResult.value : null;
    const leadStored =
      leadResult.status === "fulfilled" && leadResult.value !== null;
    const emailSent =
      emailResult.status === "fulfilled" && emailResult.value !== null;

    // Fehlgeschlagene Schritte loggen
    if (invoiceResult.status === "rejected") {
      console.error("sevDesk fehlgeschlagen:", invoiceResult.reason?.message);
    }
    if (leadResult.status === "rejected") {
      console.error("Supabase fehlgeschlagen:", leadResult.reason?.message);
    }
    if (emailResult.status === "rejected") {
      console.error("Resend fehlgeschlagen:", emailResult.reason?.message);
    }

    // Wenn E-Mail nicht gesendet werden konnte, warnen
    if (!emailSent) {
      console.warn("WARNUNG: E-Mail konnte nicht versendet werden!");
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: emailSent
          ? `Premium Report wurde erfolgreich an ${company.email} versendet.`
          : "Report wurde generiert, E-Mail-Versand steht aus. Wir melden uns bei Ihnen.",
        details: {
          report_generated: true,
          email_sent: emailSent,
          invoice_created: invoiceId !== null,
          invoice_id: invoiceId,
          lead_stored: leadStored,
        },
      }),
    };
  } catch (err) {
    console.error("Schwerwiegender Fehler:", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns unter marcoheer@synclaro.de.",
      }),
    };
  }
};

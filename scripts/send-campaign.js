#!/usr/bin/env node

/**
 * Synclaro KI-Readiness-Check — E-Mail-Kampagne
 *
 * Sendet personalisierte E-Mails an Kontakte aus der Supabase-Datenbank
 * über die Resend API.
 *
 * SICHERHEIT: DRY_RUN ist standardmäßig aktiviert.
 * Nur mit DRY_RUN=false werden tatsächlich E-Mails versendet.
 *
 * Verwendung:
 *   node send-campaign.js                      # Dry Run (Standard)
 *   DRY_RUN=false node send-campaign.js        # Tatsächlich senden
 *   CAMPAIGN=multiplikatoren node send-campaign.js  # Multiplikatoren-Kampagne
 *   LIMIT=5 node send-campaign.js              # Nur 5 Kontakte
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const DRY_RUN = process.env.DRY_RUN !== "false"; // true = nur loggen
const CAMPAIGN = process.env.CAMPAIGN || "handwerker"; // "handwerker" oder "multiplikatoren"
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const RATE_LIMIT_MS = 500; // Max 2 E-Mails pro Sekunde

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const FROM_ADDRESS = "Marco Heer | Synclaro <marcoheer@synclaro.de>";
const CHECK_URL = "https://ki-check.synclaro.de";

const SUBJECTS = {
  handwerker:
    "Wie KI-ready ist Ihr Betrieb? Kostenloser Check in 3 Minuten",
  multiplikatoren:
    "Neues kostenloses Tool für Ihre Mitgliedsbetriebe: KI-Readiness-Check",
};

const TEMPLATE_FILES = {
  handwerker: path.join(__dirname, "..", "marketing", "email-handwerker.html"),
  multiplikatoren: path.join(
    __dirname,
    "..",
    "marketing",
    "email-multiplikatoren.html"
  ),
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function validateEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (!RESEND_API_KEY && !DRY_RUN) missing.push("RESEND_API_KEY");

  if (missing.length > 0) {
    console.error(
      `\n  Fehlende Umgebungsvariablen: ${missing.join(", ")}\n`
    );
    console.error(
      "  Bitte zuerst laden: source ~/.synclaro/.env\n"
    );
    process.exit(1);
  }
}

function loadTemplate(campaign) {
  const filePath = TEMPLATE_FILES[campaign];
  if (!fs.existsSync(filePath)) {
    console.error(`Template nicht gefunden: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf-8");
}

function personalizeTemplate(template, contact, campaign) {
  let html = template;

  if (campaign === "handwerker") {
    const vorname = contact.first_name || contact.vorname || "Guten Tag";
    html = html.replace(/\{\{VORNAME\}\}/g, vorname);
  } else {
    // Multiplikatoren
    const nachname = contact.last_name || contact.nachname || "";
    const anrede = contact.anrede || (nachname ? "Sehr geehrte/r Herr/Frau" : "Guten Tag");
    html = html.replace(/\{\{ANREDE\}\}/g, anrede);
    html = html.replace(/\{\{NACHNAME\}\}/g, nachname);
  }

  // Allgemeine Platzhalter
  html = html.replace(/\{\{CHECK_URL\}\}/g, CHECK_URL);
  html = html.replace(
    /\{\{UNSUBSCRIBE_URL\}\}/g,
    `https://synclaro.de/abmelden?email=${encodeURIComponent(contact.email || "")}`
  );

  return html;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Supabase-Abfrage: Kontakte laden
// ---------------------------------------------------------------------------

async function fetchContacts(campaign) {
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("\n  Supabase-Tabellen werden geprüft...\n");

  // Strategie: Verschiedene Tabellen je nach Kampagnentyp abfragen
  // Das CRM hat: crm_contacts (neu, Master), crm_customers (alt),
  //              aaa_organisations (HWK/IHK), crm_multipliers, webinar_registrations

  let contacts = [];

  if (campaign === "handwerker") {
    // 1. Versuch: crm_contacts mit contact_type 'lead' oder 'webinar_lead'
    try {
      let query = supabase
        .from("crm_contacts")
        .select("id, first_name, last_name, email, contact_type, tags")
        .not("email", "is", null)
        .in("contact_type", ["lead", "webinar_lead", "bestandskunde"]);

      if (LIMIT) query = query.limit(LIMIT);
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        console.log(
          `  [crm_contacts] ${data.length} Kontakte gefunden (lead/webinar_lead/bestandskunde)`
        );
        contacts = data;
      } else if (error) {
        console.log(`  [crm_contacts] Fehler: ${error.message}`);
      } else {
        console.log("  [crm_contacts] Keine passenden Kontakte gefunden");
      }
    } catch (e) {
      console.log(`  [crm_contacts] Tabelle nicht erreichbar: ${e.message}`);
    }

    // 2. Fallback: crm_customers
    if (contacts.length === 0) {
      try {
        let query = supabase
          .from("crm_customers")
          .select("id, name, email, phase, status")
          .not("email", "is", null);

        if (LIMIT) query = query.limit(LIMIT);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          console.log(`  [crm_customers] ${data.length} Kontakte gefunden`);
          // Normalisieren auf einheitliches Format
          contacts = data.map((c) => {
            const parts = (c.name || "").split(" ");
            return {
              id: c.id,
              first_name: parts[0] || "",
              last_name: parts.slice(1).join(" ") || "",
              email: c.email,
              contact_type: "bestandskunde",
            };
          });
        } else if (error) {
          console.log(`  [crm_customers] Fehler: ${error.message}`);
        }
      } catch (e) {
        console.log(`  [crm_customers] Tabelle nicht erreichbar: ${e.message}`);
      }
    }

    // 3. Fallback: webinar_registrations (historische Leads)
    if (contacts.length === 0) {
      try {
        let query = supabase
          .from("webinar_registrations")
          .select("id, first_name, last_name, email")
          .not("email", "is", null);

        if (LIMIT) query = query.limit(LIMIT);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          console.log(
            `  [webinar_registrations] ${data.length} Kontakte gefunden`
          );
          contacts = data.map((c) => ({
            ...c,
            contact_type: "webinar_lead",
          }));
        } else if (error) {
          console.log(`  [webinar_registrations] Fehler: ${error.message}`);
        }
      } catch (e) {
        console.log(
          `  [webinar_registrations] Tabelle nicht erreichbar: ${e.message}`
        );
      }
    }
  } else {
    // Multiplikatoren-Kampagne

    // 1. Versuch: crm_contacts mit contact_type 'multiplikator' oder 'ansprechpartner'
    try {
      let query = supabase
        .from("crm_contacts")
        .select("id, first_name, last_name, email, contact_type, organisation_id, tags")
        .not("email", "is", null)
        .in("contact_type", ["multiplikator", "ansprechpartner"]);

      if (LIMIT) query = query.limit(LIMIT);
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        console.log(
          `  [crm_contacts] ${data.length} Multiplikatoren/Ansprechpartner gefunden`
        );
        contacts = data;
      } else if (error) {
        console.log(`  [crm_contacts] Fehler: ${error.message}`);
      } else {
        console.log(
          "  [crm_contacts] Keine Multiplikatoren/Ansprechpartner gefunden"
        );
      }
    } catch (e) {
      console.log(`  [crm_contacts] Tabelle nicht erreichbar: ${e.message}`);
    }

    // 2. Fallback: aaa_organisations (HWK/IHK mit Ansprechpartner-E-Mails)
    if (contacts.length === 0) {
      try {
        let query = supabase
          .from("aaa_organisations")
          .select(
            "id, name, contact_name, contact_email, type, status"
          )
          .not("contact_email", "is", null)
          .neq("contact_email", "")
          .in("status", ["interested", "in_contact", "cooperation", "kooperation"]);

        if (LIMIT) query = query.limit(LIMIT);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          console.log(
            `  [aaa_organisations] ${data.length} Organisationen mit Ansprechpartner gefunden`
          );
          contacts = data.map((org) => {
            const parts = (org.contact_name || "").split(" ");
            return {
              id: org.id,
              first_name: parts[0] || "",
              last_name: parts.slice(1).join(" ") || "",
              email: org.contact_email,
              contact_type: "ansprechpartner",
              organisation: org.name,
            };
          });
        } else if (error) {
          console.log(`  [aaa_organisations] Fehler: ${error.message}`);
        }
      } catch (e) {
        console.log(
          `  [aaa_organisations] Tabelle nicht erreichbar: ${e.message}`
        );
      }
    }

    // 3. Fallback: crm_multipliers
    if (contacts.length === 0) {
      try {
        let query = supabase
          .from("crm_multipliers")
          .select("id, name, email")
          .not("email", "is", null);

        if (LIMIT) query = query.limit(LIMIT);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          console.log(`  [crm_multipliers] ${data.length} Multiplikatoren gefunden`);
          contacts = data.map((m) => {
            const parts = (m.name || "").split(" ");
            return {
              id: m.id,
              first_name: parts[0] || "",
              last_name: parts.slice(1).join(" ") || "",
              email: m.email,
              contact_type: "multiplikator",
            };
          });
        } else if (error) {
          console.log(`  [crm_multipliers] Fehler: ${error.message}`);
        }
      } catch (e) {
        console.log(
          `  [crm_multipliers] Tabelle nicht erreichbar: ${e.message}`
        );
      }
    }
  }

  // E-Mails deduplizieren
  const seen = new Set();
  contacts = contacts.filter((c) => {
    if (!c.email || seen.has(c.email.toLowerCase())) return false;
    seen.add(c.email.toLowerCase());
    return true;
  });

  return contacts;
}

// ---------------------------------------------------------------------------
// E-Mail senden via Resend API
// ---------------------------------------------------------------------------

async function sendEmail(to, subject, html) {
  if (DRY_RUN) {
    return { id: "dry-run-" + Date.now(), status: "simulated" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API Fehler ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Kampagnen-Log
// ---------------------------------------------------------------------------

function initLog() {
  const logDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(
    logDir,
    `campaign-${CAMPAIGN}-${timestamp}.json`
  );

  return {
    file: logFile,
    entries: [],
    add(entry) {
      this.entries.push(entry);
    },
    save() {
      fs.writeFileSync(this.file, JSON.stringify(this.entries, null, 2), "utf-8");
      console.log(`\n  Log gespeichert: ${this.file}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  SYNCLARO KI-Readiness-Check — E-Mail-Kampagne");
  console.log("=".repeat(60));
  console.log(`\n  Kampagne:    ${CAMPAIGN}`);
  console.log(`  Modus:       ${DRY_RUN ? "DRY RUN (keine E-Mails werden gesendet)" : "LIVE — E-Mails werden gesendet!"}`);
  if (LIMIT) console.log(`  Limit:       ${LIMIT} Kontakte`);
  console.log(`  Betreff:     ${SUBJECTS[CAMPAIGN]}`);
  console.log(`  Von:         ${FROM_ADDRESS}`);

  if (!DRY_RUN) {
    console.log(
      "\n  *** ACHTUNG: LIVE-MODUS! E-Mails werden tatsächlich gesendet! ***"
    );
    console.log("  Warte 5 Sekunden — Ctrl+C zum Abbrechen...\n");
    await sleep(5000);
  }

  // Umgebungsvariablen prüfen
  validateEnv();

  // Template laden
  const template = loadTemplate(CAMPAIGN);
  console.log(`\n  Template geladen: ${TEMPLATE_FILES[CAMPAIGN]}`);

  // Kontakte laden
  const contacts = await fetchContacts(CAMPAIGN);

  if (contacts.length === 0) {
    console.log("\n  Keine Kontakte gefunden. Kampagne wird beendet.\n");
    console.log("  Tipp: Prüfen Sie die Supabase-Tabellen und -Daten.");
    console.log(
      "  Vorhandene Tabellen: crm_contacts, crm_customers, aaa_organisations,\n" +
      "                       crm_multipliers, webinar_registrations\n"
    );
    process.exit(0);
  }

  console.log(`\n  ${contacts.length} Kontakte zum Versand bereit.\n`);
  console.log("-".repeat(60));

  // Kampagnen-Log initialisieren
  const log = initLog();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const email = contact.email;
    const name = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unbekannt";

    // E-Mails ohne gültige Adresse überspringen
    if (!email || !email.includes("@")) {
      console.log(`  SKIP  ${name} — keine gültige E-Mail`);
      skipped++;
      log.add({
        status: "skipped",
        name,
        email,
        reason: "Keine gültige E-Mail",
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    // Personalisieren
    const html = personalizeTemplate(template, contact, CAMPAIGN);

    try {
      const result = await sendEmail(email, SUBJECTS[CAMPAIGN], html);

      const mode = DRY_RUN ? "DRY " : "SENT";
      console.log(
        `  ${mode}  ${name} <${email}> — ${result.id || "OK"}`
      );
      sent++;
      log.add({
        status: DRY_RUN ? "dry_run" : "sent",
        name,
        email,
        contact_type: contact.contact_type,
        organisation: contact.organisation || null,
        resend_id: result.id || null,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`  FAIL  ${name} <${email}> — ${err.message}`);
      failed++;
      log.add({
        status: "failed",
        name,
        email,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Rate Limiting
    await sleep(RATE_LIMIT_MS);
  }

  // Zusammenfassung
  console.log("\n" + "-".repeat(60));
  console.log("\n  Zusammenfassung:");
  console.log(`  ${DRY_RUN ? "Simuliert" : "Gesendet"}: ${sent}`);
  console.log(`  Fehlgeschlagen:  ${failed}`);
  console.log(`  Übersprungen:    ${skipped}`);
  console.log(`  Gesamt:          ${contacts.length}`);

  log.save();

  if (DRY_RUN) {
    console.log(
      "\n  Dies war ein Dry Run. Für echten Versand:\n" +
        "  DRY_RUN=false node send-campaign.js\n"
    );
  }

  console.log("");
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("\n  Kritischer Fehler:", err.message);
  process.exit(1);
});

"use strict";

const { createClient } = require("@supabase/supabase-js");

function selectSupabaseAdminKey(secretKey, serviceRoleKey) {
  const configured = [secretKey, serviceRoleKey].filter((value) => typeof value === "string" && value.trim());
  if (configured.length !== 1) {
    throw new Error("Für Supabase muss genau ein serverseitiger Admin-Key konfiguriert sein.");
  }
  return configured[0];
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("Serverseitige Supabase-Konfiguration fehlt.");
  }
  const key = selectSupabaseAdminKey(process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "synclaro-ai-readiness/2026-07-18" } },
  });
}

module.exports = { getSupabaseAdmin, selectSupabaseAdminKey };

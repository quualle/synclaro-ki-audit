"use strict";

const { isProduction } = require("./_shared/security");
const { getSupabaseAdmin } = require("./_shared/supabase");

exports.handler = async () => {
  if (!isProduction()) return { statusCode: 204, body: "" };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("purge_ai_readiness_ephemeral_v1");
  if (error) throw new Error(`ephemeral_purge_${error.code || "unknown"}`);
  return { statusCode: 204, body: "" };
};

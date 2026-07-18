"use strict";

const { getSupabaseAdmin } = require("./_shared/supabase");

exports.handler = async () => {
  if (process.env.CONTEXT !== "production") return { statusCode: 204, body: "" };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("purge_ai_readiness_ephemeral_v1");
  if (error) throw new Error(`ephemeral_purge_${error.code || "unknown"}`);
  return { statusCode: 204, body: "" };
};

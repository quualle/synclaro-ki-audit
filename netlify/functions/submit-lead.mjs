import { withLambda } from "@netlify/aws-lambda-compat";
import { createClient as traceSupabaseClient } from "@supabase/supabase-js";
import legacy from "./_shared/submit-lead-handler.js";

if (typeof traceSupabaseClient !== "function") {
  throw new TypeError("Supabase-Laufzeit konnte nicht geladen werden.");
}

export default withLambda(legacy.handler);

export const config = {
  path: "/api/readiness-result",
  rateLimit: {
    windowLimit: 6,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

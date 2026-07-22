import { withLambda } from "@netlify/aws-lambda-compat";
import { createClient as traceSupabaseClient } from "@supabase/supabase-js";
import legacy from "./_shared/meta-pageview-handler.js";

if (typeof traceSupabaseClient !== "function") {
  throw new TypeError("Supabase-Laufzeit konnte nicht geladen werden.");
}

export default withLambda(legacy.handler);

export const config = {
  path: "/api/readiness-meta-pageview",
  rateLimit: {
    windowLimit: 8,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

import { withLambda } from "@netlify/aws-lambda-compat";
import legacy from "./_shared/meta-pageview-handler.js";

export default withLambda(legacy.handler);

export const config = {
  path: "/api/readiness-meta-pageview",
  rateLimit: {
    windowLimit: 8,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

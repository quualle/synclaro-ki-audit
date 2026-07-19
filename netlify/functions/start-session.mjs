import { withLambda } from "@netlify/aws-lambda-compat";
import legacy from "./_shared/start-session-handler.js";

export default withLambda(legacy.handler);

export const config = {
  path: "/api/readiness-session",
  rateLimit: {
    windowLimit: 12,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

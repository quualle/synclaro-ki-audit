import { withLambda } from "@netlify/aws-lambda-compat";
import legacy from "./_shared/generate-questions-handler.js";

export default withLambda(legacy.handler);

export const config = {
  path: "/api/readiness-question",
  rateLimit: {
    windowLimit: 20,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

import { withLambda } from "@netlify/aws-lambda-compat";
import legacy from "./_shared/generate-questions-handler.js";

export default withLambda(legacy.handler);

export const config = {
  path: "/.netlify/functions/generate-questions",
  rateLimit: {
    windowLimit: 20,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

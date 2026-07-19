import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED = {
  "start-session": { path: "/api/readiness-session", windowLimit: 12 },
  "generate-questions": { path: "/api/readiness-question", windowLimit: 20 },
  "submit-lead": { path: "/api/readiness-result", windowLimit: 6 },
};

const manifest = JSON.parse(await readFile(new URL("../.netlify/functions/manifest.json", import.meta.url), "utf8"));
const functions = new Map(manifest.functions.map((entry) => [entry.name, entry]));

for (const [name, expected] of Object.entries(EXPECTED)) {
  const entry = functions.get(name);
  assert.ok(entry, `${name}: fehlt im Netlify-Manifest`);
  assert.equal(entry.buildData?.runtimeAPIVersion, 2, `${name}: läuft nicht auf Functions API v2`);
  assert.deepEqual(entry.routes, [{
    pattern: expected.path,
    literal: expected.path,
    methods: [],
  }], `${name}: Route fehlt oder wurde verändert`);
  assert.deepEqual(entry.trafficRules, {
    action: {
      type: "rate_limit",
      config: {
        rateLimitConfig: {
          windowLimit: expected.windowLimit,
          windowSize: 180,
          algorithm: "sliding_window",
        },
        aggregate: {
          keys: [{ type: "ip" }, { type: "domain" }],
        },
      },
    },
  }, `${name}: Traffic Rule fehlt oder wurde verändert`);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const submitZip = path.join(projectRoot, ".netlify/functions/submit-lead.zip");
const isolatedDirectory = await mkdtemp(path.join(tmpdir(), "synclaro-submit-lead-package-"));
try {
  execFileSync("unzip", ["-q", submitZip, "-d", isolatedDirectory]);
  const packagedSupabase = path.join(isolatedDirectory, "node_modules/@supabase/supabase-js/package.json");
  assert.equal(JSON.parse(await readFile(packagedSupabase, "utf8")).name, "@supabase/supabase-js", "submit-lead: Supabase fehlt im ZIP");

  const packagedEntry = path.join(isolatedDirectory, "netlify/functions/submit-lead.mjs");
  const submitLead = await import(pathToFileURL(packagedEntry).href);
  const response = await submitLead.default(new Request("https://ki-check.synclaro.de/api/readiness-result", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "ki-check.synclaro.de",
      origin: "https://ki-check.synclaro.de",
    },
    body: "{}",
  }), {});
  assert.equal(response.status, 400, "submit-lead: isolierter ZIP-Handler konnte keinen Validierungsfehler liefern");
  assert.equal(typeof (await response.json()).error, "string", "submit-lead: isolierter ZIP-Handler lieferte keinen JSON-Fehler");
} finally {
  await rm(isolatedDirectory, { recursive: true, force: true });
}

console.log("Netlify-Manifest: Functions API v2, drei Traffic Rules und isoliertes submit-lead-ZIP bestätigt.");

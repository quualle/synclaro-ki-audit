"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const EXPECTED_LIMITS = {
  "start-session": 12,
  "generate-questions": 20,
  "submit-lead": 6,
};

function importFunctionEntry(name) {
  return import(pathToFileURL(path.join(__dirname, `../netlify/functions/${name}.mjs`)).href);
}

test("kostenrelevante Endpunkte sind echte Functions-v2-Entries mit exportierter Rate-Limit-Konfiguration", async () => {
  for (const [name, windowLimit] of Object.entries(EXPECTED_LIMITS)) {
    const entry = await importFunctionEntry(name);
    assert.equal(typeof entry.default, "function", `${name}: default export fehlt`);
    assert.deepEqual(entry.config, {
      path: `/.netlify/functions/${name}`,
      rateLimit: {
        windowLimit,
        windowSize: 180,
        aggregateBy: ["ip", "domain"],
      },
    });
    const preflight = await entry.default(new Request(`https://preview.example/.netlify/functions/${name}`, {
      method: "OPTIONS",
    }), {});
    assert.equal(preflight.status, 204, `${name}: OPTIONS wurde nicht als leere 204-Response adaptiert`);
    assert.equal(await preflight.text(), "", `${name}: 204-Response enthält unerlaubt einen Body`);
  }
});

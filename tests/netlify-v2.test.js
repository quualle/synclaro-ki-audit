"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const EXPECTED = {
  "start-session": { path: "/api/readiness-session", windowLimit: 12 },
  "generate-questions": { path: "/api/readiness-question", windowLimit: 20 },
  "submit-lead": { path: "/api/readiness-result", windowLimit: 6 },
  "meta-pageview": { path: "/api/readiness-meta-pageview", windowLimit: 8 },
};

function importFunctionEntry(name) {
  return import(pathToFileURL(path.join(__dirname, `../netlify/functions/${name}.mjs`)).href);
}

test("kostenrelevante Endpunkte sind echte Functions-v2-Entries mit konfliktfreien API-Pfaden und Rate-Limits", async () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const entry = await importFunctionEntry(name);
    assert.equal(typeof entry.default, "function", `${name}: default export fehlt`);
    assert.deepEqual(entry.config, {
      path: expected.path,
      rateLimit: {
        windowLimit: expected.windowLimit,
        windowSize: 180,
        aggregateBy: ["ip", "domain"],
      },
    });
    const preflight = await entry.default(new Request(`https://preview.example${expected.path}`, {
      method: "OPTIONS",
    }), {});
    assert.equal(preflight.status, 204, `${name}: OPTIONS wurde nicht als leere 204-Response adaptiert`);
    assert.equal(await preflight.text(), "", `${name}: 204-Response enthält unerlaubt einen Body`);
  }
});

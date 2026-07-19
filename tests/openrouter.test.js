"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const openrouter = require("../netlify/functions/_shared/openrouter");

test("OpenRouter-Aufruf erzwingt ZDR, feste Providerwahl und striktes JSON ohne Temperature", async () => {
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  let requestBody;

  try {
    const result = await openrouter.requestStructuredJson({
      messages: [{ role: "user", content: "Test" }],
      schemaName: "test_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ok"],
        properties: { ok: { type: "boolean" } },
      },
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: "{\"ok\":true}" } }] }),
        };
      },
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(requestBody.model, "openai/gpt-5.5");
    assert.deepEqual(requestBody.reasoning, { effort: "low", exclude: true });
    assert.deepEqual(requestBody.provider, {
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: false,
    });
    assert.equal(requestBody.response_format.type, "json_schema");
    assert.equal(requestBody.response_format.json_schema.strict, true);
    assert.equal("temperature" in requestBody, false);
  } finally {
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("OpenRouter-Timeout und ungültiges JSON geben nur klassifizierte Fehler zurück", async () => {
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  try {
    await assert.rejects(openrouter.requestStructuredJson({
      messages: [],
      schemaName: "test_schema",
      schema: { type: "object" },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "kein-json" } }] }),
      }),
    }), (error) => error.code === "openrouter_invalid_json" && !String(error.message).includes("kein-json"));
  } finally {
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("kompakte Ergebnisantwort kann JSON-Modus nutzen und bleibt lokal validierbar", async () => {
  const previousFlag = process.env.AI_ADAPTIVE_ENABLED;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.AI_ADAPTIVE_ENABLED = "true";
  process.env.OPENROUTER_API_KEY = "test-key";
  let requestBody;
  try {
    const result = await openrouter.requestStructuredJson({
      messages: [{ role: "user", content: "Test" }],
      schemaName: "result_schema",
      schema: { type: "object" },
      strictSchema: false,
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ choices: [{ message: { content: "{\"ok\":true}" } }] }) };
      },
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(requestBody.response_format, { type: "json_object" });
  } finally {
    if (previousFlag === undefined) delete process.env.AI_ADAPTIVE_ENABLED;
    else process.env.AI_ADAPTIVE_ENABLED = previousFlag;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

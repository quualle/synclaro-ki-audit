"use strict";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_ADAPTIVE_MODEL = "openai/gpt-5.5";
const DEFAULT_TIMEOUT_MS = 12000;

class OpenRouterError extends Error {
  constructor(code, statusCode = 0) {
    super(code);
    this.name = "OpenRouterError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function adaptiveModel() {
  return String(process.env.OPENROUTER_ADAPTIVE_MODEL || DEFAULT_ADAPTIVE_MODEL).trim() || DEFAULT_ADAPTIVE_MODEL;
}

function adaptiveAIEnabled() {
  return String(process.env.AI_ADAPTIVE_ENABLED || "").trim().toLowerCase() === "true";
}

function adaptiveAIConfigured() {
  return adaptiveAIEnabled() && Boolean(String(process.env.OPENROUTER_API_KEY || "").trim());
}

function modelLabel(model = adaptiveModel()) {
  const labels = {
    "openai/gpt-5.6-terra": "GPT-5.6 Terra",
    "openai/gpt-5.6-sol": "GPT-5.6 Sol",
    "openai/gpt-5.5": "GPT-5.5",
  };
  return labels[model] || "Frontier-KI";
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part && (part.type === "text" || typeof part.text === "string"))
    .map((part) => String(part.text || ""))
    .join("");
}

async function requestStructuredJson({
  messages,
  schema,
  schemaName,
  maxTokens = 1800,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  reasoningEffort = "low",
  strictSchema = true,
  model = adaptiveModel(),
  fetchImpl = globalThis.fetch,
}) {
  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!adaptiveAIEnabled()) throw new OpenRouterError("adaptive_ai_disabled");
  if (!apiKey) throw new OpenRouterError("openrouter_key_missing");
  if (typeof fetchImpl !== "function") throw new OpenRouterError("fetch_unavailable");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ki-check.synclaro.de",
        "X-Title": "Synclaro AI Readiness",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        reasoning: { effort: reasoningEffort, exclude: true },
        provider: {
          zdr: true,
          data_collection: "deny",
          allow_fallbacks: false,
        },
        response_format: strictSchema
          ? {
              type: "json_schema",
              json_schema: {
                name: schemaName,
                strict: true,
                schema,
              },
            }
          : { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new OpenRouterError("openrouter_http_error", response.status);
    const payload = await response.json();
    const text = contentText(payload?.choices?.[0]?.message?.content);
    if (!text) throw new OpenRouterError("openrouter_empty_response");
    try {
      return JSON.parse(text);
    } catch {
      throw new OpenRouterError("openrouter_invalid_json");
    }
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    if (error?.name === "AbortError") throw new OpenRouterError("openrouter_timeout");
    throw new OpenRouterError("openrouter_request_failed");
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  DEFAULT_ADAPTIVE_MODEL,
  OpenRouterError,
  adaptiveAIConfigured,
  adaptiveAIEnabled,
  adaptiveModel,
  modelLabel,
  requestStructuredJson,
};

import { RECEIPT_PROMPT } from "./prompt";
import type { OpenAiConfig, TokenUsage } from "./types";

export const CONFIG_STORAGE_KEY = "splitbill.openai-config";

export const DEFAULT_OPENAI_CONFIG: OpenAiConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o",
};

export function normalizeBaseUrl(url: string): string {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`;
}

export function isConfigComplete(config: OpenAiConfig): boolean {
  return Boolean(
    normalizeBaseUrl(config.baseUrl) &&
      config.apiKey.trim() &&
      config.model.trim()
  );
}

export function loadOpenAiConfig(): OpenAiConfig {
  if (typeof window === "undefined") return { ...DEFAULT_OPENAI_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPENAI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<OpenAiConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_OPENAI_CONFIG.baseUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_OPENAI_CONFIG.model,
    };
  } catch {
    return { ...DEFAULT_OPENAI_CONFIG };
  }
}

export function saveOpenAiConfig(config: OpenAiConfig): void {
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      baseUrl: config.baseUrl.trim(),
      apiKey: config.apiKey.trim(),
      model: config.model.trim(),
    })
  );
}

export function parseConfigFromSearchParams(
  params: URLSearchParams
): Partial<OpenAiConfig> | null {
  const baseUrl = params.get("baseUrl");
  const apiKey = params.get("apiKey");
  const model = params.get("model");
  if (!baseUrl && !apiKey && !model) return null;
  return {
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
    ...(model ? { model } : {}),
  };
}

export function buildShareableSearchParams(config: OpenAiConfig): URLSearchParams {
  const params = new URLSearchParams();
  params.set("baseUrl", config.baseUrl.trim());
  params.set("apiKey", config.apiKey.trim());
  params.set("model", config.model.trim());
  return params;
}

function getFirstNumber(source: Record<string, unknown> | undefined, keys: string[]) {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") return value;
  }
  return undefined;
}

export function buildTokenUsage(source: Record<string, unknown> | undefined): TokenUsage {
  return {
    provider: "openai",
    totalTokens: getFirstNumber(source, ["total_tokens", "totalTokens", "total"]),
    promptTokens: getFirstNumber(source, ["prompt_tokens", "promptTokens", "prompt"]),
    completionTokens: getFirstNumber(source, [
      "completion_tokens",
      "completionTokens",
      "completion",
    ]),
  };
}

export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON.");
  }
}

const ULTRA_MAX_TOKENS = 16384;
const ULTRA_TEMPERATURE = 0.01;

function looksLikeUnsupportedResponseFormat(status: number, body: string): boolean {
  if (status !== 400) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("response_format") ||
    lower.includes("json_object") ||
    lower.includes("response format")
  );
}

async function postChatCompletions(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}

export async function analyzeReceiptImage(args: {
  config: OpenAiConfig;
  imageBase64: string;
  signal?: AbortSignal;
}): Promise<{ parsedJson: unknown; usage: TokenUsage }> {
  const { config, imageBase64, signal } = args;
  if (!isConfigComplete(config)) {
    throw new Error("Configure base URL, API key, and model first.");
  }

  const url = chatCompletionsUrl(config.baseUrl);
  const messages = [
    { role: "system", content: RECEIPT_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this receipt image and respond with the JSON described above.",
        },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];

  const baseBody: Record<string, unknown> = {
    model: config.model.trim(),
    messages,
    max_tokens: ULTRA_MAX_TOKENS,
    temperature: ULTRA_TEMPERATURE,
  };

  let response = await postChatCompletions(
    url,
    config.apiKey.trim(),
    { ...baseBody, response_format: { type: "json_object" } },
    signal
  );

  if (!response.ok) {
    const text = await response.text();
    if (looksLikeUnsupportedResponseFormat(response.status, text)) {
      response = await postChatCompletions(url, config.apiKey.trim(), baseBody, signal);
    } else {
      throw mapHttpError(response.status, text);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw mapHttpError(response.status, text);
  }

  const data = await response.json();
  const jsonText = data?.choices?.[0]?.message?.content;
  if (!jsonText || typeof jsonText !== "string") {
    throw new Error("OpenAI response did not include parsed content.");
  }

  return {
    parsedJson: extractJsonObject(jsonText),
    usage: buildTokenUsage(data?.usage),
  };
}

function mapHttpError(status: number, body: string): Error {
  const snippet = body.slice(0, 120);
  if (status === 401) return new Error(`Invalid API key. Check your OpenAI credentials. (${snippet})`);
  if (status === 403) return new Error(`Access denied. Check API key permissions. (${snippet})`);
  if (status === 429) return new Error(`Rate limit exceeded. Try again shortly. (${snippet})`);
  if (status === 400) return new Error(`Invalid request. Check base URL and model. (${snippet})`);
  if (status >= 500) return new Error(`Provider temporarily unavailable. (${snippet})`);
  return new Error(`OpenAI error ${status}. (${snippet})`);
}

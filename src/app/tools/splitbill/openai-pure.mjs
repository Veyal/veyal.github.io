export function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function chatCompletionsUrl(baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  return `${base}/chat/completions`;
}

export function isConfigComplete(config) {
  return Boolean(
    config &&
      normalizeBaseUrl(config.baseUrl) &&
      String(config.apiKey || "").trim() &&
      String(config.model || "").trim()
  );
}

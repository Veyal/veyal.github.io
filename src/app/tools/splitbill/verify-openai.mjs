import assert from "node:assert/strict";
import { createRequire } from "node:module";

// This script is updated after openai.ts exists; initially expect import failure.
const require = createRequire(import.meta.url);

let mod;
try {
  // Prefer dynamic import of compiled-less TS via next — for verify we duplicate pure fns inline until module exists.
  // After Step 3, replace this block to import from a tiny openai-pure.mjs export OR run duplicated asserts against copied logic.
  const { normalizeBaseUrl, chatCompletionsUrl, isConfigComplete } = await import("./openai-pure.mjs");
  assert.equal(normalizeBaseUrl("https://api.openai.com/v1/"), "https://api.openai.com/v1");
  assert.equal(
    chatCompletionsUrl("https://api.openai.com/v1/"),
    "https://api.openai.com/v1/chat/completions"
  );
  assert.equal(
    chatCompletionsUrl("https://proxy.example.com/openai"),
    "https://proxy.example.com/openai/chat/completions"
  );
  assert.equal(isConfigComplete({ baseUrl: "", apiKey: "k", model: "m" }), false);
  assert.equal(
    isConfigComplete({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o",
    }),
    true
  );
  console.log("verify-openai: PASS");
} catch (err) {
  console.error("verify-openai: FAIL", err);
  process.exit(1);
}

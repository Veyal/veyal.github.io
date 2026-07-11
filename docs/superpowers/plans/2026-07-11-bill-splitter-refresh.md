# Bill Splitter Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh `/tools/splitbill` with a ledger-desk visual system, OpenAI-compatible config (typed base URL / API key / model), and a faster 4-point polygon crop.

**Architecture:** Extract OpenAI config + analyze into `openai.ts`, isolate crop into an optimized `CropModal`, add `AiConfigModal`, and restyle the tool root with scoped CSS tokens. Keep the 5-step split flow and math; remove Azure/Gemini paths.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion, browser `localStorage` + `fetch` to user-supplied OpenAI-compatible endpoints.

## Global Constraints

- Scope is `/tools/splitbill` only — do not restyle homepage or other tools
- OpenAI-compatible only: three free-text fields (base URL, API key, model); no Azure/Gemini UI or call paths
- Keep 4-point polygon crop (do not switch to rectangle-only)
- Storage key: `splitbill.openai-config` (do not auto-migrate old `splitbill.kirby-config` secrets)
- Base URL: trim trailing slashes; append `/chat/completions` only — do not invent `/v1`
- Crop export: `toBlob` JPEG; downscale if longest edge > 2048
- No new test framework dependency; verify pure helpers with Node assert scripts and the app with `npx tsc --noEmit` / manual browser checks
- Do not commit unrelated dirty files (`package.json`, homepage, markdown-viewer, `.superpowers/`)

## File Structure

| File | Responsibility |
|------|----------------|
| `src/app/tools/splitbill/types.ts` | Shared domain types (config, crop, receipt, steps) |
| `src/app/tools/splitbill/openai.ts` | Config load/save, URL normalize, analyze API, token usage |
| `src/app/tools/splitbill/prompt.ts` | Receipt system prompt constant |
| `src/app/tools/splitbill/image.ts` | `processImageForOCR` helper |
| `src/app/tools/splitbill/AiConfigModal.tsx` | Settings UI for base URL / key / model |
| `src/app/tools/splitbill/CropModal.tsx` | Optimized polygon crop modal (rewrite) |
| `src/app/tools/splitbill/AssignmentModal.tsx` | Extract existing assignment modal + ledger restyle |
| `src/app/tools/splitbill/splitbill.css` | Tool-scoped ledger tokens + atmosphere |
| `src/app/tools/splitbill/page.tsx` | Orchestration + ledger UI (slimmed) |
| `src/app/tools/splitbill/verify-openai.mjs` | One-off Node assert script for pure helpers (dev only; delete after Task 1 or keep) |

---

### Task 1: OpenAI-compatible config + analyze module

**Files:**
- Create: `src/app/tools/splitbill/types.ts` (replace contents)
- Create: `src/app/tools/splitbill/prompt.ts`
- Create: `src/app/tools/splitbill/openai.ts`
- Create: `src/app/tools/splitbill/image.ts`
- Create: `src/app/tools/splitbill/verify-openai.mjs`
- Test: run `node src/app/tools/splitbill/verify-openai.mjs`

**Interfaces:**
- Consumes: none (foundation)
- Produces:
  - `OpenAiConfig = { baseUrl: string; apiKey: string; model: string }`
  - `DEFAULT_OPENAI_CONFIG`, `CONFIG_STORAGE_KEY = "splitbill.openai-config"`
  - `normalizeBaseUrl(url: string): string`
  - `chatCompletionsUrl(baseUrl: string): string`
  - `isConfigComplete(config: OpenAiConfig): boolean`
  - `loadOpenAiConfig(): OpenAiConfig`
  - `saveOpenAiConfig(config: OpenAiConfig): void`
  - `parseConfigFromSearchParams(params: URLSearchParams): Partial<OpenAiConfig> | null`
  - `buildShareableSearchParams(config: OpenAiConfig): URLSearchParams`
  - `analyzeReceiptImage(args: { config: OpenAiConfig; imageBase64: string; signal?: AbortSignal }): Promise<{ parsedJson: unknown; usage: TokenUsage }>`
  - `processImageForOCR(file: File, maxWidth?: number, maxHeight?: number, quality?: number): Promise<string>`
  - `RECEIPT_PROMPT: string`
  - `TokenUsage = { provider: "openai"; totalTokens?: number; promptTokens?: number; completionTokens?: number }`

- [ ] **Step 1: Write types**

Replace `src/app/tools/splitbill/types.ts` with:

```ts
export type CropPoint = { u: number; v: number };

export type OpenAiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type TokenUsage = {
  provider: "openai";
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

export type ExtraCharge = { name: string; amount: number };

export type ReceiptItem = {
  name: string;
  translatedName?: string;
  quantity: number;
  price: number;
  total: number;
  assignedTo: string[];
  percentages: Record<string, number>;
};

export type ReceiptData = {
  restaurant: string;
  address: string;
  date: string;
  currency: string;
  exchangeRate: number;
  items: ReceiptItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  discount: number;
  extraCharges: ExtraCharge[];
  total: number;
  computedTotal: number;
  isValid: boolean;
  error?: string;
};

export type Person = { name: string; color: string };

export type PersonShare = {
  name: string;
  color: string;
  items: {
    name: string;
    translatedName?: string;
    quantity: number;
    price: number;
    percentage: number;
  }[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  extraCharges: ExtraCharge[];
  discount: number;
  total: number;
  totalIdr?: number;
};

export type Step = "upload" | "review" | "people" | "assignment" | "results";
```

- [ ] **Step 2: Write failing verify script for pure helpers**

Create `src/app/tools/splitbill/verify-openai.mjs`:

```js
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
```

- [ ] **Step 3: Implement pure helpers + openai module**

Create `src/app/tools/splitbill/openai-pure.mjs` (plain JS for Node verify):

```js
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
```

Create `src/app/tools/splitbill/prompt.ts` — move the existing `RECEIPT_PROMPT` string from `page.tsx` unchanged (same rules/JSON shape).

Create `src/app/tools/splitbill/openai.ts`:

```ts
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
```

Create `src/app/tools/splitbill/image.ts` by moving `processImageForOCR` from `page.tsx` (same logic, export it).

- [ ] **Step 4: Run verify script**

Run: `node src/app/tools/splitbill/verify-openai.mjs`  
Expected: `verify-openai: PASS`

Run: `npx tsc --noEmit`  
Expected: no errors related to new files (page may still reference old types until later tasks — if so, temporarily leave old page compiling by not deleting old types until Task 5, OR update page imports in Task 5 only). **For this task:** keep `page.tsx` compiling by leaving a temporary re-export shim at the bottom of `types.ts` is NOT needed if Task 5 follows immediately in the same session; if building mid-way fails on `page.tsx`, that is expected until Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/splitbill/types.ts src/app/tools/splitbill/prompt.ts src/app/tools/splitbill/openai.ts src/app/tools/splitbill/openai-pure.mjs src/app/tools/splitbill/image.ts src/app/tools/splitbill/verify-openai.mjs
git commit -m "$(cat <<'EOF'
Add OpenAI-compatible config and analyze helpers for Bill Splitter.

EOF
)"
```

---

### Task 2: AiConfigModal

**Files:**
- Create: `src/app/tools/splitbill/AiConfigModal.tsx`
- Modify: none yet (wired in Task 5)

**Interfaces:**
- Consumes: `OpenAiConfig` from `./types`
- Produces: `AiConfigModal` props:
  ```ts
  {
    open: boolean;
    initialConfig: OpenAiConfig;
    onClose: () => void;
    onSave: (config: OpenAiConfig) => void;
  }
  ```

- [ ] **Step 1: Implement modal**

```tsx
"use client";

import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpenAiConfig } from "./types";

type Props = {
  open: boolean;
  initialConfig: OpenAiConfig;
  onClose: () => void;
  onSave: (config: OpenAiConfig) => void;
};

export function AiConfigModal({ open, initialConfig, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<OpenAiConfig>(initialConfig);

  useEffect(() => {
    if (open) setDraft(initialConfig);
  }, [open, initialConfig]);

  if (!open) return null;

  return (
    <div className="sb-modal-backdrop">
      <div className="sb-modal" role="dialog" aria-labelledby="sb-ai-config-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="sb-ai-config-title" className="sb-heading flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-[var(--sb-accent)]" />
            AI settings
          </h3>
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--sb-slate)]">
          Keys stay in your browser. Requests go to the base URL you enter.
          Include <code className="font-mono text-xs">/v1</code> when your provider needs it
          (for example <code className="font-mono text-xs">https://api.openai.com/v1</code>).
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sb-base-url">Base URL</Label>
            <Input
              id="sb-base-url"
              placeholder="https://api.openai.com/v1"
              value={draft.baseUrl}
              onChange={(e) => setDraft((p) => ({ ...p, baseUrl: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="sb-api-key">API key</Label>
            <Input
              id="sb-api-key"
              type="password"
              placeholder="sk-..."
              value={draft.apiKey}
              onChange={(e) => setDraft((p) => ({ ...p, apiKey: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="sb-model">Model</Label>
            <Input
              id="sb-model"
              placeholder="gpt-4o"
              value={draft.model}
              onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck the new file in isolation**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -40`  
Expected: no errors pointing at `AiConfigModal.tsx` (CSS classes `sb-*` are fine even before CSS file exists).

- [ ] **Step 3: Commit**

```bash
git add src/app/tools/splitbill/AiConfigModal.tsx
git commit -m "$(cat <<'EOF'
Add Bill Splitter AI settings modal for OpenAI-compatible endpoints.

EOF
)"
```

---

### Task 3: Optimized CropModal

**Files:**
- Modify: `src/app/tools/splitbill/CropModal.tsx` (full rewrite)

**Interfaces:**
- Consumes: `CropPoint` from `./types`
- Produces:
  ```ts
  {
    imageUrl: string;
    initialPolygon?: CropPoint[];
    onClose: () => void;
    onApply: (croppedFile: File) => void | Promise<void>;
  }
  ```

- [ ] **Step 1: Rewrite CropModal with rAF drag + dim overlay + JPEG blob**

Key implementation requirements (must all be present):

1. Default polygon inset `0.02` on each side (same as today)
2. On pointer down on a handle: set active index, `setPointerCapture`, store polygon in a `ref` for live updates
3. On pointer move: schedule one `requestAnimationFrame` that writes handle positions + SVG polygon points via DOM (`setAttribute` / `style.left/top`) without `setState`
4. On pointer up: `setCropPolygon` from the ref (single React commit)
5. Overlay: full-size SVG with evenodd path — outer rect + inner polygon — fill `rgba(28,25,23,0.55)` outside selection; stroke accent on polygon
6. Handles: visible 16px circle, hit target `min-w-11 min-h-11` (44px)
7. Apply:
   - Compute bbox from natural-size polygon points
   - If `max(sw,sh)` after scale would exceed 2048 on longest edge of the crop, scale draw size so longest edge ≤ 2048
   - `ctx.clip()` to polygon, `drawImage`, white `destination-over` fill
   - `canvas.toBlob(blob => ..., "image/jpeg", 0.92)` → `File` named `*-cropped.jpg`
   - Guard: ignore if `isApplying`; disable button while applying; reject if crop &lt; 10px
8. Reset restores default polygon; Cancel calls `onClose`

Skeleton (complete the DOM update helpers in the file — do not leave stubs):

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CropPoint } from "./types";

const DEFAULT_CROP_POLYGON: CropPoint[] = [
  { u: 0.02, v: 0.02 },
  { u: 0.98, v: 0.02 },
  { u: 0.98, v: 0.98 },
  { u: 0.02, v: 0.98 },
];

const cloneDefaultPolygon = () => DEFAULT_CROP_POLYGON.map((p) => ({ ...p }));
const MAX_EDGE = 2048;

type Props = {
  imageUrl: string;
  initialPolygon?: CropPoint[];
  onClose: () => void;
  onApply: (croppedFile: File) => void | Promise<void>;
};

export function CropModal({ imageUrl, initialPolygon, onClose, onApply }: Props) {
  // state: cropPolygon, activeHandle, isApplying, cropAreaSize, applyError
  // refs: cropAreaRef, cropImageRef, polygonRef, handlesRef[], polygonElRef, dimPathRef, rafRef
  // implement rAF drag + apply as specified above
  return null; // replace with full UI
}
```

Implement the full UI (do not ship `return null`). Include selection size readout using state updated on pointer up / image load (not every move).

- [ ] **Step 2: Manual logic check**

Confirm in code review of the file:
- No `setCropPolygon` inside the rAF move handler
- `toBlob` used; no `toDataURL`
- `MAX_EDGE` downscale present

- [ ] **Step 3: Commit**

```bash
git add src/app/tools/splitbill/CropModal.tsx
git commit -m "$(cat <<'EOF'
Optimize Bill Splitter polygon crop for smoother drag and faster export.

EOF
)"
```

---

### Task 4: Ledger desk CSS + fonts

**Files:**
- Create: `src/app/tools/splitbill/splitbill.css`
- Create: `src/app/tools/splitbill/layout.tsx` (tool-local layout for fonts + CSS import)

**Interfaces:**
- Consumes: none
- Produces: CSS variables `--sb-*` and utility classes `.sb-root`, `.sb-card`, `.sb-modal-backdrop`, `.sb-modal`, `.sb-heading`, `.sb-stepper`, `.sb-step`, `.sb-amount`, `.sb-icon-btn`, `.sb-dropzone`

- [ ] **Step 1: Add tool layout with fonts**

Create `src/app/tools/splitbill/layout.tsx`:

```tsx
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./splitbill.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-sb-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sb-body",
  display: "swap",
});

export default function SplitbillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`sb-root ${display.variable} ${body.variable}`}>{children}</div>
  );
}
```

- [ ] **Step 2: Write splitbill.css**

Include at minimum:

```css
.sb-root {
  --sb-paper: #f3efe6;
  --sb-ink: #1c1917;
  --sb-slate: #57534e;
  --sb-accent: #c45c26;
  --sb-line: #d6d0c4;
  --sb-card: #fffcf7;
  color: var(--sb-ink);
  font-family: var(--font-sb-body), system-ui, sans-serif;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(196, 92, 38, 0.08), transparent 60%),
    linear-gradient(180deg, #f7f3ea 0%, var(--sb-paper) 40%, #ebe6db 100%);
  border-radius: 1rem;
  padding: 1.25rem;
  min-height: 70vh;
}

.sb-heading {
  font-family: var(--font-sb-display), Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--sb-ink);
}

.sb-card {
  background: var(--sb-card);
  border: 1px solid var(--sb-line);
  border-radius: 0.75rem;
  box-shadow: 0 1px 0 rgba(28, 25, 23, 0.04);
}

.sb-amount {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}

.sb-stepper {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  border-bottom: 1px solid var(--sb-line);
  padding-bottom: 0.75rem;
}

.sb-step {
  flex: 1;
  text-align: left;
  padding: 0.5rem 0.25rem;
  border: none;
  background: transparent;
  color: var(--sb-slate);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.sb-step[data-active="true"] {
  color: var(--sb-accent);
  border-bottom-color: var(--sb-accent);
}

.sb-step[data-complete="true"]:not([data-active="true"]) {
  color: var(--sb-ink);
}

.sb-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(28, 25, 23, 0.45);
  backdrop-filter: blur(4px);
}

.sb-modal {
  width: 100%;
  max-width: 32rem;
  background: var(--sb-card);
  border: 1px solid var(--sb-line);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 20px 50px rgba(28, 25, 23, 0.18);
}

.sb-icon-btn {
  color: var(--sb-slate);
  background: transparent;
  border: none;
  cursor: pointer;
}

.sb-dropzone {
  border: 1px dashed var(--sb-line);
  border-radius: 0.75rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
  background: rgba(255, 252, 247, 0.7);
  transition: border-color 150ms ease, background 150ms ease;
}

.sb-dropzone[data-has-file="true"] {
  border-color: var(--sb-accent);
  border-style: solid;
}

@media (prefers-reduced-motion: reduce) {
  .sb-root * {
    animation: none !important;
    transition: none !important;
  }
}
```

Also style crop modal max-width override: `.sb-modal.sb-modal-wide { max-width: 56rem; }`.

- [ ] **Step 3: Commit**

```bash
git add src/app/tools/splitbill/layout.tsx src/app/tools/splitbill/splitbill.css
git commit -m "$(cat <<'EOF'
Add ledger-desk visual tokens and fonts for Bill Splitter.

EOF
)"
```

---

### Task 5: Rewire page.tsx — OpenAI + CropModal + ledger UI

**Files:**
- Modify: `src/app/tools/splitbill/page.tsx` (major)
- Create: `src/app/tools/splitbill/AssignmentModal.tsx` (extract from bottom of page)
- Delete unused: inline crop modal block, Azure/Gemini analyze, old config modal, duplicate crop handlers

**Interfaces:**
- Consumes: `analyzeReceiptImage`, `loadOpenAiConfig`, `saveOpenAiConfig`, `isConfigComplete`, `parseConfigFromSearchParams`, `buildShareableSearchParams`, `DEFAULT_OPENAI_CONFIG` from `./openai`; `processImageForOCR` from `./image`; `CropModal`; `AiConfigModal`; types from `./types`
- Produces: working Bill Splitter page with ledger UI

- [ ] **Step 1: Extract AssignmentModal**

Move the existing `AssignmentModal` component (and its props type) from the bottom of `page.tsx` into `AssignmentModal.tsx`. Restyle container classes to `sb-modal-backdrop` / `sb-modal` / `sb-heading` / `sb-amount`. Keep assignment/percentage behavior identical.

- [ ] **Step 2: Strip page of Azure/Gemini/crop duplication**

In `page.tsx`:

1. Remove `KirbyAiConfig`, `KirbyProvider`, `GEMINI_MODELS`, `DEFAULT_KIRBY_CONFIG`, Azure `analyzeWithAzure`, Gemini `analyzeWithGemini`, inline crop modal JSX, crop pointer handlers, `cropAreaRef` / `cropImageRef` / `cropPolygon` state used only by inline modal
2. State: `openAiConfig` / `configDraft` → single `openAiConfig: OpenAiConfig` + `showConfigModal`
3. On mount: `loadOpenAiConfig()`; also read URL via `parseConfigFromSearchParams` and if present merge + `saveOpenAiConfig`
4. `analyzeReceipt`: if `!isConfigComplete(openAiConfig)` → error + open config; else `processImageForOCR` then `analyzeReceiptImage({ config: openAiConfig, imageBase64, signal })` with 60s AbortController
5. Crop: `showCropModal && previewUrl && <CropModal imageUrl={previewUrl} onClose=... onApply={async (file) => { setSelectedFile(file); setHasCroppedImage(true); /* refresh preview URL */ }} />`
6. Config: `<AiConfigModal open={showConfigModal} initialConfig={openAiConfig} onClose=... onSave={(c) => { saveOpenAiConfig(c); setOpenAiConfig(c); }} />`
7. Share config: build URL with `buildShareableSearchParams(openAiConfig)`; UI note that the link includes the API key
8. Token usage label: `"OpenAI-compatible"` (not Azure/Gemini)
9. Replace candy stepper with `.sb-stepper` / `.sb-step` progress rail
10. Replace section wrappers `card-surface` with `sb-card`; titles with `sb-heading`; money with `sb-amount`
11. Remove emoji-heavy chrome from headings/copy (plain professional copy)
12. Keep split math, people colors, review editing, results share text logic

Preview URL after crop: revoke old object URL and `URL.createObjectURL(file)`.

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit`  
Expected: PASS (no TS errors)

Run: `npm run build`  
Expected: PASS (or only pre-existing unrelated failures — fix any splitbill-related failures)

- [ ] **Step 4: Manual smoke (browser)**

1. Open `/tools/splitbill/`
2. Confirm ledger look (paper ground, serif title, thin stepper)
3. Open AI settings — type base URL, key, model — Save — reload — values persist
4. Upload image → Crop → drag handles (should feel smooth) → Apply → preview updates
5. Analyze with incomplete config → settings opens
6. With valid vision-capable endpoint, analyze completes into Review

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/splitbill/page.tsx src/app/tools/splitbill/AssignmentModal.tsx src/app/tools/splitbill/CropModal.tsx src/app/tools/splitbill/AiConfigModal.tsx src/app/tools/splitbill/openai.ts src/app/tools/splitbill/types.ts
git commit -m "$(cat <<'EOF'
Rewire Bill Splitter to ledger UI, OpenAI-compatible API, and CropModal.

EOF
)"
```

---

### Task 6: Cleanup + final verification

**Files:**
- Delete if unused: `src/app/tools/splitbill/openai-pure.mjs`, `src/app/tools/splitbill/verify-openai.mjs` (optional keep; prefer delete to avoid shipping dead scripts)
- Grep cleanup for leftover Kirby/Azure/Gemini strings in splitbill

- [ ] **Step 1: Grep for leftovers**

Run:

```bash
rg -n "azure|gemini|Kirby|kirby-config|api-key|generativelanguage" src/app/tools/splitbill -i
```

Expected: no matches (except possibly comments in prompt about OCR — `RECEIPT_PROMPT` may still say “Azure OCR” metaphorically; change that phrase to “OCR” for accuracy).

- [ ] **Step 2: Soften prompt wording**

In `prompt.ts`, change `Azure OCR may break lines` → `OCR may break lines`.

- [ ] **Step 3: Remove verify helpers**

```bash
rm -f src/app/tools/splitbill/openai-pure.mjs src/app/tools/splitbill/verify-openai.mjs
```

- [ ] **Step 4: Final build**

Run: `npm run build`  
Expected: success

- [ ] **Step 5: Commit**

```bash
git add -u src/app/tools/splitbill
git commit -m "$(cat <<'EOF'
Clean up Bill Splitter leftovers after OpenAI-compatible migration.

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Ledger tokens + typography + atmosphere | 4, 5 |
| Thin progress rail stepper | 5 |
| OpenAI-compatible base URL / key / model typed | 1, 2, 5 |
| `POST …/chat/completions` + Bearer auth | 1 |
| No invented `/v1`; trim slashes | 1 |
| `response_format` retry | 1 |
| `splitbill.openai-config`; no secret auto-migrate | 1, 5 |
| Share URL `baseUrl`/`apiKey`/`model` | 1, 5 |
| CropModal only; remove page duplicate | 3, 5 |
| rAF / ref drag; dim outside; 44px targets | 3 |
| JPEG `toBlob` + 2048 downscale | 3 |
| Split file structure | 1–5 |
| Error messages for auth/rate/empty items | 1, 5 |
| Azure/Gemini removed | 5, 6 |

## Placeholder / consistency self-review

- No TBD/TODO left in tasks
- `OpenAiConfig` field names consistent: `baseUrl`, `apiKey`, `model`
- `TokenUsage.provider` is `"openai"` everywhere
- Crop props use `onApply(file: File)` consistently

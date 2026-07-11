# Bill Splitter Refresh — Design Spec

**Date:** 2026-07-11  
**Scope:** `/tools/splitbill` only (tool-scoped visual + AI + crop work)  
**Status:** Approved for planning

## Goal

Refresh Bill Splitter UI/UX with a distinct “ledger desk” visual language, replace Azure/Gemini config with a typed OpenAI-compatible provider (base URL, API key, model), and keep the 4-point polygon crop while making it smoother and cheaper to run.

## Non-goals

- Redesigning other tools or the site homepage
- Changing the core split math / assignment rules
- Adding new AI providers beyond OpenAI-compatible chat completions
- Replacing polygon crop with rectangle-only crop

## Visual system (Ledger desk)

Tool-scoped CSS variables on the splitbill root (do not change global candy theme for other pages):

| Token | Role | Value |
|-------|------|-------|
| `--sb-paper` | Page / surface ground | `#F3EFE6` |
| `--sb-ink` | Primary text / borders | `#1C1917` |
| `--sb-slate` | Secondary text | `#57534E` |
| `--sb-accent` | Primary actions / focus | `#C45C26` |
| `--sb-line` | Hairline rules | `#D6D0C4` |
| `--sb-card` | Elevated surface | `#FFFCF7` |

**Typography**

- Display: distinctive serif for page title and section headings (loaded only on this tool)
- Body: complementary sans for instructions and forms
- Money / meta: monospace for amounts, token counts, selection size

**Atmosphere**

- Soft paper gradient or light grain on the tool root — not a flat single fill
- No candy sticker borders, no emoji-heavy chrome on this page
- Motion: 2–3 intentional moments (step progress, crop overlay settle, results amount reveal); respect `prefers-reduced-motion`

**Layout principles**

- Keep the existing 5-step flow: upload → review → people → assignment → results
- Stepper becomes a thin progress rail (labels + active accent), not chunky candy tabs
- One primary CTA per section; secondary actions quieter
- Results hero: each person’s total is the dominant number

## AI configuration

### Provider model

Remove Azure OpenAI and Google Gemini as first-class providers. Single provider: **OpenAI-compatible**.

User-typed fields (all free text, no model dropdown):

1. **Base URL** — e.g. `https://api.openai.com/v1` or a custom proxy base ending at the API root
2. **API Key** — sent as `Authorization: Bearer <key>`
3. **Model** — e.g. `gpt-4o`, `gpt-4.1-mini`, or whatever the target supports

### Request shape

- `POST {normalizedBaseUrl}/chat/completions`
- Normalize base URL: trim trailing slashes; if the user pastes a host without `/v1`, do not invent paths beyond appending `/chat/completions` to what they typed (document that they should include `/v1` when required)
- Body: vision-capable chat messages (system receipt prompt + user text + `image_url` data URL), `response_format: { type: "json_object" }` when the endpoint supports it; on failure, retry once without `response_format` if the error indicates unsupported format
- Timeout: 60s abort controller (unchanged intent)

### Storage & migration

- Storage key: replace or version `splitbill.kirby-config` → `splitbill.openai-config`
- On load: if new key missing and old Kirby config exists, do not auto-map secrets into the new shape (different APIs); show empty config and open settings when analyze is attempted without credentials
- Shareable URL query params updated to `baseUrl`, `apiKey`, `model` only (warn in UI that sharing includes the key)

### Validation UX

- Analyze with missing fields → clear error + open config modal
- Config modal copy: keys stay in the browser; calls go to the user’s base URL

## Crop (polygon, performance + UX)

### Behavior (unchanged product)

- Four normalized handles `{u,v}` in `[0,1]`
- Clip canvas to polygon, export cropped JPEG for OCR

### Implementation changes

1. **Single source of truth:** use `CropModal.tsx` only; delete the duplicated crop modal markup/handlers from `page.tsx`
2. **Pointer performance:** throttle handle moves with `requestAnimationFrame`; prefer updating overlay geometry via refs/DOM during drag, commit React state on pointer up (or at rAF-batched intervals) so React does not re-render every pointer event
3. **Visual UX:** dim everything outside the polygon; larger touch targets (≥44px hit area); clear Apply / Reset / Cancel; selection size readout kept but quieter
4. **Export performance:** `canvas.toBlob('image/jpeg', quality)` — no `toDataURL` round-trip; if source natural size is very large (e.g. longest edge > 2048), downscale draw into the crop canvas before encode
5. **Concurrency:** disable Apply while cropping; ignore double-submit

## Code structure

Split the oversized `page.tsx` along clear boundaries:

| Unit | Responsibility |
|------|----------------|
| `page.tsx` | Step state, people/assignment/results orchestration, upload |
| `CropModal.tsx` | Polygon crop UI + apply |
| `AiConfigModal.tsx` | Base URL / key / model form |
| `lib/openai.ts` (or `splitbill/openai.ts`) | Config types, load/save, `analyzeReceiptImage` |
| Existing assignment modal | Keep behavior; restyle to ledger tokens |

Types in `types.ts` updated: drop Azure/Gemini fields; add OpenAI-compatible config type.

## Error handling

- Network / timeout / 401 / 429 / 5xx: human-readable messages pointing at config or crop/retry
- Empty items after parse: suggest clearer photo or crop
- Crop too small: block Apply with inline reason

## Testing / verification

- Manual: configure OpenAI-compatible endpoint, upload receipt, crop with smooth handles on desktop + touch, analyze, complete split flow
- Manual: missing config opens settings; invalid key surfaces auth error
- Manual: old localStorage Kirby config does not crash the page
- Smoke: no console errors during drag crop; Apply completes without multi-second UI freeze on a large phone photo

## Success criteria

1. Tool looks like a coherent ledger-desk product in the first viewport (brand/title + one clear next action)
2. User can type base URL, API key, and model; analyze works against a compatible `/chat/completions` vision endpoint
3. Polygon crop feels responsive; apply uses efficient JPEG blob path
4. Azure/Gemini UI and call paths are gone from this tool

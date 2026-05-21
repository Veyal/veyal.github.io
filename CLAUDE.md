# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server (http://localhost:3000)
- `npm run build` — produce static export into `out/` (`next build` with `output: "export"`)
- `npm run lint` — ESLint (`next lint`); rules `no-empty-object-type`, `no-explicit-any`, `no-unused-vars` are intentionally disabled in `.eslintrc.json`
- `npm run deploy` — build, touch `out/.nojekyll`, and publish `out/` to GitHub Pages via `npx gh-pages -d out`

There is no test runner configured.

## Architecture

### Static export to GitHub Pages
`next.config.mjs` sets `output: "export"` and `trailingSlash: true`, and `images.unoptimized: true`. The site ships as static HTML in `out/` and is deployed to the `gh-pages` branch via the `deploy` script — `homepage` in `package.json` is `https://veyal.github.io/`. All pages must work without a Next.js server: no API routes, no `next/image` optimization, no server actions. Every tool page uses `"use client"`.

### Browser-only crypto polyfills
`crypto-js` is used directly, and `next.config.mjs` adds webpack `resolve.fallback` for `crypto` → `crypto-browserify`, `stream` → `stream-browserify`, `buffer` → `buffer`. When adding crypto-using code, keep it client-side; do not import Node `crypto` directly.

### Tools registry pattern
`src/app/env/tools.json` is the single source of truth for the tool list. It is consumed by:
- `src/components/StageSelect.tsx` — landing-page "Select Stage" grid
- `src/app/tools/layout.tsx` — shared tools nav (pills + overflow dropdown; mobile shows 2 inline, desktop 3)

Adding a new tool requires three steps: add a route under `src/app/tools/<slug>/page.tsx`, append an entry to `tools.json` (`name`, `path` with trailing slash, `icon` matching the `iconMap` in `StageSelect.tsx`, `status: "ready" | "in-development" | "locked"`), and ensure the icon key exists in `StageSelect.tsx`'s `iconMap` (currently `LockIcon`, `KeyIcon`, `CodeIcon` from `lucide-react`). The tools layout also hard-codes emoji per tool name substring (`Encryptor`, `Password`, `JSON`, `AES`) — update there too if the new name doesn't match.

Certifications shown on the home page are similarly driven by `src/app/env/certifications.json`.

### App Router layout
`src/app/layout.tsx` is the root layout and renders the Kirby-themed animated background (floating stars, bubbles, clouds, platforms) for *every* page via fixed-position decorative elements — Tailwind classes referenced live in `src/app/kirby-background.css` and `src/app/globals.css`. `src/app/tools/layout.tsx` wraps all `/tools/*` pages with the Power-Up Station header and its own background; do not duplicate the global background inside tool pages.

### UI component conventions
shadcn/ui is configured (`components.json`, style `new-york`, base `neutral`, CSS variables). Primitives live in `src/components/ui/`. Path alias `@/*` → `src/*` (see `tsconfig.json`). Use `cn()` from `src/lib/utils.ts` (`clsx` + `tailwind-merge`) for class merging.

### SplitBill tool
`src/app/tools/splitbill/page.tsx` is the most complex module (~2.7k lines). Key contracts:
- **Wizard steps**: `upload → review → people → assignment → results` (`Step` union in `types.ts`).
- **AI providers**: switches between Azure OpenAI and Google Gemini via `KirbyAiConfig.provider`. Calls run directly from the browser via `fetch` — Azure POSTs to `<endpoint>/openai/deployments/<deployment>/chat/completions?api-version=<apiVersion>`; Gemini POSTs to its generative-language endpoint. There is no backend proxy.
- **Config persistence**: stored in `localStorage` under key `splitbill.kirby-config`, and also encodable into URL query params for sharing. When changing the `KirbyAiConfig` shape, update both the localStorage read/write and the shareable-URL encode/decode paths.
- **Quality tiers**: `economy | balanced | precision | ultra` map to `max_completion_tokens` budgets. Some deployments (GPT-5) reject `temperature` — the code intentionally omits it for those.
- **Prompt**: `RECEIPT_PROMPT` constant in `page.tsx` defines the strict JSON schema the model must return (`ReceiptData` in `types.ts`); changes to either side must stay in sync.
- **Cropping**: `CropModal.tsx` is a polygon cropper (4 draggable handles) that exports a clipped PNG via canvas; cropped output replaces the upload before OCR.
- **Split math**: service charge, tax, extra charges, and discount are distributed proportionally to each person's assigned-item subtotal, not split evenly.

### Reference spec
`web_spec.md` is a rebuild-reference document describing intended copy, flows, and feature parity for the entire site. Treat it as authoritative for user-facing text and UX behavior when those aren't obvious from the code.

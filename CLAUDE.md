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
- `src/app/page.tsx` — the "Small tools that run in your browser" grid on the home page
- `src/app/tools/layout.tsx` — the tool switcher bar under the site nav (scrolls sideways on narrow screens)

Adding a new tool requires three steps: add a route under `src/app/tools/<slug>/page.tsx`, append an entry to `tools.json` (`name`, `path` with trailing slash, `icon`, `status: "ready" | "in-development" | "locked"`, and a one-line `blurb`), and make sure the `icon` key exists in the `ICONS` map in `src/components/site/ToolIcon.tsx` (lucide icons; unknown keys fall back to a wrench).

Certifications shown on the home page are similarly driven by `src/app/env/certifications.json`. Their "valid until / expired" status is computed on the client after mount, so the static HTML never depends on the build date.

### Dream Land design system
The site's look is "Dream Land, grown up" (Kirby), defined in `src/app/globals.css`: reading sections and every tool page on Cloud `#FFF8FB` with Plum Ink `#2A2140` text, the home hero on Sky `#A8DCFF` with a meadow, and the Interseptor showcase, code blocks and footer on Dream Night `#221A3A`. Kirby Pink `#FF9EC4` is the primary fill (text on it is Plum Ink); Warp Yellow `#FFD44D` is for stars and the focus ring on night. Display type is Fredoka (`.type-display`, `--font-fredoka`); body and code are Recursive (`--font-rec`, MONO axis for code). Surfaces are puffy (rounded, no hard offset shadows) and buttons squish on press. The `--candy-*` and `--ink` variables and the `card-surface`, `field-input`, `chip` and `mono-label` classes are kept because tool pages use them. Do not push the owner's name in hero/marketing copy; he only appears in the About section.

Kirby art lives in `public/kirby/` (transparent WebP stickers generated with agy on a green screen and chroma-keyed): idle, inhale, full, spit, sleep, warpstar, detective, book, laptop, plus copy abilities sword, ninja, hammer, spark, cutter, mirror and wing. Each demo request in `src/lib/interseptor.ts` names the `ability` Kirby copies when its tampered version becomes a finding; the feature tabs use `src/components/dreamland/FeatureVignette.tsx` for one looping Kirby scene each.

### App Router layout
`src/app/layout.tsx` is the root layout: it loads the font and metadata only, with no decorative background. `src/components/site/Nav.tsx` and `Footer.tsx` are shared by the home page and `src/app/tools/layout.tsx`.

### Home page and Interseptor
`src/app/page.tsx` composes `DreamHero` (floating requests that Kirby inhales; a held request stays in his cheeks until the visitor forwards it, when he spits it out as a star, or drops it, when he swallows it) and `InterseptorShowcase` (real demo video, feature tabs with real screenshots, install and agent snippets) from `src/components/dreamland/`. Interseptor facts and the tamper-demo requests live in `src/lib/interseptor.ts`; keep facts in sync with the Interseptor README. Product media under `public/product/` (not `public/interseptor/`, which would collide with the Interseptor docs site path) is copied from `~/Documents/interseptor/website/assets/`. Content must stay visible in the static HTML: do not use opacity-0 entrance animations.

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

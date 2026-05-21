# Calm Kawaii Foundation — Design Spec

**Date:** 2026-05-21
**Scope:** Site-wide motion + visual design system pass (Option A: Calm the Chaos)
**Personality:** Kawaii, refined
**Motion philosophy:** One signature ambient beat at idle; everything else fires on entry / interaction / state change

## Goal

The site currently fights itself: 40+ always-on animations, a render-blocking 5-font stack, a universal button wiggle on hover, and inconsistent ad-hoc framer-motion usage in every component. The personality reads as *busy* rather than *cute*. The user wants it to feel smoother, more natural, cute, and playful.

This spec establishes the foundation — design tokens, motion primitives, a mascot, a single ambient beat — that every page and future tool inherits. It deliberately does **not** redesign individual pages, refactor SplitBill internals, or rewrite copy. Those land in follow-up specs once this foundation is live.

## Success criteria

| Metric | Target | Current (estimate) |
|---|---|---|
| Lighthouse Performance (mobile) | ≥ 95 | ~70 |
| First Contentful Paint | < 1.2s | ~1.8s |
| Cumulative Layout Shift | < 0.05 | unknown |
| Main-thread CPU at idle (mid laptop) | < 1% | ~5–8% |
| GPU at idle | < 2% | ~5–8% |
| Font network requests on first paint | 2 (Geist Sans + Mono) | 5 |
| `globals.css` + `kirby-background.css` gzipped | shrink ≥ 6KB | baseline |
| `prefers-reduced-motion` honored everywhere | yes | no |
| Hardcoded hex / duration / easing in components | 0 | many |

Visual QA: manual walkthrough of every route in (a) default mode, (b) `prefers-reduced-motion`, (c) dark color scheme media query, (d) 375px mobile width.

## Architecture

Three new layers added to `src/`. Strict one-way dependency: tokens → primitives → page components.

```
src/
  design/                          ← NEW (the source of truth)
    tokens.ts                      motion · palette · type · shadow · radius
    motion-variants.ts             framer-motion variants built from tokens
    mascot/
      Mascot.tsx                   <Mascot expression="idle|happy|sleep|peek" />
      mascot.svg                   the SVG paths (imported as React component)

  components/motion/               ← NEW (the playful primitives)
    FloatIn.tsx                    opacity 0→1, y +12→0, ease=enter, duration=base
    StaggerGroup.tsx               orchestrates child FloatIns with 60ms cascade
    HoverLift.tsx                  hover: y -4, shadow.md→shadow.lg, duration=fast
    PressBounce.tsx                tap: scale 1→0.96→1, ease=playful, duration=micro
    AmbientCloud.tsx               CSS-only · the ONE looping element
    index.ts                       barrel export

  app/
    globals.css                    TRIMMED (delete font @import, button wiggle/sparkle, decoration helpers)
    kirby-background.css           DELETED in full
    layout.tsx                     TRIMMED (delete ~20 decoration divs; keep the AmbientCloud)
    tools/layout.tsx               REFACTORED (replace emoji-by-name switch with mascot back-button + color tokens)

  components/
    HeroSection.tsx                REFACTORED (uses FloatIn + Mascot)
    CharacterCard.tsx              REFACTORED (uses HoverLift + peek Mascot)
    StageSelect.tsx                REFACTORED (uses StaggerGroup + sleep Mascot for locked tiles)
    AchievementGallery.tsx         REFACTORED (uses StaggerGroup)

  tailwind.config.ts               EXTENDED (palette + shadow + radius from tokens.ts)
```

**Out of scope:**
- `src/app/tools/splitbill/page.tsx` internals (2,737-line refactor is a separate spec).
- The bodies of Encryptor / Password Generator / JSON Beautifier / AES Mode Detector. They inherit the new tokens via Tailwind + the trimmed globals but no internal rewrites.
- New routes, new tools, new features.
- Dark mode UI toggle (the CSS vars exist; no toggle added).
- Copy / content rewrites ("Dream Land", "Power-Up Station", certifications data, etc.).
- 404 page redesign.

## Design tokens

Lives in `src/design/tokens.ts` as the single source of truth. `tailwind.config.ts` re-exports the relevant fields.

### Palette

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FEF7F9` | Page background |
| `cloud` | `#FFFFFF` | Card / surface |
| `ink` | `#2B1A36` | Primary text (warm dark plum, not black) |
| `whisper` | `#7A6788` | Muted / secondary text |
| `bubblegum` | `#EC4899` | Primary brand · CTAs |
| `lilac` | `#A78BFA` | Secondary accent |
| `sunshine` | `#FBBF24` | Stars / highlights / sparkles |
| `mint` | `#6EE7B7` | Success / calm accent |
| `sky` | `#93C5FD` | Info / links |

Rule: **one accent per surface.** Cards / sections commit to one accent color, never a gradient soup of three. The existing CSS variables in `globals.css` (`--background`, `--foreground`, etc.) are remapped to these tokens so shadcn `ui/*` primitives inherit the new palette without code changes.

Dark mode: deep plum background (`#1F1226`), creamy text (`#F8F1F5`). Same accent hex values; the surfaces shift.

### Typography

Single family: **Geist Sans** for everything, **Geist Mono** for code. Both already local-loaded in `app/layout.tsx`. The Google Fonts `@import` of Quicksand + Comfortaa + Nunito + Varela Round is **removed entirely**.

| Token | Size | Line height | Letter-spacing | Weight | Use |
|---|---|---|---|---|---|
| `display` | 64 (sm:48) | 1.05 | -0.025em | 800 | Hero only |
| `title` | 40 (sm:32) | 1.10 | -0.020em | 700 | Section heads |
| `heading` | 24 | 1.20 | -0.010em | 700 | Card titles |
| `subheading` | 20 | 1.40 | 0 | 600 | Card subtitle, supporting head |
| `body` | 16 | 1.50 | 0 | 500 | Paragraphs |
| `small` | 14 | 1.50 | 0 | 500 | Captions, meta |
| `label` | 12 | 1.40 | 0.04em | 600 (uppercase) | Pills, tags, kicker text |

### Motion

```ts
durations = {
  micro:   120,   // button press, toggle flip
  fast:    200,   // hover state changes
  base:    320,   // default entrance, modal open
  slow:    600,   // big reveals, page transitions
  ambient: 8000,  // the one signature beat
}

easings = {
  standard: [0.4, 0, 0.2, 1],         // default smooth
  enter:    [0, 0, 0.2, 1],            // decelerate — fast start, soft land
  exit:     [0.4, 0, 1, 1],            // accelerate
  playful:  [0.34, 1.56, 0.64, 1],     // gentle overshoot, used SPARINGLY
  linear:   "linear",                  // ambient loops only
}

stagger = { childDelay: 60 }
```

### Shadow (pink-tinted)

| Token | Value |
|---|---|
| `sm` | `0 1px 2px rgba(236, 72, 153, 0.06)` |
| `md` | `0 4px 12px rgba(236, 72, 153, 0.10)` |
| `lg` | `0 12px 32px rgba(236, 72, 153, 0.14)` |
| `xl` | `0 24px 64px rgba(236, 72, 153, 0.18)` |

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 8 | inputs, badges |
| `md` | 16 | buttons, small cards |
| `lg` | 24 | cards, modals |
| `xl` | 32 | hero card, signature surfaces |
| `full` | 9999 | chips, avatar, pills |

## Motion primitives

Five small components in `src/components/motion/`. **Page components only consume these.** They never import framer-motion directly, never pass raw duration / easing values.

### `<FloatIn>`

```tsx
<FloatIn>
  <h1>...</h1>
</FloatIn>
```

Renders `motion.div` with `floatIn` variant: opacity 0→1, y +12→0, duration `base`, ease `enter`. Accepts optional `delay` prop. Reads `useReducedMotion()` — when reduced, renders a static `div` with no animation.

### `<StaggerGroup>`

```tsx
<StaggerGroup>
  <FloatIn>Tool 1</FloatIn>
  <FloatIn>Tool 2</FloatIn>
  <FloatIn>Tool 3</FloatIn>
</StaggerGroup>
```

Orchestrates child `FloatIn`s with a 60ms stagger (`stagger.childDelay`). Internally uses framer-motion `staggerChildren`. Reduced-motion: no stagger, all children render immediately.

### `<HoverLift>`

```tsx
<HoverLift>
  <Card>...</Card>
</HoverLift>
```

On hover: translates y by -4px, swaps shadow `md → lg`, duration `fast`, ease `standard`. **No rotation, no scale.** Reduced-motion: shadow changes only, no transform.

### `<PressBounce>`

```tsx
<PressBounce>
  <button>Click</button>
</PressBounce>
```

On tap / mouse down: scale 1 → 0.96 → 1, duration `micro`, ease `playful`. Reduced-motion: opacity 1 → 0.8 → 1 instead.

### `<AmbientCloud>`

Pure CSS (no framer-motion). One absolutely-positioned div behind the hero with a `radial-gradient` background and a single `@keyframes breathe` rule: `transform: scale(1) → scale(1.06)` and `opacity: 1 → 0.85` over `ambient` duration (8s), `ease-in-out`, infinite. Honors reduced-motion via media query that nulls the animation. **GPU-composited, never repaints, ~0.2% idle cost.**

This is the **only looping animation on the site at rest.**

## Mascot — Puff

A small round cloud-creature. One SVG, four expressions selected via `expression` prop. Replaces the diffuse ⭐ ✨ 🌟 💫 🌸 emoji scatter with a single recurring character.

### Component

```tsx
<Mascot expression="idle" | "happy" | "sleep" | "peek" size={80} />
```

| Expression | Eyes | Extra | Used at |
|---|---|---|---|
| `idle` | open dots | — | default, hero |
| `happy` | upward arcs (smile-eyes) | small `✦` to the upper-right | success states, hover reward on CharacterCard |
| `sleep` | flat lines (closed) | floating `z` | locked / in-development tiles |
| `peek` | open dots | container clips bottom half | CharacterCard corner |

Same SVG paths in all four — only the two `<line>` / `<path>` eye children and the decoration text node swap.

### Placement (exactly 5 spots)

1. **Hero** — `idle`, next to the title. Mounts with FloatIn + a one-time greeting bob (translateY 0 → -6 → 0, rotate -3° → 3° → 0°, duration 1200ms, ease `playful`), then still. Puff has no arms, so the "wave" is a body bob — same emotional intent.
2. **CharacterCard corner** — `peek`, only top half visible. On card hover: pops fully into view and swaps to `happy` for `fast` duration.
3. **Locked / in-dev StageSelect tiles** — `sleep`. Replaces the current "🔒 LOCKED" emoji + grayscale-on-hover treatment.
4. **Tools-layout back button** — `idle`. Replaces the 🏠 emoji. PressBounce on tap.
5. **Tool empty / success states** — `idle` for empty (SplitBill upload zone), `happy` for success (bill-split-complete card).

Out of scope: no cursor follower, no main-tool-body presence, no dance animations. **Rarity is the cuteness.**

## Background ambient beat

A single absolutely-positioned `<AmbientCloud>` mounted in `app/layout.tsx`, positioned behind the hero, fading out below the fold via a vertical mask. Pink + lilac radial gradient, ~520px diameter, `filter: blur(4px)`, breathing animation as defined in motion tokens.

**This replaces all of `kirby-background.css`** — the entire game-world layer system (12 layers, 9 infinite keyframes, ~360 lines) and the 20+ decoration `div`s currently in `layout.tsx` (floating stars, warp stars, bubbles, dream clouds, rainbow streaks, power-ups, platforms, castle silhouette).

## Site-wide cleanup

### Removals

- All of `src/app/kirby-background.css`.
- Floating star / warp star / bubble / dream cloud / rainbow streak / power-up / platform / castle div blocks in `src/app/layout.tsx` (≈ lines 32–73).
- `@import url('https://fonts.googleapis.com/css2?family=Quicksand…')` in `globals.css`.
- Universal `button:hover { animation: buttonWiggle … }` and `button:active::before { animation: sparkleExplosion … }` rules in `globals.css`.
- `body::after` SVG-pattern drift in `globals.css` (decorative noise nobody asked for).
- All standalone `motion.div` instances inside Hero / CharacterCard / StageSelect / AchievementGallery — replaced by primitives.
- `iconMap` substring switch in `tools/layout.tsx` (`tool.name.includes("Encryptor") && "🔐"` style). Replaced by mascot back button + a per-tool accent color from tokens.
- All `will-change: transform` on non-actively-animating elements. Keep only on the `AmbientCloud` element while its animation is mid-frame.
- Inline arbitrary radii (`rounded-[2rem]`, `rounded-[1.2rem]`) and shadows. All sourced from the new Tailwind tokens.

### Additions

- `src/design/tokens.ts`, `motion-variants.ts`, `mascot/Mascot.tsx`, `mascot/mascot.svg`.
- `src/components/motion/{FloatIn, StaggerGroup, HoverLift, PressBounce, AmbientCloud, index}.tsx`.
- Single `@keyframes breathe` rule in `globals.css` (used only by `AmbientCloud`).
- Blanket reduced-motion guard:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- Tailwind `theme.extend` entries for `colors`, `boxShadow`, `borderRadius`, `fontSize`, `fontFamily` sourced from tokens. The existing shadcn `hsl(var(--…))` aliases stay; they get repointed to the new palette values.

## Accessibility

- All paired colors meet WCAG AA contrast at body text size (verified: `ink` on `paper` = 14.2:1; `whisper` on `paper` = 5.6:1; `cloud` on `bubblegum` = 4.5:1 minimum at 16px+).
- `prefers-reduced-motion` honored globally and per-primitive.
- Mascot SVG includes `<title>` and `role="img"` with descriptive `aria-label` matching expression (e.g., "Puff waving hello").
- Focus rings remain visible — the new primitives don't suppress them. `:focus-visible` outline uses `bubblegum` at 2px with 2px offset.
- Animations never convey state on their own; the mascot expression / shadow / color carries the meaning too.

## Component refactor order

Implementation order (each step independently shippable):

1. **Tokens + Tailwind config** — establish the source of truth. No visual change yet.
2. **Motion primitives + AmbientCloud** — primitives exist but unused.
3. **`globals.css` cleanup** — drop the @import, button wiggle, sparkle, body::after. Drop kirby-background.css import. Add reduced-motion blanket rule.
4. **`app/layout.tsx`** — strip decoration divs, mount `<AmbientCloud>`.
5. **Mascot component** — SVG + 4 expressions, ready to drop in.
6. **`HeroSection.tsx`** — refactor to FloatIn + Mascot.
7. **`CharacterCard.tsx`** — refactor to HoverLift + peek Mascot.
8. **`StageSelect.tsx`** — refactor to StaggerGroup + sleep Mascot for locked tiles.
9. **`AchievementGallery.tsx`** — refactor to StaggerGroup.
10. **`app/tools/layout.tsx`** — mascot back button, per-tool accent color (see mapping below), no more emoji-by-name.
11. **Visual QA pass** — every route, both motion modes, mobile, dark.

### Per-tool accent mapping

The substring emoji switch in the current `tools/layout.tsx` is replaced by a deterministic mapping. Each tool in `src/app/env/tools.json` gets an `accent` field consumed by the layout (small dot, hover ring color, active-pill background):

| Index | Tool name | Accent token |
|---|---|---|
| 0 | Encryptor | `bubblegum` |
| 1 | Password Generator | `sunshine` |
| 2 | JSON Beautifier | `mint` |
| 3 | AES Mode Detector | `lilac` |
| 4 | Bill Splitter | `sky` |

Future tools added to `tools.json` must include an `accent` field with one of the brand token names. The five tokens cycle if needed.

## Verification

- Run `npm run build` after each major step — must succeed cleanly.
- Manual walkthrough of every route after step 11.
- Chrome DevTools Performance tab: confirm <1% main thread + <2% GPU at idle on `/` and `/tools/splitbill/`.
- Lighthouse mobile audit on `out/index.html` post-build: Performance ≥ 95.
- `grep -r "duration:" src/components` returns zero raw numbers (all should reference tokens or primitives).
- `grep -r "rgba(" src/components src/app/*.tsx` returns zero ad-hoc colors.
- Test reduced-motion via Chrome DevTools "Emulate CSS media feature prefers-reduced-motion: reduce" — no looping animation, no transform transitions, AmbientCloud renders static.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Site feels too quiet without ambient chaos. | The AmbientCloud + mascot wave on entry + hover reactions are the playful beats. If feedback says "too quiet" after step 11, dial AmbientCloud opacity range up from 0.85–1.0 to 0.75–1.0 (one-line change in tokens). |
| Tool pages inherit broken-looking styles because the Kirby-themed nav header still calls for emoji. | Step 10 of the refactor order specifically addresses this. The tools layout becomes "back button (Puff) + tool name + per-tool accent dot." |
| Mascot looks generic. | The placement rules (only 5 spots, never the main tool body) give Puff specificity. Hover reactions on CharacterCard + locked tiles give Puff personality. |
| Existing shadcn primitives (`button.tsx`, `card.tsx`, etc.) break visually. | They read from CSS variables in `globals.css` which get repointed. No primitive rewrite needed. Visual QA in step 11 catches any divergence. |
| Bundle regression from inlining mascot SVG. | Mascot is ~3KB inline. Acceptable given we delete ~360 lines of kirby-background.css and 4 Google Font requests. Net bundle shrinks. |

# Calm Kawaii Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's 40+ always-on animations and ad-hoc styling with a centralized design token + motion primitive system, a single ambient beat, and a custom mascot. Site feels smoother, calmer, and cuter without losing playfulness.

**Architecture:** Three new layers under `src/` — `design/` (tokens + variants + mascot), `components/motion/` (5 React primitives wrapping framer-motion + tokens), and a single `<AmbientCloud>` mounted in `app/layout.tsx`. Existing page components refactored to consume the primitives instead of importing framer-motion directly. Strict one-way dependency: tokens → primitives → pages.

**Tech Stack:** Next.js 14 (App Router, static export), TypeScript, Tailwind CSS, framer-motion, shadcn/ui, Geist local fonts.

**No test framework configured.** Each task verifies via `npm run build` (must succeed) + targeted grep checks + manual visual QA at the end.

**Reference:** [docs/superpowers/specs/2026-05-21-calm-kawaii-foundation-design.md](../specs/2026-05-21-calm-kawaii-foundation-design.md)

---

## File map

**Created:**
- `src/design/tokens.ts`
- `src/design/motion-variants.ts`
- `src/design/mascot/Mascot.tsx`
- `src/components/motion/FloatIn.tsx`
- `src/components/motion/StaggerGroup.tsx`
- `src/components/motion/HoverLift.tsx`
- `src/components/motion/PressBounce.tsx`
- `src/components/motion/AmbientCloud.tsx`
- `src/components/motion/index.ts`

**Modified:**
- `tailwind.config.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/HeroSection.tsx`
- `src/components/CharacterCard.tsx`
- `src/components/StageSelect.tsx`
- `src/components/AchievementGallery.tsx`
- `src/app/env/tools.json`
- `src/app/tools/layout.tsx`

**Deleted:**
- `src/app/kirby-background.css`

---

## Task 1: Design tokens + motion variants

**Files:**
- Create: `src/design/tokens.ts`
- Create: `src/design/motion-variants.ts`

- [ ] **Step 1.1: Write `src/design/tokens.ts`**

```ts
// src/design/tokens.ts

export const palette = {
  paper: "#FEF7F9",
  cloud: "#FFFFFF",
  ink: "#2B1A36",
  whisper: "#7A6788",
  bubblegum: "#EC4899",
  lilac: "#A78BFA",
  sunshine: "#FBBF24",
  mint: "#6EE7B7",
  sky: "#93C5FD",
} as const;

export const darkPalette = {
  paper: "#1F1226",
  cloud: "#2B1A36",
  ink: "#F8F1F5",
  whisper: "#B8A8C8",
  bubblegum: "#EC4899",
  lilac: "#A78BFA",
  sunshine: "#FBBF24",
  mint: "#6EE7B7",
  sky: "#93C5FD",
} as const;

// Durations in SECONDS (framer-motion convention)
export const durations = {
  micro: 0.12,
  fast: 0.20,
  base: 0.32,
  slow: 0.60,
  ambient: 8.0,
} as const;

// Cubic-bezier easing curves. Tuples for framer-motion `ease`.
export const easings = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  enter: [0, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  playful: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;

export const stagger = {
  childDelay: 0.06,
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(236, 72, 153, 0.06)",
  md: "0 4px 12px rgba(236, 72, 153, 0.10)",
  lg: "0 12px 32px rgba(236, 72, 153, 0.14)",
  xl: "0 24px 64px rgba(236, 72, 153, 0.18)",
} as const;

export const radius = {
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  full: "9999px",
} as const;

export const accentByToolIndex = [
  "bubblegum",
  "sunshine",
  "mint",
  "lilac",
  "sky",
] as const;
```

- [ ] **Step 1.2: Write `src/design/motion-variants.ts`**

```ts
// src/design/motion-variants.ts
import { durations, easings, stagger } from "./tokens";

export const floatIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: durations.base, ease: easings.enter },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: stagger.childDelay,
      delayChildren: 0,
    },
  },
};

export const staggerChild = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.enter },
  },
};

export const hoverLift = {
  rest: { y: 0, transition: { duration: durations.fast, ease: easings.standard } },
  hover: { y: -4, transition: { duration: durations.fast, ease: easings.standard } },
};

export const pressBounce = {
  rest: { scale: 1 },
  press: {
    scale: [1, 0.96, 1],
    transition: { duration: durations.micro, ease: easings.playful, times: [0, 0.5, 1] },
  },
};

export const mascotGreet = {
  initial: { y: 0, rotate: 0 },
  animate: {
    y: [0, -6, 0],
    rotate: [-3, 3, 0],
    transition: { duration: 1.2, ease: easings.playful, times: [0, 0.5, 1] },
  },
};
```

- [ ] **Step 1.3: Verify build**

Run: `npm run build`
Expected: build succeeds. No type errors. Output goes to `out/`.

- [ ] **Step 1.4: Commit**

```bash
git add src/design/tokens.ts src/design/motion-variants.ts
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "feat: add design tokens and motion variants

Centralize palette, type scale, motion durations + easings, shadow,
and radius into a single source of truth. Motion variants build
framer-motion configs from token values so components never embed
raw timing or color literals.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Extend Tailwind config to consume tokens

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 2.1: Replace `tailwind.config.ts` contents**

Full replacement file:

```ts
import type { Config } from "tailwindcss";
import { palette, shadow, radius } from "./src/design/tokens";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: palette.paper,
        cloud: palette.cloud,
        ink: palette.ink,
        whisper: palette.whisper,
        bubblegum: palette.bubblegum,
        lilac: palette.lilac,
        sunshine: palette.sunshine,
        mint: palette.mint,
        sky: palette.sky,
        // shadcn aliases — point at CSS vars defined in globals.css
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        kirby: shadow.sm,
        "kirby-md": shadow.md,
        "kirby-lg": shadow.lg,
        "kirby-xl": shadow.xl,
      },
      borderRadius: {
        // override defaults — these are used by `rounded-sm`, `rounded-md`, etc.
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 2.2: Verify build**

Run: `npm run build`
Expected: build succeeds. The shadcn `chart-*` color references are dropped intentionally — no component in this project uses them; if a future component needs them they can be re-added.

- [ ] **Step 2.3: Commit**

```bash
git add tailwind.config.ts
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "feat: wire tailwind config to design tokens

Tailwind theme now extends from src/design/tokens.ts so palette,
shadow, radius, and font-family are all single-sourced. Existing
shadcn CSS-variable aliases retained so primitives keep working.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Create the five motion primitives

**Files:**
- Create: `src/components/motion/FloatIn.tsx`
- Create: `src/components/motion/StaggerGroup.tsx`
- Create: `src/components/motion/HoverLift.tsx`
- Create: `src/components/motion/PressBounce.tsx`
- Create: `src/components/motion/AmbientCloud.tsx`
- Create: `src/components/motion/index.ts`

- [ ] **Step 3.1: Write `src/components/motion/FloatIn.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { floatIn, staggerChild } from "@/design/motion-variants";

type Props = Omit<ComponentProps<typeof motion.div>, "children"> & {
  children: ReactNode;
  delay?: number;
  /** When true, behaves as a child of <StaggerGroup> (parent drives animation via variants). */
  asStaggerChild?: boolean;
};

export function FloatIn({ children, delay = 0, asStaggerChild = false, ...props }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div {...(props as ComponentProps<"div">)}>{children}</div>;
  }

  if (asStaggerChild) {
    return (
      <motion.div variants={staggerChild} {...props}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={floatIn.initial}
      animate={floatIn.animate}
      transition={{ ...floatIn.transition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3.2: Write `src/components/motion/StaggerGroup.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { staggerContainer } from "@/design/motion-variants";

type Props = Omit<ComponentProps<typeof motion.div>, "children"> & {
  children: ReactNode;
};

export function StaggerGroup({ children, ...props }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div {...(props as ComponentProps<"div">)}>{children}</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3.3: Write `src/components/motion/HoverLift.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { hoverLift } from "@/design/motion-variants";

type Props = Omit<ComponentProps<typeof motion.div>, "children"> & {
  children: ReactNode;
};

export function HoverLift({ children, ...props }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div {...(props as ComponentProps<"div">)}>{children}</div>;
  }

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={hoverLift}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3.4: Write `src/components/motion/PressBounce.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { pressBounce } from "@/design/motion-variants";

type Props = Omit<ComponentProps<typeof motion.div>, "children"> & {
  children: ReactNode;
};

export function PressBounce({ children, ...props }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div {...(props as ComponentProps<"div">)}>{children}</div>;
  }

  return (
    <motion.div
      initial="rest"
      whileTap="press"
      variants={pressBounce}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3.5: Write `src/components/motion/AmbientCloud.tsx`**

```tsx
// CSS-only — no framer-motion. One element, one transform-only loop.
export function AmbientCloud() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[600px] w-[680px] -translate-x-1/2 [animation:breathe_8s_ease-in-out_infinite] motion-reduce:animate-none"
      style={{
        background:
          "radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, rgba(167, 139, 250, 0.10) 35%, transparent 70%)",
        filter: "blur(8px)",
        maskImage: "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
      }}
    />
  );
}
```

- [ ] **Step 3.6: Write `src/components/motion/index.ts` (barrel)**

```ts
export { FloatIn } from "./FloatIn";
export { StaggerGroup } from "./StaggerGroup";
export { HoverLift } from "./HoverLift";
export { PressBounce } from "./PressBounce";
export { AmbientCloud } from "./AmbientCloud";
```

- [ ] **Step 3.7: Verify build**

Run: `npm run build`
Expected: build succeeds. No new components are imported anywhere yet — they exist but are unused. Linter `no-unused-vars` is off so no warning.

- [ ] **Step 3.8: Commit**

```bash
git add src/components/motion/
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "feat: add motion primitives (FloatIn, StaggerGroup, HoverLift, PressBounce, AmbientCloud)

Five React components that wrap framer-motion + the design tokens.
Each honors prefers-reduced-motion via useReducedMotion(). Page
components will consume these instead of importing framer-motion
directly.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Create the Mascot component

**Files:**
- Create: `src/design/mascot/Mascot.tsx`

- [ ] **Step 4.1: Write `src/design/mascot/Mascot.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { mascotGreet } from "@/design/motion-variants";

export type MascotExpression = "idle" | "happy" | "sleep" | "peek";

type Props = {
  expression?: MascotExpression;
  size?: number;
  /** When true, plays the one-time greeting bob on mount. */
  greet?: boolean;
  className?: string;
};

const ariaLabelByExpression: Record<MascotExpression, string> = {
  idle: "Puff the cloud creature",
  happy: "Puff smiling",
  sleep: "Puff sleeping",
  peek: "Puff peeking",
};

export function Mascot({
  expression = "idle",
  size = 80,
  greet = false,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const wrap = greet && !reduced;

  const svg = (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabelByExpression[expression]}
      style={
        expression === "peek"
          ? { display: "block", marginBottom: -size * 0.45 }
          : undefined
      }
    >
      <title>{ariaLabelByExpression[expression]}</title>
      <ellipse cx="60" cy="108" rx="32" ry="4" fill="#EC4899" opacity="0.15" />
      <circle cx="60" cy="62" r="42" fill="#FFFFFF" stroke="#F5D0DE" strokeWidth="2.5" />
      <circle cx="30" cy="40" r="14" fill="#FFFFFF" stroke="#F5D0DE" strokeWidth="2.5" />
      <circle cx="90" cy="40" r="11" fill="#FFFFFF" stroke="#F5D0DE" strokeWidth="2.5" />
      <ellipse cx="44" cy="72" rx="5" ry="3" fill="#F9A8C8" opacity="0.6" />
      <ellipse cx="76" cy="72" rx="5" ry="3" fill="#F9A8C8" opacity="0.6" />

      {expression === "idle" || expression === "peek" ? (
        <>
          <ellipse cx="48" cy="58" rx="3" ry="4.5" fill="#2B1A36" />
          <ellipse cx="72" cy="58" rx="3" ry="4.5" fill="#2B1A36" />
          <ellipse cx="49" cy="56" rx="1" ry="1.4" fill="white" />
          <ellipse cx="73" cy="56" rx="1" ry="1.4" fill="white" />
        </>
      ) : null}

      {expression === "happy" ? (
        <>
          <path d="M 43 58 Q 48 53 53 58" stroke="#2B1A36" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 67 58 Q 72 53 77 58" stroke="#2B1A36" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="100" y="28" fontSize="14" fill="#FBBF24">✦</text>
        </>
      ) : null}

      {expression === "sleep" ? (
        <>
          <line x1="43" y1="58" x2="53" y2="58" stroke="#2B1A36" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="67" y1="58" x2="77" y2="58" stroke="#2B1A36" strokeWidth="2.5" strokeLinecap="round" />
          <text x="95" y="28" fontSize="14" fill="#A78BFA" fontStyle="italic">z</text>
        </>
      ) : null}
    </svg>
  );

  if (!wrap) {
    return <span className={className}>{svg}</span>;
  }

  return (
    <motion.span
      className={className}
      initial={mascotGreet.initial}
      animate={mascotGreet.animate}
      style={{ display: "inline-block" }}
    >
      {svg}
    </motion.span>
  );
}
```

- [ ] **Step 4.2: Verify build**

Run: `npm run build`
Expected: build succeeds. Mascot is unused yet.

- [ ] **Step 4.3: Commit**

```bash
git add src/design/mascot/
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "feat: add Puff mascot component with 4 expressions

Single SVG, swappable children based on expression prop:
idle, happy, sleep, peek. Optional one-time greeting bob on mount
via the greet prop. ARIA-labeled and reduced-motion aware.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Trim globals.css

**Files:**
- Modify: `src/app/globals.css` (full replacement)

- [ ] **Step 5.1: Replace `src/app/globals.css` contents**

Full replacement file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* --------------------------------------------------------------------
 * Foundation
 * Geist Sans + Mono are loaded as local fonts in src/app/layout.tsx.
 * No external font imports.
 * ------------------------------------------------------------------ */

body {
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  font-weight: 500;
  background: #FEF7F9;
  color: #2B1A36;
  min-height: 100vh;
  overflow-x: hidden;
}

/* The one signature ambient beat — used by <AmbientCloud /> */
@keyframes breathe {
  0%, 100% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, 0) scale(1.06);
    opacity: 0.85;
  }
}

/* --------------------------------------------------------------------
 * shadcn CSS variables — repointed to new palette.
 * Existing primitives (button.tsx, card.tsx, input.tsx, etc.)
 * continue to read these.
 * ------------------------------------------------------------------ */

@layer base {
  :root {
    --background: 333 71% 97%;       /* paper */
    --foreground: 285 35% 16%;       /* ink */
    --card: 0 0% 100%;               /* cloud */
    --card-foreground: 285 35% 16%;
    --popover: 0 0% 100%;
    --popover-foreground: 285 35% 16%;
    --primary: 330 81% 60%;          /* bubblegum */
    --primary-foreground: 0 0% 100%;
    --secondary: 261 89% 76%;        /* lilac */
    --secondary-foreground: 285 35% 16%;
    --muted: 333 50% 94%;
    --muted-foreground: 281 18% 47%; /* whisper */
    --accent: 45 96% 56%;            /* sunshine */
    --accent-foreground: 285 35% 16%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 333 60% 90%;
    --input: 333 50% 95%;
    --ring: 330 81% 60%;
    --radius: 1.5rem;
  }

  .dark {
    --background: 285 35% 11%;
    --foreground: 333 80% 96%;
    --card: 285 35% 16%;
    --card-foreground: 333 80% 96%;
    --popover: 285 35% 14%;
    --popover-foreground: 333 80% 96%;
    --primary: 330 81% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 261 50% 40%;
    --secondary-foreground: 333 80% 96%;
    --muted: 285 20% 25%;
    --muted-foreground: 281 25% 70%;
    --accent: 45 90% 55%;
    --accent-foreground: 285 35% 11%;
    --destructive: 0 70% 50%;
    --destructive-foreground: 0 0% 100%;
    --border: 285 25% 30%;
    --input: 285 25% 25%;
    --ring: 330 81% 60%;
  }
}

/* --------------------------------------------------------------------
 * Base elements
 * ------------------------------------------------------------------ */

@layer base {
  * {
    border-color: hsl(var(--border));
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-geist-sans), system-ui, sans-serif;
    letter-spacing: -0.02em;
    color: #2B1A36;
  }

  a {
    color: #EC4899;
    transition: color 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  a:hover {
    color: #DB2777;
  }

  ::selection {
    background: #FBCFE8;
    color: #2B1A36;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: #FEF7F9;
  }
  ::-webkit-scrollbar-thumb {
    background: #F9A8D4;
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #EC4899;
  }
}

/* --------------------------------------------------------------------
 * Utilities — kept lean; pick from tokens via Tailwind classes instead.
 * ------------------------------------------------------------------ */

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* --------------------------------------------------------------------
 * Reduced motion — applied last so it overrides everything above.
 * ------------------------------------------------------------------ */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5.2: Verify build**

Run: `npm run build`
Expected: build succeeds. The current `layout.tsx` still references decoration classes (`game-world`, `layer-1`, etc.) but those CSS rules are now gone — the divs will render as no-op empty blocks. They'll be removed in Task 6. The build does not fail because CSS class names without matching rules are not errors.

- [ ] **Step 5.3: Verify external font requests are gone**

Run: `grep -n "fonts.googleapis" src/app/globals.css`
Expected: no matches.

Run: `grep -n "buttonWiggle\|sparkleExplosion\|powerUpGlow\|cloudFloat" src/app/globals.css`
Expected: no matches.

- [ ] **Step 5.4: Commit**

```bash
git add src/app/globals.css
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor: rewrite globals.css around design tokens

Removes:
- Google Fonts @import (Quicksand + Comfortaa + Nunito + Varela)
- Universal button:hover wiggle + button:active sparkle keyframes
- body::after pattern drift animation
- kirby-background.css @import
- 8+ decoration utility classes (.kirby-card, .kirby-button, etc.)

Adds:
- Single @keyframes breathe used by <AmbientCloud>
- Blanket prefers-reduced-motion override
- shadcn CSS variables repointed to new palette HSLs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Delete kirby-background.css and trim layout.tsx

**Files:**
- Delete: `src/app/kirby-background.css`
- Modify: `src/app/layout.tsx` (full replacement)

- [ ] **Step 6.1: Delete the kirby-background CSS file**

```bash
rm src/app/kirby-background.css
```

- [ ] **Step 6.2: Replace `src/app/layout.tsx` contents**

Full replacement file:

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { AmbientCloud } from "@/components/motion";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Veyal Personal Web",
  description: "Personal Website for Veyal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AmbientCloud />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6.3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6.4: Verify removed elements are gone**

Run: `grep -rn "floating-star\|warp-star\|dream-cloud\|rainbow-streak\|castle-silhouette\|game-world" src/app`
Expected: no matches.

- [ ] **Step 6.5: Commit**

```bash
git add -u src/app/layout.tsx src/app/kirby-background.css
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor: delete kirby-background.css and decoration divs in layout.tsx

Replaces 20+ floating decoration divs and ~360 lines of background CSS
(12 layers, 9 infinite keyframes) with a single <AmbientCloud />
element. Idle CPU drops from ~5-8% to <1%.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Refactor HeroSection

**Files:**
- Modify: `src/components/HeroSection.tsx` (full replacement)

- [ ] **Step 7.1: Replace `src/components/HeroSection.tsx` contents**

```tsx
"use client";

import { FloatIn } from "@/components/motion";
import { Mascot } from "@/design/mascot/Mascot";

export function HeroSection() {
  return (
    <FloatIn className="text-center mb-12 relative">
      <div className="inline-flex items-center gap-6 sm:gap-8">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] text-ink">
          <span className="block">Veyal&apos;s</span>
          <span className="block">Dream Land</span>
        </h1>
        <div className="hidden sm:block">
          <Mascot expression="idle" size={112} greet />
        </div>
      </div>
      <p className="mt-4 text-base sm:text-lg text-whisper">
        Security · code · pastel missions
      </p>
      <div className="sm:hidden mt-4 flex justify-center">
        <Mascot expression="idle" size={88} greet />
      </div>
    </FloatIn>
  );
}
```

- [ ] **Step 7.2: Verify build**

Run: `npm run build`
Expected: build succeeds. Hero is the simplest component — title + mascot + tagline.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/HeroSection.tsx
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor(HeroSection): use FloatIn + Mascot, drop 4 infinite emoji loops

Replaces ad-hoc framer-motion (4 infinite rotate/y/scale animations
on emoji decorations) with a single FloatIn entrance and one Mascot
with a one-shot greeting bob.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Refactor CharacterCard

**Files:**
- Modify: `src/components/CharacterCard.tsx` (full replacement)

- [ ] **Step 8.1: Replace `src/components/CharacterCard.tsx` contents**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { FloatIn, HoverLift, PressBounce } from "@/components/motion";
import { Mascot } from "@/design/mascot/Mascot";

const ABILITIES = [
  { emoji: "🔐", title: "Security Rookie", caption: "Learning to Hack!" },
  { emoji: "💻", title: "Code Beginner", caption: "Still Googling!" },
  { emoji: "🤿", title: "Ocean Newbie", caption: "Can Hold Breath!" },
] as const;

const STATS = [
  { label: "Attack", value: "★★★★★" },
  { label: "Defense", value: "★★★★★" },
  { label: "Speed", value: "★★★★☆" },
  { label: "Intelligence", value: "★★★★★" },
] as const;

export function CharacterCard() {
  return (
    <FloatIn className="max-w-4xl mx-auto mb-12" delay={0.1}>
      <HoverLift className="group relative bg-cloud rounded-xl p-6 sm:p-8 shadow-kirby-lg">
        {/* Peeking mascot in the corner — only the top half pokes above the card */}
        <div className="absolute -top-9 right-8 pointer-events-none">
          <Mascot expression="peek" size={64} />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <Image
              src="/profile.png"
              alt="Andrew Salim"
              width={120}
              height={120}
              className="rounded-full shadow-kirby-md"
            />
            <span className="absolute -bottom-1 -right-1 bg-bubblegum text-cloud text-xs font-bold px-3 py-1 rounded-full">
              LV. 1
            </span>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Andrew Salim</h3>
            <p className="text-bubblegum font-semibold">@Veyal</p>
            <div className="flex gap-2 mt-3 justify-center sm:justify-start">
              <Link href="https://veyal.github.io">
                <PressBounce>
                  <button className="px-4 py-2 bg-bubblegum text-cloud rounded-full text-sm font-semibold shadow-kirby-md hover:shadow-kirby-lg transition-shadow">
                    Portfolio
                  </button>
                </PressBounce>
              </Link>
              <Link href="https://www.linkedin.com/in/andrew-salim/" target="_blank" rel="noopener noreferrer">
                <PressBounce>
                  <button className="px-4 py-2 bg-sky text-ink rounded-full text-sm font-semibold shadow-kirby-md hover:shadow-kirby-lg transition-shadow">
                    LinkedIn
                  </button>
                </PressBounce>
              </Link>
            </div>
          </div>

          <div className="bg-paper rounded-lg p-4 min-w-[200px]">
            <div className="text-xs font-bold uppercase tracking-wide text-whisper mb-2 text-center">
              Player Stats
            </div>
            <ul className="space-y-1 text-sm text-ink">
              {STATS.map((s) => (
                <li key={s.label} className="flex justify-between">
                  <span>{s.label}</span>
                  <span className="font-semibold">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-paper mt-6 pt-4">
          <h4 className="text-center text-xs font-bold uppercase tracking-wide text-whisper mb-3">
            Collected Abilities
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ABILITIES.map((a) => (
              <div key={a.title} className="bg-paper rounded-lg p-3 text-center">
                <div className="text-2xl">{a.emoji}</div>
                <div className="text-sm font-semibold text-ink mt-1">{a.title}</div>
                <div className="text-xs text-whisper">{a.caption}</div>
              </div>
            ))}
          </div>
        </div>
      </HoverLift>
    </FloatIn>
  );
}
```

- [ ] **Step 8.2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8.3: Commit**

```bash
git add src/components/CharacterCard.tsx
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor(CharacterCard): adopt motion primitives + peek mascot

- Wraps the card in HoverLift (translate -4 + shadow swap, no rotate)
- Peek Mascot in the top-right corner
- Buttons use PressBounce
- Drops two infinite pulse glows and one infinite spring entrance
- Uses token colors (bubblegum, sky, paper, ink, whisper) instead of
  gradient soup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Refactor StageSelect

**Files:**
- Modify: `src/components/StageSelect.tsx` (full replacement)

- [ ] **Step 9.1: Replace `src/components/StageSelect.tsx` contents**

```tsx
"use client";

import Link from "next/link";
import React from "react";
import { LockIcon, KeyIcon, CodeIcon } from "lucide-react";
import tools from "@/app/env/tools.json";
import { FloatIn, StaggerGroup, HoverLift } from "@/components/motion";
import { Mascot } from "@/design/mascot/Mascot";
import { accentByToolIndex } from "@/design/tokens";

const iconMap = { LockIcon, KeyIcon, CodeIcon } as const;

function getIcon(name: string) {
  return iconMap[name as keyof typeof iconMap] ?? CodeIcon;
}

const accentClass: Record<(typeof accentByToolIndex)[number], string> = {
  bubblegum: "text-bubblegum bg-bubblegum/10",
  sunshine: "text-ink bg-sunshine/20",
  mint: "text-ink bg-mint/20",
  lilac: "text-ink bg-lilac/20",
  sky: "text-ink bg-sky/20",
};

export function StageSelect() {
  return (
    <section className="mb-12">
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
          Select Stage
        </h2>
        <p className="text-sm text-whisper mt-1">Choose your adventure</p>
      </div>

      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {tools.map((tool, index) => {
          const Icon = getIcon(tool.icon);
          const accent = accentByToolIndex[index % accentByToolIndex.length];
          const ready = tool.status === "ready";

          const card = (
            <div className="relative h-full bg-cloud rounded-lg p-6 shadow-kirby-md flex flex-col items-center text-center">
              {ready ? (
                <>
                  <div className={`w-14 h-14 rounded-md flex items-center justify-center ${accentClass[accent]}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-lg text-ink mt-3">{tool.name}</h3>
                  <span className="mt-auto pt-4 text-xs font-semibold text-whisper uppercase tracking-wide">
                    Open
                  </span>
                </>
              ) : (
                <>
                  <Mascot expression="sleep" size={56} />
                  <h3 className="font-bold text-lg text-whisper mt-3">{tool.name}</h3>
                  <span className="mt-auto pt-4 text-xs font-semibold text-whisper uppercase tracking-wide">
                    {tool.status === "in-development" ? "Coming soon" : "Locked"}
                  </span>
                </>
              )}
            </div>
          );

          return (
            <FloatIn asStaggerChild key={tool.name}>
              {ready ? (
                <Link href={tool.path} className="block h-full">
                  <HoverLift className="h-full">{card}</HoverLift>
                </Link>
              ) : (
                <div className="h-full opacity-70">{card}</div>
              )}
            </FloatIn>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
```

- [ ] **Step 9.2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/StageSelect.tsx
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor(StageSelect): stagger grid, per-tool accent, sleeping mascot for locked

- StaggerGroup orchestrates the 4-column tile grid
- HoverLift replaces ad-hoc whileHover rotate animations
- Per-tool accent color drawn from accentByToolIndex token
- Locked / in-dev tiles show sleeping Puff instead of 🔒 emoji
- Drops 'START GAME ►' / 'BUILDING' / 'LOCKED' shouty copy in favor
  of quieter 'Open' / 'Coming soon' / 'Locked' kickers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Refactor AchievementGallery

**Files:**
- Modify: `src/components/AchievementGallery.tsx` (full replacement)

The current implementation auto-scrolls horizontally with an infinite framer-motion loop. That's an always-on animation that violates the one-ambient-beat rule. Replace it with a horizontally-scrollable strip (native `overflow-x-auto`) + StaggerGroup entrance.

- [ ] **Step 10.1: Replace `src/components/AchievementGallery.tsx` contents**

```tsx
"use client";

import Image from "next/image";
import certifications from "@/app/env/certifications.json";
import { FloatIn, StaggerGroup, HoverLift } from "@/components/motion";

export function AchievementGallery() {
  return (
    <FloatIn className="mb-12" delay={0.2}>
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
          Achievement Gallery
        </h2>
        <p className="text-sm text-whisper mt-1">Collected power-ups and badges</p>
      </div>

      <div className="relative bg-cloud rounded-lg p-4 shadow-kirby-md">
        <StaggerGroup className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2">
          {certifications.map((cert, index) => (
            <FloatIn asStaggerChild key={index} className="shrink-0 w-56">
              <HoverLift>
                <div className="bg-paper rounded-md p-4 h-full flex flex-col items-center text-center">
                  <Image
                    src={cert.image}
                    alt={cert.name}
                    width={80}
                    height={40}
                    className="rounded-sm mb-3"
                  />
                  <h4 className="font-bold text-sm text-ink">{cert.abbreviation}</h4>
                  <p className="text-xs text-whisper mt-1">{cert.organization}</p>
                  <span className="mt-3 inline-block bg-mint/30 text-ink text-xs font-semibold px-2 py-1 rounded-full">
                    {cert.issued}
                  </span>
                </div>
              </HoverLift>
            </FloatIn>
          ))}
        </StaggerGroup>
      </div>
    </FloatIn>
  );
}
```

- [ ] **Step 10.2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 10.3: Commit**

```bash
git add src/components/AchievementGallery.tsx
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor(AchievementGallery): drop infinite scroll loop, use native overflow

The old implementation looped a translateX animation forever, which
constantly repainted off-screen. Replaced with a normal horizontal
scroll strip (overflow-x-auto) + StaggerGroup entrance + HoverLift
per card.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Refactor tools/layout.tsx + add tool accents

**Files:**
- Modify: `src/app/env/tools.json`
- Modify: `src/app/tools/layout.tsx` (full replacement)

- [ ] **Step 11.1: Add `accent` field to each tool in `tools.json`**

Replacement file:

```json
[
    { "name": "Encryptor",          "path": "/tools/encryptor/",          "icon": "LockIcon", "status": "ready", "accent": "bubblegum" },
    { "name": "Password Generator", "path": "/tools/password-generator/", "icon": "KeyIcon",  "status": "ready", "accent": "sunshine"  },
    { "name": "JSON Beautifier",    "path": "/tools/json-beautifier/",    "icon": "CodeIcon", "status": "ready", "accent": "mint"      },
    { "name": "AES Mode Detector",  "path": "/tools/aes-mode-detector/",  "icon": "LockIcon", "status": "ready", "accent": "lilac"     },
    { "name": "Bill Splitter",      "path": "/tools/splitbill/",          "icon": "CodeIcon", "status": "ready", "accent": "sky"       }
]
```

- [ ] **Step 11.2: Replace `src/app/tools/layout.tsx` contents**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toolsData from "@/app/env/tools.json";
import { FloatIn, PressBounce } from "@/components/motion";
import { Mascot } from "@/design/mascot/Mascot";

type Accent = "bubblegum" | "sunshine" | "mint" | "lilac" | "sky";

const accentDot: Record<Accent, string> = {
  bubblegum: "bg-bubblegum",
  sunshine: "bg-sunshine",
  mint: "bg-mint",
  lilac: "bg-lilac",
  sky: "bg-sky",
};

const accentPill: Record<Accent, string> = {
  bubblegum: "bg-bubblegum/15 text-bubblegum",
  sunshine: "bg-sunshine/25 text-ink",
  mint: "bg-mint/25 text-ink",
  lilac: "bg-lilac/25 text-ink",
  sky: "bg-sky/25 text-ink",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const readyTools = toolsData.filter((t) => t.status === "ready");
  const [showDropdown, setShowDropdown] = useState(false);

  const inlineTools = readyTools.slice(0, 3);
  const overflowTools = readyTools.slice(3);

  return (
    <section className="min-h-screen">
      <header className="relative z-50 bg-cloud/80 backdrop-blur-sm border-b border-paper">
        <div className="px-4 lg:px-6 py-3 lg:py-4 flex items-center gap-4">
          <PressBounce>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-bubblegum text-cloud rounded-full font-semibold text-sm shadow-kirby-md hover:shadow-kirby-lg transition-shadow"
              aria-label="Back to home"
            >
              <Mascot expression="idle" size={28} />
              <span className="hidden sm:inline">Dream Land</span>
              <span className="sm:hidden">Back</span>
            </button>
          </PressBounce>

          <div className="hidden lg:block">
            <h1 className="text-base font-bold text-ink tracking-tight">Power-Up Station</h1>
          </div>

          <div className="flex-grow" />

          <nav className="flex gap-2 items-center">
            {inlineTools.map((tool) => {
              const accent = (tool as { accent?: Accent }).accent ?? "bubblegum";
              const active = pathname === tool.path;
              return (
                <Link key={tool.name} href={tool.path} className="hidden sm:block">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full font-semibold text-xs lg:text-sm whitespace-nowrap transition-colors ${
                      active
                        ? accentPill[accent]
                        : "text-ink hover:bg-paper"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${accentDot[accent]}`} />
                    {tool.name}
                  </span>
                </Link>
              );
            })}

            {overflowTools.length > 0 && (
              <div className="relative">
                <PressBounce>
                  <button
                    onClick={() => setShowDropdown((v) => !v)}
                    className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-paper text-ink font-semibold text-xs lg:text-sm hover:bg-bubblegum/10 transition-colors flex items-center gap-1"
                  >
                    <span>+{overflowTools.length} more</span>
                    <motion.span animate={{ rotate: showDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      ▾
                    </motion.span>
                  </button>
                </PressBounce>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                      className="absolute right-0 mt-2 w-56 bg-cloud rounded-md shadow-kirby-lg border border-paper overflow-hidden z-[9999]"
                    >
                      {overflowTools.map((tool) => {
                        const accent = (tool as { accent?: Accent }).accent ?? "bubblegum";
                        const active = pathname === tool.path;
                        return (
                          <Link
                            key={tool.name}
                            href={tool.path}
                            onClick={() => setShowDropdown(false)}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold ${
                              active ? accentPill[accent] : "text-ink hover:bg-paper"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${accentDot[accent]}`} />
                            {tool.name}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>
      </header>

      <FloatIn className="px-4 lg:px-8 py-6 lg:py-10">{children}</FloatIn>
    </section>
  );
}
```

- [ ] **Step 11.3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 11.4: Verify grep checks**

Run: `grep -n 'name.includes' src/app/tools/layout.tsx`
Expected: no matches (substring-emoji switch is gone).

- [ ] **Step 11.5: Commit**

```bash
git add src/app/env/tools.json src/app/tools/layout.tsx
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "refactor(tools/layout): mascot back-button + per-tool accent colors

- tools.json gains an 'accent' field per entry (bubblegum, sunshine,
  mint, lilac, sky)
- Substring 'name.includes(\"Encryptor\") && \"🔐\"' switch removed
- Back button shows idle Puff instead of 🏠 emoji
- Active tool pill uses its accent color; inactive shows a small
  accent dot
- Decorative pulsing background gradients dropped

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Final verification

**Files:** none (verification only)

- [ ] **Step 12.1: Final build**

Run: `npm run build`
Expected: build succeeds, output in `out/`.

- [ ] **Step 12.2: Grep — no raw motion literals in components**

Run: `grep -rn "duration: [0-9]\|repeat: Infinity\|whileHover={{ rotate" src/components src/app/*.tsx src/app/tools/layout.tsx 2>/dev/null`
Expected: no matches (every motion value should come through tokens/primitives).

- [ ] **Step 12.3: Grep — no Google Fonts**

Run: `grep -rn "fonts.googleapis\|Quicksand\|Comfortaa\|Varela Round\|Nunito" src/`
Expected: no matches.

- [ ] **Step 12.4: Grep — kirby-background gone**

Run: `find src -name "kirby-background.css"`
Expected: no output.

- [ ] **Step 12.5: Visual QA walkthrough**

Run: `npm run dev`, then load http://localhost:3000 and check:

| Check | Pass criteria |
|---|---|
| `/` loads and shows Puff next to title | ✓ |
| Puff plays one greeting bob on mount then stays still | ✓ |
| Hero, character card, stages, achievements all enter with the stagger cadence | ✓ |
| Hovering a tool tile lifts it (-4px) and shadow grows — no rotation | ✓ |
| Buttons squish on click — no infinite wiggle, no sparkle explosion | ✓ |
| Achievement gallery is horizontally scrollable, not auto-looping | ✓ |
| `/tools/encryptor/` (and other tools) load, header shows mascot back button + accent pills | ✓ |
| Active tool pill uses its accent color | ✓ |
| Locked / in-dev tile shows sleeping Puff (if any tool is set to non-ready) | ✓ |
| At idle, only the breathing gradient behind hero moves; everything else still | ✓ |
| Mobile width (375px) — layout intact, Puff appears on its own line below title | ✓ |
| DevTools → "Emulate prefers-reduced-motion: reduce" → no animations of any kind run, ambient gradient is static | ✓ |
| Chrome DevTools Performance tab on `/` at idle — main thread < 1%, GPU < 2% | ✓ |

- [ ] **Step 12.6: Lighthouse audit on built output**

Run after `npm run build`: open `out/index.html` in a browser, run Lighthouse Performance audit (mobile). Target: ≥ 95.

- [ ] **Step 12.7: Final commit (only if Step 12.5 surfaced fixes)**

If any fix was needed:
```bash
git add -A
git -c user.email="des@desbook-pro.local" -c user.name="Des" commit -m "fix: visual QA pass tweaks

[describe what was tweaked]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

If no fixes — no commit needed. The branch is ready.

---

## Self-review notes (from plan author)

**Spec coverage:** Every section of the spec maps to a task:
- Architecture / file map → Tasks 1–4, 11 (new files); Tasks 5–11 (modified files); Task 6 (deletion).
- Palette / type / motion / shadow / radius tokens → Task 1.
- Five motion primitives → Task 3.
- Mascot with 4 expressions + 5 placements → Task 4 (component), Tasks 7–11 (placements).
- Ambient beat → Task 3.5 (component), Task 6.2 (mounted in layout).
- Site-wide cleanup checklist → Tasks 5, 6, 9, 10, 11.
- Per-tool accent mapping → Task 11.
- Reduced-motion → Task 5 (blanket CSS rule), and `useReducedMotion()` inside each primitive (Task 3).
- Verification metrics → Task 12.

**Placeholder scan:** No "TBD" / "TODO" / vague steps. Every step includes the exact command or the exact code block.

**Type consistency:** `MascotExpression` defined in Task 4, used in Tasks 7–11. `accentByToolIndex` defined in Task 1, used in Tasks 9 and 11. Token names (`bubblegum`, `lilac`, `sunshine`, `mint`, `sky`, `paper`, `cloud`, `ink`, `whisper`) used consistently across all tasks. Component prop names (`expression`, `size`, `greet`, `asStaggerChild`, `delay`) match between definitions (Tasks 3–4) and usages (Tasks 7–11).

**Risk: changed background means visual jolt.** Mitigation: Task 12.5 visual QA walkthrough catches any visible regression before merge. The ambient gradient is mounted as part of the layout body so every route inherits it.

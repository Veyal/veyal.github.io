"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { type MotionValue } from "framer-motion";

/**
 * Decorative backdrop: confetti-paper grid plus doodles that drift at
 * different rates as the page scrolls, giving the fixed layer some depth.
 *
 * Everything here is aria-hidden and pointer-events-none. Only `transform`
 * is animated so the layer stays on the compositor.
 */

type Doodle = {
  char: string;
  className: string;
  delay: string;
  /** Scroll distance travelled over the full page, in px. Sign sets direction. */
  drift: number;
  duration: number;
};

const DOODLES: Doodle[] = [
  { char: "✦", className: "left-[6%] top-[12%] text-3xl opacity-40", delay: "0s", drift: -90, duration: 4 },
  { char: "★", className: "right-[10%] top-[20%] text-2xl opacity-40", delay: "1s", drift: 70, duration: 4.5 },
  { char: "♥", className: "left-[14%] bottom-[18%] text-2xl opacity-30", delay: "2s", drift: -130, duration: 5 },
  { char: "✦", className: "right-[18%] bottom-[10%] text-3xl opacity-30", delay: "0.5s", drift: 100, duration: 4.2 },
  { char: "✧", className: "left-[45%] top-[6%] text-xl opacity-30", delay: "1.5s", drift: -55, duration: 5.5 },
];

function DriftingDoodle({
  doodle,
  progress,
  reduceMotion,
}: {
  doodle: Doodle;
  progress: MotionValue<number>;
  reduceMotion: boolean | null;
}) {
  const y = useTransform(progress, [0, 1], [0, doodle.drift]);

  // Two layers on purpose: framer-motion writes `y` as an inline transform,
  // and the CSS `float` keyframes also animate `transform`. Keyframes win over
  // inline styles, so nesting keeps the parallax and the float from fighting.
  return (
    <motion.span
      aria-hidden="true"
      className={`absolute ${doodle.className}`}
      style={{ y: reduceMotion ? 0 : y }}
    >
      <span
        className="inline-block animate-float"
        style={{ animationDelay: doodle.delay, animationDuration: `${doodle.duration}s` }}
      >
        {doodle.char}
      </span>
    </motion.span>
  );
}

export function KirbyBackdrop() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-grid" />
      {DOODLES.map((doodle, i) => (
        <DriftingDoodle
          key={`${doodle.char}-${i}`}
          doodle={doodle}
          progress={scrollYProgress}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
}

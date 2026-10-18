"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * A small looping Kirby scene for each Interseptor feature tab, acting out
 * what the feature does: Intercept inhales a request, Repeater throws a
 * boomerang that keeps coming back, Intruder spits a star at each payload,
 * Evidence inspects, Reports ticks a checklist, and AI agents type away.
 * Only the active tab is mounted; with reduced motion each scene rests on
 * its final frame.
 */

export type VignetteId = "intercept" | "repeater" | "intruder" | "evidence" | "reports" | "agents";

const STAR_PATH = "M12 1.8l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.7l-6.1 3.5 1.5-6.8L2.2 8.8l6.9-.7z";

/** Steps 0..n-1 on a fixed beat while mounted; stays on `rest` when motion is reduced. */
function useBeat(steps: number, ms: number, rest: number) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(rest);
  useEffect(() => {
    if (reduce) {
      setStep(rest);
      return;
    }
    setStep(0);
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => window.clearInterval(id);
  }, [reduce, steps, ms, rest]);
  return step;
}

function Kirby({ src, className = "" }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={640} height={640} className={`object-contain ${className}`} />
  );
}

function Star({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d={STAR_PATH} fill="var(--star)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "hit" | "ok" }) {
  const tones = {
    plain: "bg-[var(--night-3)] text-[var(--moon)]",
    hit: "bg-[var(--pink)] text-[var(--ink)]",
    ok: "bg-[#8fe3b0] text-[var(--ink)]",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.72rem] leading-5 ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Intercept: a request floats in, Kirby inhales it and holds it. */
function InterceptScene() {
  const step = useBeat(4, 850, 2);
  const pose = ["idle", "inhale", "full", "full"][step];
  return (
    <div className="relative h-full w-full">
      <Kirby src={`/kirby/kirby-${pose}.webp`} className="absolute bottom-2 left-2 h-[118px] w-[118px]" />
      <motion.div
        className="absolute right-3 top-[40%] flex items-center gap-1"
        animate={
          step === 0
            ? { x: 0, opacity: 1, scale: 1 }
            : step === 1
              ? { x: -110, opacity: 1, scale: 0.4 }
              : { x: -120, opacity: 0, scale: 0.2 }
        }
        transition={{ duration: step === 0 ? 0 : 0.6, ease: "easeIn" }}
      >
        <Star />
        <Chip>POST /login</Chip>
      </motion.div>
      <AnimatePresence>
        {step >= 2 && (
          <motion.span
            className="absolute right-3 top-3"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Chip tone="hit">Held</Chip>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Repeater: Cutter Kirby's boomerang flies out and comes back, again and again. */
function RepeaterScene() {
  const reduce = useReducedMotion();
  // Counts up once per boomerang throw; rests at 3 when motion is reduced.
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (reduce) {
      setCount(3);
      return;
    }
    setCount(1);
    const id = window.setInterval(() => setCount((n) => n + 1), 1400);
    return () => window.clearInterval(id);
  }, [reduce]);
  return (
    <div className="relative h-full w-full">
      <Kirby src="/kirby/kirby-cutter.webp" className="absolute bottom-2 left-2 h-[112px] w-[112px]" />
      <motion.svg
        viewBox="0 0 40 40"
        className="absolute left-[104px] top-[44%] h-9 w-9"
        animate={reduce ? { x: 70 } : { x: [0, 120, 0], rotate: [0, 540, 1080] }}
        transition={reduce ? { duration: 0 } : { duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      >
        <path
          d="M8 30 C 4 18 12 6 26 4 C 18 10 16 20 22 30 C 16 32 11 32 8 30 Z"
          fill="#ffd44d"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </motion.svg>
      <span className="absolute right-3 top-3">
        <Chip tone="ok">200 OK</Chip>
      </span>
      <span className="absolute bottom-3 right-3 text-xs text-[var(--lilac)]">Resent {count} time{count === 1 ? "" : "s"}</span>
    </div>
  );
}

const PAYLOADS = [
  { id: "1041", status: 404 },
  { id: "1042", status: 200 },
  { id: "1043", status: 200 },
  { id: "1044", status: 404 },
];

/** Intruder: Kirby spits a star at each payload; the ones that answer differently light up. */
function IntruderScene() {
  const step = useBeat(PAYLOADS.length + 2, 750, PAYLOADS.length + 1);
  const shooting = step < PAYLOADS.length;
  return (
    <div className="relative h-full w-full">
      <Kirby
        src={`/kirby/kirby-${shooting ? "spit" : "idle"}.webp`}
        className="absolute bottom-2 left-2 h-[112px] w-[112px]"
      />
      {shooting && (
        <motion.span
          key={step}
          className="absolute left-[96px] top-[52%]"
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: 70, y: -64 + step * 26, opacity: [1, 1, 0] }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Star className="h-4 w-4" />
        </motion.span>
      )}
      <ul className="absolute right-3 top-3 space-y-1.5">
        {PAYLOADS.map((p, k) => {
          const done = step > k;
          const differs = done && p.status === 200;
          return (
            <li key={p.id} className="flex items-center justify-end gap-1.5">
              <Chip tone={differs ? "hit" : "plain"}>
                {p.id} {done ? p.status : "…"}
              </Chip>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Evidence: detective Kirby inspects a request, then pins it to a finding. */
function EvidenceScene() {
  const reduce = useReducedMotion();
  const step = useBeat(3, 1100, 2);
  return (
    <div className="relative h-full w-full">
      <Kirby src="/kirby/kirby-detective.webp" className="absolute bottom-2 left-2 h-[112px] w-[112px]" />
      <div className="absolute right-3 top-4 w-[118px] rounded-xl bg-[var(--night-3)] p-2 font-mono text-[0.64rem] leading-4 text-[var(--lilac)]">
        <motion.span
          className="absolute inset-x-1 h-4 rounded bg-[rgba(255,212,77,0.25)]"
          animate={reduce ? { y: 16 } : { y: [0, 16, 32, 16, 0] }}
          transition={reduce ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="relative block">GET /orders/1043</span>
        <span className="relative block text-[var(--moon)]">200 someone else</span>
        <span className="relative block">Cookie: andrew</span>
      </div>
      <AnimatePresence>
        {step === 2 && (
          <motion.span
            className="absolute bottom-3 right-3"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            <Chip tone="hit">Attached to F-1</Chip>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

const CHECKS = ["Claim", "Proof", "CVSS"];

/** Reports: reading Kirby ticks off what a finding needs, then it is ready. */
function ReportsScene() {
  const step = useBeat(CHECKS.length + 2, 700, CHECKS.length + 1);
  return (
    <div className="relative h-full w-full">
      <Kirby src="/kirby/kirby-book.webp" className="absolute bottom-2 left-2 h-[108px] w-[108px]" />
      <ul className="absolute right-3 top-4 space-y-1.5 text-sm text-[var(--moon)]">
        {CHECKS.map((c, k) => (
          <li key={c} className="flex items-center gap-2">
            <motion.span
              className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--lilac)]"
              animate={{ backgroundColor: step > k ? "#8fe3b0" : "rgba(0,0,0,0)" }}
            >
              {step > k && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                  <path d="M2 6.5 L5 9 L10 3" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </motion.span>
            {c}
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {step > CHECKS.length && (
          <motion.span
            className="absolute bottom-3 right-3"
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Chip tone="ok">Ready to export</Chip>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** AI agents: Kirby types at the laptop while his robot buddy follows along. */
function AgentsScene() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-full w-full">
      <motion.div
        className="absolute bottom-2 left-1/2 -ml-[60px]"
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Kirby src="/kirby/kirby-laptop.webp" className="h-[120px] w-[120px]" />
      </motion.div>
      <span className="absolute right-3 top-3 flex gap-1">
        {[0, 1, 2].map((k) => (
          <motion.span
            key={k}
            className="block h-1.5 w-1.5 rounded-full bg-[var(--lilac)]"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.2 }}
          />
        ))}
      </span>
    </div>
  );
}

const SCENES: Record<VignetteId, () => JSX.Element> = {
  intercept: InterceptScene,
  repeater: RepeaterScene,
  intruder: IntruderScene,
  evidence: EvidenceScene,
  reports: ReportsScene,
  agents: AgentsScene,
};

export function FeatureVignette({ id }: { id: VignetteId }) {
  const Scene = SCENES[id];
  return (
    <div className="relative h-[150px] w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--night-2)] sm:w-[260px]" aria-hidden="true">
      <Scene />
    </div>
  );
}

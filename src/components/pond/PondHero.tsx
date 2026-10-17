"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Download, Pause, Play } from "lucide-react";
import { Frog } from "@/components/pond/Frog";
import { INTERSEPTOR, POND_REQUESTS, type PondRequest, type PondResponse } from "@/lib/interseptor";

/**
 * Hero: requests flit over a night pond and the Interseptor frog snaps them
 * out of the air. A caught request lands in the intercept tray, where the
 * visitor can edit it, forward it to a pretend server, or drop it.
 *
 * Flies are positioned by percentage so the server-rendered HTML is already
 * a complete, visible scene. A single rAF loop adds a wandering offset via
 * `transform`, and only runs while the hero is on screen.
 */

type Slot = {
  /** Home position as a fraction of the scene. */
  hx: number;
  hy: number;
  /** Wander amplitude in px and angular speed in rad/s. */
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
  /** Put the label left of the fly so it stays inside the scene. */
  labelLeft: boolean;
  /** Hidden on small screens to keep the scene readable. */
  wideOnly: boolean;
};

const SLOTS: Slot[] = [
  { hx: 0.3, hy: 0.07, ax: 30, ay: 12, fx: 0.42, fy: 0.9, phase: 0, labelLeft: false, wideOnly: false },
  { hx: 0.95, hy: 0.21, ax: 22, ay: 12, fx: 0.37, fy: 0.75, phase: 1.7, labelLeft: true, wideOnly: false },
  { hx: 0.42, hy: 0.36, ax: 30, ay: 12, fx: 0.5, fy: 0.62, phase: 3.1, labelLeft: false, wideOnly: true },
  { hx: 0.97, hy: 0.5, ax: 18, ay: 12, fx: 0.33, fy: 0.85, phase: 4.4, labelLeft: true, wideOnly: false },
  { hx: 0.6, hy: 0.64, ax: 26, ay: 10, fx: 0.46, fy: 0.7, phase: 5.6, labelLeft: false, wideOnly: true },
];

type Held = {
  request: PondRequest;
  value: string;
  phase: "held" | "forwarded" | "dropped";
  response?: PondResponse;
};

const METHOD_COLOR: Record<PondRequest["method"], string> = {
  GET: "var(--lily)",
  POST: "var(--firefly)",
  PUT: "var(--dragonfly)",
};

function wander(slot: Slot, t: number) {
  return {
    x: slot.ax * Math.sin(slot.fx * t + slot.phase),
    y: slot.ay * Math.sin(slot.fy * t + slot.phase * 1.3),
  };
}

export function PondHero() {
  const reduceMotion = useReducedMotion();

  const sceneRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<SVGCircleElement>(null);
  const tongueRef = useRef<SVGGElement>(null);
  const flyRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const offsets = useRef(SLOTS.map(() => ({ x: 0, y: 0 })));
  const caught = useRef(SLOTS.map(() => false));
  const busy = useRef(false);
  const inView = useRef(true);
  const lastTouch = useRef(Number.NEGATIVE_INFINITY);
  const heldRef = useRef<Held | null>(null);
  const pausedRef = useRef(false);
  const autoCaught = useRef(0);
  const trayRef = useRef<HTMLDivElement>(null);

  // Which request each slot carries, and whether the fly is showing.
  const [carried, setCarried] = useState(() => SLOTS.map((_, i) => i % POND_REQUESTS.length));
  const [visible, setVisible] = useState(() => SLOTS.map(() => true));
  const [held, setHeld] = useState<Held | null>(null);
  const [look, setLook] = useState({ x: 0.4, y: -0.6 });
  const [mouthOpen, setMouthOpen] = useState(false);
  const [gulp, setGulp] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [paused, setPaused] = useState(false);
  // useReducedMotion is null during the static render, so markup that depends
  // on it waits for mount to keep hydration consistent.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  heldRef.current = held;
  pausedRef.current = paused;

  // Wander loop.
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (inView.current && !pausedRef.current) {
        SLOTS.forEach((slot, i) => {
          const el = flyRefs.current[i];
          if (!el || caught.current[i]) return;
          const o = wander(slot, t);
          offsets.current[i] = o;
          el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // Pause the loop and the auto-catch while the hero is off screen.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Centre of a fly's glowing body, in scene coordinates. */
  const flyPoint = useCallback((i: number) => {
    const el = flyRefs.current[i];
    const scene = sceneRef.current;
    if (!el || !scene) return null;
    const dot = el.querySelector<HTMLElement>("[data-dot]");
    if (!dot) return null;
    const s = scene.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    return { x: d.left - s.left + d.width / 2, y: d.top - s.top + d.height / 2 };
  }, []);

  const drawTongue = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const g = tongueRef.current;
    if (!g) return;
    g.querySelectorAll("line").forEach((line) => {
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
    });
    const tip = g.querySelector("circle");
    tip?.setAttribute("cx", String(to.x));
    tip?.setAttribute("cy", String(to.y));
  };

  const catchFly = useCallback(
    async (i: number, fromUser = false) => {
      if (busy.current || caught.current[i]) return;
      const scene = sceneRef.current;
      const mouth = mouthRef.current;
      const el = flyRefs.current[i];
      const target = flyPoint(i);
      if (!scene || !mouth || !el || !target) return;
      busy.current = true;
      caught.current[i] = true;

      const s = scene.getBoundingClientRect();
      const m = mouth.getBoundingClientRect();
      const from = { x: m.left - s.left + m.width / 2, y: m.top - s.top + m.height / 2 };
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      setLook({ x: dx / dist, y: dy / dist });
      setMouthOpen(true);

      const start = offsets.current[i];
      if (!reduceMotion) {
        const g = tongueRef.current;
        if (g) g.style.opacity = "1";
        await animate(0, 1, {
          duration: 0.16,
          ease: "easeOut",
          onUpdate: (p) => drawTongue(from, { x: from.x + dx * p, y: from.y + dy * p }),
        });
        await animate(1, 0, {
          duration: 0.26,
          ease: [0.55, 0, 0.9, 0.4],
          onUpdate: (p) => {
            const tip = { x: from.x + dx * p, y: from.y + dy * p };
            drawTongue(from, tip);
            el.style.transform = `translate3d(${start.x + tip.x - target.x}px, ${
              start.y + tip.y - target.y
            }px, 0) scale(${0.5 + 0.5 * p})`;
          },
        });
        if (g) g.style.opacity = "0";
      }

      setVisible((v) => v.map((x, j) => (j === i ? false : x)));
      setMouthOpen(false);
      setGulp(true);
      setRipple((r) => r + 1);
      window.setTimeout(() => setGulp(false), 200);

      const request = POND_REQUESTS[carried[i]];
      setHeld({ request, value: request.initial, phase: "held" });
      busy.current = false;
      // Focus follows a visitor's catch to the tray, where the next step is.
      if (fromUser) requestAnimationFrame(() => trayRef.current?.focus());

      // A new fly arrives carrying the request nobody else has.
      window.setTimeout(() => {
        setCarried((c) => {
          const used = new Set(c);
          const free = POND_REQUESTS.map((_, k) => k).filter((k) => !used.has(k));
          const next = free.length ? free[Math.floor(Math.random() * free.length)] : c[i];
          return c.map((x, j) => (j === i ? next : x));
        });
        el.style.transform = "translate3d(0, 0, 0)";
        offsets.current[i] = { x: 0, y: 0 };
        caught.current[i] = false;
        setVisible((v) => v.map((x, j) => (j === i ? true : x)));
      }, 1800);
    },
    [carried, flyPoint, reduceMotion]
  );

  const catchRef = useRef(catchFly);
  catchRef.current = catchFly;

  // Catch one request on load so the tray shows what it is for, then wait for
  // the visitor. Only refill an empty tray, so nothing they are reading or
  // editing gets replaced, and stay still while the pond is paused.
  useEffect(() => {
    if (reduceMotion) return;
    let quietSince = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const h = heldRef.current;
      if (h || pausedRef.current) {
        quietSince = now;
        return;
      }
      const wait = autoCaught.current === 0 ? 1600 : 9000;
      if (!inView.current || now - quietSince < wait || now - lastTouch.current < 9000) return;
      const candidates = SLOTS.map((_, i) => i).filter(
        (i) => !caught.current[i] && flyRefs.current[i]?.offsetParent
      );
      if (candidates.length === 0) return;
      quietSince = now;
      autoCaught.current += 1;
      catchRef.current(candidates[Math.floor(Math.random() * candidates.length)]);
    }, 400);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const touch = () => {
    lastTouch.current = performance.now();
  };

  const forward = () => {
    touch();
    setHeld((h) => (h ? { ...h, phase: "forwarded", response: h.request.respond(h.value) } : h));
  };
  const drop = () => {
    touch();
    setHeld((h) => (h ? { ...h, phase: "dropped" } : h));
  };
  const editAgain = () => {
    touch();
    setHeld((h) => (h ? { ...h, phase: "held", response: undefined } : h));
  };
  const release = () => {
    touch();
    setHeld(null);
  };

  return (
    <section id="top" className="night relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:pb-20 lg:pt-16">
        <div className="max-w-xl">
          <a
            href={INTERSEPTOR.releases}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[rgba(227,242,234,0.16)] bg-[var(--night-2)] py-1 pl-1 pr-4 text-[0.95rem] font-semibold text-[var(--mist)] transition-colors hover:border-[var(--lily)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pond/icon-192.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            Interseptor {INTERSEPTOR.version} is out
          </a>
          <h1 className="type-display text-[clamp(2.75rem,7vw,5.25rem)] text-[var(--mist)]">
            Catch every request before it lands.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--reed)]">
            Interseptor is an intercepting proxy and pentest workbench in one Go
            binary. Hold live traffic, change it, replay it and write up the
            finding, by hand or with your AI agent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={INTERSEPTOR.releases} className="btn-primary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download {INTERSEPTOR.version}
            </a>
            <a href={INTERSEPTOR.docs} className="btn-night">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read the docs
            </a>
          </div>
          <p className="mt-8 text-[0.95rem] text-[var(--reed)]">
            Built by{" "}
            <Link href="/#about" className="font-semibold text-[var(--mist)] underline decoration-[var(--lily)] decoration-2 underline-offset-4 hover:decoration-[var(--firefly)]">
              Andrew Salim
            </Link>
            , a penetration tester who goes by Veyal.
          </p>
        </div>

        <div className="min-w-0">
          {/* The pond */}
          <div
            ref={sceneRef}
            className={`relative h-[300px] sm:h-[360px] lg:h-[400px] ${
              paused ? "[&_.animate-flutter]:[animation-play-state:paused]" : ""
            }`}
          >
            <PondBackdrop />

            {SLOTS.map((slot, i) => {
              const req = POND_REQUESTS[carried[i]];
              return (
                <button
                  key={i}
                  ref={(el) => {
                    flyRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => {
                    touch();
                    catchFly(i, true);
                  }}
                  aria-label={`Catch ${req.method} ${req.label}`}
                  aria-hidden={!visible[i] || undefined}
                  tabIndex={visible[i] ? 0 : -1}
                  className={`group absolute z-10 -ml-2 -mt-2 cursor-pointer rounded-full p-2 transition-opacity duration-300 ${
                    visible[i] ? "opacity-100" : "pointer-events-none opacity-0"
                  } ${slot.wideOnly ? "hidden sm:block" : ""}`}
                  style={{ left: `${slot.hx * 100}%`, top: `${slot.hy * 100}%` }}
                >
                  <span className="relative block h-3 w-3">
                    <svg
                      viewBox="0 0 24 14"
                      className="absolute -top-3 left-1/2 h-3.5 w-6 -translate-x-1/2"
                      aria-hidden="true"
                    >
                      <ellipse className="animate-flutter" cx="7" cy="7" rx="6" ry="6" fill="rgba(227,242,234,0.45)" />
                      <ellipse className="animate-flutter" cx="17" cy="7" rx="6" ry="6" fill="rgba(227,242,234,0.45)" />
                    </svg>
                    <span
                      data-dot
                      className="absolute inset-0 rounded-full bg-[var(--firefly)] shadow-[0_0_14px_4px_rgba(255,201,77,0.55)]"
                    />
                  </span>
                  <span
                    className={`type-mono-casual absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[rgba(227,242,234,0.16)] bg-[var(--night-2)] px-2.5 py-1 text-[0.78rem] leading-none text-[var(--mist)] transition-colors group-hover:border-[var(--firefly)] group-focus-visible:border-[var(--firefly)] ${
                      slot.labelLeft ? "right-full mr-1" : "left-full ml-1"
                    }`}
                  >
                    <span style={{ color: METHOD_COLOR[req.method] }}>{req.method}</span> {req.label}
                  </span>
                </button>
              );
            })}

            {/* Tongue overlay, drawn imperatively during a catch */}
            <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
              <g ref={tongueRef} style={{ opacity: 0 }} strokeLinecap="round">
                <line stroke="#12302a" strokeWidth="11" />
                <line stroke="#ff6fa5" strokeWidth="6" />
                <circle r="7" fill="#ff6fa5" stroke="#12302a" strokeWidth="2.5" />
              </g>
            </svg>

            <div className="absolute bottom-[8%] left-[6%] z-10 w-[104px] sm:w-[128px] lg:w-[142px]">
              <LilyPad rippleKey={ripple} />
              <Frog
                ref={mouthRef}
                look={look}
                mouthOpen={mouthOpen}
                gulp={gulp}
                blink={mounted && !reduceMotion}
                className="relative z-10 w-full"
              />
            </div>

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="absolute bottom-1 right-1 z-30 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--reed)] hover:text-[var(--mist)] motion-reduce:hidden"
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? "Resume flies" : "Pause flies"}
            </button>
          </div>

          <InterceptTray
            ref={trayRef}
            held={held}
            reduceMotion={!!reduceMotion}
            onChange={(value) => {
              touch();
              setHeld((h) => (h ? { ...h, value } : h));
            }}
            onForward={forward}
            onDrop={drop}
            onEditAgain={editAgain}
            onRelease={release}
          />
        </div>
      </div>
    </section>
  );
}

/** Water and reeds behind the scene. Edges fade out so the pond has no box. */
function PondBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 600 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
    >
      <rect x="0" y="330" width="600" height="70" fill="var(--night-2)" />
      <g stroke="rgba(147,184,170,0.18)" strokeWidth="2" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke">
        <path d="M 250 350 h 70" />
        <path d="M 380 366 h 110" />
        <path d="M 520 344 h 40" />
        <path d="M 200 384 h 80" />
      </g>
      <g fill="none" stroke="var(--night-3)" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M 556 334 C 552 270 562 230 548 176" />
        <path d="M 572 334 C 574 280 584 250 590 210" />
        <path d="M 536 334 C 536 300 528 274 520 250" />
      </g>
    </svg>
  );
}

/** Lily pad the frog sits on, with a ripple ring for each catch. */
function LilyPad({ rippleKey }: { rippleKey: number }) {
  return (
    <svg className="absolute -bottom-3 left-1/2 w-[150%] -translate-x-1/2" viewBox="0 0 240 60" aria-hidden="true">
      <ellipse cx="120" cy="30" rx="110" ry="22" fill="#164f40" />
      <ellipse cx="120" cy="26" rx="110" ry="22" fill="#1f6b55" />
      <path d="M 120 26 L 182 8 L 196 20 Z" fill="var(--night-2)" />
      {rippleKey > 0 && (
        <ellipse
          key={rippleKey}
          className="animate-ripple"
          cx="120"
          cy="28"
          rx="116"
          ry="24"
          fill="none"
          stroke="rgba(76,212,169,0.5)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

type InterceptTrayProps = {
  held: Held | null;
  reduceMotion: boolean;
  onChange: (value: string) => void;
  onForward: () => void;
  onDrop: () => void;
  onEditAgain: () => void;
  onRelease: () => void;
};

const InterceptTray = forwardRef<HTMLDivElement, InterceptTrayProps>(function InterceptTray(
  { held, reduceMotion, onChange, onForward, onDrop, onEditAgain, onRelease },
  ref
) {
  const status = !held
    ? { text: "Waiting", color: "var(--reed)" }
    : held.phase === "held"
      ? { text: "Held", color: "var(--firefly)" }
      : held.phase === "forwarded"
        ? { text: "Forwarded", color: "var(--lily)" }
        : { text: "Dropped", color: "var(--blush)" };

  const fade = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.18 },
      };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-labelledby="intercept-title"
      className="relative z-30 mt-4 rounded-[1.25rem] border border-[rgba(227,242,234,0.14)] bg-[var(--night-2)] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p id="intercept-title" className="font-semibold text-[var(--mist)]">
          Intercept
        </p>
        <span role="status" className="inline-flex items-center gap-2 text-sm text-[var(--reed)]">
          <span className="h-2 w-2 rounded-full" style={{ background: status.color }} aria-hidden="true" />
          {status.text}
          {held && (
            <span className="sr-only">
              {" "}
              {held.request.method} {held.request.label}
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 min-h-[13.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          {!held && (
            <motion.p key="empty" {...fade} className="pt-6 text-[var(--reed)]">
              Tap a flying request to catch it. You can change it before it
              reaches the server.
            </motion.p>
          )}

          {held && held.phase === "held" && (
            <motion.div key={`held-${held.request.id}`} {...fade}>
              <pre className="overflow-x-auto rounded-xl bg-[var(--night)] p-3 text-[0.8rem] leading-relaxed text-[var(--mist)]">
                {held.request.lines(held.value).join("\n")}
              </pre>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[10rem] flex-1 text-sm text-[var(--reed)]">
                  Edit {held.request.field}
                  <input
                    value={held.value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className="mt-1 block w-full rounded-lg border border-[rgba(227,242,234,0.2)] bg-[var(--night)] px-3 py-2 font-mono text-base text-[var(--firefly)] focus:border-[var(--firefly)] focus:outline-none"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={onForward} className="btn-primary">
                    Forward
                  </button>
                  <button type="button" onClick={onDrop} className="btn-night">
                    Drop
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {held && held.phase === "forwarded" && held.response && (
            <motion.div key={`fwd-${held.request.id}-${held.value}`} {...fade}>
              <pre className="overflow-x-auto rounded-xl bg-[var(--night)] p-3 text-[0.8rem] leading-relaxed text-[var(--mist)]">
                <span style={{ color: held.response.ok ? "var(--lily)" : "var(--blush)" }}>
                  HTTP/1.1 {held.response.status}
                </span>
                {"\n\n"}
                {held.response.body}
              </pre>
              <p role="status" className="mt-3 text-[var(--mist)]">
                {held.response.note}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onEditAgain} className="btn-night">
                  Edit and resend
                </button>
                <button type="button" onClick={onRelease} className="btn-night">
                  Catch another
                </button>
              </div>
            </motion.div>
          )}

          {held && held.phase === "dropped" && (
            <motion.div key={`drop-${held.request.id}`} {...fade} className="flex items-center gap-4 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pond/frog-drop-512.webp" alt="" width={88} height={88} className="h-[88px] w-[88px]" />
              <div>
                <p className="text-[var(--mist)]">Dropped. The server never saw it.</p>
                <button type="button" onClick={onRelease} className="btn-night mt-3">
                  Catch another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

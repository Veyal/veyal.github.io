"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Download, Pause, Play } from "lucide-react";
import {
  INTERSEPTOR,
  DEMO_REQUESTS,
  type CopyAbility,
  type DemoRequest,
  type DemoResponse,
} from "@/lib/interseptor";

/**
 * Hero: requests float over Dream Land and Kirby inhales them. A caught
 * request stays in Kirby's cheeks and shows up in the intercept tray, where
 * the visitor can edit it, forward it (Kirby spits it out as a star) or drop
 * it (Kirby swallows it). When a tampered request turns into a finding,
 * Kirby copies its ability instead, the way he becomes what he eats. The
 * server is pretend and runs in the browser.
 *
 * Requests are positioned by percentage so the static HTML is already a
 * complete, visible scene. A single rAF loop adds a drifting offset via
 * `transform`, and only runs while the hero is on screen and not paused.
 */

type Slot = {
  /** Home position as a fraction of the scene. */
  hx: number;
  hy: number;
  /** Drift amplitude in px and angular speed in rad/s. */
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
  /** Put the label left of the star so it stays inside the scene. */
  labelLeft: boolean;
  /** Hidden on small screens to keep the scene readable. */
  wideOnly: boolean;
};

const SLOTS: Slot[] = [
  { hx: 0.3, hy: 0.07, ax: 26, ay: 10, fx: 0.42, fy: 0.9, phase: 0, labelLeft: false, wideOnly: false },
  { hx: 0.95, hy: 0.21, ax: 20, ay: 10, fx: 0.37, fy: 0.75, phase: 1.7, labelLeft: true, wideOnly: false },
  { hx: 0.48, hy: 0.36, ax: 26, ay: 10, fx: 0.5, fy: 0.62, phase: 3.1, labelLeft: false, wideOnly: true },
  { hx: 0.97, hy: 0.5, ax: 16, ay: 10, fx: 0.33, fy: 0.85, phase: 4.4, labelLeft: true, wideOnly: false },
  { hx: 0.66, hy: 0.64, ax: 22, ay: 8, fx: 0.46, fy: 0.7, phase: 5.6, labelLeft: false, wideOnly: true },
];

type Held = {
  request: DemoRequest;
  value: string;
  phase: "held" | "forwarded" | "dropped";
  response?: DemoResponse;
};

type Pose = "idle" | "inhale" | "full" | "spit" | "sleep";
const POSES: Pose[] = ["idle", "inhale", "full", "spit", "sleep"];

/** Hat colour of each copy ability, used for its star and badge. */
const ABILITY_COLOR: Record<CopyAbility["id"], string> = {
  sword: "#4fae5a",
  ninja: "#6b4fa0",
  hammer: "#f08a3c",
  spark: "#f2c200",
  cutter: "#e0453a",
  mirror: "#9b6ad6",
  wing: "#e84a5f",
};

const STAR_PATH = "M12 1.8l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.7l-6.1 3.5 1.5-6.8L2.2 8.8l6.9-.7z";

/** Where the open mouth sits inside the inhale artwork, as fractions of its box. */
const MOUTH = { x: 0.62, y: 0.6 };

const METHOD_COLOR: Record<DemoRequest["method"], string> = {
  GET: "#2a7048",
  POST: "#b02a64",
  PUT: "#5a3fb0",
};

function drift(slot: Slot, t: number) {
  return {
    x: slot.ax * Math.sin(slot.fx * t + slot.phase),
    y: slot.ay * Math.sin(slot.fy * t + slot.phase * 1.3),
  };
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function DreamHero() {
  const reduceMotion = useReducedMotion();

  const sceneRef = useRef<HTMLDivElement>(null);
  const kirbyRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const windRef = useRef<SVGGElement>(null);
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
  const poseTimer = useRef(0);
  const abilityRef = useRef<CopyAbility | null>(null);
  const abilityTimer = useRef(0);

  // Which request each slot carries, and whether it is showing.
  const [carried, setCarried] = useState(() => SLOTS.map((_, i) => i % DEMO_REQUESTS.length));
  const [visible, setVisible] = useState(() => SLOTS.map(() => true));
  const [held, setHeld] = useState<Held | null>(null);
  const [transient, setTransient] = useState<"inhale" | "spit" | null>(null);
  const [spitKey, setSpitKey] = useState(0);
  const [ability, setAbility] = useState<CopyAbility | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [puffKey, setPuffKey] = useState(0);
  const [lost, setLost] = useState<{ key: number; id: CopyAbility["id"] } | null>(null);
  const [paused, setPaused] = useState(false);

  heldRef.current = held;
  pausedRef.current = paused;
  abilityRef.current = ability;

  // Kirby keeps a held request in his cheeks until it is forwarded or dropped,
  // keeps a copied ability until the next catch, and naps while paused.
  const showAbility = !transient && held?.phase !== "held" && ability !== null;
  const pose: Pose | null = showAbility
    ? null
    : (transient ?? (held?.phase === "held" ? "full" : paused ? "sleep" : "idle"));

  // Fetch the ability art once the page is idle, so a transformation never waits on the network.
  useEffect(() => {
    const id = window.setTimeout(() => {
      DEMO_REQUESTS.forEach((r) => {
        const img = new Image();
        img.src = `/kirby/kirby-${r.ability.id}.webp`;
      });
    }, 2500);
    return () => window.clearTimeout(id);
  }, []);

  // Stop pending pose and ability swaps if the hero unmounts mid-animation.
  useEffect(
    () => () => {
      window.clearTimeout(poseTimer.current);
      window.clearTimeout(abilityTimer.current);
    },
    []
  );

  // Drift loop.
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
          const o = drift(slot, t);
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

  /** Set a short-lived pose; a newer pose always cancels the pending reset. */
  const showTransient = (p: "inhale" | "spit" | null, resetAfter?: number) => {
    window.clearTimeout(poseTimer.current);
    setTransient(p);
    if (resetAfter) poseTimer.current = window.setTimeout(() => setTransient(null), resetAfter);
  };

  /** Play a keyframe animation on Kirby's body. Skipped when motion is reduced. */
  const play = (frames: Keyframe[], duration: number) => {
    if (reduceMotion) return;
    bodyRef.current?.animate(frames, { duration, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
  };
  const bump = () =>
    play([{ transform: "scale(1)" }, { transform: "scale(1.08, 0.92)" }, { transform: "scale(1)" }], 260);
  const wobble = () =>
    play(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.04, 0.96)" },
        { transform: "scale(0.98, 1.02)" },
        { transform: "scale(1)" },
      ],
      220
    );
  const spin = () =>
    play(
      [
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(180deg) scale(0.7)", offset: 0.45 },
        { transform: "rotate(360deg) scale(1.12)", offset: 0.8 },
        { transform: "rotate(360deg) scale(1)" },
      ],
      720
    );

  /** Knock the copied ability loose: its star bounces away, like getting hit in the games. */
  const loseAbility = () => {
    window.clearTimeout(abilityTimer.current);
    const a = abilityRef.current;
    if (!a) return;
    if (!reduceMotion) setLost({ key: Date.now(), id: a.id });
    setAbility(null);
  };

  /** Centre of a request's star, in scene coordinates. */
  const starPoint = useCallback((i: number) => {
    const el = flyRefs.current[i];
    const scene = sceneRef.current;
    const dot = el?.querySelector<SVGElement>("[data-star]");
    if (!scene || !dot) return null;
    const s = scene.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    return { x: d.left - s.left + d.width / 2, y: d.top - s.top + d.height / 2 };
  }, []);

  const mouthPoint = useCallback(() => {
    const scene = sceneRef.current;
    const kirby = kirbyRef.current;
    if (!scene || !kirby) return null;
    const s = scene.getBoundingClientRect();
    const k = kirby.getBoundingClientRect();
    return { x: k.left - s.left + k.width * MOUTH.x, y: k.top - s.top + k.height * MOUTH.y };
  }, []);

  /** Three gusts of wind curving from the request into Kirby's mouth. */
  const drawWind = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const g = windRef.current;
    if (!g) return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    g.querySelectorAll("path").forEach((path, k) => {
      const spread = (k - 1) * 22;
      const sx = from.x + nx * spread;
      const sy = from.y + ny * spread;
      const cx = (sx + to.x) / 2 + nx * spread * 0.6;
      const cy = (sy + to.y) / 2 + ny * spread * 0.6;
      path.setAttribute("d", `M ${sx} ${sy} Q ${cx} ${cy} ${to.x} ${to.y}`);
    });
  };

  const catchRequest = useCallback(
    async (i: number, fromUser = false) => {
      if (busy.current || caught.current[i]) return;
      // Never throw away a request the visitor has started editing.
      const h = heldRef.current;
      if (h?.phase === "held" && h.value !== h.request.initial) {
        if (fromUser) trayRef.current?.focus();
        return;
      }
      const el = flyRefs.current[i];
      const target = starPoint(i);
      const mouth = mouthPoint();
      if (!el || !target || !mouth) return;
      busy.current = true;
      caught.current[i] = true;
      loseAbility();

      if (!reduceMotion) {
        showTransient("inhale");
        drawWind(target, mouth);
        const g = windRef.current;
        if (g) g.style.opacity = "1";
        await sleep(220);
        const start = offsets.current[i];
        await animate(0, 1, {
          duration: 0.42,
          ease: [0.5, 0, 0.9, 0.5],
          onUpdate: (p) => {
            el.style.transform = `translate3d(${start.x + (mouth.x - target.x) * p}px, ${
              start.y + (mouth.y - target.y) * p
            }px, 0) scale(${1 - 0.8 * p})`;
          },
        });
        if (g) g.style.opacity = "0";
      }

      setVisible((v) => v.map((x, j) => (j === i ? false : x)));
      showTransient(null);
      bump();

      const request = DEMO_REQUESTS[carried[i]];
      setHeld({ request, value: request.initial, phase: "held" });
      // Warm the art for the ability this request could give, before any forward.
      new Image().src = `/kirby/kirby-${request.ability.id}.webp`;
      busy.current = false;
      // Focus follows a visitor's catch to the tray, where the next step is.
      if (fromUser) requestAnimationFrame(() => trayRef.current?.focus());

      // A new request floats in carrying one nobody else has.
      window.setTimeout(() => {
        setCarried((c) => {
          const used = new Set(c);
          const free = DEMO_REQUESTS.map((_, k) => k).filter((k) => !used.has(k));
          const next = free.length ? free[Math.floor(Math.random() * free.length)] : c[i];
          return c.map((x, j) => (j === i ? next : x));
        });
        el.style.transform = "translate3d(0, 0, 0)";
        offsets.current[i] = { x: 0, y: 0 };
        caught.current[i] = false;
        setVisible((v) => v.map((x, j) => (j === i ? true : x)));
      }, 1800);
    },
    // bump and loseAbility only touch refs and setters, so a fresh copy each render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carried, starPoint, mouthPoint, reduceMotion]
  );

  const catchRef = useRef(catchRequest);
  catchRef.current = catchRequest;

  // Catch one request on load so the tray shows what it is for, then wait for
  // the visitor. Only refill an empty tray, so nothing they are reading or
  // editing gets replaced, and stay still while the scene is paused.
  useEffect(() => {
    if (reduceMotion) return;
    let quietSince = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (heldRef.current || pausedRef.current) {
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
    const h = heldRef.current;
    if (!h) return;
    const response = h.request.respond(h.value);
    setHeld({ ...h, phase: "forwarded", response });
    if (!response.ok) {
      // A finding: Kirby spins, bursts into stars and copies the ability.
      if (reduceMotion) {
        setAbility(h.request.ability);
        return;
      }
      showTransient(null);
      spin();
      setBurstKey((k) => k + 1);
      window.clearTimeout(abilityTimer.current);
      abilityTimer.current = window.setTimeout(() => setAbility(h.request.ability), 320);
    } else if (!reduceMotion) {
      // Nothing interesting: he just spits the request on to the server.
      showTransient("spit", 700);
      setSpitKey((k) => k + 1);
    }
  };
  const drop = () => {
    touch();
    setHeld((h) => (h ? { ...h, phase: "dropped" } : h));
    bump();
    if (!reduceMotion) setPuffKey((k) => k + 1);
  };
  const editAgain = () => {
    touch();
    loseAbility();
    setHeld((h) => (h ? { ...h, phase: "held", response: undefined } : h));
    bump();
  };
  const release = () => {
    touch();
    loseAbility();
    setHeld(null);
  };

  return (
    <section id="top" className="relative overflow-hidden bg-[var(--sky)]">
      <Clouds />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:pb-16 lg:pt-14">
        <div className="relative z-10 max-w-xl">
          <a
            href={INTERSEPTOR.releases}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1 pl-1 pr-4 text-[0.95rem] font-semibold text-foreground transition-colors hover:bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/product/icon-192.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            Interseptor {INTERSEPTOR.version} is out
          </a>
          <h1 className="type-display text-[clamp(2.75rem,7vw,5.25rem)] text-foreground">
            Catch every request before it lands.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#3b3157]">
            Interseptor is an intercepting proxy and pentest workbench in one Go
            binary. Hold live traffic, change it, replay it and write up the
            finding, by hand or with your AI agent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={INTERSEPTOR.releases} className="btn-primary bg-[var(--ink)] text-[var(--moon)] hover:bg-[#3a2f5a]">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download {INTERSEPTOR.version}
            </a>
            <a href={INTERSEPTOR.docs} className="btn-ghost bg-white/60">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read the docs
            </a>
          </div>
        </div>

        <div className="relative min-w-0">
          {/* Meadow: starts where Kirby stands and runs to the bottom of the hero. */}
          <Meadow />

          <div
            ref={sceneRef}
            className={`relative h-[300px] sm:h-[360px] lg:h-[390px] ${
              paused ? "[&_.animate-twinkle]:[animation-play-state:paused]" : ""
            }`}
          >
            {SLOTS.map((slot, i) => {
              const req = DEMO_REQUESTS[carried[i]];
              return (
                <button
                  key={i}
                  ref={(el) => {
                    flyRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => {
                    touch();
                    catchRequest(i, true);
                  }}
                  aria-label={`Catch ${req.method} ${req.label}`}
                  aria-hidden={!visible[i] || undefined}
                  tabIndex={visible[i] ? 0 : -1}
                  className={`group absolute z-10 -ml-3 -mt-3 cursor-pointer rounded-full p-1.5 transition-opacity duration-300 ${
                    visible[i] ? "opacity-100" : "pointer-events-none opacity-0"
                  } ${slot.wideOnly ? "hidden sm:block" : ""}`}
                  style={{ left: `${slot.hx * 100}%`, top: `${slot.hy * 100}%` }}
                >
                  <svg viewBox="0 0 24 24" className="block h-6 w-6" aria-hidden="true">
                    <path
                      data-star
                      className="animate-twinkle"
                      d="M12 1.8l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.7l-6.1 3.5 1.5-6.8L2.2 8.8l6.9-.7z"
                      fill="var(--star)"
                      stroke="var(--ink)"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className={`type-mono-casual absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[0.78rem] leading-none text-foreground shadow-[0_1px_0_rgba(42,33,64,0.12)] transition-colors group-hover:bg-[var(--blush)] group-focus-visible:bg-[var(--blush)] ${
                      slot.labelLeft ? "right-full mr-0.5" : "left-full ml-0.5"
                    }`}
                  >
                    <span className="font-semibold" style={{ color: METHOD_COLOR[req.method] }}>
                      {req.method}
                    </span>{" "}
                    {req.label}
                  </span>
                </button>
              );
            })}

            {/* Inhale wind, drawn imperatively during a catch */}
            <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
              <g ref={windRef} style={{ opacity: 0, transition: "opacity 0.15s" }} fill="none" strokeLinecap="round">
                <path className="animate-suck" stroke="white" strokeWidth="4" opacity="0.9" />
                <path className="animate-suck" stroke="white" strokeWidth="5" />
                <path className="animate-suck" stroke="white" strokeWidth="4" opacity="0.9" />
              </g>
            </svg>

            {/* Kirby: every pose is loaded up front and swapped by opacity, so nothing flickers. */}
            <div
              ref={kirbyRef}
              className="absolute bottom-0 left-[2%] z-10 aspect-square w-[128px] sm:w-[156px] lg:w-[176px]"
            >
              <div ref={bodyRef} className="absolute inset-0" style={{ transformOrigin: "50% 70%" }}>
                {POSES.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p}
                    src={`/kirby/kirby-${p}.webp`}
                    alt=""
                    width={640}
                    height={640}
                    className="absolute inset-0 h-full w-full object-contain object-bottom"
                    style={{ opacity: pose === p ? 1 : 0 }}
                  />
                ))}
                {ability && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/kirby/kirby-${ability.id}.webp`}
                    alt=""
                    width={640}
                    height={640}
                    className="absolute inset-0 h-full w-full object-contain object-bottom"
                    style={{ opacity: showAbility ? 1 : 0 }}
                  />
                )}
              </div>

              <KirbyEffects
                burstKey={burstKey}
                puffKey={puffKey}
                lost={lost}
                ability={showAbility ? ability : null}
                reduceMotion={!!reduceMotion}
              />
            </div>

            {/* The star Kirby spits out when a request is forwarded */}
            {spitKey > 0 && (
              <motion.svg
                key={spitKey}
                viewBox="0 0 24 24"
                className="pointer-events-none absolute bottom-[22%] left-[22%] z-20 h-9 w-9"
                initial={{ x: 0, opacity: 1, rotate: 0 }}
                animate={{ x: 520, opacity: [1, 1, 0], rotate: 360 }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                aria-hidden="true"
              >
                <path
                  d={STAR_PATH}
                  fill="var(--star)"
                  stroke="var(--ink)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="absolute bottom-1 right-0 z-30 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground/80 hover:text-foreground motion-reduce:hidden"
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? "Resume" : "Pause"}
            </button>
          </div>

          <InterceptTray
            ref={trayRef}
            held={held}
            reduceMotion={!!reduceMotion}
            onChange={(value) => {
              touch();
              wobble();
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

/**
 * One-shot effects around Kirby: the star burst when he copies an ability,
 * the badge naming it, the ability star bouncing away when he loses it, and
 * the puff when he swallows a dropped request. Each replays when its key changes.
 */
function KirbyEffects({
  burstKey,
  puffKey,
  lost,
  ability,
  reduceMotion,
}: {
  reduceMotion: boolean;
  burstKey: number;
  puffKey: number;
  lost: { key: number; id: CopyAbility["id"] } | null;
  ability: CopyAbility | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {burstKey > 0 && (
        <div key={`burst-${burstKey}`} className="absolute left-1/2 top-[55%]">
          {Array.from({ length: 8 }).map((_, k) => {
            const angle = (k / 8) * Math.PI * 2;
            return (
              <motion.svg
                key={k}
                viewBox="0 0 24 24"
                className="absolute -ml-2.5 -mt-2.5 h-5 w-5"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
                animate={{
                  x: Math.cos(angle) * 96,
                  y: Math.sin(angle) * 86,
                  scale: [0.4, 1.1, 0.6],
                  opacity: [1, 1, 0],
                  rotate: 200,
                }}
                transition={{ duration: 0.75, ease: "easeOut", delay: 0.25 }}
              >
                <path d={STAR_PATH} fill="var(--star)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
              </motion.svg>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {ability && (
          <motion.div
            key={ability.id}
            className="absolute -top-7 left-1/2 whitespace-nowrap"
            initial={{ x: "-50%", y: 8, scale: 0.6, opacity: 0 }}
            animate={{ x: "-50%", y: 0, scale: 1, opacity: 1 }}
            exit={{ x: "-50%", y: -6, opacity: 0, transition: { duration: 0.15 } }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 18 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground shadow-[0_2px_0_rgba(42,33,64,0.12)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ABILITY_COLOR[ability.id] }} />
              {ability.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {lost && (
        <motion.svg
          key={`lost-${lost.key}`}
          viewBox="0 0 24 24"
          className="absolute left-[45%] top-[30%] h-8 w-8"
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: [0, 50, 95, 130], y: [0, -60, 10, -18], rotate: 540, opacity: [1, 1, 1, 0] }}
          transition={{ duration: 0.9, ease: "easeOut", times: [0, 0.35, 0.7, 1] }}
        >
          <path d={STAR_PATH} fill={ABILITY_COLOR[lost.id]} stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
        </motion.svg>
      )}

      {puffKey > 0 && (
        <div key={`puff-${puffKey}`} className="absolute left-[62%] top-[48%]">
          {[0, 1, 2].map((k) => (
            <motion.span
              key={k}
              className="absolute -ml-2 -mt-2 block h-4 w-4 rounded-full bg-white"
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 0.95 }}
              animate={{ x: 18 + k * 12, y: -24 - k * 14, scale: 1.4 - k * 0.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: k * 0.08 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A few puffy clouds in the sky. Static on purpose: Kirby is the moving part. */
function Clouds() {
  const cloud = "M30 60 a22 22 0 0 1 20-30 a30 30 0 0 1 56-8 a24 24 0 0 1 40 14 a18 18 0 0 1 4 34 h-108 a16 16 0 0 1-12-10z";
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="white">
        <path d={cloud} transform="translate(60 40) scale(1.1)" opacity="0.9" />
        <path d={cloud} transform="translate(640 20) scale(0.8)" opacity="0.8" />
        <path d={cloud} transform="translate(1180 120) scale(1.3)" opacity="0.9" />
        <path d={cloud} transform="translate(-20 520) scale(0.9)" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Rolling green hills from Kirby's feet to the bottom of the hero, full bleed. */
function Meadow() {
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[262px] h-[1200px] w-[200vw] -translate-x-1/2 sm:top-[318px] lg:top-[346px]"
      viewBox="0 0 2880 1200"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <path d="M0 70 C 400 0 800 40 1180 30 S 1900 90 2300 20 S 2700 60 2880 40 V1200 H0 Z" fill="#b8e8b2" />
      <path d="M0 120 C 500 60 900 30 1340 56 S 2100 120 2500 70 S 2800 90 2880 80 V1200 H0 Z" fill="var(--meadow)" />
      <path d="M0 120 C 500 60 900 30 1340 56 S 2100 120 2500 70 S 2800 90 2880 80" fill="none" stroke="var(--meadow-deep)" strokeWidth="5" />
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
    ? { text: "Waiting", color: "#9a90b3" }
    : held.phase === "held"
      ? { text: "Held", color: "var(--star)" }
      : held.phase === "forwarded"
        ? { text: "Forwarded", color: "var(--meadow-deep)" }
        : { text: "Dropped", color: "var(--cheek)" };

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
      className="relative z-30 mt-5 rounded-[1.75rem] bg-white p-4 shadow-[0_2px_0_rgba(42,33,64,0.08)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p id="intercept-title" className="type-display text-lg">
          Intercept
        </p>
        <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full ring-1 ring-[rgba(42,33,64,0.25)]"
            style={{ background: status.color }}
            aria-hidden="true"
          />
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
            <motion.p key="empty" {...fade} className="pt-6 text-muted-foreground">
              Tap a floating request and Kirby inhales it. You can change it
              before it reaches the server.
            </motion.p>
          )}

          {held && held.phase === "held" && (
            <motion.div key={`held-${held.request.id}`} {...fade}>
              <pre className="overflow-x-auto rounded-2xl bg-[var(--night)] p-3 text-[0.8rem] leading-relaxed text-[var(--moon)]">
                {held.request.lines(held.value).join("\n")}
              </pre>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[10rem] flex-1 text-sm text-muted-foreground">
                  Edit {held.request.field}
                  <input
                    value={held.value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className="field-input mt-1 block font-mono"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={onForward} className="btn-primary">
                    Forward
                  </button>
                  <button type="button" onClick={onDrop} className="btn-ghost">
                    Drop
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {held && held.phase === "forwarded" && held.response && (
            <motion.div key={`fwd-${held.request.id}-${held.value}`} {...fade}>
              <pre className="overflow-x-auto rounded-2xl bg-[var(--night)] p-3 text-[0.8rem] leading-relaxed text-[var(--moon)]">
                <span style={{ color: held.response.ok ? "#8fe3b0" : "var(--pink)" }}>
                  HTTP/1.1 {held.response.status}
                </span>
                {"\n\n"}
                {held.response.body}
              </pre>
              <p role="status" className="mt-3">
                {held.response.note}
              </p>
              {!held.response.ok && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/kirby/kirby-${held.request.ability.id}.webp`}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                  <span>
                    Kirby copied <strong className="text-foreground">{held.request.ability.name}</strong>.{" "}
                    {held.request.ability.why}
                  </span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onEditAgain} className="btn-ghost">
                  Edit and resend
                </button>
                <button type="button" onClick={onRelease} className="btn-ghost">
                  Catch another
                </button>
              </div>
            </motion.div>
          )}

          {held && held.phase === "dropped" && (
            <motion.div key={`drop-${held.request.id}`} {...fade} className="flex items-center gap-4 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kirby/kirby-sleep.webp" alt="" width={96} height={96} className="h-24 w-24 object-contain" />
              <div>
                <p>Dropped. Kirby swallowed it, so the server never saw it.</p>
                <button type="button" onClick={onRelease} className="btn-ghost mt-3">
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

"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Github, Pause, Play } from "lucide-react";
import { CopyLine } from "@/components/dreamland/CopyLine";
import { INTERSEPTOR } from "@/lib/interseptor";

type Capability = {
  id: string;
  name: string;
  body: string;
  /** Real product screenshot, or null for the agent transcript panel. */
  image: string | null;
  alt: string;
};

const CAPABILITIES: Capability[] = [
  {
    id: "intercept",
    name: "Intercept",
    body: "Hold requests and responses mid-flight, edit them, then forward or drop. Match-and-replace rules take care of edits you make every time.",
    image: "/product/history-list-dark.webp",
    alt: "Interseptor proxy history listing captured requests to api.example.com with methods, paths and status codes",
  },
  {
    id: "repeater",
    name: "Repeater",
    body: "Resend any request by hand and compare what comes back. Postman collections open straight into editable tabs.",
    image: "/product/repeater-dark.webp",
    alt: "Interseptor Repeater tab resending GET /api/v1/orders/1042 with the JSON response on the right",
  },
  {
    id: "intruder",
    name: "Intruder",
    body: "Fuzz with Sniper, Battering, Pitchfork and Cluster attacks, or fire a race window. Responses that look different get flagged for you.",
    image: "/product/intruder-dark.webp",
    alt: "Interseptor Intruder running a Sniper attack over order IDs, with status differences flagged in the results",
  },
  {
    id: "evidence",
    name: "Evidence",
    body: "Attach a captured request to a finding as proof. The request, the response and your note stay together.",
    image: "/product/attach-evidence-dark.webp",
    alt: "Attaching a captured request as evidence to an existing finding in Interseptor",
  },
  {
    id: "reports",
    name: "Reports",
    body: "A preflight checks every finding for missing proof before export, then writes the report.",
    image: "/product/report-preflight-dark.webp",
    alt: "Interseptor report preflight showing no blockers and two findings ready to export",
  },
  {
    id: "agents",
    name: "AI agents",
    body: "A real MCP server and a REST/SSE API drive the same engine as the UI. Your agent does the reasoning, and Interseptor captures, replays and records.",
    image: null,
    alt: "",
  },
];

const FACTS = [
  { term: "Ships as", value: "One static binary" },
  { term: "Written in", value: "Go, no JVM" },
  { term: "Runs on", value: "macOS, Linux, Windows" },
  { term: "Phones", value: "Android and iOS setup" },
  { term: "License", value: "MIT" },
  { term: "Telemetry", value: "None" },
];

export function InterseptorShowcase() {
  return (
    <section id="interseptor" className="night relative scroll-mt-16">
      <Nightfall />
      <NightStars />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <h2 className="type-display text-[clamp(2.25rem,5vw,3.75rem)] text-[var(--moon)]">
              One binary. The whole workbench.
            </h2>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-[var(--lilac)]">
              Everything a web pentest needs between the browser and the
              server, without a JVM to warm up, a license key, or a cap on how
              many findings you can export.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.term} className="border-t border-[rgba(244,240,255,0.14)] pt-3">
                <dt className="text-sm text-[var(--lilac)]">{f.term}</dt>
                <dd className="mt-0.5 font-semibold text-[var(--moon)]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DemoVideo />

        <Workbench />

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <CopyLine label="Install with Go 1.25 or later" text={INTERSEPTOR.install} />
          <CopyLine
            label="Or hand it to your AI agent"
            text={`Read ${INTERSEPTOR.agentGuide} and follow it.`}
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(244,240,255,0.14)] pt-6">
          <p className="max-w-xl text-[0.95rem] text-[var(--lilac)]">
            For systems you own or have written permission to test.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={INTERSEPTOR.repo} className="btn-night">
              <Github className="h-4 w-4" aria-hidden="true" />
              Source on GitHub
            </a>
            <a href={INTERSEPTOR.releases} className="btn-primary">
              Download {INTERSEPTOR.version}
            </a>
          </div>
        </div>
      </div>

      <CloudFloor />
    </section>
  );
}

/** The real 35-second product tour. Plays muted while on screen, with a pause control. */
function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || reduceMotion) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          video.play().catch(() => setPlaying(false));
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduceMotion]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  return (
    <figure className="mt-14">
      <div className="relative overflow-hidden rounded-[1.25rem] border border-[rgba(244,240,255,0.14)] bg-[var(--night-2)]">
        <video
          ref={ref}
          className="block aspect-[16/10] w-full"
          poster="/product/demo-dark-poster.webp"
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Interseptor product tour: capturing traffic, replaying a request, and recording a finding"
        >
          <source src="/product/demo-dark.webm" type="video/webm" />
          <source src="/product/demo-dark.mp4" type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgba(34,26,58,0.85)] px-4 text-sm font-semibold text-[var(--moon)] backdrop-blur hover:bg-[var(--night)]"
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {playing ? "Pause tour" : "Play tour"}
        </button>
      </div>
      <figcaption className="mt-3 text-sm text-[var(--lilac)]">
        A 35-second tour of the real app: capture, replay, and a finding with its proof attached.
      </figcaption>
    </figure>
  );
}

/** Tabs that swap a real screenshot for each part of the tool. */
function Workbench() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cap = CAPABILITIES[active];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    let next = active;
    if (e.key in keys) next = (active + keys[e.key] + CAPABILITIES.length) % CAPABILITIES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CAPABILITIES.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mt-20 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <h3 className="text-2xl font-bold text-[var(--moon)]">What you get</h3>
        <div
          role="tablist"
          aria-label="Interseptor features"
          onKeyDown={onKeyDown}
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {CAPABILITIES.map((c, i) => {
            const selected = i === active;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`tab-${c.id}`}
                aria-selected={selected}
                aria-controls="workbench-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={`relative shrink-0 rounded-full px-4 py-2.5 text-left font-semibold transition-colors lg:rounded-xl ${
                  selected ? "text-[var(--ink)]" : "text-[var(--lilac)] hover:text-[var(--moon)]"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="workbench-pill"
                    className="absolute inset-0 rounded-full bg-[var(--pink)] lg:rounded-xl"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="workbench-panel"
        aria-labelledby={`tab-${cap.id}`}
        tabIndex={0}
        className="min-w-0 rounded-[1.25rem]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cap.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <p className="max-w-[40rem] text-lg leading-relaxed text-[var(--moon)]">{cap.body}</p>
            <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-[rgba(244,240,255,0.14)] bg-[var(--night-2)]">
              {cap.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cap.image}
                  alt={cap.alt}
                  width={1440}
                  height={900}
                  loading="lazy"
                  className="block aspect-[16/10] w-full object-cover object-left-top"
                />
              ) : (
                <AgentPanel />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** What driving Interseptor from an agent looks like, using its real MCP tool names. */
function AgentPanel() {
  const lines: { who: "you" | "agent"; text: string }[] = [
    { who: "you", text: `Read ${INTERSEPTOR.agentGuide} and follow it. Test shop.example.com.` },
    { who: "agent", text: "check_readiness → scope_from_url shop.example.com" },
    { who: "agent", text: "list_flows tag=auth → promote_flow_to_authz Customer, Admin" },
    { who: "agent", text: "authz_run inScope=true → 3 endpoints answer the wrong role" },
    { who: "agent", text: "create_finding \"Order API returns other customers' orders\"" },
    { who: "agent", text: "add_finding_poc baseline, action, result → ready for review" },
  ];
  return (
    <div className="grid aspect-[16/10] w-full grid-cols-1 content-center gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_9rem] sm:p-8">
      <ol className="space-y-3 font-mono text-[0.82rem] leading-relaxed sm:text-[0.9rem]">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3">
            <span className={l.who === "you" ? "text-[var(--star)]" : "text-[var(--sky)]"}>
              {l.who}
            </span>
            <span className="min-w-0 break-words text-[var(--moon)]">{l.text}</span>
          </li>
        ))}
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kirby/kirby-laptop.webp"
        alt=""
        width={144}
        height={144}
        className="hidden h-36 w-36 sm:block"
      />
    </div>
  );
}

/** Night falls over the meadow: a soft hill line in Dream Night at the top of the band. */
function Nightfall() {
  return (
    <svg
      className="absolute bottom-full left-0 block h-12 w-full sm:h-16"
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 64 V40 C 240 8 480 4 720 22 S 1200 52 1440 18 V64 Z" fill="var(--night)" />
    </svg>
  );
}

/** A handful of static stars in the night sky; three of them twinkle slowly. */
function NightStars() {
  const stars = [
    { x: 6, y: 6, r: 1.6 },
    { x: 18, y: 14, r: 1.1, t: true },
    { x: 33, y: 4, r: 1.3 },
    { x: 61, y: 9, r: 1.8, t: true },
    { x: 78, y: 3, r: 1.2 },
    { x: 92, y: 12, r: 1.5, t: true },
    { x: 87, y: 30, r: 1 },
    { x: 3, y: 28, r: 1.1 },
  ];
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 h-[480px] w-full" aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="var(--star)"
          opacity={0.85}
          className={s.t ? "animate-twinkle [animation-duration:3.2s]" : undefined}
        />
      ))}
    </svg>
  );
}

/** Puffy cloud tops where the night band gives way to the reading sections. */
function CloudFloor() {
  return (
    <svg
      className="block h-16 w-full sm:h-24"
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 96 V62 a40 40 0 0 1 70-22 a56 56 0 0 1 104 4 a44 44 0 0 1 82-6 a60 60 0 0 1 112 10 a42 42 0 0 1 78 -4 a58 58 0 0 1 108 2 a46 46 0 0 1 86 4 a62 62 0 0 1 116 -2 a44 44 0 0 1 82 6 a56 56 0 0 1 104 -4 a48 48 0 0 1 90 2 a58 58 0 0 1 108 0 a50 50 0 0 1 94 4 a40 40 0 0 1 64 8 V96 Z"
        fill="hsl(var(--background))"
      />
    </svg>
  );
}

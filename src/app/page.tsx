"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Star } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import certifications from "@/app/env/certifications.json";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const CANDY = [
  "var(--candy-pink)",
  "var(--candy-yellow)",
  "var(--candy-mint)",
  "var(--candy-sky)",
  "var(--candy-grape)",
];

const stats = [
  { name: "Curiosity", stars: 5 },
  { name: "Hacking", stars: 4 },
  { name: "Cooking", stars: 2 },
  { name: "Resisting snacks", stars: 1 },
];

const abilities = [
  { emoji: "🔐", name: "Security Rookie", caption: "Learning to hack!" },
  { emoji: "💻", name: "Code Beginner", caption: "Still Googling!" },
  { emoji: "🤿", name: "Ocean Newbie", caption: "Can hold breath!" },
];

const tools = [
  {
    emoji: "🔐",
    name: "Encryptor",
    path: "/tools/encryptor/",
    desc: "Scramble your secrets with AES magic. Unscramble them too (that part's important).",
    color: 0,
  },
  {
    emoji: "🎲",
    name: "Password Generator",
    path: "/tools/password-generator/",
    desc: "Passwords so random even I can't guess them. And guessing passwords is literally my job.",
    color: 1,
  },
  {
    emoji: "🪄",
    name: "JSON Beautifier",
    path: "/tools/json-beautifier/",
    desc: "Turns your JSON spaghetti into JSON lasagna. Neat, layered, delicious.",
    color: 2,
  },
  {
    emoji: "🕵️",
    name: "AES Mode Detector",
    path: "/tools/aes-mode-detector/",
    desc: "Detective work for ciphertext. Is it ECB? CBC? Let's find out together.",
    color: 3,
  },
  {
    emoji: "🧾",
    name: "Bill Splitter",
    path: "/tools/splitbill/",
    desc: "Snap a receipt, let AI read it, split fairly. Friendships: saved.",
    color: 4,
  },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < n
              ? "fill-[var(--candy-yellow)] text-foreground"
              : "fill-transparent text-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

function certStatus(cert: { expires?: string; expired?: string }) {
  if (cert.expired) return { label: "retired badge", bg: "var(--candy-grape)" };
  if (cert.expires) return { label: `until ${cert.expires}`, bg: "var(--candy-mint)" };
  return { label: "forever mine", bg: "var(--candy-yellow)" };
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ============ HERO ============ */}
        <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mono-label">
              <span className="animate-scan inline-block">👋</span> hello there!
            </p>
            <h1
              className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-7xl"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              I&apos;m{" "}
              <span className="relative inline-block">
                Andrew
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 9C40 3 80 3 197 8"
                    stroke="var(--candy-pink)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
              <span className="mt-3 block text-2xl font-bold text-foreground/80 sm:text-4xl">
                I hack things for a living —{" "}
                <span className="text-[var(--candy-pink)]">nicely</span> 😇
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg">
              The internet calls me{" "}
              <span className="font-extrabold text-foreground">@Veyal</span>.
              Companies pay me to break into their apps before the bad guys do.
              In between, I build silly-but-useful little tools that run right
              in your browser. Snacks are involved at every stage.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/#tools" className="btn-primary">
                Come play <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/Veyal"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <Github className="h-4 w-4" /> GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/andrew-salim/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <Linkedin className="h-4 w-4" /> LinkedIn
              </a>
            </div>

            <p className="mt-8 text-sm font-bold text-foreground/60">
              Certified in things with scary acronyms:{" "}
              {["OSCP", "OSWE", "GMOB", "CEH", "CPSA", "CRT"].map((c, i) => (
                <span
                  key={c}
                  className="mr-1.5 inline-block rounded-full border-2 border-foreground px-2 py-0.5 text-xs font-extrabold text-foreground"
                  style={{ background: CANDY[i % CANDY.length] }}
                >
                  {c}
                </span>
              ))}
            </p>
          </motion.div>

          {/* Character card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.55, delay: 0.1, type: "spring", bounce: 0.4 }}
            id="about"
            className="scroll-mt-24"
          >
            <div className="card-surface card-hover relative p-6 sm:p-7">
              {/* corner sticker */}
              <div className="absolute -right-3 -top-3 rotate-12 rounded-full border-2 border-foreground bg-[var(--candy-yellow)] px-3 py-1 text-xs font-extrabold shadow-[2px_2px_0_var(--ink)]">
                LV. 99 SNACKER
              </div>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-[#5ab8ff]/30 shadow-[3px_3px_0_var(--ink)]">
                    <Image
                      src="/profile.png"
                      alt="Andrew Salim"
                      width={92}
                      height={92}
                    />
                  </div>
                </div>
                <div>
                  <h2
                    className="text-2xl font-extrabold text-foreground"
                    style={{ fontFamily: "'Baloo 2', sans-serif" }}
                  >
                    Andrew Salim
                  </h2>
                  <p className="font-extrabold text-[var(--candy-pink)]">@Veyal</p>
                  <p className="mt-1 text-xs font-bold text-foreground/60">
                    friendly neighborhood hacker
                  </p>
                </div>
              </div>

              {/* Player stats */}
              <div className="mt-5 rounded-xl border-2 border-foreground bg-secondary p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-foreground/60">
                  ⭐ Player stats
                </p>
                <div className="mt-2 space-y-1.5">
                  {stats.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground/80">
                        {s.name}
                      </span>
                      <Stars n={s.stars} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-bold text-foreground/50">
                  * certifications are real, stars are self-assessed
                </p>
              </div>

              {/* Abilities */}
              <div className="mt-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-foreground/60">
                  ✨ Collected abilities
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {abilities.map((a, i) => (
                    <div
                      key={a.name}
                      className="rounded-xl border-2 border-foreground p-2.5 text-center shadow-[2px_2px_0_var(--ink)] transition-transform hover:-rotate-2 hover:scale-105"
                      style={{ background: `${CANDY[i % CANDY.length]}22` }}
                    >
                      <span className="text-xl">{a.emoji}</span>
                      <p className="mt-1 text-[11px] font-extrabold leading-tight text-foreground">
                        {a.name}
                      </p>
                      <p className="text-[10px] font-bold text-foreground/60">
                        {a.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============ ACHIEVEMENTS (CERTS) ============ */}
        <section id="achievements" className="scroll-mt-24 py-14">
          <motion.div {...fadeUp} className="text-center">
            <p className="mono-label">🏆 achievements unlocked</p>
            <h2
              className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              Proof I studied
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-foreground/60 sm:text-base">
              Real exams where I had to actually hack real machines while a
              proctor watched me sweat. Collected like Pokémon badges.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {certifications.map((cert, i) => {
              const status = certStatus(cert);
              return (
                <motion.div
                  key={cert.abbreviation}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                  className="card-surface card-hover relative p-5"
                  style={{ rotate: `${(i % 3) - 1}deg` }}
                >
                  <span
                    className="absolute -right-2 -top-2 rounded-full border-2 border-foreground px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-[2px_2px_0_var(--ink)]"
                    style={{ background: status.bg }}
                  >
                    {status.label}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-foreground bg-white p-1.5 shadow-[2px_2px_0_var(--ink)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cert.image}
                        alt={cert.abbreviation}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <h3
                        className="text-xl font-extrabold text-foreground"
                        style={{ fontFamily: "'Baloo 2', sans-serif" }}
                      >
                        {cert.abbreviation}
                      </h3>
                      <p className="text-xs font-bold leading-snug text-foreground/70">
                        {cert.name}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-bold text-foreground/50">
                    {cert.organization} · unlocked {cert.issued}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ============ PLAYGROUND (TOOLS) ============ */}
        <section id="tools" className="scroll-mt-24 py-14">
          <motion.div {...fadeUp} className="text-center">
            <p className="mono-label">🎮 the playground</p>
            <h2
              className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              Toys I built for you
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-foreground/60 sm:text-base">
              Free forever, no servers, no tracking, no vegetables. Everything
              happens right in your browser.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              >
                <Link
                  href={tool.path}
                  className="card-surface card-hover group flex h-full flex-col p-6"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground text-2xl shadow-[2px_2px_0_var(--ink)] transition-transform group-hover:-rotate-6 group-hover:scale-110"
                      style={{ background: CANDY[tool.color] }}
                    >
                      {tool.emoji}
                    </span>
                    <span className="rounded-full border-2 border-foreground bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-foreground/70">
                      STAGE {i + 1}
                    </span>
                  </div>
                  <h3
                    className="mt-4 text-xl font-extrabold text-foreground"
                    style={{ fontFamily: "'Baloo 2', sans-serif" }}
                  >
                    {tool.name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm font-bold leading-relaxed text-foreground/60">
                    {tool.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--candy-pink)]">
                    PRESS START
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}

            {/* "more soon" tile */}
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: tools.length * 0.05 }}
              className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-foreground/40 p-6 text-center"
            >
              <span className="text-3xl">🚧</span>
              <p className="mt-2 font-extrabold text-foreground/50">
                Next toy loading…
              </p>
              <p className="text-xs font-bold text-foreground/40">
                (as soon as I stop playing with the other ones)
              </p>
            </motion.div>
          </div>
        </section>

        {/* ============ CONTACT ============ */}
        <section id="contact" className="scroll-mt-24 py-14 pb-24">
          <motion.div
            {...fadeUp}
            className="card-surface relative overflow-hidden bg-[#ff6fa5]/15 p-8 text-center sm:p-14"
          >
            <span className="absolute left-6 top-6 rotate-[-8deg] text-2xl">💌</span>
            <span className="absolute right-8 top-10 rotate-12 text-2xl">✨</span>
            <span className="absolute bottom-8 left-12 rotate-6 text-2xl">🫶</span>
            <p className="mono-label">say hi!</p>
            <h2
              className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              Let&apos;s be friends
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-bold leading-relaxed text-foreground/70 sm:text-base">
              Need something hacked (legally!), want to nerd out about
              security, or just want to tell me which tool is your favorite?
              I answer faster than my SLA suggests.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://www.linkedin.com/in/andrew-salim/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <Linkedin className="h-4 w-4" /> Wave on LinkedIn
              </a>
              <a
                href="https://github.com/Veyal"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <Github className="h-4 w-4" /> Stalk my GitHub
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

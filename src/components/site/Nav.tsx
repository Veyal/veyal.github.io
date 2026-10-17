"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Github, Linkedin, Menu, X } from "lucide-react";

const links = [
  { href: "/#about", label: "About me" },
  { href: "/#interseptor", label: "Interseptor" },
  { href: "/#achievements", label: "Achievements" },
  { href: "/#tools", label: "Playground" },
  { href: "/#contact", label: "Say hi" },
];

/** Maps each nav link to the section id it points at ("/#tools" -> "tools"). */
const sections = links.map((l) => ({ ...l, id: l.href.replace("/#", "") }));

export function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // XP-style scroll progress bar. scaleX only, so it stays on the compositor.
  const { scrollYProgress } = useScroll();
  const xpProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  // Highlight whichever section currently crosses the middle of the viewport.
  useEffect(() => {
    const observed = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (observed.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Close the mobile panel if the viewport grows into the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-card shadow-[2px_2px_0_var(--ink)] transition-transform duration-200 group-hover:rotate-12">
            <Image src="/profile.png" alt="Veyal" width={36} height={36} />
          </span>
          <span
            className="text-lg font-extrabold tracking-tight text-foreground"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            veyal<span className="text-[var(--candy-pink)]">.land</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {sections.map((l) => {
            const isActive = active === l.id;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive ? "true" : undefined}
                className={`relative rounded-full px-3.5 py-2 text-sm font-bold transition-colors duration-150 ${
                  isActive
                    ? "text-foreground"
                    : "text-foreground/70 hover:-rotate-2 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--candy-yellow)]"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 30 }
                    }
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
          <div className="mx-2 h-5 w-0.5 rounded bg-foreground/20" />
          <a
            href="https://github.com/Veyal"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="rounded-full p-2 text-foreground/70 transition-all hover:rotate-6 hover:bg-[var(--candy-mint)] hover:text-foreground"
          >
            <Github className="h-[18px] w-[18px]" />
          </a>
          <a
            href="https://www.linkedin.com/in/andrew-salim/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="rounded-full p-2 text-foreground/70 transition-all hover:-rotate-6 hover:bg-[var(--candy-sky)] hover:text-foreground"
          >
            <Linkedin className="h-[18px] w-[18px]" />
          </a>
        </nav>

        <button
          className="rounded-lg border-2 border-foreground bg-card p-2 text-foreground shadow-[2px_2px_0_var(--ink)] md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* LV.99 XP bar */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: xpProgress }}
        className="absolute bottom-0 left-0 h-1 w-full origin-left bg-[var(--candy-pink)]"
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
            className="overflow-hidden border-t-2 border-foreground bg-background md:hidden"
          >
            <div className="px-4 pb-4 pt-2">
              {sections.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.04 * i }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-bold ${
                      active === l.id
                        ? "bg-[var(--candy-yellow)] text-foreground"
                        : "text-foreground/80 hover:bg-[var(--candy-yellow)] hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-2 flex gap-2 px-3">
                <a
                  href="https://github.com/Veyal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip"
                >
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/andrew-salim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip"
                >
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import { INTERSEPTOR } from "@/lib/interseptor";

const links = [
  { href: "/#interseptor", label: "Interseptor" },
  { href: "/#about", label: "About" },
  { href: "/#tools", label: "Tools" },
  { href: "/#contact", label: "Contact" },
];

/** Sticky Cloud bar shared by the home page and the tool pages. */
export function Nav() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

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
    <header className="sticky top-0 z-50 border-b border-[var(--pad-edge)] bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="type-display flex items-center gap-2 text-2xl text-foreground">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M12 1.8l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.7l-6.1 3.5 1.5-6.8L2.2 8.8l6.9-.7z"
              fill="var(--star)"
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          veyal
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[0.95rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/Veyal"
            aria-label="Veyal on GitHub"
            className="ml-1 rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-5 w-5" />
          </a>
          <a href={INTERSEPTOR.releases} className="btn-primary ml-2 min-h-10 px-4 text-sm">
            Get Interseptor
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-secondary md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[var(--pad-edge)] md:hidden"
          >
            <div className="flex flex-col px-4 pb-5 pt-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-lg font-semibold text-foreground hover:bg-secondary"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-3 px-3">
                <a href={INTERSEPTOR.releases} className="btn-primary">
                  Get Interseptor
                </a>
                <a href="https://github.com/Veyal" className="btn-ghost">
                  <Github className="h-4 w-4" aria-hidden="true" /> GitHub
                </a>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

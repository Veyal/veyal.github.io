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

/** Sticky night bar shared by the home page and the tool pages. */
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
    <header className="night sticky top-0 z-50 border-b border-[rgba(227,242,234,0.1)] bg-[var(--night)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="type-display flex items-center gap-2 text-2xl text-[var(--mist)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lily)]" aria-hidden="true" />
          veyal
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[0.95rem] font-semibold text-[var(--reed)] transition-colors hover:text-[var(--mist)]"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/Veyal"
            aria-label="Veyal on GitHub"
            className="ml-1 rounded-full p-2.5 text-[var(--reed)] transition-colors hover:text-[var(--mist)]"
          >
            <Github className="h-5 w-5" />
          </a>
          <a href={INTERSEPTOR.releases} className="btn-primary ml-2 min-h-10 px-4 text-sm">
            Get Interseptor
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--mist)] hover:bg-[var(--night-2)] md:hidden"
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
            className="overflow-hidden border-t border-[rgba(227,242,234,0.1)] md:hidden"
          >
            <div className="flex flex-col px-4 pb-5 pt-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-lg font-semibold text-[var(--mist)] hover:bg-[var(--night-2)]"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-3 px-3">
                <a href={INTERSEPTOR.releases} className="btn-primary">
                  Get Interseptor
                </a>
                <a href="https://github.com/Veyal" className="btn-night">
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

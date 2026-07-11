"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Github, Linkedin, Menu, X } from "lucide-react";

const links = [
  { href: "/#about", label: "About me" },
  { href: "/#achievements", label: "Achievements" },
  { href: "/#tools", label: "Playground" },
  { href: "/#contact", label: "Say hi" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-card shadow-[2px_2px_0_var(--ink)] transition-transform group-hover:rotate-12">
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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-bold text-foreground/70 transition-all hover:-rotate-2 hover:bg-[var(--candy-yellow)] hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
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
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t-2 border-foreground bg-background px-4 pb-4 pt-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-bold text-foreground/80 hover:bg-[var(--candy-yellow)] hover:text-foreground"
            >
              {l.label}
            </Link>
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
        </nav>
      )}
    </header>
  );
}

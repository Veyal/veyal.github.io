import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import { INTERSEPTOR } from "@/lib/interseptor";

export function Footer() {
  return (
    <footer className="night">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Link href="/" className="type-display text-xl text-[var(--moon)]">
            veyal
          </Link>
          <p className="mt-1 text-sm text-[var(--lilac)]">
            Interseptor is open source under the MIT license.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={INTERSEPTOR.docs} className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--lilac)] hover:text-[var(--moon)]">
            Interseptor docs
          </a>
          <a
            href="https://github.com/Veyal"
            aria-label="Veyal on GitHub"
            className="rounded-full p-2.5 text-[var(--lilac)] hover:text-[var(--moon)]"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/andrew-salim/"
            aria-label="LinkedIn"
            className="rounded-full p-2.5 text-[var(--lilac)] hover:text-[var(--moon)]"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

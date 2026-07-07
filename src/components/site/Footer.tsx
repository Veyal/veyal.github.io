import { Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground bg-[#ffc94d]/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="text-sm font-bold text-foreground/80">
          © {new Date().getFullYear()} Andrew Salim (@Veyal) · made with ♥ and
          too many snacks
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Veyal"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="rounded-full border-2 border-foreground bg-card p-2 text-foreground shadow-[2px_2px_0_var(--ink)] transition-transform hover:rotate-6"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/andrew-salim/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="rounded-full border-2 border-foreground bg-card p-2 text-foreground shadow-[2px_2px_0_var(--ink)] transition-transform hover:-rotate-6"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

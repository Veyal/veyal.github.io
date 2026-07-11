"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import toolsData from "@/app/env/tools.json";

const toolEmojis: Record<string, string> = {
  Encryptor: "🔐",
  "Password Generator": "🎲",
  "JSON Beautifier": "🪄",
  "AES Mode Detector": "🕵️",
  "Bill Splitter": "🧾",
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const readyTools = toolsData.filter((t) => t.status === "ready");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full border-2 border-foreground bg-card px-3 py-1.5 text-sm font-extrabold text-foreground shadow-[2px_2px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:bg-[var(--candy-yellow)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <span
            className="hidden text-lg font-extrabold text-foreground lg:block"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            the <span className="text-[var(--candy-pink)]">playground</span> 🎮
          </span>

          <div className="flex-1" />

          <nav className="flex items-center gap-1.5">
            {readyTools.map((tool) => {
              const active = pathname === tool.path;
              return (
                <Link
                  key={tool.name}
                  href={tool.path}
                  className={`hidden items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition-all lg:flex ${
                    active
                      ? "border-foreground bg-[var(--candy-pink)] text-foreground shadow-[2px_2px_0_var(--ink)]"
                      : "border-transparent text-foreground/60 hover:-rotate-2 hover:border-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span>{toolEmojis[tool.name] ?? "🧸"}</span>
                  {tool.name}
                </Link>
              );
            })}

            {/* Mobile / tablet: dropdown with all tools */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1.5 rounded-full border-2 border-foreground bg-card px-3.5 py-2 text-xs font-extrabold text-foreground shadow-[2px_2px_0_var(--ink)]"
              >
                {toolEmojis[
                  readyTools.find((t) => t.path === pathname)?.name ?? ""
                ] ?? "🎮"}{" "}
                {readyTools.find((t) => t.path === pathname)?.name ?? "Pick a toy"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`}
                />
              </button>
              {showMore && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-[4px_4px_0_var(--ink)]">
                  {readyTools.map((tool) => {
                    const active = pathname === tool.path;
                    return (
                      <Link
                        key={tool.name}
                        href={tool.path}
                        onClick={() => setShowMore(false)}
                        className={`flex items-center gap-2.5 px-4 py-3 text-sm font-extrabold transition-colors ${
                          active
                            ? "bg-[#ff6fa5]/30 text-foreground"
                            : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <span>{toolEmojis[tool.name] ?? "🧸"}</span>
                        {tool.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}

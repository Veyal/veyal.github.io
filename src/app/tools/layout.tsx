"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ToolIcon } from "@/components/site/ToolIcon";
import toolsData from "@/app/env/tools.json";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const readyTools = toolsData.filter((t) => t.status === "ready");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      {/* Tool switcher: scrolls sideways on narrow screens instead of hiding tools. */}
      <div className="bg-[var(--blush)]">
        <nav
          aria-label="Tools"
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6"
        >
          {readyTools.map((tool) => {
            const active = pathname === tool.path;
            return (
              <Link
                key={tool.path}
                href={tool.path}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--ink)] text-white"
                    : "text-muted-foreground hover:bg-white hover:text-foreground"
                }`}
              >
                <ToolIcon name={tool.icon} className="h-4 w-4" />
                {tool.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}

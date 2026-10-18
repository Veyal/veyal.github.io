"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Github, Linkedin } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ToolIcon } from "@/components/site/ToolIcon";
import { DreamHero } from "@/components/dreamland/DreamHero";
import { InterseptorShowcase } from "@/components/dreamland/InterseptorShowcase";
import { INTERSEPTOR } from "@/lib/interseptor";
import certifications from "@/app/env/certifications.json";
import tools from "@/app/env/tools.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Feb 2027" -> first day after that month, so a cert is valid through its whole expiry month. */
function endOfMonth(label: string) {
  const [mon, year] = label.split(" ");
  return new Date(Number(year), MONTHS.indexOf(mon) + 1, 1);
}

type Cert = (typeof certifications)[number] & { expires?: string; expired?: string };

/**
 * Status wording for a certification. `now` is null during the static render
 * and the first client render, so the output never depends on build time.
 */
function certStatus(cert: Cert, now: Date | null) {
  if (cert.expired) return { text: `Expired ${cert.expired}`, active: false };
  if (cert.expires) {
    if (now && now >= endOfMonth(cert.expires)) return { text: `Expired ${cert.expires}`, active: false };
    return { text: `Valid until ${cert.expires}`, active: true };
  }
  return { text: "Does not expire", active: true };
}

export default function HomePage() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const certs = certifications as Cert[];
  const readyTools = tools.filter((t) => t.status === "ready");

  return (
    <div className="min-h-screen">
      <Nav />

      <main>
        <DreamHero />
        <InterseptorShowcase />

        {/* About */}
        <section id="about" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:pb-28">
            <div>
              <div className="flex items-center gap-4">
                <Image
                  src="/profile.png"
                  alt=""
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-[1.25rem] bg-[var(--blush)] ring-2 ring-[var(--pink)] ring-offset-4 ring-offset-[hsl(var(--background))]"
                />
                <p className="font-semibold">@Veyal</p>
              </div>
              <h2 className="type-display mt-8 text-[clamp(2.25rem,5vw,3.5rem)]">Hi, I&apos;m Andrew.</h2>
              <div className="mt-6 max-w-[36rem] space-y-4 text-lg leading-relaxed text-muted-foreground">
                <p>
                  I&apos;m a penetration tester. Companies hire me to break into
                  their web and mobile apps before someone else does, then I
                  write up exactly how to fix what I found.
                </p>
                <p>
                  Interseptor is the proxy I build for that work. Between
                  engagements I make small browser tools, and there are snacks
                  at every stage.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="https://www.linkedin.com/in/andrew-salim/" className="btn-ghost">
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                  LinkedIn
                </a>
                <a href="https://github.com/Veyal" className="btn-ghost">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold">Certifications</h3>
              <p className="mt-2 text-muted-foreground">
                Hands-on exams where I had to break into real machines while a proctor watched.
              </p>
              <ul className="mt-6 divide-y divide-[var(--pad-edge)] border-y border-[var(--pad-edge)]">
                {certs.map((cert) => {
                  const status = certStatus(cert, now);
                  return (
                    <li key={cert.abbreviation} className="flex items-center gap-4 py-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cert.image} alt="" className="max-h-full max-w-full object-contain" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-snug">
                          {cert.abbreviation}{" "}
                          <span className="font-normal text-muted-foreground">{cert.name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {cert.organization}, issued {cert.issued}
                          <span className={`block font-semibold sm:hidden ${status.active ? "text-[#7a1f4c]" : ""}`}>
                            {status.text}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline ${
                          status.active ? "bg-[var(--blush)] text-[#7a1f4c]" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="scroll-mt-16 bg-[var(--blush)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="type-display max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]">
              Small tools that run in your browser.
            </h2>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-muted-foreground">
              Free, with no account and no server of mine in the middle.
            </p>
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {readyTools.map((tool, i) => (
                <li
                  key={tool.path}
                  className={readyTools.length % 2 === 1 && i === readyTools.length - 1 ? "md:col-span-2" : undefined}
                >
                  <Link href={tool.path} className="card-surface card-hover flex h-full items-start gap-4 p-5 sm:p-6">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--blush)] text-[var(--cheek)]">
                      <ToolIcon name={tool.icon} className="h-6 w-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-bold">{tool.name}</span>
                      <span className="mt-1 block leading-relaxed text-muted-foreground">{tool.blurb}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
              <div>
                <h2 className="type-display text-[clamp(2.5rem,6vw,4.5rem)]">Need something tested?</h2>
                <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                  Ask me about a pentest, tell me what Interseptor should do
                  next, or just say hi. LinkedIn is the fastest way to reach me.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
                <a href="https://www.linkedin.com/in/andrew-salim/" className="btn-primary">
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                  Message me on LinkedIn
                </a>
                <a href={INTERSEPTOR.issues} className="btn-ghost">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  Open an Interseptor issue
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

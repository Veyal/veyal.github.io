"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** A single command or prompt with a copy button, styled for night surfaces. */
export function CopyLine({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[var(--moon)]">{label}</p>
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-[rgba(244,240,255,0.14)] bg-[var(--night)] p-3">
        <code className="min-w-0 flex-1 break-all text-[0.85rem] leading-relaxed text-[var(--moon)]">{text}</code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[var(--lilac)] hover:bg-[var(--night-2)] hover:text-[var(--moon)]"
          aria-label={copied ? "Copied" : `Copy: ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-[var(--pink)]" /> : <Copy className="h-4 w-4" />}
          <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

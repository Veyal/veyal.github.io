"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "./format";

type SummaryEntry = {
  name: string;
  color: string;
  subtotal: number;
  count: number;
};

type AssignmentTotalsProps = {
  summary: SummaryEntry[];
  currency: string;
  onCalculate: () => void;
  calculateDisabled: boolean;
  blockedMessage?: string;
};

export function AssignmentTotals({
  summary,
  currency,
  onCalculate,
  calculateDisabled,
  blockedMessage,
}: AssignmentTotalsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const detail = (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
        Running totals
      </p>
      {summary.length ? (
        summary.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between rounded-md border border-[var(--sb-line)] bg-white p-4"
          >
            <div>
              <p className="font-medium text-[var(--sb-ink)]">{entry.name}</p>
              <p className="text-xs text-[var(--sb-slate)]">
                {entry.count} item{entry.count === 1 ? "" : "s"} assigned
              </p>
            </div>
            <p className="sb-amount font-medium text-[var(--sb-accent)]">
              {formatCurrency(entry.subtotal, currency)}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm text-[var(--sb-slate)]">
          Assign at least one item to each person.
        </p>
      )}
      <Button onClick={onCalculate} className="w-full" disabled={calculateDisabled}>
        Calculate split
      </Button>
      {blockedMessage && (
        <p className="text-xs text-[var(--sb-slate)]">{blockedMessage}</p>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden rounded-lg border border-[var(--sb-line)] p-5 lg:block">
        {detail}
      </div>

      <div className="sb-totals-bar -mx-6 flex min-w-0 items-center gap-3 border-t border-[var(--sb-line)] bg-[var(--sb-card)] px-6 py-3 lg:hidden">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
          onClick={() => setSheetOpen(true)}
          aria-label="Show running totals"
        >
          {summary.map((entry) => (
            <span
              key={entry.name}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: entry.color }}
              title={`${entry.name}: ${formatCurrency(entry.subtotal, currency)}`}
            >
              {entry.name[0]?.toUpperCase()}
            </span>
          ))}
        </button>
        <Button onClick={onCalculate} disabled={calculateDisabled} className="whitespace-nowrap">
          Calculate
        </Button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/45 lg:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--sb-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detail}
          </div>
        </div>
      )}
    </>
  );
}

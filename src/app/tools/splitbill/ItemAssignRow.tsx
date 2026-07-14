"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "./format";
import { PersonChip } from "./PersonChip";
import type { Person, ReceiptItem } from "./types";

type ItemAssignRowProps = {
  item: ReceiptItem;
  people: Person[];
  currency: string;
  requiresAssignment: boolean;
  onTogglePerson: (personName: string) => void;
  onSplitAll: () => void;
  onChangePercentage: (personName: string, value: number) => void;
  onResetEqual: () => void;
};

export function ItemAssignRow({
  item,
  people,
  currency,
  requiresAssignment,
  onTogglePerson,
  onSplitAll,
  onChangePercentage,
  onResetEqual,
}: ItemAssignRowProps) {
  const unique = Array.from(new Set(item.assignedTo ?? []));

  const [expanded, setExpanded] = useState(false);
  const [showChips, setShowChips] = useState(requiresAssignment || unique.length > 0);

  const totalPercentage = unique.reduce(
    (sum, name) => sum + (item.percentages?.[name] || 0),
    0
  );
  const remaining = Math.round((100 - totalPercentage) * 10) / 10;
  const isUnassigned = requiresAssignment && unique.length === 0;

  return (
    <div
      className="sb-item-row"
      data-unassigned={isUnassigned || undefined}
      data-free={!requiresAssignment || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--sb-ink)]">{item.name}</p>
          {item.translatedName && (
            <p className="text-xs text-[var(--sb-slate)]">{item.translatedName}</p>
          )}
        </div>
        <p className="sb-amount font-medium text-[var(--sb-ink)]">
          {formatCurrency(item.total, currency)}
        </p>
      </div>

      {!requiresAssignment && !showChips ? (
        <button
          type="button"
          className="mt-2 text-xs text-[var(--sb-slate)] underline"
          onClick={() => setShowChips(true)}
        >
          Free item — tap to track who had it (optional)
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="sb-chip-row">
            {people.map((person) => (
              <PersonChip
                key={person.name}
                person={person}
                assigned={unique.includes(person.name)}
                onToggle={() => onTogglePerson(person.name)}
              />
            ))}
            <button
              type="button"
              className="rounded-full border border-dashed border-[var(--sb-line)] px-3 py-1 text-xs font-semibold text-[var(--sb-slate)] hover:border-[var(--sb-accent)] hover:text-[var(--sb-accent)]"
              onClick={onSplitAll}
              aria-label="Split this item evenly among everyone"
            >
              ⚡ all
            </button>
            {unique.length > 0 && (
              <button
                type="button"
                className="rounded-full border border-[var(--sb-line)] px-3 py-1 text-xs font-semibold text-[var(--sb-slate)] hover:border-[var(--sb-accent)] hover:text-[var(--sb-accent)]"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-label={expanded ? "Hide fine-tune split" : "Fine-tune split"}
              >
                ···
              </button>
            )}
          </div>

          {unique.length > 0 && (
            <p className="text-xs text-[var(--sb-slate)]">
              {unique.length === 1
                ? `${unique[0]} — 100%`
                : `${unique.join(", ")} — ${totalPercentage.toFixed(1)}% assigned`}
            </p>
          )}

          {expanded && unique.length > 0 && (
            <div className="sb-finetune space-y-2">
              {unique.map((name) => (
                <div key={name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="w-20 truncate text-[var(--sb-ink)]">{name}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.percentages?.[name] || 0}
                    onChange={(e) => onChangePercentage(name, Number(e.target.value))}
                    className="w-20 font-mono"
                  />
                  <span className="text-[var(--sb-slate)]">%</span>
                  <span className="sb-amount ml-auto text-[var(--sb-ink)]">
                    {formatCurrency(
                      item.total * ((item.percentages?.[name] || 0) / 100),
                      currency
                    )}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <span
                  aria-live="polite"
                  className={cn(
                    "text-xs font-medium",
                    Math.abs(remaining) < 0.1
                      ? "text-[var(--sb-slate)]"
                      : "text-[var(--sb-accent)]"
                  )}
                >
                  {Math.abs(remaining) < 0.1
                    ? "Balanced at 100%"
                    : `Remaining: ${remaining}%`}
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--sb-accent)] underline"
                  onClick={onResetEqual}
                >
                  Reset to equal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Person, ReceiptItem } from "./types";

const formatCurrency = (amount: number, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

type AssignmentModalProps = {
  item: ReceiptItem;
  people: Person[];
  currency?: string;
  onClose: () => void;
  onTogglePerson: (name: string) => void;
  onChangePercentage: (name: string, value: number) => void;
};

export function AssignmentModal({
  item,
  people,
  currency = "IDR",
  onClose,
  onTogglePerson,
  onChangePercentage,
}: AssignmentModalProps) {
  const unique = Array.from(new Set(item.assignedTo ?? []));
  const totalPercentage = unique.reduce(
    (sum, name) => sum + (item.percentages?.[name] || 0),
    0
  );
  const balanced = Math.abs(totalPercentage - 100) < 0.1;

  return (
    <div className="sb-modal-backdrop">
      <div className="sb-modal sb-modal-wide space-y-4" role="dialog" aria-labelledby="sb-assign-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="sb-assign-title" className="sb-heading text-lg">
              {item.name}
            </h3>
            {item.translatedName && (
              <p className="mt-1 text-sm text-[var(--sb-slate)]">
                {item.translatedName}
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--sb-slate)]">
              <span className="sb-amount font-medium text-[var(--sb-ink)]">
                {formatCurrency(item.total, currency)}
              </span>{" "}
              — choose who shares this item.
            </p>
          </div>
          <button
            type="button"
            className="sb-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            balanced
              ? "border-[var(--sb-line)] bg-[rgba(196,92,38,0.06)] text-[var(--sb-ink)]"
              : "border-[var(--sb-accent)] bg-[rgba(196,92,38,0.08)] text-[var(--sb-ink)]"
          )}
        >
          Assigned total:{" "}
          <span className="sb-amount">{totalPercentage.toFixed(1)}%</span>
          {balanced ? "" : " — should add up to 100%."}
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          {people.map((person) => {
            const assigned = unique.includes(person.name);
            const percentage = item.percentages?.[person.name] || 0;
            return (
              <div
                key={person.name}
                className={cn(
                  "space-y-3 rounded-lg border p-4",
                  assigned
                    ? "border-[var(--sb-accent)] bg-[rgba(196,92,38,0.05)]"
                    : "border-[var(--sb-line)] bg-[var(--sb-card)]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--sb-ink)]">{person.name}</p>
                      {assigned && (
                        <p className="text-xs text-[var(--sb-slate)]">
                          Share{" "}
                          <span className="sb-amount">
                            {formatCurrency(item.total * (percentage / 100), currency)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={assigned ? "outline" : "default"}
                    onClick={() => onTogglePerson(person.name)}
                  >
                    {assigned ? "Remove" : "Add"}
                  </Button>
                </div>
                {assigned && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={percentage}
                      onChange={(e) =>
                        onChangePercentage(person.name, Number(e.target.value))
                      }
                      className="w-full accent-[var(--sb-accent)]"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={percentage}
                        onChange={(e) =>
                          onChangePercentage(person.name, Number(e.target.value))
                        }
                        className="w-20 font-mono"
                      />
                      <span className="text-[var(--sb-slate)]">%</span>
                      <span className="sb-amount ml-auto font-medium text-[var(--sb-ink)]">
                        {formatCurrency(item.total * (percentage / 100), currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

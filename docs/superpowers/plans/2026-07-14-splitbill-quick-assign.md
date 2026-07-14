# Bill Splitter Quick-Assign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Bill Splitter's modal-per-item assignment flow with inline tap-to-assign chips, and collapse the 5-step wizard to 3 steps (Setup, Assign, Results), per `docs/superpowers/specs/2026-07-14-splitbill-quick-assign-design.md`.

**Architecture:** Extract the monolithic `page.tsx` assignment/upload/review/people markup into focused components (`PersonChip`, `ItemAssignRow`, `AssignmentTotals`, `SetupStep`), reusing the existing state/handlers in `page.tsx` unchanged. `AssignmentModal.tsx` is deleted. The `Step` union shrinks from 5 to 3 values.

**Tech Stack:** Next.js 14 (App Router, static export), React 18, Tailwind CSS, shadcn/ui primitives, TypeScript strict mode.

## Global Constraints

- No test runner exists in this repo — every task's verification is `npx tsc --noEmit` (type check) followed by a manual walkthrough in `npm run dev`, not automated tests.
- Do not change `calculateSplit`, `buildResultsSummary`, `shareResults`, or the proportional service-charge/tax/discount math in `page.tsx` — bit-for-bit unchanged.
- Do not touch `AiConfigModal.tsx`, `openai.ts`, `CropModal.tsx`, `image.ts`, or `prompt.ts`.
- All new components are `"use client"` (static export, no server components) per this repo's CLAUDE.md.
- Reuse existing `--sb-*` CSS custom properties and the `sb-card` / `sb-heading` / `sb-amount` / `sb-dropzone` classes already defined in `splitbill.css` — do not introduce new color values outside the existing ledger-desk palette.
- Every new/moved piece of currency formatting must go through the single shared `formatCurrency` in `format.ts` (Task 1) — no re-declaring the `Intl.NumberFormat` closure in more than one place.

---

### Task 1: Shared currency formatter

**Files:**
- Create: `src/app/tools/splitbill/format.ts`
- Modify: `src/app/tools/splitbill/page.tsx`

**Interfaces:**
- Produces: `formatCurrency(amount: number, currency?: string): string`, exported from `src/app/tools/splitbill/format.ts`. Used by every later task.

- [ ] **Step 1: Create `format.ts`**

```ts
export const formatCurrency = (amount: number, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
```

- [ ] **Step 2: Import it in `page.tsx` and delete the local copy**

In `page.tsx`, find:

```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { AiConfigModal } from "./AiConfigModal";
```

Replace with:

```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
```

Then find the local definition (a few lines below `COLOR_POOL`):

```ts
const formatCurrency = (amount: number, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const formatTokenCount = (value?: number) =>
```

Replace with:

```ts
const formatTokenCount = (value?: number) =>
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/tools/splitbill/`.
Expected: page loads with no console errors; header and upload zone render exactly as before (this step is a pure refactor, no visible change).

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/splitbill/format.ts src/app/tools/splitbill/page.tsx
git commit -m "Extract shared currency formatter for Bill Splitter."
```

---

### Task 2: Inline chip assignment (`PersonChip`, `ItemAssignRow`), delete the modal

**Files:**
- Create: `src/app/tools/splitbill/PersonChip.tsx`
- Create: `src/app/tools/splitbill/ItemAssignRow.tsx`
- Modify: `src/app/tools/splitbill/splitbill.css`
- Modify: `src/app/tools/splitbill/page.tsx`
- Delete: `src/app/tools/splitbill/AssignmentModal.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from `./format` (Task 1); `Person`, `ReceiptItem` from `./types`; existing `page.tsx` functions `toggleAssignment(itemIndex: number, personName: string): void` and `updatePercentage(itemIndex: number, personName: string, rawValue: number): void` (both already defined, unchanged) and `updateReceiptItem(index: number, updater: (item: ReceiptItem) => ReceiptItem): void` (already defined, unchanged).
- Produces: `PersonChip` component — props `{ person: Person; assigned: boolean; onToggle: () => void }`. `ItemAssignRow` component — props `{ item: ReceiptItem; people: Person[]; currency: string; requiresAssignment: boolean; onTogglePerson: (personName: string) => void; onSplitAll: () => void; onChangePercentage: (personName: string, value: number) => void; onResetEqual: () => void }`. New `page.tsx` functions `splitItemEvenly(itemIndex: number): void` and `resetItemToEqual(itemIndex: number): void`, both used by Task 3 and later tasks.

- [ ] **Step 1: Create `PersonChip.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { Person } from "./types";

type PersonChipProps = {
  person: Person;
  assigned: boolean;
  onToggle: () => void;
};

export function PersonChip({ person, assigned, onToggle }: PersonChipProps) {
  return (
    <button
      type="button"
      className={cn("sb-chip")}
      style={{ backgroundColor: assigned ? person.color : undefined }}
      aria-pressed={assigned}
      aria-label={`${assigned ? "Remove" : "Add"} ${person.name}`}
      title={person.name}
      onClick={onToggle}
    >
      {person.name[0]?.toUpperCase()}
    </button>
  );
}
```

- [ ] **Step 2: Create `ItemAssignRow.tsx`**

```tsx
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
  const [expanded, setExpanded] = useState(false);
  const [showChips, setShowChips] = useState(requiresAssignment);

  const unique = Array.from(new Set(item.assignedTo ?? []));
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
                <div key={name} className="flex items-center gap-2 text-sm">
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
```

- [ ] **Step 3: Add the new CSS classes**

In `splitbill.css`, find:

```css
.sb-dropzone[data-has-file="true"] {
  border-color: var(--sb-accent);
  border-style: solid;
}

@media (prefers-reduced-motion: reduce) {
```

Replace with:

```css
.sb-dropzone[data-has-file="true"] {
  border-color: var(--sb-accent);
  border-style: solid;
}

.sb-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 2px solid var(--sb-line);
  background: var(--sb-card);
  color: var(--sb-ink);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.sb-chip[aria-pressed="true"] {
  border-color: transparent;
  color: #fffcf7;
}

.sb-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.sb-item-row {
  border: 1px solid var(--sb-line);
  border-radius: 0.65rem;
  background: var(--sb-card);
  padding: 0.9rem 1rem;
}

.sb-item-row[data-unassigned="true"] {
  border-left: 3px solid var(--sb-accent);
}

.sb-item-row[data-free="true"] {
  border-style: dashed;
}

.sb-finetune {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--sb-line);
}

@media (prefers-reduced-motion: reduce) {
```

- [ ] **Step 4: Add `splitItemEvenly` and `resetItemToEqual` to `page.tsx`**

Find the end of `updatePercentage` (right before `calculateSplit`):

```ts
      return { ...item, percentages };
    });
  };

  const calculateSplit = () => {
```

Replace with:

```ts
      return { ...item, percentages };
    });
  };

  const splitItemEvenly = (itemIndex: number) => {
    updateReceiptItem(itemIndex, (item) => {
      const names = people.map((person) => person.name);
      const equal = names.length ? 100 / names.length : 0;
      const percentages: Record<string, number> = {};
      names.forEach((name) => {
        percentages[name] = equal;
      });
      return { ...item, assignedTo: names, percentages };
    });
  };

  const resetItemToEqual = (itemIndex: number) => {
    updateReceiptItem(itemIndex, (item) => {
      const unique = Array.from(new Set(item.assignedTo ?? []));
      if (!unique.length) return item;
      const equal = 100 / unique.length;
      const percentages = { ...item.percentages };
      unique.forEach((name) => {
        percentages[name] = equal;
      });
      return { ...item, percentages };
    });
  };

  const calculateSplit = () => {
```

- [ ] **Step 5: Remove the `assignmentModalIndex` state**

Find:

```ts
  const [people, setPeople] = useState<Person[]>([]);
  const [personInput, setPersonInput] = useState("");
  const [assignmentModalIndex, setAssignmentModalIndex] = useState<number | null>(
    null
  );
  const [results, setResults] = useState<PersonShare[] | null>(null);
```

Replace with:

```ts
  const [people, setPeople] = useState<Person[]>([]);
  const [personInput, setPersonInput] = useState("");
  const [results, setResults] = useState<PersonShare[] | null>(null);
```

Find (inside `handleResetUpload`):

```ts
    setPeople([]);
    setAssignmentModalIndex(null);
    setCurrentStep("upload");
```

Replace with:

```ts
    setPeople([]);
    setCurrentStep("upload");
```

- [ ] **Step 6: Replace the item-list buttons with `ItemAssignRow`, update imports**

Find the import block:

```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
import { AssignmentModal } from "./AssignmentModal";
import { CropModal } from "./CropModal";
```

Replace with:

```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
import { CropModal } from "./CropModal";
import { ItemAssignRow } from "./ItemAssignRow";
```

Find the items column inside the assignment section:

```tsx
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Items
              </p>
              {currentReceipt.items.map((item, index) => {
                const unique = Array.from(new Set(item.assignedTo ?? []));
                const totalPercentage = unique.reduce(
                  (sum, name) => sum + (item.percentages?.[name] || 0),
                  0
                );
                const isFree = !itemRequiresAssignment(item);
                return (
                  <button
                    key={`${item.name}-${index}`}
                    onClick={() => setAssignmentModalIndex(index)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-4 text-left transition-colors",
                      unique.length
                        ? "border-[var(--sb-accent)] bg-[rgba(196,92,38,0.05)]"
                        : isFree
                          ? "border-dashed border-[var(--sb-line)] bg-white hover:border-[var(--sb-accent)]"
                          : "border-[var(--sb-line)] bg-white hover:border-[var(--sb-accent)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--sb-ink)]">
                          {item.name}
                        </p>
                        {item.translatedName && (
                          <p className="text-xs text-[var(--sb-slate)]">
                            {item.translatedName}
                          </p>
                        )}
                        <p className="text-sm text-[var(--sb-slate)]">
                          {unique.length
                            ? `Assigned to ${unique.join(", ")}`
                            : isFree
                              ? "Optional — free item"
                              : "Tap to assign"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="sb-amount font-medium text-[var(--sb-ink)]">
                          {formatCurrency(item.total, currentReceipt.currency)}
                        </p>
                        {unique.length > 0 && (
                          <p className="text-xs font-medium text-[var(--sb-accent)]">
                            {totalPercentage.toFixed(1)}% assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
```

Replace with:

```tsx
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Items
              </p>
              {currentReceipt.items.map((item, index) => (
                <ItemAssignRow
                  key={`${item.name}-${index}`}
                  item={item}
                  people={people}
                  currency={currentReceipt.currency}
                  requiresAssignment={itemRequiresAssignment(item)}
                  onTogglePerson={(personName) => toggleAssignment(index, personName)}
                  onSplitAll={() => splitItemEvenly(index)}
                  onChangePercentage={(personName, value) =>
                    updatePercentage(index, personName, value)
                  }
                  onResetEqual={() => resetItemToEqual(index)}
                />
              ))}
            </div>
```

- [ ] **Step 7: Remove the `AssignmentModal` usage at the bottom of `page.tsx`**

Find:

```tsx
      <AiConfigModal
        open={showConfigModal}
        initialConfig={openAiConfig}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
      />

      {assignmentModalIndex !== null &&
        currentReceipt &&
        currentReceipt.items[assignmentModalIndex] && (
          <AssignmentModal
            item={currentReceipt.items[assignmentModalIndex]}
            people={people}
            currency={currentReceipt.currency}
            onClose={() => setAssignmentModalIndex(null)}
            onTogglePerson={(personName) =>
              toggleAssignment(assignmentModalIndex, personName)
            }
            onChangePercentage={(personName, value) =>
              updatePercentage(assignmentModalIndex, personName, value)
            }
          />
        )}

      {loadingState && (
```

Replace with:

```tsx
      <AiConfigModal
        open={showConfigModal}
        initialConfig={openAiConfig}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
      />

      {loadingState && (
```

- [ ] **Step 8: Delete the old modal file**

```bash
rm src/app/tools/splitbill/AssignmentModal.tsx
```

- [ ] **Step 9: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors (in particular, no "unused variable" issues around `cn`/`AssignmentModal` since both were fully removed from `page.tsx`).

- [ ] **Step 10: Verify in the browser**

Run: `npm run dev`, walk through Upload → Review → People → Assignment (still 5 steps at this point — the merge happens in Task 4). In Assignment, confirm: tapping a person chip toggles them onto an item with no modal opening; tapping a second chip auto-splits 50/50; `⚡ all` assigns everyone evenly; `···` expands the fine-tune row with number inputs and a working "Reset to equal"; free (0-priced) items default to a collapsed "tap to track" link.
Expected: all of the above works with no console errors.

- [ ] **Step 11: Commit**

```bash
git add src/app/tools/splitbill/PersonChip.tsx src/app/tools/splitbill/ItemAssignRow.tsx src/app/tools/splitbill/splitbill.css src/app/tools/splitbill/page.tsx
git rm src/app/tools/splitbill/AssignmentModal.tsx
git commit -m "Replace Bill Splitter's assignment modal with inline chip rows."
```

---

### Task 3: Running totals — sticky bar (mobile) / sidebar (desktop)

**Files:**
- Create: `src/app/tools/splitbill/AssignmentTotals.tsx`
- Modify: `src/app/tools/splitbill/splitbill.css`
- Modify: `src/app/tools/splitbill/page.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from `./format`; existing `page.tsx` memo `assignmentSummary: { name: string; color: string; subtotal: number; count: number }[]` (unchanged) and `calculateSplit(): void` (unchanged).
- Produces: `AssignmentTotals` component — props `{ summary: { name: string; color: string; subtotal: number; count: number }[]; currency: string; onCalculate: () => void; calculateDisabled: boolean; blockedMessage?: string }`.

- [ ] **Step 1: Create `AssignmentTotals.tsx`**

```tsx
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

      <div className="sb-totals-bar -mx-6 flex items-center gap-3 border-t border-[var(--sb-line)] bg-[var(--sb-card)] px-6 py-3 lg:hidden">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 overflow-x-auto"
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
```

- [ ] **Step 2: Add the sticky bar CSS**

In `splitbill.css`, find:

```css
.sb-finetune {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--sb-line);
}

@media (prefers-reduced-motion: reduce) {
```

Replace with:

```css
.sb-finetune {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--sb-line);
}

.sb-totals-bar {
  position: sticky;
  bottom: 0;
  z-index: 30;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}

@media (prefers-reduced-motion: reduce) {
```

- [ ] **Step 3: Wire it into `page.tsx`**

Find the import for `ItemAssignRow`:

```ts
import { ItemAssignRow } from "./ItemAssignRow";
```

Replace with:

```ts
import { AssignmentTotals } from "./AssignmentTotals";
import { ItemAssignRow } from "./ItemAssignRow";
```

Find the assignment section's grid (items column + running-totals column):

```tsx
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Items
              </p>
              {currentReceipt.items.map((item, index) => (
                <ItemAssignRow
                  key={`${item.name}-${index}`}
                  item={item}
                  people={people}
                  currency={currentReceipt.currency}
                  requiresAssignment={itemRequiresAssignment(item)}
                  onTogglePerson={(personName) => toggleAssignment(index, personName)}
                  onSplitAll={() => splitItemEvenly(index)}
                  onChangePercentage={(personName, value) =>
                    updatePercentage(index, personName, value)
                  }
                  onResetEqual={() => resetItemToEqual(index)}
                />
              ))}
            </div>

            <div className="space-y-4 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Running totals
              </p>
              {assignmentSummary.length ? (
                assignmentSummary.map((summary) => (
                  <div
                    key={summary.name}
                    className="flex items-center justify-between rounded-md border border-[var(--sb-line)] bg-white p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--sb-ink)]">
                        {summary.name}
                      </p>
                      <p className="text-xs text-[var(--sb-slate)]">
                        {summary.count} item{summary.count === 1 ? "" : "s"} assigned
                      </p>
                    </div>
                    <p className="sb-amount font-medium text-[var(--sb-accent)]">
                      {formatCurrency(summary.subtotal, currentReceipt.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--sb-slate)]">
                  Assign at least one item to each person.
                </p>
              )}
              <Button
                onClick={calculateSplit}
                className="w-full"
                disabled={people.length === 0 || hasUnassignedPricedItems}
              >
                Calculate split
              </Button>
              {hasUnassignedPricedItems && (
                <p className="text-xs text-[var(--sb-slate)]">
                  Assign all priced items to continue. Free (0) items can stay unassigned.
                </p>
              )}
            </div>
          </div>
```

Replace with:

```tsx
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Items
              </p>
              {currentReceipt.items.map((item, index) => (
                <ItemAssignRow
                  key={`${item.name}-${index}`}
                  item={item}
                  people={people}
                  currency={currentReceipt.currency}
                  requiresAssignment={itemRequiresAssignment(item)}
                  onTogglePerson={(personName) => toggleAssignment(index, personName)}
                  onSplitAll={() => splitItemEvenly(index)}
                  onChangePercentage={(personName, value) =>
                    updatePercentage(index, personName, value)
                  }
                  onResetEqual={() => resetItemToEqual(index)}
                />
              ))}
            </div>

            <AssignmentTotals
              summary={assignmentSummary}
              currency={currentReceipt.currency}
              onCalculate={calculateSplit}
              calculateDisabled={people.length === 0 || hasUnassignedPricedItems}
              blockedMessage={
                hasUnassignedPricedItems
                  ? "Assign all priced items to continue. Free (0) items can stay unassigned."
                  : undefined
              }
            />
          </div>
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, open the Assignment step at a narrow (mobile) viewport width: confirm a sticky bar with per-person avatars pins to the bottom, updates live as you tap chips, and tapping it opens a bottom sheet with the full breakdown plus a working "Calculate split" button. Widen to a desktop viewport: confirm the sticky bar disappears and a persistent sidebar with the same data shows instead.
Expected: both renderings work, no layout overlap with the item list.

- [ ] **Step 6: Commit**

```bash
git add src/app/tools/splitbill/AssignmentTotals.tsx src/app/tools/splitbill/splitbill.css src/app/tools/splitbill/page.tsx
git commit -m "Add sticky running-totals bar/sidebar to Bill Splitter's assignment step."
```

---

### Task 4: Merge Upload/Review/People into one Setup step (5 steps → 3)

**Files:**
- Modify: `src/app/tools/splitbill/types.ts`
- Create: `src/app/tools/splitbill/SetupStep.tsx`
- Modify: `src/app/tools/splitbill/page.tsx`

**Interfaces:**
- Consumes: existing `page.tsx` state/handlers `selectedFile`, `previewUrl`, `hasCroppedImage`, `isAnalyzing`, `currentReceipt`, `ocrMeta`, `people`, `personInput`, `handleFileDrop`, `handleResetUpload`, `handleResetCrop`, `analyzeReceipt`, `setCurrentReceipt`, `setPersonInput`, `handleAddPerson`, `handleRemovePerson` (all unchanged); new `handleOpenCrop(): void` added in this task.
- Produces: `Step = "setup" | "assign" | "results"` (was 5 values). `SetupStep` component — props listed in Step 2 below.

- [ ] **Step 1: Shrink the `Step` union**

In `types.ts`, find:

```ts
export type Step = "upload" | "review" | "people" | "assignment" | "results";
```

Replace with:

```ts
export type Step = "setup" | "assign" | "results";
```

- [ ] **Step 2: Create `SetupStep.tsx`**

```tsx
"use client";

import { useRef } from "react";
import Image from "next/image";
import { FileImage, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatCurrency } from "./format";
import type { Person, ReceiptData } from "./types";

type SetupStepProps = {
  selectedFile: File | null;
  previewUrl: string | null;
  hasCroppedImage: boolean;
  isAnalyzing: boolean;
  onFileDrop: (files: FileList | null) => void;
  onResetUpload: () => void;
  onOpenCrop: () => void;
  onResetCrop: () => void;
  onAnalyze: () => void;

  currentReceipt: ReceiptData | null;
  ocrMeta: { method: string } | null;
  onUpdateReceipt: (receipt: ReceiptData) => void;

  people: Person[];
  personInput: string;
  onPersonInputChange: (value: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (name: string) => void;

  onContinue: () => void;
};

export function SetupStep({
  selectedFile,
  previewUrl,
  hasCroppedImage,
  isAnalyzing,
  onFileDrop,
  onResetUpload,
  onOpenCrop,
  onResetCrop,
  onAnalyze,
  currentReceipt,
  ocrMeta,
  onUpdateReceipt,
  people,
  personInput,
  onPersonInputChange,
  onAddPerson,
  onRemovePerson,
  onContinue,
}: SetupStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="sb-card space-y-6 p-6">
      <header className="space-y-1">
        <h2 className="sb-heading text-lg">Upload &amp; set up</h2>
        <p className="text-sm text-[var(--sb-slate)]">
          Add a receipt, confirm the totals, then list who&apos;s splitting.
        </p>
      </header>

      <div
        className="sb-dropzone cursor-pointer"
        data-has-file={Boolean(selectedFile)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFileDrop(e.dataTransfer.files);
        }}
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button")) return;
          fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            onFileDrop(event.target.files);
            if (event.target) event.target.value = "";
          }}
        />
        {previewUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-xl">
              <Image
                src={previewUrl}
                alt="Receipt preview"
                fill
                sizes="(max-width: 768px) 90vw, 480px"
                className="rounded-lg border border-[var(--sb-line)] bg-white object-contain"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onResetUpload();
                }}
              >
                Remove
              </Button>
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCrop();
                }}
              >
                Crop receipt
              </Button>
              {hasCroppedImage && (
                <Button
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResetCrop();
                  }}
                >
                  Reset crop
                </Button>
              )}
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onAnalyze();
                }}
                disabled={!selectedFile || isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing
                  </span>
                ) : (
                  "Analyze receipt"
                )}
              </Button>
            </div>
            <p className="w-full text-center text-xs text-[var(--sb-slate)]">
              {hasCroppedImage
                ? "Using the cropped image. Re-open Crop to adjust."
                : "Tip: crop to the receipt text to improve accuracy."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <FileImage className="mx-auto h-12 w-12 text-[var(--sb-slate)] opacity-60" />
            <p className="sb-heading text-lg">Drop your receipt here</p>
            <p className="text-sm text-[var(--sb-slate)]">
              Supports JPG, PNG, and HEIC. Nothing is uploaded to a server.
            </p>
            <Button
              className="mt-2"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse files
            </Button>
          </div>
        )}
      </div>

      {currentReceipt && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Merchant
              </p>
              <p className="sb-heading text-xl">
                {currentReceipt.restaurant || "Restaurant name not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.address || "Address not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.date || "Date not detected"}
              </p>
              {ocrMeta && (
                <p className="text-xs text-[var(--sb-slate)]">
                  Parsed via {ocrMeta.method}
                </p>
              )}

              <div className="space-y-3 border-t border-[var(--sb-line)] pt-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="currency"
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                    >
                      Currency
                    </Label>
                    <Input
                      id="currency"
                      value={currentReceipt.currency}
                      onChange={(e) =>
                        onUpdateReceipt({
                          ...currentReceipt,
                          currency: e.target.value.toUpperCase(),
                        })
                      }
                      className="font-mono"
                      placeholder="IDR, USD..."
                    />
                  </div>
                  {currentReceipt.currency !== "IDR" && (
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="exchangeRate"
                        className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                      >
                        Rate to IDR
                      </Label>
                      <Input
                        id="exchangeRate"
                        type="number"
                        value={currentReceipt.exchangeRate}
                        onChange={(e) =>
                          onUpdateReceipt({
                            ...currentReceipt,
                            exchangeRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono"
                        placeholder="15000"
                      />
                    </div>
                  )}
                </div>
                {currentReceipt.currency !== "IDR" && (
                  <p className="text-xs text-[var(--sb-slate)]">
                    1 {currentReceipt.currency} ={" "}
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.exchangeRate)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Bill summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--sb-slate)]">Items total</span>
                  <span className="sb-amount">
                    {formatCurrency(currentReceipt.subtotal, currentReceipt.currency)}
                  </span>
                </div>
                {currentReceipt.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Service charge</span>
                    <span className="sb-amount">
                      {formatCurrency(
                        currentReceipt.serviceCharge,
                        currentReceipt.currency
                      )}
                    </span>
                  </div>
                )}
                {currentReceipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Tax</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.tax, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                {currentReceipt.extraCharges.map((charge) => (
                  <div className="flex justify-between" key={charge.name}>
                    <span className="text-[var(--sb-slate)]">{charge.name}</span>
                    <span className="sb-amount">
                      {formatCurrency(charge.amount, currentReceipt.currency)}
                    </span>
                  </div>
                ))}
                {currentReceipt.discount !== 0 && (
                  <div className="flex justify-between font-medium text-[var(--sb-accent)]">
                    <span>Discount</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.discount, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-[var(--sb-line)] pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="sb-amount text-[var(--sb-accent)]">
                    {formatCurrency(currentReceipt.total, currentReceipt.currency)}
                  </span>
                </div>
                {!currentReceipt.isValid && (
                  <p className="rounded-md border border-[var(--sb-accent)] bg-[rgba(196,92,38,0.06)] px-3 py-2 text-xs text-[var(--sb-ink)]">
                    Totals don&apos;t reconcile exactly. Double-check the numbers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--sb-line)] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
              Line items
            </p>
            <div className="space-y-2">
              {currentReceipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-md border border-[var(--sb-line)] bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--sb-ink)]">{item.name}</p>
                    {item.translatedName && (
                      <p className="mt-0.5 text-sm text-[var(--sb-slate)]">
                        {item.translatedName}
                      </p>
                    )}
                    <p className="text-xs text-[var(--sb-slate)]">
                      {item.total === 0 ? "Free / note" : `item #${index + 1}`}
                    </p>
                  </div>
                  <p className="sb-amount font-medium text-[var(--sb-ink)]">
                    {formatCurrency(item.total, currentReceipt.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--sb-line)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
              Add people
            </p>
            <p className="mt-1 text-sm text-[var(--sb-slate)]">
              Everyone listed receives an itemized share.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-4 md:col-span-2">
                <Label htmlFor="personName" className="text-sm font-medium">
                  Person name
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="personName"
                    placeholder="e.g. Alice, Bob..."
                    value={personInput}
                    onChange={(e) => onPersonInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddPerson();
                      }
                    }}
                  />
                  <Button onClick={onAddPerson} className="whitespace-nowrap">
                    Add person
                  </Button>
                </div>
                <p className="text-xs text-[var(--sb-slate)]">
                  Press Enter to add quickly.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--sb-line)] p-4 text-sm text-[var(--sb-slate)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Headcount
                </p>
                <p>
                  <strong className="sb-amount text-[var(--sb-ink)]">
                    {people.length}
                  </strong>{" "}
                  {people.length === 1 ? "person" : "people"} added.
                </p>
                <p>Each receives a fair-share summary.</p>
              </div>
            </div>

            {people.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {people.map((person) => (
                  <span
                    key={person.name}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--sb-line)] px-4 py-1.5 text-sm font-medium text-[var(--sb-ink)]"
                    style={{ backgroundColor: `${person.color}1a` }}
                  >
                    {person.name}
                    <button
                      className="text-xs opacity-70 hover:opacity-100"
                      onClick={() => onRemovePerson(person.name)}
                      aria-label={`Remove ${person.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--sb-slate)]">No one added yet.</p>
            )}
          </div>

          <div className="sb-totals-bar -mx-6 flex justify-end border-t border-[var(--sb-line)] bg-[var(--sb-card)] px-6 py-3">
            <Button onClick={onContinue} disabled={people.length === 0}>
              Continue to Assign
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Update `page.tsx` imports**

Find:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FileImage, Loader2, Settings, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
import { CropModal } from "./CropModal";
import { AssignmentTotals } from "./AssignmentTotals";
import { ItemAssignRow } from "./ItemAssignRow";
```

Replace with:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Settings, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
import { CropModal } from "./CropModal";
import { AssignmentTotals } from "./AssignmentTotals";
import { ItemAssignRow } from "./ItemAssignRow";
import { SetupStep } from "./SetupStep";
```

- [ ] **Step 4: Update `STEP_ORDER` / `STEP_META`**

Find:

```ts
const STEP_ORDER: Step[] = ["upload", "review", "people", "assignment", "results"];

const STEP_META: Record<Step, { label: string; description: string }> = {
  upload: { label: "Upload", description: "Add a receipt photo" },
  review: { label: "Review", description: "Check the parsed items" },
  people: { label: "People", description: "List who is splitting" },
  assignment: { label: "Assign", description: "Match items to people" },
  results: { label: "Results", description: "Per-person totals" },
};
```

Replace with:

```ts
const STEP_ORDER: Step[] = ["setup", "assign", "results"];

const STEP_META: Record<Step, { label: string; description: string }> = {
  setup: { label: "Setup", description: "Upload, review, add people" },
  assign: { label: "Assign", description: "Match items to people" },
  results: { label: "Results", description: "Per-person totals" },
};
```

- [ ] **Step 5: Update initial state, remove `fileInputRef`**

Find:

```ts
  const [currentStep, setCurrentStep] = useState<Step>("upload");
```

Replace with:

```ts
  const [currentStep, setCurrentStep] = useState<Step>("setup");
```

Find:

```ts
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Replace with:

```ts
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
```

- [ ] **Step 6: Add `handleOpenCrop`**

Find:

```ts
  const handleResetCrop = () => {
    if (!originalFile) return;
    setSelectedFile(originalFile);
    setHasCroppedImage(false);
    setShowCropModal(false);
  };
```

Replace with:

```ts
  const handleResetCrop = () => {
    if (!originalFile) return;
    setSelectedFile(originalFile);
    setHasCroppedImage(false);
    setShowCropModal(false);
  };

  const handleOpenCrop = () => {
    if (!previewUrl || !selectedFile) {
      setErrorMessage("Upload a receipt before cropping.");
      return;
    }
    setShowCropModal(true);
  };
```

- [ ] **Step 7: Fix `handleResetUpload`'s step reset**

Find:

```ts
    setPeople([]);
    setCurrentStep("upload");
    setTokenUsage(null);
  }, []);
```

Replace with:

```ts
    setPeople([]);
    setCurrentStep("setup");
    setTokenUsage(null);
  }, []);
```

- [ ] **Step 8: Drop the post-analyze step jump**

Find:

```ts
      setCurrentReceipt(receipt);
      setTokenUsage(usage);
      setOcrMeta({ method: "OpenAI-compatible" });
      setCurrentStep("review");
    } catch (error) {
```

Replace with:

```ts
      setCurrentReceipt(receipt);
      setTokenUsage(usage);
      setOcrMeta({ method: "OpenAI-compatible" });
    } catch (error) {
```

- [ ] **Step 9: Fix `calculateSplit`'s step redirects and copy**

Find:

```ts
    if (people.length === 0) {
      setErrorMessage("Add at least one person before splitting.");
      setCurrentStep("people");
      return;
    }
```

Replace with:

```ts
    if (people.length === 0) {
      setErrorMessage("Add at least one person before splitting.");
      setCurrentStep("setup");
      return;
    }
```

Find:

```ts
    if (unassignedPriced.length) {
      setErrorMessage(
        "Assign every priced item before calculating. Free (0) items can stay unassigned."
      );
      setCurrentStep("assignment");
      return;
    }
```

Replace with:

```ts
    if (unassignedPriced.length) {
      setErrorMessage(
        "Assign every priced item before calculating. Free (0) items can stay unassigned."
      );
      setCurrentStep("assign");
      return;
    }
```

Find:

```ts
    if (invalidPercentages.length) {
      setErrorMessage("Some items do not add up to 100%. Adjust the sliders.");
      setCurrentStep("assignment");
      return;
    }
```

Replace with:

```ts
    if (invalidPercentages.length) {
      setErrorMessage(
        "Some items do not add up to 100%. Open the ··· fine-tune panel to adjust."
      );
      setCurrentStep("assign");
      return;
    }
```

- [ ] **Step 10: Fix `canNavigateToStep`**

Find:

```ts
  const canNavigateToStep = (step: Step) => {
    if (step === "upload") return true;
    if (step === "review" || step === "people") {
      return Boolean(currentReceipt);
    }
    if (step === "assignment") {
      return Boolean(currentReceipt && people.length > 0);
    }
    if (step === "results") {
      return Boolean(results && currentReceipt);
    }
    return false;
  };
```

Replace with:

```ts
  const canNavigateToStep = (step: Step) => {
    if (step === "setup") return true;
    if (step === "assign") {
      return Boolean(currentReceipt && people.length > 0);
    }
    if (step === "results") {
      return Boolean(results && currentReceipt);
    }
    return false;
  };
```

- [ ] **Step 11: Replace the Upload/Review/People sections with `<SetupStep />`**

Find the entire block starting at `{showSection("upload") && (` and ending at the People section's closing `)}` (this spans the Upload, Review, and People sections):

```tsx
      {showSection("upload") && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Upload receipt</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Drag and drop a photo or browse. Files stay in your browser.
            </p>
          </header>

          <div
            className="sb-dropzone cursor-pointer"
            data-has-file={Boolean(selectedFile)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleFileDrop(e.dataTransfer.files);
            }}
            onClick={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("button")) return;
              fileInputRef.current?.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                handleFileDrop(event.target.files);
                if (event.target) event.target.value = "";
              }}
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative mx-auto aspect-[3/4] w-full max-w-xl">
                  <Image
                    src={previewUrl}
                    alt="Receipt preview"
                    fill
                    sizes="(max-width: 768px) 90vw, 480px"
                    className="rounded-lg border border-[var(--sb-line)] bg-white object-contain"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleResetUpload();
                    }}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!previewUrl || !selectedFile) {
                        setErrorMessage("Upload a receipt before cropping.");
                        return;
                      }
                      setShowCropModal(true);
                    }}
                  >
                    Crop receipt
                  </Button>
                  {hasCroppedImage && (
                    <Button
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleResetCrop();
                      }}
                    >
                      Reset crop
                    </Button>
                  )}
                  <Button
                    onClick={(event) => {
                      event.stopPropagation();
                      analyzeReceipt();
                    }}
                    disabled={!selectedFile || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing
                      </span>
                    ) : (
                      "Analyze receipt"
                    )}
                  </Button>
                </div>
                <p className="w-full text-center text-xs text-[var(--sb-slate)]">
                  {hasCroppedImage
                    ? "Using the cropped image. Re-open Crop to adjust."
                    : "Tip: crop to the receipt text to improve accuracy."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <FileImage className="mx-auto h-12 w-12 text-[var(--sb-slate)] opacity-60" />
                <p className="sb-heading text-lg">Drop your receipt here</p>
                <p className="text-sm text-[var(--sb-slate)]">
                  Supports JPG, PNG, and HEIC. Nothing is uploaded to a server.
                </p>
                <Button
                  className="mt-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse files
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {showSection("review") && currentReceipt && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Review the parsed receipt</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Confirm the merchant details and totals before splitting.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Merchant
              </p>
              <p className="sb-heading text-xl">
                {currentReceipt.restaurant || "Restaurant name not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.address || "Address not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.date || "Date not detected"}
              </p>
              {ocrMeta && (
                <p className="text-xs text-[var(--sb-slate)]">
                  Parsed via {ocrMeta.method}
                </p>
              )}

              <div className="space-y-3 border-t border-[var(--sb-line)] pt-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="currency"
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                    >
                      Currency
                    </Label>
                    <Input
                      id="currency"
                      value={currentReceipt.currency}
                      onChange={(e) =>
                        setCurrentReceipt({
                          ...currentReceipt,
                          currency: e.target.value.toUpperCase(),
                        })
                      }
                      className="font-mono"
                      placeholder="IDR, USD..."
                    />
                  </div>
                  {currentReceipt.currency !== "IDR" && (
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="exchangeRate"
                        className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                      >
                        Rate to IDR
                      </Label>
                      <Input
                        id="exchangeRate"
                        type="number"
                        value={currentReceipt.exchangeRate}
                        onChange={(e) =>
                          setCurrentReceipt({
                            ...currentReceipt,
                            exchangeRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono"
                        placeholder="15000"
                      />
                    </div>
                  )}
                </div>
                {currentReceipt.currency !== "IDR" && (
                  <p className="text-xs text-[var(--sb-slate)]">
                    1 {currentReceipt.currency} ={" "}
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.exchangeRate)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Bill summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--sb-slate)]">Items total</span>
                  <span className="sb-amount">
                    {formatCurrency(currentReceipt.subtotal, currentReceipt.currency)}
                  </span>
                </div>
                {currentReceipt.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Service charge</span>
                    <span className="sb-amount">
                      {formatCurrency(
                        currentReceipt.serviceCharge,
                        currentReceipt.currency
                      )}
                    </span>
                  </div>
                )}
                {currentReceipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Tax</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.tax, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                {currentReceipt.extraCharges.map((charge) => (
                  <div className="flex justify-between" key={charge.name}>
                    <span className="text-[var(--sb-slate)]">{charge.name}</span>
                    <span className="sb-amount">
                      {formatCurrency(charge.amount, currentReceipt.currency)}
                    </span>
                  </div>
                ))}
                {currentReceipt.discount !== 0 && (
                  <div className="flex justify-between font-medium text-[var(--sb-accent)]">
                    <span>Discount</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.discount, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-[var(--sb-line)] pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="sb-amount text-[var(--sb-accent)]">
                    {formatCurrency(currentReceipt.total, currentReceipt.currency)}
                  </span>
                </div>
                {!currentReceipt.isValid && (
                  <p className="rounded-md border border-[var(--sb-accent)] bg-[rgba(196,92,38,0.06)] px-3 py-2 text-xs text-[var(--sb-ink)]">
                    Totals don&apos;t reconcile exactly. Double-check the numbers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--sb-line)] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
              Line items
            </p>
            <div className="space-y-2">
              {currentReceipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-md border border-[var(--sb-line)] bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--sb-ink)]">{item.name}</p>
                    {item.translatedName && (
                      <p className="mt-0.5 text-sm text-[var(--sb-slate)]">
                        {item.translatedName}
                      </p>
                    )}
                    <p className="text-xs text-[var(--sb-slate)]">
                      {item.total === 0
                        ? "Free / note"
                        : `item #${index + 1}`}
                    </p>
                  </div>
                  <p className="sb-amount font-medium text-[var(--sb-ink)]">
                    {formatCurrency(item.total, currentReceipt.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep("people")}>Continue</Button>
            </div>
          </div>
        </section>
      )}

      {showSection("people") && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Add people</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Everyone listed receives an itemized share.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <Label htmlFor="personName" className="text-sm font-medium">
                Person name
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="personName"
                  placeholder="e.g. Alice, Bob..."
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPerson();
                    }
                  }}
                />
                <Button onClick={handleAddPerson} className="whitespace-nowrap">
                  Add person
                </Button>
              </div>
              <p className="text-xs text-[var(--sb-slate)]">
                Press Enter to add quickly.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-[var(--sb-line)] p-4 text-sm text-[var(--sb-slate)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Headcount
              </p>
              <p>
                <strong className="sb-amount text-[var(--sb-ink)]">
                  {people.length}
                </strong>{" "}
                {people.length === 1 ? "person" : "people"} added.
              </p>
              <p>Each receives a fair-share summary.</p>
            </div>
          </div>

          {people.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {people.map((person) => (
                <span
                  key={person.name}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--sb-line)] px-4 py-1.5 text-sm font-medium text-[var(--sb-ink)]"
                  style={{ backgroundColor: `${person.color}1a` }}
                >
                  {person.name}
                  <button
                    className="text-xs opacity-70 hover:opacity-100"
                    onClick={() => handleRemovePerson(person.name)}
                    aria-label={`Remove ${person.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--sb-slate)]">No one added yet.</p>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep("review")}>
              Back to review
            </Button>
            <Button
              onClick={() => setCurrentStep("assignment")}
              disabled={people.length === 0}
            >
              Go to assignment
            </Button>
          </div>
        </section>
      )}
```

Replace with:

```tsx
      {showSection("setup") && (
        <SetupStep
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          hasCroppedImage={hasCroppedImage}
          isAnalyzing={isAnalyzing}
          onFileDrop={handleFileDrop}
          onResetUpload={handleResetUpload}
          onOpenCrop={handleOpenCrop}
          onResetCrop={handleResetCrop}
          onAnalyze={analyzeReceipt}
          currentReceipt={currentReceipt}
          ocrMeta={ocrMeta}
          onUpdateReceipt={setCurrentReceipt}
          people={people}
          personInput={personInput}
          onPersonInputChange={setPersonInput}
          onAddPerson={handleAddPerson}
          onRemovePerson={handleRemovePerson}
          onContinue={() => setCurrentStep("assign")}
        />
      )}
```

- [ ] **Step 12: Fix the Assign section's opening condition and back button**

Find:

```tsx
      {showSection("assignment") && currentReceipt && people.length > 0 && (
```

Replace with:

```tsx
      {showSection("assign") && currentReceipt && people.length > 0 && (
```

Find:

```tsx
            <Button variant="outline" onClick={() => setCurrentStep("people")}>
              Back to people
            </Button>
```

Replace with:

```tsx
            <Button variant="outline" onClick={() => setCurrentStep("setup")}>
              Back to setup
            </Button>
```

- [ ] **Step 13: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors. In particular, confirm there are no leftover references to `"upload"`, `"review"`, `"people"`, or `"assignment"` as `Step` values:

Run: `grep -n '"upload"\|"review"\|"people"\|"assignment"' src/app/tools/splitbill/page.tsx`
Expected: only unrelated matches remain, e.g. the literal word "people" inside `{people.length === 1 ? "person" : "people"}`-style copy strings that aren't step names (there should be none left in `page.tsx` after this task, since that copy now lives in `SetupStep.tsx`). If any `setCurrentStep("upload"|"review"|"people"|"assignment")` call remains, fix it before proceeding.

- [ ] **Step 14: Verify in the browser (mobile viewport first, then desktop)**

Run: `npm run dev`.
Mobile viewport: upload a receipt photo, analyze it, confirm the merchant/summary card, line items, and "Add people" row all appear inline below the upload zone with no step transition; add 2+ people; confirm "Continue to Assign" is disabled until at least one person exists, then tap it and land on Assign. From Assign, tap "Back to setup" and confirm the previously entered receipt/people are still there.
Desktop viewport: repeat the same walkthrough, confirming the two-column Setup layout.
Expected: nav pills show exactly 3 steps (Setup, Assign, Results); no console errors at any point.

- [ ] **Step 15: Commit**

```bash
git add src/app/tools/splitbill/types.ts src/app/tools/splitbill/SetupStep.tsx src/app/tools/splitbill/page.tsx
git commit -m "Merge Bill Splitter's upload, review, and people steps into one setup step."
```

---

### Task 5: Final verification pass

**Files:** none (verification only; fix inline and commit only if an issue is found).

**Interfaces:** none — this task exercises the full app built by Tasks 1-4 against the spec's success criteria.

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors introduced by this change (pre-existing warnings, if any, are out of scope).

- [ ] **Step 2: Full mobile walkthrough**

Run: `npm run dev`, at a mobile viewport width (~375px):
1. Upload a real receipt photo with several line items, optionally crop, analyze it.
2. Confirm the receipt summary and line items appear inline, then add at least 4 people.
3. Continue to Assign. For a single-owner item, tap one chip — confirm it's assigned with no modal. For a shared item, tap `⚡ all` — confirm it splits evenly across everyone in one tap. For one item, open `···` and set an uneven split (e.g. 70/30 across two people) — confirm the "Remaining" indicator and "Reset to equal" both work.
4. Confirm the sticky bottom bar shows live per-person totals and that tapping it opens the full breakdown sheet.
5. Assign every remaining priced item, tap Calculate, and confirm the Results totals match hand-calculated expectations (spot check one person's total against the receipt's tax/service-charge proportions).

Expected: no modal ever opens during assignment; totals and the primary action are reachable without scrolling back up; all 5 checks pass.

- [ ] **Step 3: Full desktop walkthrough**

Repeat Step 2 at a desktop viewport width (~1280px), additionally confirming: Setup renders as two columns; the Assign step shows the running-totals sidebar persistently instead of the sticky bar; chip hover states show the person's name via the `title` tooltip.

- [ ] **Step 4: Confirm split math is untouched**

Cross-check one multi-person Results total by hand: (person's assigned item subtotal) + (service charge × their subtotal / total subtotal) + (tax × same proportion) + (any extra charges × same proportion) + (discount × same proportion). It should match the number shown in the Results card, exactly as it did before this redesign (this math was not touched in Tasks 1-4).

- [ ] **Step 5: Fix and commit, if needed**

If any check in Steps 1-4 fails, fix it directly in the relevant file from Tasks 1-4, then:

```bash
git add -A
git commit -m "Fix issues found in Bill Splitter quick-assign verification pass."
```

If everything passes, no commit is needed for this task.

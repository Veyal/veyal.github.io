# Bill Splitter Quick-Assign — Design Spec

**Date:** 2026-07-14
**Scope:** `/tools/splitbill` only — wizard structure and the item-assignment interaction
**Status:** Approved for planning

## Goal

Bill Splitter gets slow with a real group: assigning items today means opening `AssignmentModal.tsx` per item, tapping "Add" per person, and dragging sliders to balance percentages. For N items × M people this is N modal round-trips. Redesign the flow — mobile first, then desktop — so assigning is mostly one tap per item, while still supporting uneven custom splits when needed.

Target personas (in priority order): many people with a few shared items (the common restaurant case), few people with a long itemized receipt, and occasional uneven/custom splits on individual items.

## Non-goals

- No changes to AI config, OCR/analyze request flow, or the crop modal (`AiConfigModal.tsx`, `openai.ts`, `CropModal.tsx` untouched)
- No changes to split math: `calculateSplit`, `buildResultsSummary`, `shareResults`, and the proportional service-charge/tax/discount distribution are unchanged
- No "split the whole bill equally, no itemization" mode — itemized assignment stays the default and only supported mode
- No multi-select-items-then-bulk-assign, and no "assign all remaining to everyone" catch-all button — considered and explicitly declined in favor of keeping the interaction to chip-tap + the per-item `⚡ all` shortcut
- No new test runner or automated test suite (none exists in this repo; verification stays manual per `npm run dev`)

## Wizard structure: 5 steps → 3

Current: `upload → review → people → assignment → results`.

New: `setup → assign → results`.

- **Setup** merges Upload, Review, and People into one continuous scroll. Before a receipt is analyzed, the page shows only the upload zone. Once analysis succeeds, the merchant/summary card and line items (today's Review content) render below it in place, followed immediately by the "Add people" row (name input + Add button) — no step transition between reviewing the receipt and adding people. A sticky "Continue to Assign" button at the bottom enables once ≥1 person is added.
  - Desktop: two columns — left: upload thumbnail + merchant/summary card; right: line items feeding into the people-adding row.
  - The existing `!currentReceipt.isValid` reconciliation warning stays, now inline in the merged card instead of gating a step.
- **Assign** is the redesigned item-assignment screen (see below). Kept as its own step because it's the busiest screen and benefits from full width/height.
- **Results** is visually tightened but functionally unchanged from today.

`Step` union in `types.ts` becomes `"setup" | "assign" | "results"`. The step-pill nav (`STEP_ORDER`, `STEP_META`, `canNavigateToStep`) shrinks to 3 entries; the gating logic (can't reach `assign` without people, can't reach `results` without computed `results`) carries over unchanged in spirit.

## Assignment step

### Item row (replaces `AssignmentModal.tsx`)

```
🍜 Nasi Goreng                    Rp45,000
[A][B][C][D]  [⚡ all]  [···]
```

- Each person renders as a small avatar chip (initial + their existing `person.color`) inline in the item row. Tapping a chip toggles that person on/off the item immediately — no modal, no confirmation step.
- As soon as 2+ chips are active on an item, it auto-splits equally among them, reusing the existing `toggleAssignment` logic (`100 / unique.length`) unchanged.
- **`⚡ all`** — one-tap shortcut that assigns every person on the bill to that item with an equal split, for shared items (drinks, platters) without tapping each chip individually.
- **`···`** expands an inline fine-tune row (pushes the item card taller in place, not a modal) with a number input per currently-assigned person instead of a slider — typing an exact value is more reliable than dragging on a touchscreen. Shows a live "Remaining: X%" indicator and a "Reset to equal" button. This is where uneven custom splits (the third persona) happen, opt-in per item.
- Free (0-priced) items keep today's dashed "optional" styling; their chip row is collapsed by default (tap to expand if someone wants to track it), matching current `itemRequiresAssignment` behavior.
- Unassigned priced items get a left amber accent bar so they're scannable in a long list without opening anything, replacing today's border/background-only state.

Touch targets: chips are ≥44px regardless of headcount; a row wraps chips to a second line rather than shrinking below that size once there are 6+ people. Chips are real `<button>` elements with `aria-pressed` reflecting assignment state, so keyboard tab/Enter/Space and screen readers work without extra ARIA wiring.

### Sticky totals (mobile) / sidebar (desktop)

- **Mobile:** a slim bar pinned above the safe-area shows each person's avatar + running total, live-updating as chips are tapped, plus the "Calculate split" button — reachable without scrolling. Tapping the bar expands a bottom sheet with the full per-person breakdown (today's second column, repurposed as an expandable sheet). The scroll container reserves bottom padding so the bar never overlaps the last item row or an expanded fine-tune panel.
- **Desktop:** the same running-totals content renders as a persistent right-hand sidebar instead (today's existing two-column `lg:grid-cols-2` layout, restyled) — no need to hide it behind a bar when the viewport has room to show it always.

Both consume the existing `assignmentSummary` memo and `hasUnassignedPricedItems` check unchanged.

## Component changes

- Delete `AssignmentModal.tsx`. Its logic (`onTogglePerson` → `toggleAssignment`, `onChangePercentage` → `updatePercentage`) already lives in `page.tsx`; the new row component takes the same callbacks directly.
- New files: `ItemAssignRow.tsx` (chip row + `⚡ all` + inline fine-tune), `PersonChip.tsx` (shared avatar chip, used in the row and the totals bar/sidebar), `StickyTotalsBar.tsx` (mobile bottom bar + expandable sheet; renders as sidebar content on desktop breakpoints or is paired with a separate sidebar wrapper — implementation plan decides the exact split), `SetupStep.tsx` (merged upload/review/people markup extracted out of `page.tsx`).
- Existing helpers reused unchanged: `itemRequiresAssignment`, `isItemUnassigned`, `assignmentSummary`, `hasUnassignedPricedItems`, `toggleAssignment`, `updatePercentage`, `calculateSplit`.
- No changes to `ReceiptItem.assignedTo` / `ReceiptItem.percentages` shape in `types.ts` — the new UI reads/writes the same fields the modal did.

## Error handling / edge cases

- "Must sum to 100%" validation in `calculateSplit` is untouched; the inline fine-tune panel's "Remaining: X%" indicator is a UX aid pointing at the same rule, not a new validation path.
- Free items and unassigned-item warnings carry over from today's behavior (`calculateSplit` still blocks on unassigned priced items and routes back to the `assign` step with the existing error message).
- Removing a person (`handleRemovePerson`) already re-normalizes remaining percentages; unchanged.

## Testing / verification

No test runner exists in this repo. Verification is manual:

1. `npm run dev`, drive the flow at a mobile viewport width first: upload a sample receipt, let it analyze, add several people in the merged Setup step, then in Assign use chip-tap for single-owner items, `⚡ all` for a shared item, and the inline fine-tune for one uneven split — confirm the sticky bar updates live and `calculateSplit` produces correct totals.
2. Repeat at a desktop viewport width, confirming the two-column Setup layout and the sidebar (instead of sticky bar) render correctly.
3. Confirm keyboard-only chip toggling and screen-reader-announced `aria-pressed` state.

## Success criteria

1. Assigning a receipt with several shared items and 5+ people takes noticeably fewer taps than the current modal-per-item flow — no modal opens for the common single-owner or evenly-shared cases.
2. Uneven custom splits are still possible per item via the inline fine-tune row, without forcing every item through it.
3. Mobile: running totals and the primary CTA are reachable at all times without scrolling back up.
4. Setup (upload → review → add people) is a single continuous scroll with no step transition in between.
5. Split math, AI config, and crop behavior are bit-for-bit unchanged from before this redesign.

# Spec 72 — Lifetime spending: drill a category's year into its months

**Status: Complete — implemented 2026-11-15 (code only; not run on a device).**

## Why

"Spending page, lifetime tab: i can see category wise spending and if i click it it opens
and show per year spending … what i want is after clicking the category it will show the per
year spending just like the current behavior and when i click the year it will show per
month cost."

The Lifetime tab already renders category → per-year via `PeriodSpendingBreakdown.tsx`. This
adds the **second** level: year → per-month, with the per-year view kept exactly as it is.

## What

Depends on **`bikelog_server` spec 64**, which nests each lifetime year bucket's months in
its `children`. This spec is the render side.

`PeriodSpendingBreakdown.tsx` (shared by the Year and Lifetime tabs) and the
`TSpendingPeriodBucket` type in `types/spending.types.ts`:

- `TSpendingPeriodBucket` gains `children?: TSpendingPeriodBucket[] | null` (mirrors server).
- A **second expansion state**, `expandedBuckets`, keyed `"category:bucketKey"` (unique
  across categories), reset alongside the category-level `expanded` whenever the period
  changes — so a stale open month-list never survives a tab/period switch.
- A bucket row is now drill-capable **iff** it has a non-empty `children` array. When it does,
  the row becomes a `TouchableOpacity` with a trailing chevron and, when open, renders its
  months indented beneath it (a hairline left rail, `Mon · litres(fuel only) · ৳amount`).
- A bucket **without** `children` renders exactly as before — a plain, non-tappable row.

### Why this leaves the Year tab untouched

`PeriodSpendingBreakdown` is also the Year tab's view, where buckets are already months and
the server sends `children: null`. The entire second level is gated on `children` being a
non-empty array, so on the Year tab every bucket stays a plain leaf row — no behaviour change
there, by construction. Only the Lifetime tab, whose year buckets now carry month children,
gains the drill-down.

### Column alignment

The year row's trailing chevron sits in a fixed 16px slot; the month rows carry an empty slot
of the same width, so the ৳amount column stays aligned between a year and its months.

## Cascade

Server **spec 64** (the month nesting) is the matching backend change — additive, so no web
change (cascade step 3 not triggered). App + server, no web.

## Verify (not run on a device)

- V1 — Lifetime tab: tapping a category still opens its per-year rows (unchanged).
- V2 — tapping a year row now expands it to that category's months for that year, ৳ per
  month; tapping again collapses it. Chevron flips up/down.
- V3 — the Fuel category's month rows show litres; other categories' do not.
- V4 — switching tabs (Year ↔ Lifetime) or changing the year on the Year tab clears any open
  month lists; nothing stale carries over.
- V5 — **Year tab unchanged**: its month buckets have no chevron and are not tappable.
- V6 — 360dp: year rows, chevrons and indented month rows fit with the amount column aligned.
- V7 — a category+year's month totals visibly sum to the year row's total (server spec 64 V2
  guarantees this to the paisa).

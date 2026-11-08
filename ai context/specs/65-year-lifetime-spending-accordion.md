# 65 — Year & Lifetime spending accordions

**Status**: ✅ Code complete — implemented 2026-11-08. `npx tsc --noEmit` clean, `yarn lint` clean on the touched files. **Not run on a device**, and it needs **`bikelog_server` spec 61** deployed (against an older server the Year/Lifetime tabs show their error state — `/period-breakdown` 404s).
**Scope**: `bikelog_app/` only — one new component (`PeriodSpendingBreakdown.tsx`), the Year/Lifetime tab wiring in `Spending.tsx`, and types. Paired with `bikelog_server` spec 61.

---

## Request

> "In the spending page, in month tab, you show category wise data and it is accordion so when I click the category I see the category wise detail. Now I want almost similar thing in the year and lifetime tab with some changes. In year tab, you show category wise data and if I click in the category I should see per month data like, fuel show 9145.50, if I click accordion should open and it should show: Jan 3.3L 650taka. In the lifetime, when I click in a category the accordion should open and it should show: 2026: 225L 5678 taka. Now the design should be appropriate and have to similar to my project design."

## What changed

The Year and Lifetime tabs previously read `/spending-summary` (flat `SpendingSummaryView`). They now read `bikelog_server` spec 61's `/spending-summary/period-breakdown` and render the new `PeriodSpendingBreakdown` — the same total panel + per-day figure + tap-to-expand category accordion as the Month tab's `MonthlySpendingBreakdown` (spec 62), so the design matches 1:1. The difference is what a category expands to:

- **Year tab** → per-**month** rows: `Jan   3.3L   ৳650`. Months chronological Jan→Dec.
- **Lifetime tab** → per-**year** rows: `2026   225L   ৳5678`. Years newest-first.

Litres show on the **Fuel** category only (the server sends `liters: null` for every other category, and the row renders an empty litres column for those).

## Implementation notes

- `PeriodSpendingBreakdown.tsx` is a near-clone of `MonthlySpendingBreakdown.tsx` — same panel/kicker/bar/swatch styling — but the accordion body maps `category.buckets` (label · litres · amount) instead of `category.records`. Bucket labels are pre-formatted server-side, so the component renders them raw (no `date-fns` parsing). A small `formatLiters` trims trailing zeros (`3.3L`, `225L`).
- `avgDailyScopeLabel` prop ("this year" / "of ownership") so the per-day hint reads correctly on each tab; the per-day math (`getElapsedDaysInYear`, purchase-date days) is unchanged from before.
- Cache keys: `["spending", bikeId, "year-breakdown", targetYear]` and `["spending", bikeId, "lifetime-breakdown"]` — distinct from the `BikeStatStrip` summary keys but still under the `["spending", bikeId]` prefix every mutation invalidates.
- `SpendingSummaryView.tsx` is now unused by `Spending.tsx` (the Month, Year and Lifetime tabs all use their own breakdown components; Trend is inline). Left in place rather than deleted — out of scope — but it is dead code and a later cleanup spec can remove it.
- House style: defensive `?.` / `&&` throughout the new component and the touched `Spending.tsx` branches.

## Files touched

- `components/main/Spending/PeriodSpendingBreakdown.tsx` — new.
- `components/main/Spending/Spending.tsx` — `YearTab` + `LifetimeTab` rewired; unused `SpendingSummaryView` / `TSpendingSummary` imports dropped.
- `types/spending.types.ts` — `liters?` on `TSpendingRecord`; new `TSpendingPeriodBucket`, `TSpendingPeriodGroup`, `TPeriodCategoryBreakdown`.

## Verification

- **Static floor (done)**: `npx tsc --noEmit` clean; `eslint` clean on the three touched files.
- **V1 (device, pending)** Year tab: each category expands to its months with correct totals; Fuel rows show litres, others don't.
- **V2 (device, pending)** Lifetime tab: each category expands to years, newest-first, with litres on Fuel.
- **V3 (device, pending)** Category totals + the top-panel total match the Month tab / summary for the same period.
- **V4 (device, pending)** Switching year (stepper) or tab collapses open accordions (expanded state resets on `period`/`targetYear` change).
- **V5 (device, pending)** Empty period → EmptyState, no accordion.

# 62 — Monthly spending breakdown as accordions

**Status**: ✅ Code complete — implemented 2026-11-04. `npx tsc --noEmit` clean, `yarn lint` clean. **Not run on a device**, and it needs **`bikelog_server` spec 60** deployed (against an older server the Month tab shows its error state — the endpoint 404s).
**Scope**: `bikelog_app/` only — one new component (`MonthlySpendingBreakdown.tsx`), the Month tab wiring in `Spending.tsx`, and two types. Paired with `bikelog_server` spec 60.

---

## Request

> "in the spending page, in the monthly spending tab section, i see spending by category like: fuel 1230, 86.8%, Accessories 200, 13.2%. Now currently i m only seeing the category wise total spending, now i want to see category wise data + their details … it will be accordion, if i click this, then it will show the details … 12 november i add 2 L of fuel, cost 200, 18 november 3l fuel, cost 300 taka … i want this only in the monthly spending page tab, not other page's tab."

Reference (UX only, not code): `expenseTracker2`'s `components/main/MonthlyTransaction/TrendTab.tsx` — category cards that expand to their transactions.

---

## Problem

`SpendingSummaryView` renders each category as a static row (swatch · name · amount · bar · %). There is no way to see *which* logs made up a category's total without leaving the Spending screen for the Fuel / Maintenance / Accessories / Engine Oil lists and filtering by date by eye. The data behind each total already exists server-side (the `/details` endpoint has fed the PDF export since spec 23's consumer), it was just never surfaced in the breakdown.

---

## What was built

**The Month tab only.** Year, Lifetime and Trend are untouched — they keep `SpendingSummaryView` / the trend charts.

1. **`MonthlySpendingBreakdown.tsx`** (new). Same glowing **Total panel** as `SpendingSummaryView` (so the top of the Month tab is visually unchanged, including the `avgDailyExpense / day` column), then the category list rendered as **accordions**:
   - **Collapsed**: swatch · category name · total · chevron, with the thin proportional bar + `%` underneath — i.e. everything the old static row showed, plus a chevron.
   - **Expanded** (tap anywhere on the header): the category's line-item **records** — `date` (e.g. `18 Nov`, via `formatApiDate` to dodge the UTC-midnight off-by-one, H-C) · `description` (the server's pre-built line, e.g. `3L @ ৳100/L`) · `amount`, with an optional secondary line for `vendor ?? remarks` when present.
   - State is `Record<categoryName, boolean>`, **closed by default**, and **reset whenever the month changes** (a `useEffect` on `data.targetMonth`) so one month's open rows never carry into a month that may not even hold those categories — the same reasoning the reference `TrendTab` documents.

2. **`Spending.tsx` `MonthTab`** now fetches **`bikelog_server` spec 60**'s `GET /bikes/:bikeId/spending-summary/monthly-breakdown?targetMonth=…` (shape `TMonthlyCategoryBreakdown`) instead of the plain summary, and renders `MonthlySpendingBreakdown`. The empty-state and `avgDailyExpense` now read `breakdown.totalSpending`. PDF export is unchanged (still `/details`).

3. **`types/spending.types.ts`** — `TSpendingCategoryGroup` + `TMonthlyCategoryBreakdown`.

---

## Hazards / decisions

- **H-A — distinct react-query cache key.** The Month tab's key is now `["spending", bikeId, "month-breakdown", targetMonth]`, **not** `["spending", bikeId, "month", targetMonth]`. That older key is still owned by `BikeStatStrip.tsx`, which fetches the differently-shaped **summary** response; reusing it would collide two queries with one cache entry and feed one of them the wrong shape. The new key is still under the `["spending", bikeId]` prefix every mutation (fuel/maintenance/oil/accessory writes) invalidates, so the accordion refreshes on a new log exactly as the old row did.

- **H-B — no client-side grouping or arithmetic.** The server hands categories already bucketed with their records nested and summed (spec 60). The component only renders — it does not re-group a flat array, does not sum, and the `%` is the one derived figure (`total / totalSpending`), computed the same way `SpendingSummaryView` always has. Keeping the grouping server-side means the Month tab and the hub's figures share one source of truth.

- **H-C — dates via `formatApiDate`.** Record dates are date-only fields serialized at UTC midnight; `new Date(iso)` + `format` shifts them back a day in any timezone behind UTC (the bug `formatApiDate`/`parseApiDate` exist to prevent). The same fix spec 61 applied to the accessory card.

- **D1 — richer than the reference.** The reference collapses to name + entry-count + total. This keeps the existing Nocturne bar + `%` (what the developer's current design shows) *and* adds the drill-down, so collapsing a category loses nothing that is there today.

- **D2 — the kicker says `BY CATEGORY · TAP TO EXPAND`.** The accordion affordance is a single chevron; the kicker makes the interaction discoverable without a tooltip.

- **H-D — a category with no line items can't appear.** Spec 60 derives its categories from the records, so there is no empty accordion to guard against here (a zero-fuel month simply has no Fuel card, unlike the old static list which showed `Fuel ৳0`).

---

## Verification (owed — device pass)

- **V1** — Spending › Month on a month with fuel + accessories: the total panel is unchanged; categories render as cards with chevrons, ordered by total desc.
- **V2** — tapping a category expands it to that category's records (date · description · amount), newest-first; tapping again collapses it.
- **V3** — the reported example: a fuel category expanding to `12 Nov … ৳200` and `18 Nov … ৳300` style rows.
- **V4** — stepping to another month collapses all open rows.
- **V5** — a maintenance category shows its parts/notes line; an accessory category shows item names; engine oil shows the oil type.
- **V6** — an empty month shows the existing `Nothing spent in <Month>` empty state (not an empty accordion list).
- **V7** — Year / Lifetime / Trend tabs are visually and behaviourally **unchanged**.
- **V8** — pull-to-refresh and adding a fuel log both refresh the accordion totals (cache-prefix invalidation, H-A).
- **V9** — against a pre-spec-60 server the Month tab shows its error state with a working Retry (no crash).

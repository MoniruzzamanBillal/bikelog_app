# 26: Monthly Average Daily Expense

Status: ✅ Complete

## Goal

On the Spending screen's **Month** tab, show an "Avg Daily Expense" card alongside the existing "Total Spending" card, computed as `totalSpending / numberOfDays` — where `numberOfDays` is the current day-of-month when viewing the current month (e.g. 17 on Aug 17), or the full day-count of the month when viewing a fully-elapsed past month. This is purely a client-side derived stat; no backend change is involved (spec 11 already established that the `spending-summary` endpoint returns totals only, with averages always computed client-side).

## Design

### Behavior / formula

`components/main/Spending/Spending.tsx`'s `MonthTab` already tracks `targetMonth` (a `"yyyy-MM"` string, defaulting to the current month, steppable to any past/future month via the unclamped `MonthStepper`). The number of days to divide by depends on how `targetMonth` relates to today:

| Case | `numberOfDays` |
|---|---|
| `targetMonth` is the current calendar month | day-of-month of today, e.g. `17` on Aug 17, 2026 |
| `targetMonth` is a past month (fully elapsed) | total days in that month, e.g. `31` for July |
| `targetMonth` is a future month | `0` — no days have elapsed, so the card is not shown (this case is already effectively excluded upstream: a future month has no logs yet, so `summary.totalSpending` is `0` and `MonthTab` already falls into its `EmptyState` branch instead of rendering `SpendingSummaryView` at all — the `0`-day guard is a defensive backstop, not the primary gate) |

Add a colocated helper directly above `MonthTab` in `Spending.tsx` (no new `utils/date.ts` file — matches this codebase's existing pattern of inlining small date calcs at the call site rather than centralizing them):

```tsx
import { getDate, getDaysInMonth, isSameMonth, parse } from "date-fns";

function getElapsedDaysInMonth(targetMonth: string): number {
  const monthDate = parse(targetMonth, "yyyy-MM", new Date());
  const now = new Date();

  if (isSameMonth(monthDate, now)) {
    return getDate(now);
  }
  if (monthDate > now) {
    return 0;
  }
  return getDaysInMonth(monthDate);
}
```

(`date-fns` is already a project dependency — used elsewhere in this same file and in `MonthStepper.tsx`.)

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `components/main/Spending/Spending.tsx` | Modify | Add `getElapsedDaysInMonth` helper; in `MonthTab`, compute `daysElapsed = getElapsedDaysInMonth(targetMonth)` and `avgDailyExpense = daysElapsed > 0 ? (summary?.totalSpending ?? 0) / daysElapsed : 0`; pass both down to `SpendingSummaryView` only when `daysElapsed > 0`. |
| `components/main/Spending/SpendingSummaryView.tsx` | Modify | Add two new **optional** props, `avgDailyExpense?: number` and `daysElapsed?: number`. When both are provided (and `daysElapsed > 0`), render a second small card directly below the existing `totalCard`, above the `categoriesTitle`/category list. `YearTab`/`LifetimeTab` don't pass these props, so their rendering is completely unaffected — this is an additive, backward-compatible change to a shared component. |

No changes to `types/spending.types.ts` are needed — `avgDailyExpense`/`daysElapsed` are UI-derived values, not API response fields, so inline prop typing (matching this file's existing `interface SpendingSummaryViewProps`-style pattern) is sufficient and consistent with `code-standards.md`'s rule to type *API payloads* explicitly (this isn't one).

### New card markup (inside `SpendingSummaryView.tsx`)

Reuse the existing `totalCard` visual language (same `COLORS.card` background, `borderRadius: 6`, shadow) but at a visually secondary weight (smaller value font) so it doesn't compete with the primary Total Spending card:

```tsx
{avgDailyExpense !== undefined && daysElapsed !== undefined && daysElapsed > 0 && (
  <View style={styles.avgCard}>
    <Text style={styles.avgLabel}>Avg Daily Expense</Text>
    <Text style={styles.avgValue}>৳{avgDailyExpense.toFixed(2)}</Text>
    <Text style={styles.avgCaption}>
      over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
    </Text>
  </View>
)}
```

Styles to add to `SpendingSummaryView.tsx`'s `StyleSheet.create`, positioned to sit directly under `totalCard`:

```tsx
avgCard: {
  backgroundColor: COLORS.card,
  borderRadius: 6,
  padding: 16,
  alignItems: "center",
  marginBottom: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
avgLabel: {
  fontSize: 13,
  color: COLORS.textLight,
  fontWeight: "500",
},
avgValue: {
  fontSize: 20,
  fontWeight: "700",
  color: COLORS.text,
  marginTop: 4,
},
avgCaption: {
  fontSize: 12,
  color: COLORS.textLight,
  marginTop: 2,
},
```

No new color tokens needed — `utils/colors.ts` has no `COLORS.expense` token (confirmed by reading the file), and this card intentionally reuses the neutral `COLORS.card`/`COLORS.text`/`COLORS.textLight` scheme already used by `totalCard`, rather than introducing a new accent color for a single card.

### Card placement rationale

Placing the new card inside `SpendingSummaryView` (rather than as a sibling element in `MonthTab`) keeps the visual order "Total Spending → Avg Daily Expense → Category breakdown" — mirroring how the reference weekly-transactions pattern stacks its total-balance card directly above its per-day-average card, above the detail list — without having to split `SpendingSummaryView`'s single total+breakdown block across two components.

## Implementation

1. [x] In `components/main/Spending/SpendingSummaryView.tsx`: added `avgDailyExpense?: number` and `daysElapsed?: number` to `SpendingSummaryViewProps`; rendered the new `avgCard` block (guarded exactly as specced) between the existing `totalCard` View and the `categoriesTitle` Text; added the four new styles (`avgCard`, `avgLabel`, `avgValue`, `avgCaption`) to the existing `StyleSheet.create` call.
2. [x] In `components/main/Spending/Spending.tsx`: imported `getDate, getDaysInMonth, isSameMonth` from `date-fns` (alongside the existing `format, parse` import); added the `getElapsedDaysInMonth` helper function above `MonthTab`, exactly as specced; inside `MonthTab`, compute `daysElapsed` and `avgDailyExpense` from `summary` and `targetMonth`; pass both to `<SpendingSummaryView summary={summary} />` via the spec's own suggested conditional-spread form (`{...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}`) — `YearTab`/`LifetimeTab` call sites left untouched, don't pass either prop.
3. [x] Manually traced the three date-boundary cases against the implemented `getElapsedDaysInMonth` logic (no device available — reasoned through the function directly): current month (today 2026-08-17) → `isSameMonth` true → `getDate(now)` = `17`, matches the spec's own worked example; a fully-elapsed past month (July while today is in August) → `isSameMonth` false, `monthDate > now` false → `getDaysInMonth` = `31`; a future month (September) → `monthDate > now` true → `0`, and `MonthTab` only spreads the two props into `SpendingSummaryView` when `daysElapsed > 0`, so no card/no `NaN` regardless of `totalSpending`.
4. [x] Ran `expo lint` (0 issues) and `npx tsc --noEmit` (0 errors) — both clean.
5. [x] Updated `ai context/progress-tracker.md`: added a Recent Activity entry and a spec 26 row to the Spec Implementation Status table.

## Dependencies

Spec 11 (Spending Summary) must exist first — this spec extends `Spending.tsx` and `SpendingSummaryView.tsx`, both created by spec 11. No dependency on spec 25 (Remove Trend Charts) — that spec only touches the `TrendTab`/`"trend"` branch of `Spending.tsx`, which this spec doesn't modify.

## Verify

- [x] On the Month tab, viewing the **current** month with `totalSpending > 0`: `getElapsedDaysInMonth` returns `getDate(now)` (e.g. `17` on 2026-08-17) and `avgDailyExpense = summary.totalSpending / daysElapsed`, rendered as `৳{avgDailyExpense.toFixed(2)}` — code-traced correct; **not visually confirmed on-device**, no simulator/device available in this environment, same standing gap as every other spec in this project.
- [x] Stepping back to a **fully-elapsed past month** (e.g. July while today is in August): `isSameMonth` is false and `monthDate > now` is false, so the function returns `getDaysInMonth(monthDate)` (`31` for July), not today's day-of-month — code-traced correct, not visually confirmed.
- [x] Stepping forward to a **future month with no logs yet**: no average card is shown — belt-and-suspenders on two levels: `summary.totalSpending` is `0` so `MonthTab` falls into its existing `EmptyState` branch before `SpendingSummaryView` even renders, **and** `getElapsedDaysInMonth` independently returns `0` for a future month (`monthDate > now` true), so even if that upstream assumption ever changes, `MonthTab`'s `daysElapsed > 0` guard still withholds both props and `SpendingSummaryView`'s own `daysElapsed > 0` check in the JSX condition prevents a stray card or `NaN`.
- [x] The Year tab and Lifetime tab are unaffected — grep-confirmed neither `YearTab` nor `LifetimeTab` in `Spending.tsx` passes `avgDailyExpense`/`daysElapsed` to their `<SpendingSummaryView summary={summary} />` calls; both props are optional so `SpendingSummaryViewProps` stays backward-compatible. Not visually confirmed on-device.
- [x] Currency formatting matches the rest of the screen: `৳` prefix, `.toFixed(2)`, identical to `totalCard`'s existing `avgValue`/`totalValue` pattern.
- [x] No backend/API changes made; `Spending.tsx`'s `spending-summary?period=month&targetMonth=...` request URL and `TSpendingSummary` response type are both untouched — `avgDailyExpense`/`daysElapsed` are purely client-derived, never sent to or read from the API.
- [x] `expo lint` — 0 errors/warnings; `npx tsc --noEmit` — 0 errors.
- [x] `ai context/progress-tracker.md` updated with a new spec 26 row and Recent Activity entry.

# 26: Monthly Average Daily Expense

Status: ⛔ Not started

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

1. In `components/main/Spending/SpendingSummaryView.tsx`: add `avgDailyExpense?: number` and `daysElapsed?: number` to `SpendingSummaryViewProps`; render the new `avgCard` block (guarded as shown above) between the existing `totalCard` View and the `categoriesTitle` Text; add the three new styles (`avgCard`, `avgLabel`, `avgValue`, `avgCaption`) to the existing `StyleSheet.create` call.
2. In `components/main/Spending/Spending.tsx`: import `getDate, getDaysInMonth, isSameMonth` from `date-fns` (alongside the existing `format, parse` import); add the `getElapsedDaysInMonth` helper function above `MonthTab`; inside `MonthTab`, compute `daysElapsed` and `avgDailyExpense` from `summary` and `targetMonth`; pass `avgDailyExpense={avgDailyExpense}` and `daysElapsed={daysElapsed}` to the `<SpendingSummaryView summary={summary} />` call, only spreading them in when `daysElapsed > 0` (e.g. `{...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}`, or an equivalent explicit conditional — implementer's choice, as long as `YearTab`/`LifetimeTab` call sites are left untouched and don't pass these props).
3. Manually verify the three date-boundary cases (current month, a fully-elapsed past month, a future month with no data) per the Verify checklist below.
4. Run `expo lint` and `npx tsc --noEmit`; fix anything flagged.
5. Update `ai context/progress-tracker.md`: add a Recent Activity entry and a new row (`| 26 | ✅ Complete | ... |`) to the Spec Implementation Status table once verified.

## Dependencies

Spec 11 (Spending Summary) must exist first — this spec extends `Spending.tsx` and `SpendingSummaryView.tsx`, both created by spec 11. No dependency on spec 25 (Remove Trend Charts) — that spec only touches the `TrendTab`/`"trend"` branch of `Spending.tsx`, which this spec doesn't modify.

## Verify

- [ ] On the Month tab, viewing the **current** month with `totalSpending > 0`: the new card shows `daysElapsed` equal to today's day-of-month (e.g. `17` on 2026-08-17) and `avgDailyExpense` equal to `totalSpending / 17`, formatted as `৳X.XX`.
- [ ] Stepping back to a **fully-elapsed past month** (e.g. July while today is in August): the card divides by that month's total day count (`31` for July), not by today's day-of-month.
- [ ] Stepping forward to a **future month with no logs yet**: no average card is shown (this already falls into the existing `EmptyState` branch since `totalSpending` is `0`; confirm the `daysElapsed > 0` guard also prevents a stray card/`NaN` if that assumption ever changes).
- [ ] The Year tab and Lifetime tab are visually unchanged — no average-expense card appears on either, since `YearTab`/`LifetimeTab` don't pass the new optional props to `SpendingSummaryView`.
- [ ] Currency formatting matches the rest of the screen: `৳` prefix, two decimal places (`.toFixed(2)`).
- [ ] No backend/API changes made; `spending-summary` request/response shape for the Month tab is unchanged.
- [ ] `expo lint` clean (0 errors/warnings) and `npx tsc --noEmit` clean.
- [ ] `ai context/progress-tracker.md` updated with a new spec 26 row and Recent Activity entry.

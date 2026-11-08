# 63: Cost per day on the Spending Year & Lifetime tabs

Status: ✅ **Implemented 2026-11-08.** Verified to the static floor only: `npx tsc --noEmit` clean,
`npx eslint` clean on both touched files. **Not run on a device.** App-only — no backend, no web change.

Requested directly by the developer (2026-11-08):

> "in spending page, in yearly, lifetime, tab, in top section you show total spending, now can you show
> cost per day just like the monthly tab page '৳299.31 / day over 8 days this month'?"

## Problem

The Month tab's total panel shows a per-day figure (`৳299.31 / day` + `over 8 days this month`); the **Year**
and **Lifetime** tabs show only the total. The developer wants the same per-day figure on those two tabs.

## What shipped

No new UI. `SpendingSummaryView` (the view both tabs already render) **already had** the `avgDailyExpense` /
`daysElapsed` props and the per-day column — the Year/Lifetime tabs in `Spending.tsx` just never passed them.
So the change is: compute the two numbers per tab and pass them, plus make the hint's trailing phrase
period-aware.

- **Year** → `avgDailyExpense = totalSpending / daysElapsed`, where `daysElapsed` comes from a new
  `getElapsedDaysInYear(targetYear)` that mirrors the existing `getElapsedDaysInMonth`: the current year counts
  days elapsed so far (`getDayOfYear(now)`, inclusive of today), a **past** year counts its full 365/366
  (`getDaysInYear`), a **future** year counts 0 so the figure is hidden. Hint: `over N days this year`.
- **Lifetime** → day count is measured from the bike's **`purchaseDate`** to today, inclusive
  (`differenceInCalendarDays(now, parseISO(purchaseDate)) + 1`) — "cost per day of ownership". Hint:
  `over N days of ownership`. A missing or future purchase date → figure hidden.

## Why purchase date for Lifetime (D1)

Lifetime has no natural period. The developer was offered three bases (first spending record / bike purchase
date / bike added-to-app date) and **chose purchase date**. It needs no backend change — `purchaseDate` is on
the `TBike` already fetched in the `Spending` parent — and reads as a meaningful "cost of ownership per day". It
understates slightly if the bike was bought well before spending tracking began; that trade-off was accepted.
The "first spending record" basis (most accurate spending rate) was declined because it would need an additive
server field.

## Files

- **`components/main/Spending/SpendingSummaryView.tsx`** — new optional prop `avgDailyScopeLabel`
  (default `"this month"`); the hardcoded `this month` in the hint becomes `{avgDailyScopeLabel}`. Nothing else
  changes — the `showAvgDaily` guard, `avgCol`/`avgValue`/`avgHint` styles and layout are reused as-is.
- **`components/main/Spending/Spending.tsx`**:
  - new `getElapsedDaysInYear(targetYear)` beside `getElapsedDaysInMonth`;
  - `YearTab` computes `daysElapsed`/`avgDailyExpense` and passes them + `avgDailyScopeLabel="this year"`,
    spread conditionally (`daysElapsed > 0`) exactly like `MonthTab` does;
  - `LifetimeTab` gains a `purchaseDate?: string` prop, computes the ownership-day count, and passes the figures
    + `avgDailyScopeLabel="of ownership"`;
  - the parent `Spending` threads `purchaseDate={bike?.purchaseDate}` into `<LifetimeTab>`;
  - date-fns imports grow by `getDayOfYear`, `getDaysInYear`, `differenceInCalendarDays`, `parseISO`.
- `MonthlySpendingBreakdown.tsx` (the Month tab) is **untouched** — its `this month` wording is already correct.

## Decisions / hazards

- **D1** — Lifetime denominator is the bike's purchase date (see above).
- **H1 — the figure hides rather than divides by zero.** Both tabs only pass the props when `daysElapsed > 0`,
  and `SpendingSummaryView`'s existing `showAvgDaily` guard already requires `daysElapsed > 0`. A future year,
  or a missing/future purchase date, therefore shows the total alone — never `৳∞ / day` or `over 0 days`.
- **H2 — inclusive day counts, consistent with the Month tab.** The Month tab counts today as a full day
  (`getDate`); Year (`getDayOfYear`) and Lifetime (`+ 1`) match, so none of the three is off by one relative to
  the others.
- **H3 — no backend / web cascade.** The denominators are all client-derived; the server contract is unchanged,
  so `bikelog_client-web-` needs nothing (it does not render this figure on Year/Lifetime, and that is fine —
  additive, prototype-follows-app).

## Verification (device pass — owed)

- V1 Year (current year) shows `৳x / day` + `over N days this year`, N = today's day-of-year.
- V2 Year switched to a **past** year → denominator is the full 365/366 for that year.
- V3 Year switched to a **future** year → per-day figure hidden, total still shown.
- V4 Lifetime shows `৳x / day` + `over <days-since-purchase> days of ownership`; `total ÷ days` checks out by
  hand for one bike.
- V5 Month tab unchanged (`over N days this month`).
- V6 Phone-width (360dp) layout — the per-day column (`maxWidth: 45%`) does not crowd the total; already proven
  on the Month tab.

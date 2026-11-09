# Spec 67 — Spending Trend: a full calendar year (Jan→Dec)

**Status: Complete — implemented 2026-11-09 (code only; not run on a device).**

## Why

"In trend tab page, in the graph, you show only 6 month's data … here i want to show 12
month's data from january to december." A rolling window read "Dec → Nov" at mid-year, not
"Jan → Dec", so the Trend tab is re-scoped to a fixed calendar year.

## What

`TrendTab` in `components/main/Spending/Spending.tsx`:

- New `targetYear` state (default current year) + a **`YearStepper`** control row at the top
  (consistent with the Year tab; the data is now year-scoped so the stepper lets the rider
  see past years rather than being locked to the current one).
- Fetches `/spending-summary/trend?targetYear=${targetYear}` (`bikelog_server` spec 63),
  cache key `["spending","trend",bikeId,targetYear]` — still under the `["spending",bikeId]`
  prefix every mutation invalidates.
- Bar chart: 12 bars Jan→Dec (labels already `format(targetMonth,"MMM")`); `fillBarGeometry`
  stretches them to the panel width (spec 64).
- The donut's "By category" month = **the latest month in the year that has spending**
  (`monthsWithSpending[last]`), not `monthlySummary[last]`. In the current year that's the
  live month; in a past year its last active month; future all-zero months never win. The
  highlighted bar follows that same month (`latestIndex`).
- Title "Spending in {year}". If **no month in the year has spending**, the whole tab shows a
  single "Nothing spent in {year}" empty state instead of a flat all-zero chart.

## Decisions / hazards

- **D1 — "January to December" ⇒ a fixed calendar year, not a rolling 12.** The literal month
  names only hold for a calendar year; the server spec 63 `targetYear` path exists for this.
- **D2 — pie month = latest *with data*.** Picking `monthlySummary[last]` (December) would
  leave the current year's donut permanently empty until December. Filtering to spending>0
  fixes every year uniformly.
- **H1 — older server.** `?targetYear=` on a pre-spec-63 server falls through to its rolling
  default and returns a 3-month window; the tab still renders (labels just won't be Jan→Dec).
  Needs `bikelog_server` spec 63 deployed to be correct.

## Cascade

App + **server spec 63** (trend `targetYear`). **No web change** — app-only ask, and server
63 is an additive param.

## Verify (not run on a device)

- V1 — Trend shows 12 bars Jan→Dec for the current year; the stepper moves between years.
- V2 — the donut reflects the latest month-with-spending; its bar is the bright one.
- V3 — a year with no spend shows the empty state, not an all-zero chart.
- V4 — tapping a bar still shows its month's total + top category above the chart.
- V5 — 360dp: 12 bars fill the width with no right gutter and no horizontal scroll.

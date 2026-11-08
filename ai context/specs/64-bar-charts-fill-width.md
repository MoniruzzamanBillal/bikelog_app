# 64: Bar charts fill the full width (no empty gutter on the right)

Status: ✅ **Implemented 2026-11-08.** Verified to the static floor only: `npx tsc --noEmit` clean,
`npx eslint` clean on all touched files. **Not run on a device.** App-only — no backend, no web change.

Requested directly by the developer (2026-11-08):

> "in the app, in all graph the x axis data dont take the full width, the x axis is still have space in the
> right side. for example, in mileage page, in yearly tab, the x axis shows the month name and the name did not
> take full width."

## Problem

`react-native-gifted-charts`' `BarChart` lays bars out at a fixed `barWidth`/`spacing` and does **not** stretch
them to fill its container. When the bar count is small/fixed, the bars (and their x-axis labels) stop short and
leave an empty gutter on the right. The mileage **Yearly** tab (12 month bars, `barWidth={12}` `spacing={9}`)
showed this; it only looked full at one particular screen width by coincidence.

The spending **Trend** tab (6 bars) already had this fixed in the previous session, inline. This spec
generalises that fix and applies it to the remaining chart.

## What shipped

- **New shared util `utils/chartGeometry.ts` → `fillBarGeometry()`.** Given the measured chart width and the
  bar count, it returns the `barWidth` and `spacing` that make the bars span the bar region exactly:
  `barCount*barWidth + (barCount-1)*spacing === usable`, where `usable = chartWidth − yAxisWidth −
  initialSpacing − endSpacing`. A `maxBarWidth` cap (default 44) stops a few bars from becoming absurdly wide —
  the inter-bar gap absorbs the remainder — and sane fixed values are returned before the width is measured.
- **`components/main/Mileage/YearlyMileageTab.tsx`** — the chart is now wrapped in a `View` with `onLayout` that
  records `chartWidth`; `barWidth`/`spacing` come from `fillBarGeometry`, and a short placeholder (`height 140`)
  renders until the width is known, to avoid a layout jump. The tap-to-detail behaviour is unchanged.
- **`components/main/Spending/Spending.tsx`** — the previously-inline `trendBarGeometry()` function is removed
  and the Trend chart now calls the shared `fillBarGeometry()` (same inputs via the existing `TREND_*`
  constants). No behavioural change there; just de-duplication so the two charts can't drift.

## Why measure rather than set a fixed `width`

gifted-charts can take a `width`, but the right value depends on the panel's inner width, which depends on
screen width and the `Panel` padding — not known at author time. Measuring the wrapping `View` with `onLayout`
and solving for `barWidth`/`spacing` fills the panel exactly at any screen size, and degrades to fixed fallback
values on the first frame.

## Scope — which charts

Only **two** components use gifted-charts bar charts: `YearlyMileageTab` and `Spending`'s `TrendTab`. Both now
use `fillBarGeometry`. The spending **PieChart** has no x-axis and is unaffected. The category bars in
`SpendingSummaryView`/`MonthlySpendingBreakdown` are plain `View`s with a `%` width (already full-width), not
charts. So "all graphs" is covered.

## Decisions / hazards

- **H1 — fills exactly, including when the bar cap binds.** `spacing` is computed as the remainder after
  `barCount*barWidth`, so even when `barWidth` is clamped to `maxBarWidth` (few bars) the row still fills the
  full width via a wider gap. With many bars the cap never binds and `barWidth` shrinks instead.
- **H2 — placeholder prevents a layout jump.** The chart renders only once `chartWidth > 0`; until then a
  fixed-height `View` holds the space, so the panel doesn't resize when the real chart appears.
- **H3 — no overflow handling changed.** If a future chart ever has so many bars that even `barWidth 8` won't
  fit, `spacing` floors at 4 and gifted-charts' own horizontal scroll takes over — same as before. Not a
  concern for 6 or 12 bars.

## Verification (device pass — owed)

- V1 Mileage → Yearly: the 12 month bars and their `Jan…Dec` labels span the full panel width, no empty gutter
  on the right, at 360dp and on a wider device.
- V2 Spending → Trend: unchanged from the previous session (6 bars still fill the width); tap-tooltip still works.
- V3 Rotate / different widths: bars re-fill after the width changes (onLayout re-fires).
- V4 The tap-to-detail highlight on the Yearly chart still selects the correct month after the resize.

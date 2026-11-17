# Spec 71 — Month stepper: tap the label to pick a month & year

**Status: Complete — implemented 2026-11-15 (code only; not run on a device).**

## Why

Two requests, same control: "in the monthly tab, i can change the month by clicking the
arrow button … i want to keep this feature. now … if i click the month name, i should be
able to select month and the year and keep the current feature of changing the month by
clicking the arrow." Said once for the **Mileage** page's Monthly tab and once for the
**Spending** page's Monthly tab.

Both tabs render the same shared control — `components/main/shared/MonthStepper.tsx` (used
by `Mileage/MonthlyMileageTab.tsx` and `Spending/Spending.tsx`'s `MonthTab`). So the picker
is added **once**, to that component, and both tabs get it. No per-tab code changed.

## What

`MonthStepper.tsx` only:

- The **arrows are unchanged** — still step ±1 month, still disable the forward arrow once
  the view reaches the current month.
- The centre **label box is now a button** (added a trailing `chevron-down` affordance and
  centred its contents). Tapping it opens a picker.
- **The picker** — a `react-native-paper` `Portal` + `Modal` (the same modal primitive the
  form modals use), Nocturne-styled:
  - a year row: `‹ {year} ›`, seeded from the month in view each time the picker opens;
  - a 3-column grid of the twelve month abbreviations;
  - the active month+year cell is highlighted (`tint(COLORS.primary, 0.22)` fill, primary
    border, `accentForeground` text);
  - tapping a month calls `onChange("YYYY-MM")` and closes the picker.

### The one real rule: the future bound is mirrored, not re-invented

The arrows already forbid stepping past the current real month. The picker enforces the
**same** bound so the two controls can never disagree:

- the picker's forward-year arrow is disabled once `pickerYear >= currentYear`;
- any month cell later than the current real month (`pickerYear > nowYear || (pickerYear ===
  nowYear && m > nowMonth)`) is rendered disabled (35% opacity, non-pressable).

A past month in any year is always selectable. The picker has **no lower bound** — a rider
can page back through years freely, matching the back-arrow, which has none either.

## Cascade

**App-only.** `MonthStepper`'s props (`targetMonth`, `onChange`) are unchanged, so both call
sites are untouched. No server, no web. No new dependency — `Modal`/`Portal` and `tint` were
already in use.

## Verify (not run on a device)

- V1 — Mileage → Monthly: arrows still change the month as before.
- V2 — Spending → Monthly: arrows still change the month as before.
- V3 — tapping the month label on either tab opens the picker on the month currently in view.
- V4 — picking a month+year updates the tab's data (the existing `targetMonth` state and its
  query key drive this; the picker only sets that state).
- V5 — the picker cannot select a future month: months after the current real month are
  dimmed and inert, and the forward-year arrow stops at the current year.
- V6 — selecting a past month in an earlier year works, and the forward arrow on the stepper
  re-enables after moving back off the current month.
- V7 — 360dp: the three-column grid and the year row fit without horizontal scroll; the modal
  sits inset from the screen edges.

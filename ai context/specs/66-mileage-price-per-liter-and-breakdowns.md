# Spec 66 — Mileage: price/L everywhere, monthly fill-up records, lifetime per-year

**Status: Complete — implemented 2026-11-09 (code only; not run on a device).**

## Why

From the developer's message, the Mileage section:

- **History tab** — "one of my requirement was to show fuel price … but i wanted the
  price per liter … now i want to show both full fuel price like the current one and
  price per liter .. make the text a bit small and make the text color a bit white."
- **Monthly tab** — "show the current month's fuel fill up, the information should be same
  as shown in the history tab page's record card, but it should show current month's info."
- **Yearly tab** — "the information in the card is correct, just add price per liter."
- **Lifetime tab** — "show per year data … the information to show in the card will be same
  as the yearly tab's per-month data."

## What

**No new client fetch for History/Yearly/Monthly** — every figure is already on data the
screens hold. The Lifetime per-year list is the one piece needing the server
(`bikelog_server` spec 62's additive `yearlySummary`).

Price per litre = period/month/year **fuel cost ÷ litres**. Cost per km = fuel cost ÷
distance. Both guarded with `?.`/`&&` so a missing field reads `—`, never `৳undefined`/`৳NaN`.

### New shared components

- **`MileageRecordCard.tsx`** — one exact-mileage period card (period · distance · litres ·
  `Fuel cost ৳X · ৳Y/km · ৳Z/L` · km/l · bar). Extracted from the History tab so the
  Monthly tab renders identical cards. The cost line now carries **three** money figures, so
  it runs at **11.5px** and in `COLORS.text` (brighter than the greyed detail line) — the
  developer's "a bit small, a bit white".
- **`MileageBreakdownList.tsx`** — the per-period list (headline label + avg mileage over a
  3-col metric grid). Extracted from the Yearly tab's inline list and given a **`Price / L`**
  metric (now Distance · Fuel used · Fuel cost · Price/L · Cost/km · Fill-ups = 6, a clean
  3×2). Shared by the Yearly tab (a row per month) and the Lifetime tab (a row per year).

### Per tab

- **History** — maps records to `MileageRecordCard`; its inline card markup + styles removed.
- **Monthly** — keeps the four stat tiles, then a **FILL-UP RECORDS** section: the full
  history (same `["mileage","history",bikeId]` query key the History tab owns, so
  react-query dedupes — no new endpoint) filtered to records whose **`periodEndDate`** is in
  the selected month (`formatApiDate(…, "yyyy-MM") === targetMonth`), rendered with
  `MileageRecordCard`. Bars scale to the month's own best km/l. A month with fuel logs but no
  closed period shows a one-line "No exact record closed this month" note.
- **Yearly** — chart + tapped-bar strip unchanged; the inline per-month list is now
  `MileageBreakdownList`, so it gains Price/L.
- **Lifetime** — keeps the four lifetime-total tiles, then a **BY YEAR**
  `MileageBreakdownList` from `yearlySummary` (newest-first), guarded `?? []` so an older
  server simply shows the totals with no year list.

## Decisions / hazards

- **D1 — "fuel fill up" in the Monthly tab = the History record cards, filtered to the
  month.** The history card is a full-tank-to-full-tank *period*, not a single fuel log; the
  developer tied the ask to "the history tab's record card", so that is what's reused. A
  record is assigned to the month its period **closed** in (`periodEndDate`), i.e. when its
  closing fill-up was logged.
- **D2 — Monthly records filtered client-side, not via a new endpoint.** The history query is
  already cached; filtering a handful of records is trivial and keeps the card byte-identical.
- **H1 — an older server with no `yearlySummary`.** The Lifetime tab reads `?? []` and simply
  omits the BY YEAR list; the totals still render. Every `MileageBreakdownList` value is
  independently guarded, so a half-populated year never prints `NaN`.
- **H2 — month bar scale is local.** Monthly cards scale against the month's best km/l (not
  all-time), so a quiet month's bars still read, matching the per-set pattern the History tab
  already uses.

## Cascade

App + **server spec 62** (Lifetime `yearlySummary`). **No web change** — the developer said
app-only, and server 62 is additive anyway.

## Verify (not run on a device)

- V1 — History card shows `Fuel cost ৳… · ৳…/km · ৳…/L`, smaller and brighter than before.
- V2 — a record with no cost shows `—` for all three money figures.
- V3 — Monthly: the four tiles plus a card per fill-up closed in the stepped month; step the
  month and the list follows; a month with logs but no closed period shows the note.
- V4 — Yearly: each month card now has a Price / L metric; totals unchanged.
- V5 — Lifetime: the four total tiles, then a card per year newest-first with the same six
  metrics as a Yearly month card.
- V6 — 360dp: the History cost line and the 3×2 metric grid don't overflow or clip.

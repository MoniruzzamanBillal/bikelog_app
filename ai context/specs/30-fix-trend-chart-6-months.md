# 30: Bug Fix — Trend Charts Show 3 Months Instead of 6

Status: ✅ Complete

## Goal

Fix a user-reported bug: the Spending "Trend" tab and Mileage "Trends" tab (both restored in spec 28) render only **3 months** of bars, not the **6 months** the original instruction (spec 18) called for. The legend/label rendering itself is correct — this is purely a data-window bug, not a rendering bug.

## Context

**User's own words this session**: "in trending chart my instruction was, i will get 6 month of data and show 6 month of data along with the chart with the legend. i m getting the chart with legend which is what i wanted. but in graph i m seeing only 3 months of data instead of 6 month's data."

**Root cause, confirmed by reading the live files, not assumed:**

- `components/main/Spending/Spending.tsx`'s `TrendTab` (line 257) calls `useFetchData<TSpendingTrend>(..., \`/bikes/${bikeId}/spending-summary/trend?months=3\`)` — hardcoded `months=3`.
- `components/main/Mileage/MileageTrendTab.tsx` (line 17) calls `useFetchData<TMileageTrend>(..., \`/bikes/${bikeId}/mileage/trend?months=3\`)` — same hardcoded `months=3`.
- Both chart titles are hardcoded text: `"Spending, last 3 months"` and `"Distance, last 3 months"`.
- This `months=3` hardcode has been present, unchanged, since it was first written in spec 18, and was carried forward verbatim through spec 25's removal and spec 28's restoration — **no prior spec ever actually implemented a 6-month window**, despite spec 18's own Design section framing 3 as just "hardcoded for this pass" pending a real UI control. The user's original ask for 6 months was never implemented; every spec since has just copied the same `?months=3` forward.
- The backend already supports this with no change needed — confirmed via `bikelog_server/src/app/modules/spending/spending.controller.ts:37-44` and `bikelog_server/src/app/modules/mileageRecord/mileageRecord.controller.ts:75-81`: both parse `req.query.months`, default to `3` only when the param is absent, and validate `1 <= months <= 24`. Passing `months=6` is already a legal, already-handled request on both endpoints — this is a pure frontend fix.
- `bikelog_server/src/app/modules/ai/ai.service.ts:112`'s "Last 3 months trend" string is a separate, unrelated feature (the AI insight prompt text) and is **out of scope** for this spec — the user's complaint is specifically about the chart, not the AI insight card.

## Design

### Files to modify

| Path | Change |
|---|---|
| `components/main/Spending/Spending.tsx` | `TrendTab`'s fetch URL: `?months=3` → `?months=6`. Chart title: `"Spending, last 3 months"` → `"Spending, last 6 months"`. |
| `components/main/Mileage/MileageTrendTab.tsx` | Fetch URL: `?months=3` → `?months=6`. Chart title: `"Distance, last 3 months"` → `"Distance, last 6 months"`. |
| `ai context/specs/00-build-plan.md` | Add a spec 30 row. |
| `ai context/progress-tracker.md` | Add a spec 30 row to the Spec Implementation Status table (Not Started until implemented), then a Recent Activity entry once done. |

No backend change, no new type, no new dependency — `TSpendingTrend`/`TMileageTrend` already carry an array of `monthlySummary` entries of whatever length the backend returns; nothing about their shape assumes exactly 3 entries.

### Chart width at 6 bars vs. 3

Both `BarChart` calls use `barWidth={28}` and `spacing={24}` with no explicit `width` prop, so `react-native-gifted-charts` sizes the chart to its container and scrolls horizontally by default once content overflows — going from 3 to 6 bars does not require a layout change, only needs confirming on-device that the chart card's fixed padding (`chartCard: { padding: 16 }`) still looks reasonable with either all 6 bars visible at once or a horizontal scroll, whichever the library falls back to at real phone widths.

## Implementation

1. [x] Change `Spending.tsx`'s `TrendTab` fetch URL from `?months=3` to `?months=6`; update the bar-chart title text to "last 6 months". Done — `components/main/Spending/Spending.tsx`, `useFetchData` URL and `chartTitle` text both updated, nothing else in that function touched.
2. [x] Change `MileageTrendTab.tsx`'s fetch URL from `?months=3` to `?months=6`; update the bar-chart title text to "last 6 months". Done — `components/main/Mileage/MileageTrendTab.tsx`, same two-line change.
3. [x] Run `expo lint` and `npx tsc --noEmit`; fix anything either flags. Both clean, 0 issues — no fixes needed.
4. [x] Add a spec 30 row to `ai context/specs/00-build-plan.md` and `ai context/progress-tracker.md`'s Spec Implementation Status table; add a Recent Activity entry; flip this spec's own `Status:` line to `✅ Complete`.

## Dependencies

None — this only touches the two trend-chart call sites spec 28 already restored. Spec 29 (in progress, unrelated auth-token bug) is untouched by this change.

## Verify

- [x] Spending's Trend tab bar chart shows 6 bars (6 distinct months), not 3 — *(code-verified only, no device/simulator in this environment)*: `TrendTab`'s `useFetchData` now requests `.../spending-summary/trend?months=6`; `barData` is a plain `.map()` over the full `monthlySummary` array returned, so it renders however many months the backend returns for that param.
- [x] Mileage's Trends tab bar chart shows 6 bars (6 distinct months), not 3 — *(code-verified only)*: same pattern, `MileageTrendTab` now requests `.../mileage/trend?months=6`.
- [x] A month with zero activity among the 6 still renders as a real zero-valued bar, not a gap — *(code-verified)*: no filter was added to either `barData` map; behavior is unchanged from spec 18/28, only the `months` value changed.
- [x] Spending's donut still reflects only the **most recent** month's category breakdown, not all 6 months merged together — *(code-verified)*: `latest` is still computed as `monthlySummary[monthlySummary.length - 1]`, untouched by this change.
- [x] Both chart titles read "last 6 months", not "last 3 months" — confirmed in both edited files.
- [x] `expo lint` and `npx tsc --noEmit` both clean — confirmed, 0 issues on both.
- [ ] **Exercise both tabs on a real device or simulator** — confirm all 6 bars are legible (either fully visible or scrollable) at real phone width. **Not run** — no device/emulator/simulator available in this environment (same standing gap as every other spec in this app). This is the one item that must not be marked done from static review alone; flagged for the user to confirm on their next device session.

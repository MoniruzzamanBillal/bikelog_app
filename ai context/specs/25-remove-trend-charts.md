# 25: Remove Trend Charts

Status: ⛔ Not started

## Goal

Remove chart display from the mobile app entirely — per direct user instruction, the app should not show the Spending/Mileage trend charts at all. This reverses spec 18 (`18-spending-mileage-trend-charts.md`), taking the app back to its original v1 "no charting library" stance rather than leaving the charts hidden-but-present. Web (`bikelog_client-web-`) keeps and widens its own charts (its own spec 20) — this is a mobile-only removal, not a backend or web change.

## Context

Everything spec 18 added is confined to a small, well-isolated set of files (confirmed by direct code inspection, not assumed from spec 18's own text):

- **`components/main/Spending/Spending.tsx`**: `"trend"` is one value of the `TPeriod` union; one pill entry in the `TABS` array; an inline `TrendTab` function (~lines 147–204, imports `BarChart, PieChart` from `react-native-gifted-charts`, and `CHART_COLORS` from `utils/colors.ts`); one render-switch branch (`{activeTab === "trend" && <TrendTab bikeId={bikeId} />}`, ~line 244).
- **`components/main/Mileage/Mileage.tsx`**: `"trends"` is one value of the `TTab` union; one pill entry in `TABS`; an import of `MileageTrendTab`; one render-switch branch (~line 62).
- **`components/main/Mileage/MileageTrendTab.tsx`**: a standalone file, entirely the trend chart — safe to delete outright.
- **`package.json`**: `react-native-gifted-charts` (`^1.4.77`) and its peer dependency `react-native-svg` (`15.12.1`, pinned per spec 18's implementation notes to match Expo SDK 54's compatibility table). Neither is imported anywhere in app code outside the two files above.
- **`utils/colors.ts:21-27`**: `CHART_COLORS`, used only inside `Spending.tsx`'s `TrendTab`.
- **`types/spending.types.ts`** / **`types/mileage.types.ts`**: `TMonthlySpending`, `TSpendingTrend`, `TMileageTrend` — added for the charts. `TMileageTrend` reused the pre-existing `TMonthlySummary` type, which must **not** be deleted if other Mileage tabs (e.g. `YearlyMileageTab`) still use it.
- **Docs spec 18 flipped**, which now need flipping back: `architecture.md` Invariant 6, `project-overview.md`'s Out of Scope section, `ui-context.md`'s Conventions "Charts" line.

The backend trend endpoints (`GET .../spending-summary/trend`, `GET .../mileage/trend`) are **not** part of this removal — they're shared with the web client (which is *widening* its own use of them, spec 20) and with the AI-integration feature (`bikelog_server`'s `ai.service.ts:105` uses mileage trend data for AI insight generation, unrelated to charts). This spec only removes the mobile app's own UI consumption of them.

## Design

### Files to change

| Path | Action | Notes |
| --- | --- | --- |
| `components/main/Mileage/MileageTrendTab.tsx` | Delete | Entire file is the chart component. |
| `components/main/Spending/Spending.tsx` | Modify | Remove `"trend"` from `TPeriod`; remove its `TABS` entry; delete the inline `TrendTab` function; remove the render-switch branch; remove now-unused `BarChart, PieChart` and `CHART_COLORS` imports. |
| `components/main/Mileage/Mileage.tsx` | Modify | Remove `"trends"` from `TTab`; remove its `TABS` entry; remove the `MileageTrendTab` import and render-switch branch. |
| `utils/colors.ts` | Modify | Remove `CHART_COLORS` (confirm zero remaining references first). |
| `types/spending.types.ts` | Modify | Remove `TMonthlySpending`, `TSpendingTrend` (confirm unused elsewhere first — grep before deleting). |
| `types/mileage.types.ts` | Modify | Remove `TMileageTrend` only. Keep `TMonthlySummary` — it predates spec 18 and is likely still used by other Mileage tabs; verify by grep before touching it. |
| `package.json` | Modify | Remove `react-native-gifted-charts`. Remove `react-native-svg` **only if** a grep of the dependency tree shows nothing else needs it (see Implementation step 6) — some other installed library could depend on it transitively and silently break if it's pulled. |
| `ai context/architecture.md` | Modify | Revert Invariant 6 to the pre-spec-18 "no charting library" wording. |
| `ai context/project-overview.md` | Modify | Restore "Charts of any kind" to the Out of Scope section. |
| `ai context/ui-context.md` | Modify | Restore the "Rich text / animation / charts: none" Conventions line. |
| `ai context/specs/00-build-plan.md` | Modify | Add a note on spec 18's row that it was reversed by spec 25 (keep the historical row, don't delete it); add a spec 25 row. |
| `ai context/progress-tracker.md` | Modify | Recent Activity entry for the removal; update Spec Implementation Status table; update Known Gaps if the chart-removal changes anything documented there. |

### What NOT to touch

- Backend trend endpoints (`bikelog_server`) — out of scope per this project's cross-project rule (read-only across projects); the web client still needs them.
- `types/mileage.types.ts`'s `TMonthlySummary` — predates this feature, likely still in use.
- The rest of `Spending.tsx`'s `MonthTab`/`YearTab`/`LifetimeTab` and `Mileage.tsx`'s `MileageHistoryTab`/`MonthlyMileageTab`/`YearlyMileageTab`/`LifetimeMileageTab` — spec 18 was a pure addition to both files; removal should be equally surgical, restoring exactly the pre-spec-18 shape of both `TABS` arrays and render switches.

## Implementation

1. [ ] Delete `components/main/Mileage/MileageTrendTab.tsx`.
2. [ ] In `Spending.tsx`: remove `"trend"` from the `TPeriod` union; remove the `{ key: "trend", label: "Trend" }` entry from `TABS`; delete the inline `TrendTab` function; remove the `{activeTab === "trend" && <TrendTab bikeId={bikeId} />}` render branch; remove the now-unused `BarChart, PieChart` import (from `react-native-gifted-charts`) and `CHART_COLORS` import.
3. [ ] In `Mileage.tsx`: remove `"trends"` from the `TTab` union; remove the `{ key: "trends", label: "Trends" }` entry from `TABS`; remove the `MileageTrendTab` import and its render-switch branch.
4. [ ] Grep the codebase for `CHART_COLORS`; if the only remaining reference was the one just removed from `Spending.tsx`, delete it from `utils/colors.ts`.
5. [ ] Grep for `TMonthlySpending`, `TSpendingTrend`, `TMileageTrend`; remove each from its `type/*.types.ts` file only if the grep confirms no remaining references (e.g. double-check spec 19's AI-integration screens don't reuse any of these for displaying AI-generated trend summaries before deleting).
6. [ ] Before removing `react-native-svg` from `package.json`, grep `node_modules`/the dependency tree for any other installed package that depends on it. If nothing else needs it, run `yarn remove react-native-gifted-charts react-native-svg`; if something else does, run `yarn remove react-native-gifted-charts` only and note in this spec's Verify section why `react-native-svg` was kept.
7. [ ] Revert `ai context/architecture.md` Invariant 6, `ai context/project-overview.md`'s Out of Scope section, and `ai context/ui-context.md`'s Conventions "Charts" line to their pre-spec-18 wording (undoing exactly what spec 18's own Implementation step 6 changed).
8. [ ] Update `ai context/specs/00-build-plan.md`: annotate spec 18's row as reversed by spec 25 (keep the row, don't delete history); add a spec 25 row.
9. [ ] Update `ai context/progress-tracker.md`: Recent Activity, Spec Implementation Status table, Known Gaps if anything new surfaces (e.g. if `react-native-svg` had to be kept for an unrelated transitive dependency, note that here too).
10. [ ] Run `expo lint` and `npx tsc --noEmit`; fix anything flagged — in particular watch for unused-import lint errors left behind by the chart removal.

## Dependencies

None blocking — this is a pure removal within spec 08 (Mileage) and spec 11 (Spending Summary)'s existing tab systems, reversing only what spec 18 added. No other spec depends on the charts being present.

## Verify

- [ ] Spending screen no longer shows a "Trend" pill/tab — only Month/Year/Lifetime remain, functioning exactly as they did before spec 18.
- [ ] Mileage screen no longer shows a "Trends" pill/tab — only History/Monthly/Yearly/Lifetime remain, functioning exactly as they did before spec 18.
- [ ] `MileageTrendTab.tsx` is deleted; a repo-wide grep for `react-native-gifted-charts` imports returns zero matches in app code.
- [ ] `react-native-gifted-charts` is removed from `package.json`. `react-native-svg` is removed too, unless the dependency-tree check found another package needs it — state which outcome occurred and why.
- [ ] `CHART_COLORS`, `TSpendingTrend`, `TMonthlySpending`, `TMileageTrend` no longer exist in the codebase (grep confirms zero references); `TMonthlySummary` still exists and is still used by the remaining Mileage tabs.
- [ ] `architecture.md`, `project-overview.md`, and `ui-context.md` all state "no charting library" again, matching their pre-spec-18 wording.
- [ ] `expo lint` and `npx tsc --noEmit` both clean, zero errors/warnings.
- [ ] App still builds/runs; the remaining Spending (Month/Year/Lifetime) and Mileage (History/Monthly/Yearly/Lifetime) tabs are unaffected functionally by the removal.

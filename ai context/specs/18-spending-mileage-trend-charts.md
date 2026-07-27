# 18: Spending & Mileage Trend Charts

Status: ✅ Complete

## Goal

Add a "Trend" view to the existing Spending screen and a "Trends" tab to the existing Mileage screen, each showing the last 3 months of activity as charts: a bar chart of monthly totals, plus (Spending only) a donut of the most recent month's category breakdown. This is v2 scope, client for the backend's already-shipped trend endpoints (`bikelog_server` spec 15) — the same feature already built and shipped on `bikelog_client-web-` (its spec 13), ported to this app's own conventions rather than copied verbatim.

## Context

**Backend contract** (already live on the shared `bikelog_server`; re-confirmed via direct `curl` against the deployed instance, not assumed from the web app's docs):

- `GET /bikes/:bikeId/spending-summary/trend?months=3` → `{ months: number, monthlySummary: [{ targetMonth: "YYYY-MM", totalSpending: number, categoryBreakdown: [{ category: string, total: number }] }] }`
- `GET /bikes/:bikeId/mileage/trend?months=3` → `{ months: number, monthlySummary: [{ targetMonth: "YYYY-MM", totalDistanceKm: number, totalLitersConsumed: number, fuelLogCount: number }] }`

**Key behaviors**:

- Rolling N-month window ending at the current month (default `months=3`), not calendar-year bound — matches the existing Monthly/Yearly tabs' "current month/year" defaulting convention, nothing new to handle here.
- A zero-activity month is always returned as a real entry with zero values (never omitted from `monthlySummary`) — both charts can render a flat/empty bar for that month without any extra guard code, same as the web implementation found.
- Spending's category-breakdown donut uses the **most recent month's** `categoryBreakdown`, already embedded in the same trend response — no second request needed.
- `?months=3` is hardcoded for this pass (no UI to change the window), matching the web implementation's scope exactly.

**New dependency — reverses this app's documented "no charting library" stance**: `architecture.md` Invariant 6, `project-overview.md`'s Out of Scope section, and `ui-context.md`'s Conventions section all currently state no charting library is used, matching both sibling projects' original v1 stance. `bikelog_client-web-` already reversed this for its own spec 13 (added Recharts). This spec does the same for RN: adds **`react-native-gifted-charts`** (+ its peer dependency **`react-native-svg`**) — chosen over `victory-native`/`react-native-chart-kit` for the simplest possible API matching exactly what's needed here (a bar chart + a donut, nothing more complex). All three docs above must be updated as part of this spec's own Implementation steps, the same way spec 14 introduced `@react-native-community/datetimepicker` as a new native dependency and documented it in place rather than silently.

## Design

### Files to create/modify

| Path                                          | Action | Notes                                                                                                                                                      |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                | Modify | Add `react-native-gifted-charts` + `react-native-svg`.                                                                                                     |
| `types/spending.types.ts`                     | Modify | Add `TMonthlySpending`, `TSpendingTrend`.                                                                                                                  |
| `types/mileage.types.ts`                      | Modify | Add `TMileageTrend` (reuses existing `TMonthlySummary`).                                                                                                   |
| `utils/colors.ts`                             | Modify | Add `CHART_COLORS: string[]` (5 values), shared by both new components.                                                                                    |
| `components/main/Spending/Spending.tsx`       | Modify | `TPeriod` gains `"trend"`, `TABS` gains a 4th pill, new inline `TrendTab` function added alongside the existing inline `MonthTab`/`YearTab`/`LifetimeTab`. |
| `components/main/Mileage/Mileage.tsx`         | Modify | `TTab` gains `"trends"`, `TABS` gains a 5th pill, renders new `MileageTrendTab`.                                                                           |
| `components/main/Mileage/MileageTrendTab.tsx` | Create | New separate file, mirroring `MonthlyMileageTab.tsx`'s shape — Mileage already splits every tab into its own file, unlike Spending.                        |
| `architecture.md`                             | Modify | Flip Invariant 6 to reflect the new charting dependency.                                                                                                   |
| `project-overview.md`                         | Modify | Remove "Charts of any kind" from Out of Scope; note it as delivered in this spec.                                                                          |
| `ui-context.md`                               | Modify | Update the "Rich text / animation / charts: none" line.                                                                                                    |

### Spending.tsx — new inline `TrendTab`

Added inside `Spending.tsx` alongside the existing `MonthTab`/`YearTab`/`LifetimeTab` functions (same file — this mirrors how those three are already inline there, not separate files):

```tsx
function TrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];
  const latest = monthlySummary[monthlySummary.length - 1];
  const latestBreakdown = latest?.categoryBreakdown ?? [];

  const barData = monthlySummary.map((m) => ({
    value: m.totalSpending,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: COLORS.primary,
  }));

  const pieData = latestBreakdown.map((c, i) => ({
    value: c.total,
    text: c.category,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Spending, last 3 months</Text>
        <BarChart
          data={barData}
          barWidth={28}
          spacing={24}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={0}
        />
      </View>

      {pieData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            By category (
            {latest
              ? format(
                  parse(latest.targetMonth, "yyyy-MM", new Date()),
                  "MMM yyyy",
                )
              : ""}
            )
          </Text>
          <PieChart data={pieData} donut radius={90} innerRadius={60} />
        </View>
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
    </ScrollView>
  );
}
```

`TABS` and the render switch each gain one entry:

```tsx
const TABS: { key: TPeriod; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "trend", label: "Trend" },
];
// ...
{
  activeTab === "trend" && <TrendTab bikeId={bikeId} />;
}
```

### Mileage/MileageTrendTab.tsx — new separate file

Mirrors `MonthlyMileageTab.tsx`'s exact shape (props interface, `SectionLoading`, card styling):

```tsx
interface MileageTrendTabProps {
  bikeId: string;
}

export function MileageTrendTab({ bikeId }: MileageTrendTabProps) {
  const { data, isLoading } = useFetchData<TMileageTrend>(
    ["mileage", "trend", bikeId],
    `/bikes/${bikeId}/mileage/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];

  const barData = monthlySummary.map((m) => ({
    value: m.totalDistanceKm,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: COLORS.primary,
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distance, last 3 months</Text>
        <BarChart
          data={barData}
          barWidth={28}
          spacing={24}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={0}
        />
      </View>
    </ScrollView>
  );
}
```

`Mileage.tsx`'s `TTab`/`TABS`/render switch each gain a 5th `"trends"` entry, same pattern as the Spending changes above.

### `utils/colors.ts` addition

```ts
export const CHART_COLORS = [
  "#2196F3", // COLORS.primary
  "#4CAF50", // COLORS.success
  "#FF9800", // COLORS.warning
  "#9C27B0",
  "#F44336", // COLORS.danger
];
```

## Implementation

1. Run `yarn add react-native-gifted-charts react-native-svg`.
2. Add `TMonthlySpending`/`TSpendingTrend` to `types/spending.types.ts`; add `TMileageTrend` to `types/mileage.types.ts` (reuse existing `TMonthlySummary` for its array entries, same as the web implementation did).
3. Add `CHART_COLORS` to `utils/colors.ts`.
4. Add the inline `TrendTab` to `Spending.tsx`, plus the `TPeriod`/`TABS`/render-switch additions.
5. Create `components/main/Mileage/MileageTrendTab.tsx`; add the `TTab`/`TABS`/render-switch additions to `Mileage.tsx`.
6. Update `architecture.md` Invariant 6, `project-overview.md`'s Out of Scope section, and `ui-context.md`'s Conventions section to reflect the reversed charting-library policy.
7. Run `expo lint` and `npx tsc --noEmit`; fix anything either flags.
8. Update `progress-tracker.md` (Current Phase, Spec Implementation Status table, Recent Activity, Known Gaps if anything new surfaces) and flip this spec's own `Status:` line and `00-build-plan.md`'s row to `✅ Complete`.

## Dependencies

Spec 08 (Mileage) and Spec 11 (Spending Summary) must already exist — this spec only adds a tab to each, it doesn't touch their existing Month/Year/Lifetime/History/Monthly/Yearly tabs.

## Verify

- [x] **Spending Trend tab renders a bar chart of the last 3 months' totals** _(code-verified only — no simulator/device in this environment)_: `TrendTab` in `Spending.tsx`, `useFetchData<TSpendingTrend>` against `.../spending-summary/trend?months=3`, `BarChart` fed `totalSpending` per `targetMonth` (formatted `MMM` via `date-fns`).
- [x] **Spending Trend tab renders a donut of the most recent month's category breakdown, with no second network request**: `latestBreakdown` is read from `trend.monthlySummary`'s last entry — the same response object the bar chart's `barData` is built from, no second `useFetchData` call.
- [x] **A zero-activity month renders as a real zero-valued bar, not a gap or crash**: `barData`/`pieData` are built via a plain `.map()` over the full `monthlySummary` array — no filter ever drops an entry.
- [x] **Mileage Trends tab renders a bar chart of `totalDistanceKm` per month**: `MileageTrendTab.tsx`, same pattern as the spending bar chart, no donut on this side (matches the web app's mileage-trend scope exactly).
- [x] **Both new tabs' pill buttons behave like every existing tab**: `"trend"`/`"trends"` were added as plain entries to the existing `TABS` arrays and render switches in `Spending.tsx`/`Mileage.tsx` — no new tab-bar styling introduced, `styles.tab`/`styles.tabActive` reused as-is.
- [x] **`architecture.md`/`project-overview.md`/`ui-context.md` no longer claim "no charting library"**: all three updated in this pass — `architecture.md` Invariant 6 now carves out the charting exception, `project-overview.md`'s Out of Scope strikes the charts line, `ui-context.md`'s Conventions gained a dedicated "Charts" line.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `npx tsc --noEmit` also passes clean.

**Implementation notes**:
- `react-native-svg` was initially installed at `^15.15.5` (latest) but `npx expo install --check` flagged it against Expo SDK 54's expected `15.12.1` — re-ran `npx expo install react-native-svg` to pin the SDK-compatible version rather than leaving a newly-introduced native-module mismatch in place. `react-native-gifted-charts@1.4.77` needed no such pin (not part of Expo's own compatibility table). The other packages `expo install --check` flagged (`expo`, `expo-font`, `expo-linking`, `expo-router`, `expo-web-browser`, `react-native-gesture-handler`) are pre-existing version drift unrelated to this spec — left untouched, out of scope.
- No `app.json` config-plugin entry was needed for `react-native-svg` (unlike spec 14's `@react-native-community/datetimepicker`) — it autolinks without any native config to inject; confirmed no plugin-related warning was emitted by either install.
- Chart component props (`BarChart`'s `data`/`barWidth`/`spacing`/`roundedTop`/`yAxisThickness`/`xAxisThickness`, `PieChart`'s `data`/`donut`/`radius`/`innerRadius`) type-checked clean against the installed `react-native-gifted-charts` types as written in the spec's own Design sample — no corrections needed vs. the draft code.
- **Not exercised on a real device/simulator** — same standing gap as every other spec in this project (see `progress-tracker.md`'s Known Gaps); the chart rendering itself (bar heights, donut segments, label truncation at phone width) is type/lint-verified only.

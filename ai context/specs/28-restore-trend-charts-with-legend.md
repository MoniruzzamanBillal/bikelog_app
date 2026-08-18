# 28: Restore Trend Charts (Bar + Donut), Donut Now With a Legend

Status: ✅ Complete

## Goal

Re-add the Spending "Trend" tab (bar chart + category-breakdown donut) and the Mileage "Trends" tab (bar chart), reversing spec 25's removal — per direct user instruction. This time, the donut chart must render a **legend** (color swatch + category name + amount + percentage per slice). The user's original spec-25 request was "remove the chart" because the donut's legend was missing; spec 25 over-executed that and removed the bar chart too. This spec restores both chart types on both screens, fixing the actual root cause (missing legend) instead of re-removing anything.

## Context

**What actually happened, reconstructed from `18-spending-mileage-trend-charts.md` and `25-remove-trend-charts.md`:**

- Spec 18 added a Spending "Trend" tab (`BarChart` of last-3-months totals + `PieChart` donut of the latest month's category breakdown) and a Mileage "Trends" tab (`BarChart` of last-3-months distance), using `react-native-gifted-charts` + `react-native-svg`.
- The donut (`PieChart` with `donut radius={90} innerRadius={60}`) was rendered with no legend at all — `react-native-gifted-charts`'s `PieChart` does not draw one automatically, and spec 18's own Design sample never added a `legendComponent` or any custom legend markup below it. A viewer had no way to tell which slice was which category without guessing from color alone.
- The user reported this as "the chart" being broken/unusable and asked for it to be removed. Spec 25 removed **both** the donut and the bar chart, on both screens, entirely — overshooting the actual complaint, which was specifically about the missing legend, not about charts being unwanted in general.
- Per this conversation, the user now wants both chart types back on both screens, with the donut's legend problem actually fixed this time.

**Backend contract** (unchanged since spec 18 — re-confirm still live before implementing, don't assume):

- `GET /bikes/:bikeId/spending-summary/trend?months=3` → `{ months: number, monthlySummary: [{ targetMonth: "YYYY-MM", totalSpending: number, categoryBreakdown: [{ category: string, total: number }] }] }`
- `GET /bikes/:bikeId/mileage/trend?months=3` → `{ months: number, monthlySummary: [{ targetMonth: "YYYY-MM", totalDistanceKm: number, totalLitersConsumed: number, fuelLogCount: number }] }`
- Rolling N-month window, zero-activity months always present as real zero-valued entries (never omitted) — both charts render a flat bar for those months with no extra guard code.
- Spending's donut uses the **most recent month's** `categoryBreakdown`, already embedded in the trend response — no second request.

**Current app state (post spec-25 removal, confirmed by reading the live files, not assumed from the specs above):**

- No charting dependency installed (`package.json` has no `react-native-gifted-charts`/`react-native-svg`; confirmed via grep).
- `types/spending.types.ts` has no `TMonthlySpending`/`TSpendingTrend`; `types/mileage.types.ts` has no `TMileageTrend` (its pre-existing `TMonthlySummary` is intact and still used by `YearlyMileageTab.tsx`).
- `utils/colors.ts` has no `CHART_COLORS`.
- `components/main/Spending/Spending.tsx`'s `TPeriod` is `"month" | "year" | "lifetime"`, `TABS` has 3 entries, no `TrendTab`.
- `components/main/Mileage/Mileage.tsx`'s `TTab` is `"history" | "monthly" | "yearly" | "lifetime"`, `TABS` has 4 entries, no `MileageTrendTab` import; `components/main/Mileage/MileageTrendTab.tsx` does not exist.
- `architecture.md` Invariant 6, `project-overview.md`'s Out of Scope, and `ui-context.md`'s Conventions all currently state "no charting library" again (each with a one-line historical footnote about specs 18/25).
- Both `Spending.tsx` and `Mileage.tsx` already wrap their tab-bar row in a horizontal `ScrollView` (`style={styles.tabBarScroll}` with `flexGrow: 0`, `contentContainerStyle={styles.tabBar}`) — this was spec 18's own on-device fix for tab overflow/height distortion and is still in place, so re-adding a 4th/5th tab needs no new tab-bar work this time.

**Why the legend, not something else, is the fix:** the user's own words this session — "in the chart, you will show the legend, previously it was missing that's why i told you to remove the chart" — directly identifies the donut's missing legend as the root cause, not the chart type or the library choice. No other design change (chart library swap, different chart type, removing the donut in favor of a list-only view) is in scope here.

## Design

### Files to create/modify

| Path                                          | Action | Notes                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                | Modify | Re-add `react-native-gifted-charts` + `react-native-svg` via `npx expo install` (re-check the SDK-54-compatible `react-native-svg` version at implementation time — spec 18 needed to pin it to `15.12.1` against a `^15.15.5` default; don't assume that pin is still the exact right version without re-checking `expo install --check`). |
| `types/spending.types.ts`                     | Modify | Re-add `TMonthlySpending`, `TSpendingTrend` (same shape as spec 18).                                                                                                                                                                                                                                                                        |
| `types/mileage.types.ts`                      | Modify | Re-add `TMileageTrend` (reuses existing `TMonthlySummary`, untouched).                                                                                                                                                                                                                                                                      |
| `utils/colors.ts`                             | Modify | Re-add `CHART_COLORS: string[]` (5 values, same as spec 18).                                                                                                                                                                                                                                                                                |
| `components/main/Spending/Spending.tsx`       | Modify | `TPeriod` regains `"trend"`, `TABS` regains its 4th pill, re-add inline `TrendTab` — donut now paired with a legend block (new this spec).                                                                                                                                                                                                  |
| `components/main/Mileage/Mileage.tsx`         | Modify | `TTab` regains `"trends"`, `TABS` regains its 5th pill, re-add `MileageTrendTab` import + render-switch branch.                                                                                                                                                                                                                             |
| `components/main/Mileage/MileageTrendTab.tsx` | Create | Recreate, identical shape to spec 18's version (bar chart only — no legend needed, single-series chart, month labels already identify each bar).                                                                                                                                                                                            |
| `ai context/architecture.md`                  | Modify | Flip Invariant 6 back to the charting-exception wording, appending a note that spec 28 restored what spec 25 removed (fixing the missing-legend gap this time).                                                                                                                                                                             |
| `ai context/project-overview.md`              | Modify | Remove "Charts of any kind" from Out of Scope again; note spec 28 in the historical footnote.                                                                                                                                                                                                                                               |
| `ai context/ui-context.md`                    | Modify | Update the charts Conventions line again; note spec 28 in the historical footnote.                                                                                                                                                                                                                                                          |
| `ai context/specs/00-build-plan.md`           | Modify | Add a spec 28 row; annotate spec 25's row as itself reversed by spec 28.                                                                                                                                                                                                                                                                    |
| `ai context/progress-tracker.md`              | Modify | Add a spec 28 row to the Spec Implementation Status table (this pass, marked Not Started); Recent Activity + Known Gaps once actually implemented.                                                                                                                                                                                          |

### Spending.tsx — inline `TrendTab`, donut now with a legend

Same data-fetching shape as spec 18 (one `useFetchData<TSpendingTrend>` call feeds both the bar chart and the donut — no second request), plus a legend block rendered directly under the `PieChart`:

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
  const breakdownTotal = latestBreakdown.reduce((sum, c) => sum + c.total, 0);

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

          <View style={styles.legend}>
            {latestBreakdown.map((c, i) => {
              const percentage =
                breakdownTotal > 0
                  ? ((c.total / breakdownTotal) * 100).toFixed(1)
                  : "0.0";
              return (
                <View key={c.category} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      {
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      },
                    ]}
                  />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {c.category}
                  </Text>
                  <Text style={styles.legendValue}>
                    ৳{c.total.toFixed(2)} ({percentage}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
    </ScrollView>
  );
}
```

`TABS` and the render switch each regain the `"trend"` entry, identical to spec 18.

### `styles` additions in `Spending.tsx` (legend block)

```ts
chartCard: {
  backgroundColor: COLORS.card,
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
},
chartTitle: {
  fontSize: 14,
  fontWeight: "600",
  color: COLORS.text,
  marginBottom: 8,
},
legend: {
  marginTop: 12,
  gap: 8,
},
legendItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
legendSwatch: {
  width: 12,
  height: 12,
  borderRadius: 6,
},
legendLabel: {
  flex: 1,
  fontSize: 13,
  color: COLORS.text,
},
legendValue: {
  fontSize: 13,
  fontWeight: "600",
  color: COLORS.textLight,
},
```

Legend rows are a plain vertical list (one row per category: swatch, name, `৳amount (pct%)`) rather than a wrapped horizontal chip row — `categoryBreakdown` category names are free-text and can be long, and a vertical list avoids the truncation/wrapping problems a horizontal legend would hit at phone width. Amount + percentage format matches `SpendingSummaryView.tsx`'s existing category-breakdown convention exactly (`৳{total.toFixed(2)}`, `((cat.total / total) * 100).toFixed(1)`), so the donut's legend reads consistently with the plain-list breakdown already shown elsewhere on the Month/Year/Lifetime tabs.

### `Mileage/MileageTrendTab.tsx` — recreated, unchanged from spec 18

No legend needed here — a single-series bar chart where each bar's month label (`MMM`, via `date-fns`) already identifies it; a legend only helps distinguish multiple categories/series, which the mileage bar chart doesn't have.

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

### `utils/colors.ts` addition (unchanged from spec 18)

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

1. [x] Re-check the current Expo SDK-compatible `react-native-svg` version before installing (`npx expo install react-native-svg react-native-gifted-charts`, then `npx expo install --check` to catch any version-pin mismatch — don't assume spec 18's `15.12.1` pin is still current without checking). Confirmed: `npx expo install` resolved `react-native-svg@15.12.1` on its own (same pin spec 18 needed to force manually) and `react-native-gifted-charts@1.4.78`; `expo install --check` afterward did not flag either package — only pre-existing, unrelated version drift (`expo`, `expo-constants`, `expo-file-system`, `expo-font`, `expo-linking`, `expo-router`, `expo-web-browser`, `react-native-gesture-handler`), left untouched per spec 18's own precedent for this exact situation.
2. [x] Re-add `TMonthlySpending`/`TSpendingTrend` to `types/spending.types.ts`; re-add `TMileageTrend` to `types/mileage.types.ts` (reuse existing `TMonthlySummary`, do not duplicate it).
3. [x] Re-add `CHART_COLORS` to `utils/colors.ts`.
4. [x] Re-add the inline `TrendTab` to `Spending.tsx` (bar chart + donut + **new legend block**), plus the `TPeriod`/`TABS`/render-switch additions and the new `chartCard`/`chartTitle`/`legend*` styles.
5. [x] Recreate `components/main/Mileage/MileageTrendTab.tsx`; re-add the `TTab`/`TABS`/render-switch additions to `Mileage.tsx`. Recreated file confirmed byte-for-byte identical to spec 18's original (`git show` against the pre-spec-25 commit) — same imports (`ScrollView` from `react-native-gesture-handler`, not `react-native`), same shadow-based `chartCard` style, no legend (single-series bar chart, not applicable).
6. [x] Update `ai context/architecture.md` Invariant 6, `ai context/project-overview.md`'s Out of Scope section, and `ai context/ui-context.md`'s Conventions section — reinstate the charting-library exception, with a footnote covering all three specs (18 added → 25 removed → 28 restored with a legend fix).
7. [x] Run `expo lint` and `npx tsc --noEmit`; fix anything either flags. Both clean, 0 issues, no fixes needed.
8. [x] Update `ai context/progress-tracker.md` (Current Phase, Spec Implementation Status table, Recent Activity, Known Gaps) and `ai context/specs/00-build-plan.md`'s row, and flip this spec's own `Status:` line to `✅ Complete` once actually implemented.

## Dependencies

Spec 08 (Mileage) and Spec 11 (Spending Summary) must already exist (they do) — this spec only adds a tab to each. No other spec depends on these charts being present or absent.

## Verify

- [x] **Spending's Trend tab renders a bar chart of the last 3 months' totals, identical behavior to spec 18** _(code-verified only — no simulator/device in this environment)_: `TrendTab` in `Spending.tsx`, `useFetchData<TSpendingTrend>` against `.../spending-summary/trend?months=3`, `BarChart` fed `totalSpending` per `targetMonth`.
- [x] **Spending's Trend tab renders a donut of the most recent month's category breakdown, fed from the same request as the bar chart (no second network call)** _(code-verified)_: `pieData`/`latestBreakdown` are both derived from the single `trend.monthlySummary` response also used for `barData` — no second `useFetchData` call.
- [x] **The donut has a visible legend** _(code-verified only, not confirmed on-device — see the flagged item below)_: `styles.legend` block renders one row per `latestBreakdown` entry directly under the `PieChart`, each with a `legendSwatch` (`CHART_COLORS[i % CHART_COLORS.length]`), the category name (`legendLabel`), and `৳{c.total.toFixed(2)} ({percentage}%)` (`legendValue`) — the specific gap this spec exists to close.
- [x] **Legend swatch colors visually match their corresponding donut slice colors** _(code-verified)_: both `pieData`'s slice `color` and the legend's `legendSwatch` `backgroundColor` index the same `CHART_COLORS[i % CHART_COLORS.length]` over the same `latestBreakdown` array/order — guaranteed to match by construction, not just by visual coincidence.
- [x] **A zero-activity month still renders as a real zero-valued bar, not a gap or crash** _(code-verified, unchanged from spec 18)_: `barData`/`pieData` are built via a plain `.map()` over the full `monthlySummary` array — no filter ever drops an entry.
- [x] **Mileage's Trends tab renders a bar chart of `totalDistanceKm` per month, identical behavior to spec 18 (no legend — single series, not applicable)** _(code-verified only)_: `MileageTrendTab.tsx` recreated byte-for-byte identical to the pre-spec-25 version (confirmed via `git show` against the original commit).
- [x] **Both tabs' pill buttons behave like every other existing tab; the existing horizontal-scroll tab bar accommodates the re-added 4th/5th pill without any new overflow/height issue** _(code-verified)_: `"trend"`/`"trends"` were added as plain entries to the existing `TABS` arrays and render switches — no tab-bar styling touched; both screens' tab-bar `ScrollView` (with `tabBarScroll`'s `flexGrow: 0` fix from spec 18's own on-device addendum) was already in place before this spec and is untouched.
- [x] **`architecture.md`/`project-overview.md`/`ui-context.md` again state the charting-library exception, each with an updated historical footnote naming specs 18, 25, and 28**: all three updated in this pass.
- [x] **`expo lint` and `npx tsc --noEmit` both clean**: 0 errors, 0 warnings on both.
- [ ] **Exercise the donut + legend on a real device or simulator before calling this closed** — the original bug (missing legend) was only ever visible on-device, never caught by lint/type-checking, so the code-only verification pass above does not actually confirm the fix. **Not exercised on a real device/simulator** — same standing gap as every other spec in this app (no `adb`/`xcrun` in this environment). This is the one item in this spec's Verify list that must not be marked done from static review alone — flagged for the user to confirm on their next device session.

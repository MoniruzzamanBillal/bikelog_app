# 08: Mileage Statistics

Status: ✅ Complete

## Goal

Build the mileage screen (`app/bikes/[bikeId]/mileage.tsx` route + `Mileage` component + 4 sub-tab components): display motorcycle fuel economy (average km/liter) via 4 tabs: History (exact records + rolling average), Monthly (breakdown by month), Yearly (breakdown by year), Lifetime (all-time totals).

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `GET /bikes/:bikeId/mileage` — returns `{ exactRecords: [...], approximate: { mileageKmPerLiter, basedOnFuelLogCount, isEstimate } | null }` (approximate computed from trailing 10 fuel logs).
- `GET /bikes/:bikeId/mileage/monthly?targetMonth=YYYY-MM` — returns `{ totalDistanceKm, totalLitersConsumed, fuelLogCount, targetMonth }`.
- `GET /bikes/:bikeId/mileage/yearly?targetYear=YYYY` — returns `{ totalDistanceKm, totalLitersConsumed, fuelLogCount }` per month + overall.
- `GET /bikes/:bikeId/mileage/lifetime` — returns `{ totalDistanceKm, totalLitersConsumed, fuelLogCount }`.

**Key behaviors**:
- exactRecords = array of { date, odometerReading, litersAdded, mileageKmPerLiter } (historical records from full-tank logs).
- approximate can be null if fewer than 10 full-tank logs exist (don't divide by zero).
- Averages are **NOT** returned by API — always compute client-side (totalDistanceKm / totalLitersConsumed).
- Tabs should be tab-switched (Paper or native Tab component, not separate screens).

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/bikes/[bikeId]/mileage.tsx` | Create | One-liner route wrapper. |
| `components/main/Mileage/Mileage.tsx` | Create | Tab switcher component, pulls data for all 4 tabs. |
| `components/main/Mileage/MileageHistoryTab.tsx` | Create | Exact records + rolling average, ScrollView of entries. |
| `components/main/Mileage/MonthlyMileageTab.tsx` | Create | Month/year selector, displays total distance/liters/average for selected month. |
| `components/main/Mileage/YearlyMileageTab.tsx` | Create | Year selector, displays per-month grid + overall totals. |
| `components/main/Mileage/LifetimeMileageTab.tsx` | Create | Simple totals (all-time distance/liters), single card. |
| `types/mileage.types.ts` | Create | `IExactMileageRecord`, `IMileageApproximate`, `IMonthlyMileage`, `IYearlyMileage`, etc. |

### Mileage (tab switcher)

```tsx
export function Mileage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 2 && styles.tabActive]}
          onPress={() => setActiveTab(2)}
        >
          <Text>Yearly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 3 && styles.tabActive]}
          onPress={() => setActiveTab(3)}
        >
          <Text>Lifetime</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 0 && <MileageHistoryTab bikeId={bikeId} />}
      {activeTab === 1 && <MonthlyMileageTab bikeId={bikeId} />}
      {activeTab === 2 && <YearlyMileageTab bikeId={bikeId} />}
      {activeTab === 3 && <LifetimeMileageTab bikeId={bikeId} />}
    </View>
  );
}
```

### MileageHistoryTab

```tsx
export function MileageHistoryTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<{
    exactRecords: IExactMileageRecord[];
    approximate: IMileageApproximate | null;
  }>(["mileage", bikeId, "exact"], `/bikes/${bikeId}/mileage`);

  const records = data?.exactRecords || [];
  const approx = data?.approximate;
  const avgMileage = approx?.mileageKmPerLiter?.toFixed(2) || "—";

  return (
    <ScrollView style={styles.container}>
      {isLoading ? (
        <SectionLoading count={5} />
      ) : records.length === 0 ? (
        <EmptyState label="No mileage data yet. Log full tanks to track consumption." />
      ) : (
        <>
          {approx && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Average Mileage (last 10 fills)</Text>
              <Text style={styles.summaryValue}>{avgMileage} km/L</Text>
              <Text style={styles.summaryNote}>
                {approx.isEstimate ? "Estimated" : "Calculated"} from {approx.basedOnFuelLogCount} logs
              </Text>
            </View>
          )}

          <Text style={styles.recordsTitle}>Full Tank Records</Text>
          {records.map((record) => (
            <View key={`${record.date}-${record.odometerReading}`} style={styles.record}>
              <Text style={styles.recordDate}>{format(new Date(record.date), "dd MMM yyyy")}</Text>
              <Text>Odometer: {record.odometerReading} km</Text>
              <Text>Liters: {record.litersAdded}</Text>
              <Text>Mileage: {record.mileageKmPerLiter?.toFixed(2) || "—"} km/L</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
```

### MonthlyMileageTab

```tsx
export function MonthlyMileageTab({ bikeId }: { bikeId: string }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), "yyyy-MM"));

  const { data, isLoading } = useFetchData<{
    totalDistanceKm: number;
    totalLitersConsumed: number;
    fuelLogCount: number;
    targetMonth: string;
  }>(
    ["mileage", bikeId, "monthly", targetMonth],
    `/bikes/${bikeId}/mileage/monthly?targetMonth=${targetMonth}`
  );

  const totalDist = data?.totalDistanceKm || 0;
  const totalLiters = data?.totalLitersConsumed || 0;
  const avgMileage = totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : "—";

  return (
    <KeyboardAwareScrollView style={styles.container}>
      {isLoading ? (
        <SectionLoading count={3} />
      ) : (
        <>
          <View style={styles.selector}>
            <Text>Month: </Text>
            <TextInput
              value={targetMonth}
              onChangeText={setTargetMonth}
              placeholder="yyyy-MM"
              style={styles.monthInput}
            />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Distance</Text>
            <Text style={styles.summaryValue}>{totalDist} km</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Fuel</Text>
            <Text style={styles.summaryValue}>{totalLiters} L</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Average Mileage</Text>
            <Text style={styles.summaryValue}>{avgMileage} km/L</Text>
          </View>

          <Text style={styles.logCount}>Fill-ups this month: {data?.fuelLogCount || 0}</Text>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}
```

### YearlyMileageTab & LifetimeMileageTab

Similar structure (fetch from appropriate endpoint, display totals, compute average client-side). Yearly shows a per-month breakdown grid; Lifetime shows simple all-time totals.

## Implementation

1. **Create `types/mileage.types.ts`**: Type definitions for all mileage responses.
2. **Create `components/main/Mileage/` folder** and 4 tab component files.
3. **Create `app/bikes/[bikeId]/mileage.tsx`** route wrapper.
4. **Test each tab**: Verify data fetches and displays correctly.
5. **Test average computation**: Verify client-side math is correct.
6. **Run `expo lint`**.

## Dependencies

Spec 06 (Bike hub) must exist first.

## Verify

- [x] **History tab displays** *(code-verified — no simulator/device)*: `MileageHistoryTab.tsx` calls `useFetchData<TMileageHistoryResponse>(["mileage", "history", bikeId], "/bikes/${bikeId}/mileage")`, reads `data?.data`, renders `exactRecords` list and `approximate` summary card when available. `isLoading` → `SectionLoading`, empty → `EmptyState`.
- [x] **Monthly tab displays**: `MonthlyMileageTab.tsx` with month text input `yyyy-MM`, GET `/bikes/${bikeId}/mileage/monthly?targetMonth=...`, renders distance/fuel/avg cards + log count. Client-side avg: `totalDistanceKm / totalLitersConsumed`.
- [x] **Yearly tab displays**: `YearlyMileageTab.tsx` with prev/next year selector (chevron buttons), GET `/bikes/${bikeId}/mileage/yearly?targetYear=...`, per-month card grid with month name, avg, distance, fuel, log count.
- [x] **Lifetime tab displays**: `LifetimeMileageTab.tsx` GET `/bikes/${bikeId}/mileage/lifetime`, renders main avg card + total distance/fuel cards + log count. Empty state when no logs.
- [x] **Averages computed correctly client-side**: Every tab computes `totalDistanceKm / totalLitersConsumed` with zero-division guard (`totalLiters > 0 ? ... : "—"`).
- [x] **Null approximate handled gracefully**: `MileageHistoryTab.tsx` renders `EmptyState` when `exactRecords.length === 0 && !approx`. If `approx` is null, the summary card simply doesn't render; no division by zero.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

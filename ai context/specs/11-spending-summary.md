# 11: Spending Summary

Status: ✅ Complete

## Goal

Build the spending screen (`app/bikes/[bikeId]/spending.tsx` route + `Spending` component + 3 sub-tab components): display total spending with category breakdown via 3 tabs: Month (current month), Year (current year), Lifetime (all-time).

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `GET /bikes/:bikeId/spending-summary?period=month&targetMonth=YYYY-MM` — required params: `period` (exactly `month` | `year` | `lifetime`), optional `targetMonth` (if period=month), optional `targetYear` (if period=year).
- Response: `{ period, targetMonth?, targetYear?, totalSpending, categoryBreakdown }` where `categoryBreakdown` is a list of `{ category (string, e.g. "Fuel", "Engine Oil", "Tire Change"), amount }`, sorted descending by amount.
- **Key behavior**: API returns totals only — **no pre-computed averages**. Averages (e.g. average cost per fuel log) are always computed client-side if ever needed.

**UI**:
- Three tabs: Month, Year, Lifetime.
- Month tab: shows spending for selected month (selector), total + category breakdown.
- Year tab: shows spending for selected year, total + category breakdown.
- Lifetime tab: all-time totals, no selector.
- Display: total as a prominent card, category breakdown as a stacked bar chart or simple list (for v1, plain list is simpler).

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/bikes/[bikeId]/spending.tsx` | Create | One-liner route wrapper. |
| `components/main/Spending/Spending.tsx` | Create | Tab switcher component (Month/Year/Lifetime). |
| `components/main/Spending/SpendingSummaryView.tsx` | Create | Reusable component showing total + category breakdown (used by all 3 tabs). |
| `types/spending.types.ts` | Create | `ISpendingSummary`, `ICategoryBreakdown`, etc. |

### Spending (tab switcher)

```tsx
export function Spending() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text>Year</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 2 && styles.tabActive]}
          onPress={() => setActiveTab(2)}
        >
          <Text>Lifetime</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 0 && <MonthSpendingTab bikeId={bikeId} />}
      {activeTab === 1 && <YearSpendingTab bikeId={bikeId} />}
      {activeTab === 2 && <LifetimeSpendingTab bikeId={bikeId} />}
    </View>
  );
}

function MonthSpendingTab({ bikeId }: { bikeId: string }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data, isLoading } = useFetchData<ISpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`
  );

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.selector}>
        <Text>Month: </Text>
        <TextInput
          value={targetMonth}
          onChangeText={setTargetMonth}
          placeholder="yyyy-MM"
          style={styles.monthInput}
        />
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : data ? (
        <SpendingSummaryView summary={data} />
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
    </KeyboardAwareScrollView>
  );
}

function YearSpendingTab({ bikeId }: { bikeId: string }) {
  const [targetYear, setTargetYear] = useState(format(new Date(), "yyyy"));
  const { data, isLoading } = useFetchData<ISpendingSummary>(
    ["spending", bikeId, "year", targetYear],
    `/bikes/${bikeId}/spending-summary?period=year&targetYear=${targetYear}`
  );

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.selector}>
        <Text>Year: </Text>
        <TextInput
          value={targetYear}
          onChangeText={setTargetYear}
          placeholder="yyyy"
          style={styles.yearInput}
        />
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : data ? (
        <SpendingSummaryView summary={data} />
      ) : (
        <EmptyState label="No spending data for this year" />
      )}
    </KeyboardAwareScrollView>
  );
}

function LifetimeSpendingTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<ISpendingSummary>(
    ["spending", bikeId, "lifetime"],
    `/bikes/${bikeId}/spending-summary?period=lifetime`
  );

  return (
    <KeyboardAwareScrollView style={styles.container}>
      {isLoading ? (
        <SectionLoading count={3} />
      ) : data ? (
        <SpendingSummaryView summary={data} />
      ) : (
        <EmptyState label="No lifetime spending data" />
      )}
    </KeyboardAwareScrollView>
  );
}
```

### SpendingSummaryView component

```tsx
export function SpendingSummaryView({ summary }: { summary: ISpendingSummary }) {
  const total = summary.totalSpending || 0;
  const categories = summary.categoryBreakdown || [];

  return (
    <View>
      {/* Total card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Spending</Text>
        <Text style={styles.totalValue}>৳{total.toFixed(2)}</Text>
      </View>

      {/* Category breakdown */}
      <Text style={styles.categoriesTitle}>By Category</Text>
      {categories.length === 0 ? (
        <Text style={styles.noData}>No category breakdown available</Text>
      ) : (
        categories.map((cat, i) => {
          const percentage = total > 0 ? ((cat.amount / total) * 100).toFixed(1) : 0;
          return (
            <View key={i} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <Text style={styles.categoryAmount}>
                  ৳{cat.amount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.categoryPercent}>{percentage}%</Text>
            </View>
          );
        })
      )}
    </View>
  );
}
```

## Implementation

1. **Create `types/spending.types.ts`**: `ISpendingSummary`, `ICategoryBreakdown`.
2. **Create `components/main/Spending/Spending.tsx`** tab switcher.
3. **Create `components/main/Spending/SpendingSummaryView.tsx`** summary component.
4. **Create `app/bikes/[bikeId]/spending.tsx`** route wrapper.
5. **Test month/year/lifetime tabs**: Verify data fetches and displays for each period.
6. **Test category breakdown**: Verify categories are shown with amounts and percentages.
7. **Run `expo lint`**.

## Dependencies

Spec 06 (Bike hub) must exist first.

## Verify

- [x] **Month tab displays** *(code-verified only — no simulator/device in this environment)*: `MonthTab` in `Spending.tsx` fetches `useFetchData<TSpendingSummary>(["spending", bikeId, "month", targetMonth], "/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}")`, `targetMonth` defaults to the current month (`format(new Date(), "yyyy-MM")`) and is editable via a text input, renders `SpendingSummaryView` on success.
- [x] **Year tab displays**: Same pattern, `targetYear` defaults to current year, `period=year&targetYear=...`.
- [x] **Lifetime tab displays**: No selector, `period=lifetime` only.
- [x] **Total displayed prominently**: `SpendingSummaryView`'s `totalCard` is a large centered card, `fontSize: 28` value.
- [x] **Categories displayed correctly**: name, amount (`৳${cat.total.toFixed(2)}` — see Implementation Note below on the field name), percentage per row.
- [x] **Percentage calculation correct**: `(cat.total / total) * 100`, guarded against division by zero (`total > 0 ? ... : "0.0"`).
- [x] **Empty state shown**: when `!summary || summary.totalSpending <= 0`, renders `EmptyState` instead of `SpendingSummaryView` (stricter than the spec's own sample, which only checked truthiness of `data` — showing an empty-but-present zero-total response as "no data" is reasonable UX, not a defect).
- [x] **No averages pre-computed**: `TSpendingSummary` type has no average field; only `totalSpending` + `categoryBreakdown`.
- [x] **Currency prefix**: `৳` before every amount (total and each category row).
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note**: this spec's own sample code uses `cat.amount` throughout, but the actual backend field (confirmed via `bikelog_server/src/app/modules/spending/spending.interface.ts`: `TSpendingCategoryBreakdown = { category: string; total: number }`) is `total`, not `amount` — the implementation correctly used `cat.total`, diverging from the spec's sample. Also confirmed the response envelope needs the standard single `.data` drill (`data?.data`, not `.data.data.result` or similar) — `getSpendingSummaryFromDB` returns the summary object directly, no pagination wrapper, matching a single-object fetch like `GET /bikes/:id`. This checklist was not filled in when the spec was originally marked complete; annotated during a later review pass (2026-07-22) — no code changes were needed, the implementation was already correct.

import { Panel } from "@/components/main/shared";
import { TPeriodCategoryBreakdown } from "@/types/spending.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

interface PeriodSpendingBreakdownProps {
  data: TPeriodCategoryBreakdown;
  periodLabel?: string;
  avgDailyExpense?: number;
  daysElapsed?: number;
  avgDailyScopeLabel?: string;
}

// Litres read as "3.3L" / "225L" — two decimals, trailing zeros trimmed.
function formatLiters(liters: number): string {
  const rounded = Math.round(liters * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}L`;
}

/**
 * Spec 65: the Year / Lifetime tabs' spending view. Same total panel + category accordion
 * as the Month tab's MonthlySpendingBreakdown, but a category expands to TIME BUCKETS
 * instead of individual records — per-month rows for a year ("Jan  3.3L  ৳650"), per-year
 * rows for lifetime ("2026  225L  ৳5678"). Fed by `bikelog_server` spec 61's
 * /spending-summary/period-breakdown, which buckets server-side. Litres show on the Fuel
 * category only (null elsewhere).
 */
export function PeriodSpendingBreakdown({
  data,
  periodLabel,
  avgDailyExpense,
  daysElapsed,
  avgDailyScopeLabel = "this period",
}: PeriodSpendingBreakdownProps) {
  const total = data?.totalSpending || 0;
  const categories = data?.categories ?? [];
  const maxCategory = categories?.[0]?.total ?? 0;
  const showAvgDaily =
    avgDailyExpense !== undefined &&
    daysElapsed !== undefined &&
    daysElapsed > 0;

  // Closed by default, keyed by category name. Reset whenever the period changes — carrying
  // one year's open rows into another (which may not hold those categories) reads as a
  // glitch. Mirrors MonthlySpendingBreakdown.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpanded({});
  }, [data?.period, data?.targetYear]);

  return (
    <View style={styles.stack}>
      <Panel glow style={styles.totalPanel}>
        <View style={styles.totalLeft}>
          <Text style={styles.totalLabel}>
            {periodLabel ? `Total spending · ${periodLabel}` : "Total spending"}
          </Text>
          <Text style={styles.totalValue}>{formatTaka(total)}</Text>
        </View>

        {showAvgDaily ? (
          <View style={styles.avgCol}>
            <Text style={styles.avgValue}>
              {formatTaka(avgDailyExpense)} / day
            </Text>
            <Text style={styles.avgHint}>
              over {daysElapsed} day{daysElapsed === 1 ? "" : "s"}{" "}
              {avgDailyScopeLabel}
            </Text>
          </View>
        ) : null}
      </Panel>

      <Text style={styles.kicker}>BY CATEGORY · TAP TO EXPAND</Text>

      {categories?.length === 0 ? (
        <Text style={styles.noData}>No category breakdown available</Text>
      ) : (
        <Panel style={styles.listPanel}>
          {categories?.map((cat, i) => {
            const catTotal = cat?.total ?? 0;
            const percentage =
              total > 0 ? ((catTotal / total) * 100).toFixed(1) : "0.0";
            const barWidth =
              maxCategory > 0 ? (catTotal / maxCategory) * 100 : 0;
            const color = CHART_COLORS[Math.min(i, 4)];
            const open = !!expanded?.[cat?.category];
            const count = cat?.buckets?.length ?? 0;

            return (
              <View
                key={cat?.category}
                style={[
                  styles.categoryBlock,
                  i > 0 ? styles.categoryDivider : null,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [cat?.category]: !prev?.[cat?.category],
                    }))
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${cat?.category}, ${formatTaka(
                    catTotal,
                  )}, ${count} ${count === 1 ? "period" : "periods"}`}
                  style={styles.categoryRow}
                >
                  <View style={styles.categoryTop}>
                    <View style={[styles.swatch, { backgroundColor: color }]} />
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {cat?.category}
                    </Text>
                    <Text style={styles.categoryAmount}>
                      {formatTaka(catTotal)}
                    </Text>
                    <MaterialCommunityIcons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={COLORS.textLight}
                    />
                  </View>

                  <View style={styles.categoryBottom}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${barWidth}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                    <Text style={styles.percent}>{percentage}%</Text>
                  </View>
                </TouchableOpacity>

                {open && (
                  <View style={styles.records}>
                    {cat?.buckets?.map((bucket) => (
                      <View key={bucket?.key} style={styles.recordRow}>
                        <Text style={styles.recordLabel}>{bucket?.label}</Text>
                        <Text style={styles.recordLiters}>
                          {bucket?.liters != null
                            ? formatLiters(bucket?.liters)
                            : ""}
                        </Text>
                        <Text style={styles.recordAmount}>
                          {formatTaka(bucket?.total ?? 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </Panel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  totalPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  totalLeft: {
    flex: 1,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  avgCol: {
    alignItems: "flex-end",
    maxWidth: "45%",
  },
  avgValue: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  avgHint: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textLight,
    textAlign: "right",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginTop: 4,
  },
  noData: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  listPanel: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryBlock: {
    paddingVertical: 12,
  },
  categoryDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surface2,
  },
  categoryRow: {
    gap: 6,
  },
  categoryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  categoryAmount: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  categoryBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.surface2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    borderRadius: 3,
  },
  percent: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    minWidth: 38,
    textAlign: "right",
  },
  records: {
    marginTop: 10,
    gap: 2,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    paddingLeft: 16,
  },
  recordLabel: {
    width: 52,
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  recordLiters: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  recordAmount: {
    fontSize: 12.5,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
});

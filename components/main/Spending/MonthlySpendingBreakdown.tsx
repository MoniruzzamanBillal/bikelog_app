import { Panel } from "@/components/main/shared";
import { TMonthlyCategoryBreakdown } from "@/types/spending.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

interface MonthlySpendingBreakdownProps {
  data: TMonthlyCategoryBreakdown;
  periodLabel?: string;
  avgDailyExpense?: number;
  daysElapsed?: number;
}

/**
 * Spec 62: the Month tab's spending view. Same total panel as SpendingSummaryView, but
 * the category list is an accordion — tapping a category reveals that category's
 * line-item records for the month (date, description, amount). Fed by `bikelog_server`
 * spec 60's /spending-summary/monthly-breakdown, which nests the records under each
 * category server-side. The Year / Lifetime / Trend tabs keep SpendingSummaryView.
 */
export function MonthlySpendingBreakdown({
  data,
  periodLabel,
  avgDailyExpense,
  daysElapsed,
}: MonthlySpendingBreakdownProps) {
  const total = data?.totalSpending || 0;
  const categories = data?.categories ?? [];
  const maxCategory = categories[0]?.total ?? 0;
  const showAvgDaily =
    avgDailyExpense !== undefined &&
    daysElapsed !== undefined &&
    daysElapsed > 0;

  // Closed by default, keyed by category name. Reset whenever the month changes —
  // carrying one month's open rows into another month (which may not even hold those
  // categories) reads as a glitch. Mirrors the reference TrendTab's behaviour.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpanded({});
  }, [data?.targetMonth]);

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
              over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
            </Text>
          </View>
        ) : null}
      </Panel>

      <Text style={styles.kicker}>BY CATEGORY · TAP TO EXPAND</Text>

      {categories.length === 0 ? (
        <Text style={styles.noData}>No category breakdown available</Text>
      ) : (
        <Panel style={styles.listPanel}>
          {categories.map((cat, i) => {
            const percentage =
              total > 0 ? ((cat.total / total) * 100).toFixed(1) : "0.0";
            const barWidth =
              maxCategory > 0 ? (cat.total / maxCategory) * 100 : 0;
            const color = CHART_COLORS[Math.min(i, 4)];
            const open = !!expanded[cat.category];
            const count = cat.records.length;

            return (
              <View
                key={cat.category}
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
                      [cat.category]: !prev[cat.category],
                    }))
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${cat.category}, ${formatTaka(
                    cat.total,
                  )}, ${count} ${count === 1 ? "entry" : "entries"}`}
                  style={styles.categoryRow}
                >
                  <View style={styles.categoryTop}>
                    <View style={[styles.swatch, { backgroundColor: color }]} />
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {cat.category}
                    </Text>
                    <Text style={styles.categoryAmount}>
                      {formatTaka(cat.total)}
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

                {open ? (
                  <View style={styles.records}>
                    {cat.records.map((rec, ri) => {
                      const secondary = rec.vendor ?? rec.remarks;
                      return (
                        <View
                          key={`${cat.category}-${ri}`}
                          style={styles.recordRow}
                        >
                          <Text style={styles.recordDate}>
                            {formatApiDate(rec.date, "d MMM")}
                          </Text>
                          <View style={styles.recordMain}>
                            <Text style={styles.recordDesc} numberOfLines={2}>
                              {rec.description}
                            </Text>
                            {secondary ? (
                              <Text
                                style={styles.recordSecondary}
                                numberOfLines={1}
                              >
                                {secondary}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.recordAmount}>
                            {formatTaka(rec.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
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
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  totalLeft: {
    flex: 1,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  avgCol: {
    alignItems: "flex-end",
    maxWidth: "45%",
  },
  avgValue: {
    fontSize: 12,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  avgHint: {
    fontSize: 11,
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
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 7,
    paddingLeft: 16,
  },
  recordDate: {
    width: 46,
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    paddingTop: 1,
  },
  recordMain: {
    flex: 1,
    minWidth: 0,
  },
  recordDesc: {
    fontSize: 12.5,
    color: COLORS.text,
  },
  recordSecondary: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 1,
  },
  recordAmount: {
    fontSize: 12.5,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    paddingTop: 1,
  },
});

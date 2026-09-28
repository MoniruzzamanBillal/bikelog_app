import { Panel } from "@/components/main/shared";
import { TSpendingSummary } from "@/types/spending.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface SpendingSummaryViewProps {
  summary: TSpendingSummary;
  periodLabel?: string;
  avgDailyExpense?: number;
  daysElapsed?: number;
}

export function SpendingSummaryView({
  summary,
  periodLabel,
  avgDailyExpense,
  daysElapsed,
}: SpendingSummaryViewProps) {
  const total = summary.totalSpending || 0;
  const categories = [...(summary.categoryBreakdown || [])].sort(
    (a, b) => b.total - a.total,
  );
  const maxCategory = categories[0]?.total ?? 0;
  const showAvgDaily =
    avgDailyExpense !== undefined &&
    daysElapsed !== undefined &&
    daysElapsed > 0;

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
            <Text style={styles.avgValue}>{formatTaka(avgDailyExpense)} / day</Text>
            <Text style={styles.avgHint}>
              over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
            </Text>
          </View>
        ) : null}
      </Panel>

      <Text style={styles.kicker}>BY CATEGORY</Text>

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

            return (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryTop}>
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.category}
                  </Text>
                  <Text style={styles.categoryAmount}>
                    {formatTaka(cat.total)}
                  </Text>
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
    color: COLORS.textLight,
    textAlign: "right",
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginTop: 4,
  },
  noData: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  listPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    minWidth: 38,
    textAlign: "right",
  },
});

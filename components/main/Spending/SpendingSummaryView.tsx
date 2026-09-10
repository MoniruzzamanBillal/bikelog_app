import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/utils/colors";
import { TSpendingSummary } from "@/types/spending.types";

interface SpendingSummaryViewProps {
  summary: TSpendingSummary;
  avgDailyExpense?: number;
  daysElapsed?: number;
}

export function SpendingSummaryView({
  summary,
  avgDailyExpense,
  daysElapsed,
}: SpendingSummaryViewProps) {
  const total = summary.totalSpending || 0;
  const categories = summary.categoryBreakdown || [];

  return (
    <View>
      <View style={styles.totalWrap}>
        <Text style={styles.totalLabel}>Total Spending</Text>
        <Text style={styles.totalValue}>৳{total.toFixed(0)}</Text>
        {avgDailyExpense !== undefined &&
          daysElapsed !== undefined &&
          daysElapsed > 0 && (
            <Text style={styles.avgCaption}>
              Avg daily: ৳{avgDailyExpense.toFixed(0)} · {daysElapsed} day
              {daysElapsed === 1 ? "" : "s"}
            </Text>
          )}
      </View>

      <Text style={styles.categoriesTitle}>Category Breakdown</Text>
      {categories.length === 0 ? (
        <Text style={styles.noData}>No category breakdown available</Text>
      ) : (
        <View style={styles.listCard}>
          {categories.map((cat, i) => {
            const percentage = total > 0 ? ((cat.total / total) * 100).toFixed(1) : "0.0";
            return (
              <View
                key={cat.category}
                style={[
                  styles.categoryRow,
                  i === categories.length - 1 && styles.categoryRowLast,
                ]}
              >
                <Text style={styles.categoryName}>{cat.category}</Text>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>৳{cat.total.toFixed(0)}</Text>
                  <Text style={styles.categoryPercent}>{percentage}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  totalWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "300",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  avgCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  categoriesTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  categoryRowLast: {
    borderBottomWidth: 0,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  categoryPercent: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  noData: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 20,
  },
});

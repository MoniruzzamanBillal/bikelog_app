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
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Spending</Text>
        <Text style={styles.totalValue}>৳{total.toFixed(2)}</Text>
      </View>

      {avgDailyExpense !== undefined && daysElapsed !== undefined && daysElapsed > 0 && (
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>Avg Daily Expense</Text>
          <Text style={styles.avgValue}>৳{avgDailyExpense.toFixed(2)}</Text>
          <Text style={styles.avgCaption}>
            over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
          </Text>
        </View>
      )}

      <Text style={styles.categoriesTitle}>By Category</Text>
      {categories.length === 0 ? (
        <Text style={styles.noData}>No category breakdown available</Text>
      ) : (
        categories.map((cat, i) => {
          const percentage = total > 0 ? ((cat.total / total) * 100).toFixed(1) : "0.0";
          return (
            <View key={i} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <Text style={styles.categoryAmount}>৳{cat.total.toFixed(2)}</Text>
              </View>
              <Text style={styles.categoryPercent}>{percentage}%</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  avgCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avgLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  avgValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  avgCaption: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryPercent: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  noData: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 20,
  },
});

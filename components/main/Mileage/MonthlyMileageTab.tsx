import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { ScrollView } from "react-native-gesture-handler";
import { TextInput } from "react-native-paper";
import { SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMonthlyMileage } from "@/types/mileage.types";

interface MonthlyMileageTabProps {
  bikeId: string;
}

export function MonthlyMileageTab({ bikeId }: MonthlyMileageTabProps) {
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(format(now, "yyyy-MM"));

  const { data, isLoading } = useFetchData<TMonthlyMileage>(
    ["mileage", "monthly", bikeId, targetMonth],
    `/bikes/${bikeId}/mileage/monthly?targetMonth=${targetMonth}`,
    { enabled: !!bikeId && !!targetMonth },
  );

  const monthly = data?.data;
  const totalDist = monthly?.totalDistanceKm ?? 0;
  const totalLiters = monthly?.totalLitersConsumed ?? 0;
  const avgMileage =
    totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : "—";

  if (isLoading) {
    return <SectionLoading count={3} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.selectorRow}>
        <Text style={styles.selectorLabel}>Month: </Text>
        <View style={styles.monthInputWrapper}>
          <TextInput
            placeholder="yyyy-MM"
            value={targetMonth}
            onChangeText={setTargetMonth}
            textColor={COLORS.text}
            style={styles.input}
          />
        </View>
      </View>

      {monthly && monthly.fuelLogCount > 0 ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Average Mileage</Text>
            <Text style={styles.summaryValue}>{avgMileage} km/L</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Distance</Text>
            <Text style={styles.summaryValue}>{totalDist} km</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Fuel</Text>
            <Text style={styles.summaryValue}>{totalLiters.toFixed(2)} L</Text>
          </View>
          <Text style={styles.logCount}>
            Fill-ups this month: {monthly.fuelLogCount}
          </Text>
        </>
      ) : (
        <Text style={styles.emptyText}>No fuel logs for this month.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 8,
  },
  monthInputWrapper: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  input: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  logCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 40,
  },
});

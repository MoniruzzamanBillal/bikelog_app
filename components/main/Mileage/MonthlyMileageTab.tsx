import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { ScrollView } from "react-native-gesture-handler";
import { ErrorState, MonthStepper, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMonthlyMileage } from "@/types/mileage.types";

interface MonthlyMileageTabProps {
  bikeId: string;
}

export function MonthlyMileageTab({ bikeId }: MonthlyMileageTabProps) {
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(format(now, "yyyy-MM"));

  const { data, isLoading, isError, refetch } = useFetchData<TMonthlyMileage>(
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
      <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : monthly && monthly.fuelLogCount > 0 ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Mileage</Text>
            <Text style={styles.statValue}>{avgMileage}</Text>
            <Text style={styles.statUnit}>km/L</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{totalDist.toLocaleString()}</Text>
            <Text style={styles.statUnit}>km</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Fuel</Text>
            <Text style={styles.statValue}>{totalLiters.toFixed(1)}</Text>
            <Text style={styles.statUnit}>L</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No fuel logs for this month.</Text>
      )}

      {monthly && monthly.fuelLogCount > 0 && (
        <Text style={styles.logCount}>Fill-ups this month: {monthly.fuelLogCount}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 4,
  },
  statUnit: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 1,
  },
  logCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 40,
  },
});

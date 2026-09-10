import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { ErrorState, SectionLoading, YearStepper } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TYearlyMileage } from "@/types/mileage.types";

interface YearlyMileageTabProps {
  bikeId: string;
}

export function YearlyMileageTab({ bikeId }: YearlyMileageTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data, isLoading, isError, refetch } = useFetchData<TYearlyMileage>(
    ["mileage", "yearly", bikeId, year],
    `/bikes/${bikeId}/mileage/yearly?targetYear=${year}`,
    { enabled: !!bikeId && !!year },
  );

  const yearly = data?.data;

  if (isLoading) {
    return <SectionLoading count={4} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <YearStepper year={year} onChange={setYear} />

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : yearly?.monthlySummary && yearly.monthlySummary.length > 0 ? (
        <View style={styles.listCard}>
          {yearly.monthlySummary.map((m, i) => {
            const avg =
              m.totalLitersConsumed > 0
                ? (m.totalDistanceKm / m.totalLitersConsumed).toFixed(1)
                : "—";
            const monthIndex = Number(m.targetMonth.split("-")[1]) - 1;
            const monthName = new Date(Number(year), monthIndex).toLocaleString(
              "default",
              { month: "long" },
            );
            return (
              <View
                key={m.targetMonth}
                style={[
                  styles.row,
                  i === yearly.monthlySummary.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.monthName}>{monthName}</Text>
                  <Text style={styles.monthDetail}>
                    {m.totalDistanceKm.toLocaleString()} km ·{" "}
                    {m.totalLitersConsumed.toFixed(1)} L · {m.fuelLogCount} logs
                  </Text>
                </View>
                <Text style={styles.monthAvg}>{avg} km/L</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>No fuel logs for {year}.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flex: 1,
  },
  monthName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  monthAvg: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
  },
  monthDetail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 40,
  },
});

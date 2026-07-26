import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SectionLoading, YearStepper } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TYearlyMileage } from "@/types/mileage.types";

interface YearlyMileageTabProps {
  bikeId: string;
}

export function YearlyMileageTab({ bikeId }: YearlyMileageTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data, isLoading } = useFetchData<TYearlyMileage>(
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

      {yearly?.monthlySummary && yearly.monthlySummary.length > 0 ? (
        yearly.monthlySummary.map((m) => {
          const avg =
            m.totalLitersConsumed > 0
              ? (m.totalDistanceKm / m.totalLitersConsumed).toFixed(2)
              : "—";
          const monthIndex = Number(m.targetMonth.split("-")[1]) - 1;
          const monthName = new Date(Number(year), monthIndex).toLocaleString(
            "default",
            { month: "long" },
          );
          return (
            <View key={m.targetMonth} style={styles.monthCard}>
              <Text style={styles.monthName}>{monthName}</Text>
              <Text style={styles.monthAvg}>{avg} km/L</Text>
              <Text style={styles.monthDetail}>
                {m.totalDistanceKm.toLocaleString()} km ·{" "}
                {m.totalLitersConsumed.toFixed(2)} L · {m.fuelLogCount} logs
              </Text>
            </View>
          );
        })
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
  monthCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  monthName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  monthAvg: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  monthDetail: {
    fontSize: 13,
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

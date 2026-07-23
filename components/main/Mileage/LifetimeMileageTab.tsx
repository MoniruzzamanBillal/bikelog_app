import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TLifetimeMileage } from "@/types/mileage.types";

interface LifetimeMileageTabProps {
  bikeId: string;
}

export function LifetimeMileageTab({ bikeId }: LifetimeMileageTabProps) {
  const { data, isLoading } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );

  const lifetime = data?.data;

  if (isLoading) {
    return <SectionLoading count={3} />;
  }

  if (!lifetime || lifetime.fuelLogCount === 0) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.emptyText}>
          No fuel logs yet. Start logging to see lifetime stats.
        </Text>
      </ScrollView>
    );
  }

  const avg =
    lifetime.totalLitersConsumed > 0
      ? (lifetime.totalDistanceKm / lifetime.totalLitersConsumed).toFixed(2)
      : "—";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>Lifetime Average</Text>
        <Text style={styles.mainValue}>{avg} km/L</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Distance</Text>
        <Text style={styles.summaryValue}>
          {lifetime.totalDistanceKm.toLocaleString()} km
        </Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Fuel</Text>
        <Text style={styles.summaryValue}>
          {lifetime.totalLitersConsumed.toFixed(2)} L
        </Text>
      </View>
      <Text style={styles.logCount}>
        Fuel Logs: {lifetime.fuelLogCount}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainLabel: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },
  summaryCard: {
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
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 4,
  },
  logCount: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 40,
  },
});

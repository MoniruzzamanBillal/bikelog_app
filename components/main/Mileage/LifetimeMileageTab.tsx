import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { ErrorState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TLifetimeMileage } from "@/types/mileage.types";

interface LifetimeMileageTabProps {
  bikeId: string;
}

export function LifetimeMileageTab({ bikeId }: LifetimeMileageTabProps) {
  const { data, isLoading, isError, refetch } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );

  const lifetime = data?.data;

  if (isLoading) {
    return <SectionLoading count={3} />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
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
      ? (lifetime.totalDistanceKm / lifetime.totalLitersConsumed).toFixed(1)
      : "—";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>Lifetime Average</Text>
        <Text style={styles.mainValue}>
          {avg} <Text style={styles.mainUnit}>km/L</Text>
        </Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Distance</Text>
          <Text style={styles.summaryValue}>
            {lifetime.totalDistanceKm.toLocaleString()} km
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Fuel</Text>
          <Text style={styles.summaryValue}>
            {lifetime.totalLitersConsumed.toFixed(1)} L
          </Text>
        </View>
      </View>
      <Text style={styles.logCount}>Fuel Logs: {lifetime.fuelLogCount}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  mainLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 6,
  },
  mainUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textLight,
    fontFamily: "System",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "monospace",
    marginTop: 4,
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

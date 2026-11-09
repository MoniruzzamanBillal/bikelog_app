import {
  EmptyState,
  ErrorState,
  SectionLoading,
  StatTile,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TLifetimeMileage } from "@/types/mileage.types";
import { COLORS } from "@/utils/colors";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MileageBreakdownList } from "./MileageBreakdownList";

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
    return <SectionLoading count={2} />;
  }

  if (isError) {
    return <ErrorState title="Couldn’t load mileage" onRetry={refetch} />;
  }

  if (!lifetime || lifetime?.fuelLogCount === 0) {
    return (
      <EmptyState
        icon="speedometer-medium"
        title="No mileage data yet"
        message="Mileage is calculated when a full-tank fill closes a period. Log two full-tank fills to see your first exact km/l."
      />
    );
  }

  const avg =
    lifetime?.totalLitersConsumed > 0
      ? (lifetime?.totalDistanceKm / lifetime?.totalLitersConsumed).toFixed(2)
      : "—";

  // Per-year breakdown from the SAME single /mileage/lifetime call (server spec 62's
  // `yearlySummary`), newest-first. Guarded `?? []` so an older/un-deployed server
  // that omits the field just shows the totals with no year list.
  const years = lifetime?.yearlySummary ?? [];

  return (
    <View style={styles.stack}>
      <View style={styles.grid}>
        <StatTile
          label="Total distance"
          value={lifetime.totalDistanceKm.toLocaleString()}
          unit="km"
          style={styles.tile}
        />
        <StatTile
          label="Fuel used"
          value={lifetime.totalLitersConsumed.toFixed(2)}
          unit="L"
          style={styles.tile}
        />
        <StatTile
          label="Fill-ups"
          value={lifetime.fuelLogCount}
          style={styles.tile}
        />
        <StatTile
          label="Average"
          value={avg}
          unit={avg === "—" ? undefined : "km/l"}
          style={styles.tile}
        />
      </View>

      {years?.length > 0 ? (
        <>
          <Text style={styles.kicker}>BY YEAR</Text>
          <MileageBreakdownList
            items={years.map((y) => ({
              key: y.targetYear,
              label: y.targetYear,
              totalDistanceKm: y?.totalDistanceKm,
              totalLitersConsumed: y?.totalLitersConsumed,
              totalFuelCost: y?.totalFuelCost,
              fuelLogCount: y?.fuelLogCount,
            }))}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48.3%",
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginTop: 4,
  },
});

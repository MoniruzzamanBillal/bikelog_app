import {
  EmptyState,
  ErrorState,
  SectionLoading,
  StatTile,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TLifetimeMileage } from "@/types/mileage.types";
import { StyleSheet, View } from "react-native";

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

  return (
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
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48.3%",
  },
});

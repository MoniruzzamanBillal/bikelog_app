import {
  EmptyState,
  ErrorState,
  MonthStepper,
  SectionLoading,
  StatTile,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TMonthlyMileage } from "@/types/mileage.types";
import { format } from "date-fns";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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

  return (
    <View style={styles.stack}>
      <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />

      {isLoading ? (
        <SectionLoading count={2} />
      ) : isError ? (
        <ErrorState title="Couldn’t load mileage" onRetry={refetch} />
      ) : monthly && monthly.fuelLogCount > 0 ? (
        <View style={styles.grid}>
          <StatTile
            label="Distance"
            value={totalDist.toLocaleString()}
            unit="km"
            style={styles.tile}
          />
          <StatTile
            label="Fuel used"
            value={totalLiters.toFixed(2)}
            unit="L"
            style={styles.tile}
          />
          <StatTile
            label="Fill-ups"
            value={monthly.fuelLogCount}
            style={styles.tile}
          />
          <StatTile
            label="Average"
            value={avgMileage}
            unit={avgMileage === "—" ? undefined : "km/l"}
            style={styles.tile}
          />
        </View>
      ) : (
        <EmptyState
          icon="speedometer-medium"
          title="Nothing logged this month"
          message="Fuel logs dated in this month will show up here."
        />
      )}
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
});

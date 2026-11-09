import {
  EmptyState,
  ErrorState,
  MonthStepper,
  SectionLoading,
  StatTile,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import {
  TMileageHistoryResponse,
  TMonthlyMileage,
} from "@/types/mileage.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { format } from "date-fns";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MileageRecordCard } from "./MileageRecordCard";

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

  // The per-month fill-up cards reuse the full history (same cache key the History
  // tab owns, so react-query dedupes), filtered client-side to the chosen month —
  // no extra endpoint. A record is assigned to the month its period *closed* in
  // (periodEndDate), which is when its fill-up was logged.
  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );

  const monthly = data?.data;
  const totalDist = monthly?.totalDistanceKm ?? 0;
  const totalLiters = monthly?.totalLitersConsumed ?? 0;
  const avgMileage =
    totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : "—";

  const monthRecords = (historyData?.data?.exactRecords ?? []).filter(
    (r) => formatApiDate(r?.periodEndDate, "yyyy-MM") === targetMonth,
  );
  // Scale each bar against the best km/l within this month's set (same pattern as
  // the History tab, but relative to the month rather than all-time).
  const maxKmpl = Math.max(...monthRecords.map((r) => r?.mileageKmPerLiter), 0);

  return (
    <View style={styles.stack}>
      <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />

      {isLoading ? (
        <SectionLoading count={2} />
      ) : isError ? (
        <ErrorState title="Couldn’t load mileage" onRetry={refetch} />
      ) : monthly && monthly?.fuelLogCount > 0 ? (
        <>
          <View style={styles.grid}>
            <StatTile
              compact
              label="Distance"
              value={totalDist.toLocaleString()}
              unit="km"
              style={styles.tile}
            />
            <StatTile
              compact
              label="Fuel used"
              value={totalLiters.toFixed(2)}
              unit="L"
              style={styles.tile}
            />
            <StatTile
              compact
              label="Fill-ups"
              value={monthly.fuelLogCount}
              style={styles.tile}
            />
            <StatTile
              compact
              label="Average"
              value={avgMileage}
              unit={avgMileage === "—" ? undefined : "km/l"}
              style={styles.tile}
            />
          </View>

          <Text style={styles.kicker}>FILL-UP RECORDS</Text>
          {monthRecords?.length > 0 ? (
            <View style={styles.records}>
              {monthRecords.map((record) => (
                <MileageRecordCard
                  key={record._id}
                  record={record}
                  maxKmpl={maxKmpl}
                  compact
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noRecords}>
              No exact record closed this month — a full-tank fill closes a
              period and adds a card here.
            </Text>
          )}
        </>
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
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginTop: 4,
  },
  records: {
    gap: 10,
  },
  noRecords: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});

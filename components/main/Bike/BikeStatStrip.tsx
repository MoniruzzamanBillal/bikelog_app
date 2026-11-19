import { useFetchData } from "@/hooks/useApi";
import { TEngineOilStatus } from "@/types/engine-oil-log.types";
import { TMileageHistoryResponse } from "@/types/mileage.types";
import { TSpendingSummary } from "@/types/spending.types";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MiniStatsSkeleton } from "./BikeStatStripSkeleton";

function getAvgMileage(history?: TMileageHistoryResponse): number | null {
  const exact = history?.exactRecords ?? [];
  if (exact?.length > 0) {
    const recent = [...exact]
      .sort(
        (a, b) =>
          new Date(b?.periodEndDate).getTime() -
          new Date(a?.periodEndDate).getTime(),
      )
      .slice(0, 5);
    return (
      recent.reduce((sum, r) => sum + r?.mileageKmPerLiter, 0) / recent?.length
    );
  }
  if (history?.approximate) {
    return history?.approximate?.mileageKmPerLiter ?? null;
  }
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

type TBikeStatStripProps = {
  bikeId: string;

  currentOdometer?: number;
  initialOdometer?: number;
};

export function BikeStatStrip({
  bikeId,
  currentOdometer,
  initialOdometer,
}: TBikeStatStripProps) {
  const now = new Date();
  const targetMonth = format(now, "yyyy-MM");

  const { data: historyData, isLoading: historyLoading } =
    useFetchData<TMileageHistoryResponse>(
      ["mileage", "history", bikeId],
      `/bikes/${bikeId}/mileage`,
      { enabled: !!bikeId },
    );
  const { data: spendingData, isLoading: monthLoading } =
    useFetchData<TSpendingSummary>(
      ["spending", bikeId, "month", targetMonth],
      `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
      { enabled: !!bikeId },
    );
  // ! Lifetime spend for the "Total spent" stat — reuses the Spending screen's key.
  const { data: lifetimeSpendData, isLoading: lifetimeLoading } =
    useFetchData<TSpendingSummary>(
      ["spending", bikeId, "lifetime"],
      `/bikes/${bikeId}/spending-summary?period=lifetime`,
      { enabled: !!bikeId },
    );
  // ! spec 57 §E item 5 — the SAME key the Engine oil screen uses.
  const { data: oilStatusData } = useFetchData<TEngineOilStatus>(
    ["engineOilStatus", bikeId],
    `/bikes/${bikeId}/engine-oil-logs/status`,
    { enabled: !!bikeId },
  );

  const avgMileage = getAvgMileage(historyData?.data);
  const monthSpend = spendingData?.data?.totalSpending;
  const totalSpend = lifetimeSpendData?.data?.totalSpending;

  const lifetimeDistanceKm =
    currentOdometer != null && initialOdometer != null
      ? currentOdometer - initialOdometer
      : null;
  const costPerKm =
    totalSpend != null && lifetimeDistanceKm != null && lifetimeDistanceKm > 0
      ? totalSpend / lifetimeDistanceKm
      : null;

  const oilStatus = oilStatusData?.data;
  const kmOnThisOil = oilStatus?.lastChange ? oilStatus?.kmSinceChange : null;
  const oilLife = oilStatus?.lastChange ? oilStatus?.percentUsed : null;

  if (historyLoading || monthLoading || lifetimeLoading) {
    return <MiniStatsSkeleton count={4} />;
  }

  return (
    <View style={styles.miniStats}>
      <Stat
        label="Avg mileage"
        value={avgMileage == null ? "—" : `${avgMileage.toFixed(1)} km/l`}
      />
      <Stat
        label={`${format(now, "MMM")} spend`}
        value={monthSpend == null ? "—" : formatTaka(monthSpend)}
      />
      <Stat
        label="Cost / km"
        value={costPerKm == null ? "—" : `${formatTaka(costPerKm)}/km`}
      />
      {kmOnThisOil != null && (
        <Stat
          label="On this Engine oil"
          value={`${kmOnThisOil.toLocaleString()} km`}
        />
      )}
      {oilLife != null && (
        <Stat label="Engine oil life" value={`${Math.round(oilLife)}% used`} />
      )}
      <Stat
        label="Total spent"
        value={totalSpend == null ? "—" : formatTaka(totalSpend)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  miniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 5,
    rowGap: 7,
  },
  miniStat: {
    width: "31.5%",
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  miniValue: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});

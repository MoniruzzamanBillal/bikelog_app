import { useFetchData } from "@/hooks/useApi";
import { TEngineOilStatus } from "@/types/engine-oil-log.types";
import { TMileageHistoryResponse } from "@/types/mileage.types";
import { TSpendingSummary } from "@/types/spending.types";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

/**
 * Avg km/l for the hub's mini-stat row — the last ≤5 exact full-tank periods,
 * else the approximate estimate. Same logic as the web's `getAvgMileage`.
 * Returns the raw km/l number (or null when there is no data) so it can be both
 * rendered and reused for the half-tank range — formatting happens at the call site.
 */
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
  /** From the already-loaded bike; lifetime distance = current − initial, drives Cost/km. */
  currentOdometer?: number;
  initialOdometer?: number;
};

/**
 * The mini-stat strip under the odometer on the bike detail hub. Owns its own
 * read-only fetches — each reuses a query key another screen already owns, so
 * react-query serves them from cache rather than adding a request.
 */
export function BikeStatStrip({
  bikeId,
  currentOdometer,
  initialOdometer,
}: TBikeStatStripProps) {
  const now = new Date();
  const targetMonth = format(now, "yyyy-MM");

  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );
  const { data: spendingData } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId },
  );
  // ! Lifetime spend for the "Total spent" stat — reuses the Spending screen's key.
  const { data: lifetimeSpendData } = useFetchData<TSpendingSummary>(
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
  // ! Cost per km: all-in lifetime spend (fuel+maintenance+oil+accessories — the SAME figure
  // ! as the "Total spent" tile) over lifetime distance = currentOdometer − initialOdometer.
  // ! Null (→ "—") when there's no spend yet or no distance ridden (new bike, avoids ÷0).
  const lifetimeDistanceKm =
    currentOdometer != null && initialOdometer != null
      ? currentOdometer - initialOdometer
      : null;
  const costPerKm =
    totalSpend != null && lifetimeDistanceKm != null && lifetimeDistanceKm > 0
      ? totalSpend / lifetimeDistanceKm
      : null;
  // ! "On this oil" / "Oil life" are hidden entirely when there is no oil change — a bike with
  // ! none shows the strip without them rather than tiles reading "0 km" / "0% used".
  const oilStatus = oilStatusData?.data;
  const kmOnThisOil = oilStatus?.lastChange ? oilStatus?.kmSinceChange : null;
  const oilLife = oilStatus?.lastChange ? oilStatus?.percentUsed : null;

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
        <Stat label="On this oil" value={`${kmOnThisOil.toLocaleString()} km`} />
      )}
      {oilLife != null && (
        <Stat label="Oil life" value={`${Math.round(oilLife)}% used`} />
      )}
      <Stat
        label="Total spent"
        value={totalSpend == null ? "—" : formatTaka(totalSpend)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ! Fixed 3-column grid (Avg mileage, month spend, Cost/km, On this oil?, Oil life?, Total spent).
  // ! Each tile takes a fixed width rather than `flex: 1`, so wrapped rows line up into real
  // ! columns and a partial last row (3+1 without oil, 3+3 with) packs left under column 1 —
  // ! `flex: 1` made last-row tiles grow to fill their row and break the alignment.
  miniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 6,
    rowGap: 8,
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

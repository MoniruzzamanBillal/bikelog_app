import { Panel } from "@/components/main/shared";
import { TMileageRecord } from "@/types/mileage.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { formatTaka } from "@/utils/formatTaka";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface MileageRecordCardProps {
  record: TMileageRecord;
  /** Largest km/l in the set this card belongs to — scales the progress bar. */
  maxKmpl: number;
  /** Tighter padding and smaller text — used by the Monthly tab's fill-up list. */
  compact?: boolean;
}

/**
 * One exact-mileage period card (a full-tank-to-full-tank window). Shared by the
 * Mileage History tab and the Monthly tab. `compact` gives the Monthly list a
 * smaller card (tighter padding + smaller text) while History keeps the fuller size.
 *
 * Every figure is guarded with `?.` / `&&` so a record with no cost — or an API
 * that hasn't shipped a field — reads "—", never "৳undefined" or "৳NaN".
 */
export function MileageRecordCard({
  record,
  maxKmpl,
  compact,
}: MileageRecordCardProps) {
  const fuelCost =
    record?.totalFuelCost != null ? formatTaka(record?.totalFuelCost) : "—";
  // Period fuel spend ÷ distance ridden in that period.
  const costPerKm =
    record?.totalFuelCost != null && record?.distanceKm
      ? `৳${(record?.totalFuelCost / record?.distanceKm).toFixed(2)}/km`
      : "—";
  // Period fuel spend ÷ litres burned in that period — the average pump price.
  const pricePerLiter =
    record?.totalFuelCost != null && record?.litersConsumed
      ? `৳${(record?.totalFuelCost / record?.litersConsumed).toFixed(2)}/L`
      : "—";

  return (
    <Panel style={[styles.record, compact && styles.recordCompact]}>
      <View style={styles.recordRow}>
        <View style={styles.recordLeft}>
          <Text style={[styles.recordPeriod, compact && styles.periodCompact]}>
            {formatApiDate(record?.periodStartDate, "dd MMM")} →{" "}
            {formatApiDate(record?.periodEndDate, "dd MMM yyyy")}
          </Text>
          <Text style={[styles.recordDetail, compact && styles.detailCompact]}>
            {record?.distanceKm?.toLocaleString()} km ·{" "}
            {record?.litersConsumed?.toFixed(2)} L
          </Text>
          <Text style={[styles.recordCost, compact && styles.costCompact]}>
            Fuel cost {fuelCost} · {costPerKm} · {pricePerLiter}
          </Text>
        </View>
        <View style={styles.recordKmplRow}>
          <Text style={[styles.recordKmpl, compact && styles.kmplCompact]}>
            {record?.mileageKmPerLiter?.toFixed(1)}
          </Text>
          <Text
            style={[styles.recordKmplUnit, compact && styles.kmplUnitCompact]}
          >
            km/l
          </Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${
                maxKmpl > 0 ? (record.mileageKmPerLiter / maxKmpl) * 100 : 0
              }%`,
            },
          ]}
        />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  record: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recordLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recordPeriod: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  recordDetail: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  // Three money figures sit on this line (cost · cost/km · price/L), so it runs
  // small and in the muted tone to stay compact and read as secondary detail.
  recordCost: {
    fontSize: 10.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  recordKmplRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  recordKmpl: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  recordKmplUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  barTrack: {
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.surface2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    borderRadius: 3,
    backgroundColor: CHART_COLORS[0],
  },

  // Compact variant (Monthly tab): tighter card + a notch smaller on every line.
  recordCompact: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  periodCompact: {
    fontSize: 11,
  },
  detailCompact: {
    fontSize: 11.5,
  },
  costCompact: {
    fontSize: 9.5,
  },
  kmplCompact: {
    fontSize: 15,
  },
  kmplUnitCompact: {
    fontSize: 11,
  },
});

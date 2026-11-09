import { Panel, RuleFade } from "@/components/main/shared";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

/** One period's figures — a month (Yearly tab) or a year (Lifetime tab). */
export interface TMileagePeriod {
  /** Stable list key. */
  key: string;
  /** Row heading — e.g. "November" or "2026". */
  label: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
}

/** One labelled figure in a period's metric grid (caption above value). */
function Metric({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The per-period breakdown list shared by the Mileage Yearly tab (a row per
 * month) and the Lifetime tab (a row per year). Each row is a headline
 * (label + average mileage) over a labelled grid of the raw figures.
 *
 * Every value is guarded with `?.` / `&&` so a period with no data — or a field
 * an older API hasn't sent — reads "—", never "৳undefined" or "৳NaN".
 */
export function MileageBreakdownList({
  items,
  compact,
  hidePricePerLiter,
}: {
  items: TMileagePeriod[];
  /** Tighter rows + smaller, dimmer values — used by the Yearly tab. */
  compact?: boolean;
  /** Drop the "Price / L" metric — the Lifetime tab hides it, since a year's
   *  average pump price blends many different prices and isn't meaningful. */
  hidePricePerLiter?: boolean;
}) {
  return (
    <Panel style={styles.listPanel}>
      {items.map((m, i) => {
        // Average mileage: distance ÷ litres (same as Monthly/Lifetime totals).
        const avgMileage =
          m?.totalLitersConsumed && m?.totalDistanceKm != null
            ? `${(m?.totalDistanceKm / m?.totalLitersConsumed).toFixed(2)} km/l`
            : "—";
        const distance =
          m?.totalDistanceKm != null
            ? `${m?.totalDistanceKm?.toLocaleString()} km`
            : "—";
        const fuelUsed =
          m?.totalLitersConsumed != null
            ? `${m?.totalLitersConsumed?.toFixed(2)} L`
            : "—";
        const fuelCost =
          m?.totalFuelCost != null ? formatTaka(m?.totalFuelCost) : "—";
        // Average pump price = fuel spend ÷ litres burned.
        const pricePerLiter =
          m?.totalFuelCost != null && m?.totalLitersConsumed
            ? `৳${(m?.totalFuelCost / m?.totalLitersConsumed).toFixed(2)}`
            : "—";
        // Fuel cost per km = fuel spend ÷ distance ridden.
        const costPerKm =
          m?.totalFuelCost != null && m?.totalDistanceKm
            ? `৳${(m?.totalFuelCost / m?.totalDistanceKm).toFixed(2)}`
            : "—";
        const fills = m?.fuelLogCount != null ? `${m?.fuelLogCount}` : "—";

        return (
          <View key={m.key}>
            <View style={[styles.row, compact && styles.rowCompact]}>
              <View style={styles.headLine}>
                <Text
                  style={[styles.heading, compact && styles.headingCompact]}
                >
                  {m.label}
                </Text>
                <View style={styles.headAvgWrap}>
                  <Text style={styles.headAvgCaption}>Avg mileage</Text>
                  <Text
                    style={[styles.headAvg, compact && styles.headAvgCompact]}
                  >
                    {avgMileage}
                  </Text>
                </View>
              </View>
              <View style={styles.metrics}>
                <Metric label="Distance" value={distance} compact={compact} />
                <Metric label="Fuel used" value={fuelUsed} compact={compact} />
                <Metric label="Fuel cost" value={fuelCost} compact={compact} />
                {!hidePricePerLiter && (
                  <Metric
                    label="Price / L"
                    value={pricePerLiter}
                    compact={compact}
                  />
                )}
                <Metric label="Cost / km" value={costPerKm} compact={compact} />
                <Metric label="Fill-ups" value={fills} compact={compact} />
              </View>
            </View>
            {i < items?.length - 1 ? <RuleFade /> : null}
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  listPanel: {
    paddingVertical: 2,
  },
  // Per-period block: a headline (label + average mileage) over a labelled grid
  // of the raw figures. Six metrics don't fit one tabular row at phone width, so
  // each value carries its own caption instead of sharing unlabelled columns.
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  headAvgWrap: {
    alignItems: "flex-end",
  },
  headAvgCaption: {
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: COLORS.textLight,
  },
  // Average mileage is the headline metric of this screen, so it reads brightest.
  headAvg: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    fontVariant: ["tabular-nums"],
  },
  // 3-column wrapped grid: Distance / Fuel used / Fuel cost, then Price·L / Cost·km / Fill-ups.
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  metric: {
    width: "33.3%",
    gap: 1,
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: COLORS.textLight,
  },
  metricValue: {
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },

  // Compact variant (Yearly tab): tighter rows, smaller text, and the white value
  // lines dimmed to the muted tone so the dense grid reads softer.
  rowCompact: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  headingCompact: {
    fontSize: 13.5,
    // A bit white — brighter than textLight but not the full white it was.
    color: CHART_COLORS[4],
  },
  headAvgCompact: {
    fontSize: 13.5,
  },
  metricLabelCompact: {
    fontSize: 9,
  },
  metricValueCompact: {
    fontSize: 12,
    // Values read white; the labels keep their muted tone (metricLabel, unchanged).
    color: COLORS.text,
  },
});

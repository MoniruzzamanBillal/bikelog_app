import {
  EmptyState,
  ErrorState,
  Panel,
  SectionLoading,
  YearStepper,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TYearlyMileage } from "@/types/mileage.types";
import { fillBarGeometry } from "@/utils/chartGeometry";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { format, parse } from "date-fns";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Text } from "react-native-paper";
import { MileageBreakdownList } from "./MileageBreakdownList";

// Bars fill whatever width is left of this y-axis label gutter (see fillBarGeometry).
const Y_AXIS_WIDTH = 34;
const INITIAL_SPACING = 8;
const END_SPACING = 8;

interface YearlyMileageTabProps {
  bikeId: string;
}

export function YearlyMileageTab({ bikeId }: YearlyMileageTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());
  // Which bar is tapped; drives both the focus highlight and the detail strip
  // rendered ABOVE the chart (gifted-charts' own tooltip clips inside the
  // chart's scroll container, so we render our own outside it).
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // Measured inner width of the chart panel, used to stretch the 12 month bars to
  // fill it instead of leaving empty space on the right.
  const [chartWidth, setChartWidth] = useState(0);

  const { data, isLoading, isError, refetch } = useFetchData<TYearlyMileage>(
    ["mileage", "yearly", bikeId, year],
    `/bikes/${bikeId}/mileage/yearly?targetYear=${year}`,
    { enabled: !!bikeId && !!year },
  );

  const yearly = data?.data;
  const months = yearly?.monthlySummary ?? [];
  // The backend always returns all 12 months (zero-filled), so emptiness is
  // "no fuel logs in any month", not an empty array.
  const hasData = months.some((m) => m?.fuelLogCount > 0);

  const barData = months.map((m, i) => ({
    value: m?.totalDistanceKm,
    label: format(parse(m?.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: i === selectedIndex ? COLORS.accent : CHART_COLORS[0],
  }));

  // Stretch the bars to fill the measured panel width (12 months otherwise leave a
  // gap on the right at some screen widths).
  const { barWidth, spacing } = fillBarGeometry({
    chartWidth,
    barCount: barData.length,
    yAxisWidth: Y_AXIS_WIDTH,
    initialSpacing: INITIAL_SPACING,
    endSpacing: END_SPACING,
  });

  // The tapped month's data for the detail strip above the chart.
  const selected = selectedIndex != null ? months[selectedIndex] : null;
  const selMonthLabel =
    selected &&
    format(parse(selected?.targetMonth, "yyyy-MM", new Date()), "MMMM");
  const selDistance =
    selected?.totalDistanceKm != null
      ? `${selected?.totalDistanceKm?.toLocaleString()} km`
      : "—";
  const selAvg =
    selected?.totalLitersConsumed && selected?.totalDistanceKm != null
      ? `${(selected?.totalDistanceKm / selected?.totalLitersConsumed).toFixed(2)} km/l`
      : "—";
  const selFills =
    selected?.fuelLogCount != null
      ? `${selected?.fuelLogCount} ${selected?.fuelLogCount === 1 ? "fill" : "fills"}`
      : "—";

  return (
    <View style={styles.stack}>
      <YearStepper year={year} onChange={setYear} />

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState title="Couldn’t load mileage" onRetry={refetch} />
      ) : !hasData ? (
        <EmptyState
          icon="speedometer-medium"
          title={`Nothing logged in ${year}`}
          message="Fuel logs dated in this year will show up here."
        />
      ) : (
        <>
          <Panel style={styles.chartPanel}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Distance by month</Text>
              {selected ? (
                <Text style={styles.chartHint}>{selMonthLabel}</Text>
              ) : (
                <Text style={styles.chartHint}>Tap a bar for detail</Text>
              )}
            </View>

            {/* Detail strip for the tapped bar — rendered here, outside the
                chart's own (clipping) container, so nothing is ever cut off. */}
            {selected ? (
              <View style={styles.selStrip}>
                <View style={styles.selItem}>
                  <Text style={styles.selItemLabel}>Distance</Text>
                  <Text style={styles.selValue}>{selDistance}</Text>
                </View>
                <View style={styles.selItem}>
                  <Text style={styles.selItemLabel}>Avg mileage</Text>
                  <Text style={styles.selValue}>{selAvg}</Text>
                </View>
                <View style={styles.selItem}>
                  <Text style={styles.selItemLabel}>Fill-ups</Text>
                  <Text style={styles.selValue}>{selFills}</Text>
                </View>
              </View>
            ) : null}

            <View
              style={styles.chartMeasure}
              onLayout={(e: LayoutChangeEvent) =>
                setChartWidth(e.nativeEvent.layout.width)
              }
            >
              {chartWidth > 0 ? (
                <BarChart
                  data={barData}
                  barWidth={barWidth}
                  spacing={spacing}
                  initialSpacing={INITIAL_SPACING}
                  endSpacing={END_SPACING}
                  yAxisLabelWidth={Y_AXIS_WIDTH}
                  roundedTop
                  height={140}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  hideRules
                  yAxisTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: COLORS.textLight,
                    fontSize: 10,
                  }}
                  noOfSections={4}
                  // Tap a bar to show its month detail above; tap it again to clear.
                  focusBarOnPress
                  focusedBarIndex={selectedIndex ?? undefined}
                  focusedBarConfig={{ color: COLORS.accent }}
                  onPress={(_item: unknown, index: number) =>
                    setSelectedIndex((prev) => (prev === index ? null : index))
                  }
                />
              ) : (
                <View style={styles.chartPlaceholder} />
              )}
            </View>
          </Panel>

          <MileageBreakdownList
            compact
            items={months.map((m) => ({
              key: m.targetMonth,
              label: format(
                parse(m?.targetMonth, "yyyy-MM", new Date()),
                "MMMM",
              ),
              totalDistanceKm: m?.totalDistanceKm,
              totalLitersConsumed: m?.totalLitersConsumed,
              totalFuelCost: m?.totalFuelCost,
              fuelLogCount: m?.fuelLogCount,
            }))}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  chartPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  chartHint: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  // Wrapper whose width we measure so the bars can be stretched to fill it.
  chartMeasure: {
    width: "100%",
  },
  chartPlaceholder: {
    height: 140,
  },
  // Tapped-bar detail, above the chart so it can never be clipped by the
  // chart's internal scroll/clip container.
  selStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.edge,
    backgroundColor: COLORS.surface2,
  },
  selItem: {
    flex: 1,
    gap: 2,
  },
  selItemLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: COLORS.textLight,
  },
  selValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
});

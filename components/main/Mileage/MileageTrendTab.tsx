import { ErrorState, Panel, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TMileageTrend } from "@/types/mileage.types";
import { CHART_COLORS, COLORS, tint } from "@/utils/colors";
import { format, parse } from "date-fns";
import { StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Text } from "react-native-paper";

interface MileageTrendTabProps {
  bikeId: string;
}

export function MileageTrendTab({ bikeId }: MileageTrendTabProps) {
  const { data, isLoading, isError, refetch } = useFetchData<TMileageTrend>(
    ["mileage", "trend", bikeId],
    `/bikes/${bikeId}/mileage/trend?months=6`,
  );

  const monthlySummary = data?.data?.monthlySummary ?? [];

  // Earlier months sit back at 55%; the current month is the solid ramp colour.
  const barData = monthlySummary.map((m, i) => ({
    value: m.totalDistanceKm,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor:
      i === monthlySummary.length - 1
        ? CHART_COLORS[0]
        : tint(CHART_COLORS[0], 0.55),
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  if (isError) {
    return <ErrorState title="Couldn’t load the trend" onRetry={refetch} />;
  }

  return (
    <Panel style={styles.chartPanel}>
      <Text style={styles.chartTitle}>Distance, last 6 months</Text>
      <BarChart
        data={barData}
        barWidth={24}
        spacing={16}
        initialSpacing={8}
        endSpacing={8}
        yAxisLabelWidth={34}
        roundedTop
        height={180}
        yAxisThickness={0}
        xAxisThickness={0}
        hideRules
        showValuesAsTopLabel
        topLabelTextStyle={{ color: COLORS.textLight, fontSize: 11 }}
        yAxisTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: COLORS.textLight, fontSize: 11 }}
        noOfSections={4}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  chartPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 12,
  },
});

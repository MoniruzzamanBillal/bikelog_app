import { StyleSheet, Text, View } from "react-native";
import { format, parse } from "date-fns";
import { ScrollView } from "react-native-gesture-handler";
import { BarChart } from "react-native-gifted-charts";
import { ErrorState, SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMileageTrend } from "@/types/mileage.types";

interface MileageTrendTabProps {
  bikeId: string;
}

export function MileageTrendTab({ bikeId }: MileageTrendTabProps) {
  const { data, isLoading, isError, refetch } = useFetchData<TMileageTrend>(
    ["mileage", "trend", bikeId],
    `/bikes/${bikeId}/mileage/trend?months=6`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];

  const barData = monthlySummary.map((m, i) => ({
    value: m.totalDistanceKm,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor:
      i === monthlySummary.length - 1 ? COLORS.accent : "rgba(145,132,217,0.3)",
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distance, last 6 months</Text>
        <BarChart
          data={barData}
          barWidth={28}
          spacing={24}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
          rulesColor={COLORS.borderSubtle}
          noOfSections={4}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
});

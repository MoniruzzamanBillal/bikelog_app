import { StyleSheet, Text, View } from "react-native";
import { format, parse } from "date-fns";
import { ScrollView } from "react-native-gesture-handler";
import { BarChart } from "react-native-gifted-charts";
import { SectionLoading } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TMileageTrend } from "@/types/mileage.types";

interface MileageTrendTabProps {
  bikeId: string;
}

export function MileageTrendTab({ bikeId }: MileageTrendTabProps) {
  const { data, isLoading } = useFetchData<TMileageTrend>(
    ["mileage", "trend", bikeId],
    `/bikes/${bikeId}/mileage/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];

  const barData = monthlySummary.map((m) => ({
    value: m.totalDistanceKm,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: COLORS.primary,
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distance, last 3 months</Text>
        <BarChart
          data={barData}
          barWidth={28}
          spacing={24}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={0}
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
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
});

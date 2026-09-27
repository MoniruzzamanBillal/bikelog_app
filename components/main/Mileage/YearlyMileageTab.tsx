import {
  EmptyState,
  ErrorState,
  Panel,
  RuleFade,
  SectionLoading,
  YearStepper,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TYearlyMileage } from "@/types/mileage.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { format, parse } from "date-fns";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Text } from "react-native-paper";

interface YearlyMileageTabProps {
  bikeId: string;
}

export function YearlyMileageTab({ bikeId }: YearlyMileageTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data, isLoading, isError, refetch } = useFetchData<TYearlyMileage>(
    ["mileage", "yearly", bikeId, year],
    `/bikes/${bikeId}/mileage/yearly?targetYear=${year}`,
    { enabled: !!bikeId && !!year },
  );

  const yearly = data?.data;
  const months = yearly?.monthlySummary ?? [];

  const barData = months.map((m) => ({
    value: m.totalDistanceKm,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: CHART_COLORS[0],
  }));

  return (
    <View style={styles.stack}>
      <YearStepper year={year} onChange={setYear} />

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState title="Couldn’t load mileage" onRetry={refetch} />
      ) : months.length === 0 ? (
        <EmptyState
          icon="speedometer-medium"
          title={`Nothing logged in ${year}`}
          message="Fuel logs dated in this year will show up here."
        />
      ) : (
        <>
          <Panel style={styles.chartPanel}>
            <Text style={styles.chartTitle}>Distance by month</Text>
            <BarChart
              data={barData}
              barWidth={12}
              spacing={9}
              initialSpacing={8}
              endSpacing={8}
              yAxisLabelWidth={34}
              roundedTop
              height={140}
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              yAxisTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
              noOfSections={4}
            />
          </Panel>

          <Panel style={styles.listPanel}>
            {months.map((m, i) => {
              const monthLabel = format(
                parse(m.targetMonth, "yyyy-MM", new Date()),
                "MMMM",
              );
              return (
                <View key={m.targetMonth}>
                  <View style={styles.row}>
                    <Text style={styles.month}>{monthLabel}</Text>
                    <Text style={styles.rowValue}>
                      {m.totalDistanceKm.toLocaleString()} km
                    </Text>
                    <Text style={styles.rowValue}>
                      {m.totalLitersConsumed.toFixed(2)} L
                    </Text>
                    <Text style={styles.rowCount}>{m.fuelLogCount}</Text>
                  </View>
                  {i < months.length - 1 ? <RuleFade /> : null}
                </View>
              );
            })}
          </Panel>
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
  chartTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 10,
  },
  listPanel: {
    paddingVertical: 2,
  },
  row: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  month: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    minWidth: 68,
  },
  rowCount: {
    fontSize: 13,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    minWidth: 20,
  },
});

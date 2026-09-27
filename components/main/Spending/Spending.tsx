import {
  EmptyState,
  ErrorState,
  MonthStepper,
  Panel,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
  SegmentedTabs,
  YearStepper,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import {
  TSpendingDetails,
  TSpendingSummary,
  TSpendingTrend,
} from "@/types/spending.types";
import { apiGet } from "@/utils/api";
import { CHART_COLORS, COLORS, tint } from "@/utils/colors";
import { generateSpendingPdf } from "@/utils/generateSpendingPdf";
import { format, getDate, getDaysInMonth, isSameMonth, parse } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { AiSpendingInsightCard } from "./AiSpendingInsightCard";
import { SpendingSummaryView } from "./SpendingSummaryView";

type TPeriod = "month" | "year" | "lifetime" | "trend";

const EMPTY_MESSAGE =
  "Fuel logs, maintenance logs and purchased accessories dated in this period will appear here.";

async function exportSpendingPdf(
  bikeId: string,
  period: TPeriod,
  params: { targetMonth?: string; targetYear?: string },
  periodLabel: string,
  setIsExporting: (value: boolean) => void,
) {
  setIsExporting(true);
  try {
    const query = new URLSearchParams({ period });
    if (params.targetMonth) query.set("targetMonth", params.targetMonth);
    if (params.targetYear) query.set("targetYear", params.targetYear);

    const response = await apiGet(
      `/bikes/${bikeId}/spending-summary/details?${query.toString()}`,
    );
    const details = response?.data as TSpendingDetails;
    await generateSpendingPdf(details, periodLabel);
  } catch (error) {
    const message = (error as { message?: string })?.message;
    Toast.show({
      type: "error",
      text1: "Export failed",
      text2: message ?? "Couldn't generate the PDF",
      position: "top",
    });
  } finally {
    setIsExporting(false);
  }
}

const TABS: { value: TPeriod; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "trend", label: "Trend" },
];

function getElapsedDaysInMonth(targetMonth: string): number {
  const monthDate = parse(targetMonth, "yyyy-MM", new Date());
  const now = new Date();

  if (isSameMonth(monthDate, now)) {
    return getDate(now);
  }
  if (monthDate > now) {
    return 0;
  }
  return getDaysInMonth(monthDate);
}

function PdfButton({
  isExporting,
  onPress,
}: {
  isExporting: boolean;
  onPress: () => void;
}) {
  return (
    <PrimaryButton
      variant="secondary"
      icon="download"
      compact
      loading={isExporting}
      disabled={isExporting}
      onPress={onPress}
    >
      PDF
    </PrimaryButton>
  );
}

function MonthTab({ bikeId }: { bikeId: string }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), "yyyy-MM"));
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId && !!targetMonth },
  );
  const summary = data?.data;

  const periodLabel = format(
    parse(targetMonth, "yyyy-MM", new Date()),
    "MMMM yyyy",
  );
  const daysElapsed = getElapsedDaysInMonth(targetMonth);
  const avgDailyExpense =
    daysElapsed > 0 ? (summary?.totalSpending ?? 0) / daysElapsed : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.controlRow}>
        <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />
        <PdfButton
          isExporting={isExporting}
          onPress={() =>
            exportSpendingPdf(
              bikeId,
              "month",
              { targetMonth },
              periodLabel,
              setIsExporting,
            )
          }
        />
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState title="Couldn’t load spending" onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView
          summary={summary}
          periodLabel={periodLabel}
          {...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}
        />
      ) : (
        <EmptyState
          icon="cash-multiple"
          title={`Nothing spent in ${periodLabel}`}
          message={EMPTY_MESSAGE}
        />
      )}

      <AiSpendingInsightCard bikeId={bikeId} />
    </ScrollView>
  );
}

function YearTab({ bikeId }: { bikeId: string }) {
  const [targetYear, setTargetYear] = useState(format(new Date(), "yyyy"));
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "year", targetYear],
    `/bikes/${bikeId}/spending-summary?period=year&targetYear=${targetYear}`,
    { enabled: !!bikeId && !!targetYear },
  );
  const summary = data?.data;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.controlRow}>
        <YearStepper year={targetYear} onChange={setTargetYear} />
        <PdfButton
          isExporting={isExporting}
          onPress={() =>
            exportSpendingPdf(
              bikeId,
              "year",
              { targetYear },
              targetYear,
              setIsExporting,
            )
          }
        />
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState title="Couldn’t load spending" onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} periodLabel={targetYear} />
      ) : (
        <EmptyState
          icon="cash-multiple"
          title={`Nothing spent in ${targetYear}`}
          message={EMPTY_MESSAGE}
        />
      )}

      <AiSpendingInsightCard bikeId={bikeId} />
    </ScrollView>
  );
}

function LifetimeTab({ bikeId }: { bikeId: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "lifetime"],
    `/bikes/${bikeId}/spending-summary?period=lifetime`,
    { enabled: !!bikeId },
  );
  const summary = data?.data;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.controlRowEnd}>
        <PdfButton
          isExporting={isExporting}
          onPress={() =>
            exportSpendingPdf(bikeId, "lifetime", {}, "Lifetime", setIsExporting)
          }
        />
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState title="Couldn’t load spending" onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} periodLabel="Lifetime" />
      ) : (
        <EmptyState
          icon="cash-multiple"
          title="Nothing spent yet"
          message={EMPTY_MESSAGE}
        />
      )}

      <AiSpendingInsightCard bikeId={bikeId} />
    </ScrollView>
  );
}

function TrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading, isError, refetch } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=6`,
  );

  const monthlySummary = data?.data?.monthlySummary ?? [];
  const latest = monthlySummary[monthlySummary.length - 1];
  const latestBreakdown = latest?.categoryBreakdown ?? [];
  const breakdownTotal = latestBreakdown.reduce((sum, c) => sum + c.total, 0);

  const barData = monthlySummary.map((m, i) => ({
    value: m.totalSpending,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor:
      i === monthlySummary.length - 1
        ? CHART_COLORS[0]
        : tint(CHART_COLORS[0], 0.55),
  }));

  const pieData = latestBreakdown.map((c, i) => ({
    value: c.total,
    text: c.category,
    color: CHART_COLORS[Math.min(i, 4)],
  }));

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <SectionLoading count={2} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.tabContent}>
        <ErrorState title="Couldn’t load the trend" onRetry={refetch} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <Panel style={styles.chartPanel}>
        <Text style={styles.chartTitle}>Spending, last 6 months</Text>
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

      {pieData.length > 0 ? (
        <Panel style={styles.chartPanel}>
          <Text style={styles.chartTitle}>
            By category
            {latest
              ? ` · ${format(
                  parse(latest.targetMonth, "yyyy-MM", new Date()),
                  "MMM yyyy",
                )}`
              : ""}
          </Text>

          <View style={styles.donutRow}>
            <PieChart
              data={pieData}
              donut
              radius={64}
              innerRadius={42}
              innerCircleColor={COLORS.card}
            />

            <View style={styles.legend}>
              {latestBreakdown.map((c, i) => {
                const percentage =
                  breakdownTotal > 0
                    ? ((c.total / breakdownTotal) * 100).toFixed(1)
                    : "0.0";
                return (
                  <View key={c.category} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendSwatch,
                        { backgroundColor: CHART_COLORS[Math.min(i, 4)] },
                      ]}
                    />
                    <Text style={styles.legendLabel} numberOfLines={1}>
                      {c.category}
                    </Text>
                    <Text style={styles.legendValue}>{percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Panel>
      ) : (
        <EmptyState
          icon="cash-multiple"
          title="Nothing spent this month"
          message={EMPTY_MESSAGE}
        />
      )}

      <AiSpendingInsightCard bikeId={bikeId} />
    </ScrollView>
  );
}

export function Spending() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [activeTab, setActiveTab] = useState<TPeriod>("month");

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Spending"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />

      <View style={styles.body}>
        <SegmentedTabs
          value={activeTab}
          onChange={setActiveTab}
          options={TABS}
          style={styles.tabs}
          fill
        />

        <View style={styles.tabHost}>
          {activeTab === "month" && <MonthTab bikeId={bikeId} />}
          {activeTab === "year" && <YearTab bikeId={bikeId} />}
          {activeTab === "lifetime" && <LifetimeTab bikeId={bikeId} />}
          {activeTab === "trend" && <TrendTab bikeId={bikeId} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabs: {
    marginBottom: 12,
  },
  tabHost: {
    flex: 1,
  },
  tabContent: {
    paddingBottom: 24,
    gap: 12,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  controlRowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
    marginBottom: 12,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.text,
  },
  legendValue: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
});

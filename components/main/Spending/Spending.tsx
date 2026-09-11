import {
  EmptyState,
  ErrorState,
  MonthStepper,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
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
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { generateSpendingPdf } from "@/utils/generateSpendingPdf";
import { format, getDate, getDaysInMonth, isSameMonth, parse } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { AiSpendingInsightCard } from "./AiSpendingInsightCard";
import { SpendingSummaryView } from "./SpendingSummaryView";

type TPeriod = "month" | "year" | "lifetime" | "trend";

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

const TABS: { key: TPeriod; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "trend", label: "Trend" },
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

  const daysElapsed = getElapsedDaysInMonth(targetMonth);
  const avgDailyExpense =
    daysElapsed > 0 ? (summary?.totalSpending ?? 0) / daysElapsed : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExportPdf = () =>
    exportSpendingPdf(
      bikeId,
      "month",
      { targetMonth },
      format(parse(targetMonth, "yyyy-MM", new Date()), "MMMM yyyy"),
      setIsExporting,
    );

  return (
    <KeyboardAwareScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />

      <PrimaryButton
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting…" : "Export PDF"}
      </PrimaryButton>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView
          summary={summary}
          {...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}
        />
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
    </KeyboardAwareScrollView>
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

  const handleExportPdf = () =>
    exportSpendingPdf(bikeId, "year", { targetYear }, targetYear, setIsExporting);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <YearStepper year={targetYear} onChange={setTargetYear} />

      <PrimaryButton
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting…" : "Export PDF"}
      </PrimaryButton>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} />
      ) : (
        <EmptyState label="No spending data for this year" />
      )}
    </KeyboardAwareScrollView>
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

  const handleExportPdf = () =>
    exportSpendingPdf(bikeId, "lifetime", {}, "Lifetime", setIsExporting);

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <PrimaryButton
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting…" : "Export PDF"}
      </PrimaryButton>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} />
      ) : (
        <EmptyState label="No lifetime spending data" />
      )}
    </ScrollView>
  );
}

function TrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading, isError, refetch } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=6`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];
  const latest = monthlySummary[monthlySummary.length - 1];
  const latestBreakdown = latest?.categoryBreakdown ?? [];
  const breakdownTotal = latestBreakdown.reduce((sum, c) => sum + c.total, 0);

  const barData = monthlySummary.map((m, i) => ({
    value: m.totalSpending,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor:
      i === monthlySummary.length - 1 ? COLORS.accent : "rgba(145,132,217,0.3)",
  }));

  const pieData = latestBreakdown.map((c, i) => ({
    value: c.total,
    text: c.category,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Spending, last 6 months</Text>
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

      {pieData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            By category (
            {latest
              ? format(
                  parse(latest.targetMonth, "yyyy-MM", new Date()),
                  "MMM yyyy",
                )
              : ""}
            )
          </Text>
          <PieChart
            data={pieData}
            donut
            radius={90}
            innerRadius={60}
            innerCircleColor={COLORS.surface}
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
                      {
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      },
                    ]}
                  />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {c.category}
                  </Text>
                  <Text style={styles.legendValue}>
                    ৳{c.total.toFixed(2)} ({percentage}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
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
      <ScreenHeader title="Spending" backLabel={bike?.nickname ?? "Back"} />

      <View style={styles.body}>
        <AiSpendingInsightCard bikeId={bikeId} />

        <View style={styles.tabBar}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === key && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
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
    padding: 16,
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabContent: {
    flex: 1,
  },
  exportButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
    width: "auto",
    paddingHorizontal: 20,
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
  legend: {
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
  },
});

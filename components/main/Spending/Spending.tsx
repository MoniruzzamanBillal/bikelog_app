import {
  EmptyState,
  MonthStepper,
  SectionLoading,
  YearStepper,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingSummary, TSpendingTrend } from "@/types/spending.types";
import { CHART_COLORS, COLORS } from "@/utils/colors";
import { format, parse } from "date-fns";
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
import { SpendingSummaryView } from "./SpendingSummaryView";

type TPeriod = "month" | "year" | "lifetime" | "trend";

const TABS: { key: TPeriod; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "trend", label: "Trend" },
];

function MonthTab({ bikeId }: { bikeId: string }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), "yyyy-MM"));
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId && !!targetMonth },
  );
  const summary = data?.data;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <KeyboardAwareScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />

      {isLoading ? (
        <SectionLoading count={3} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} />
      ) : (
        <EmptyState label="No spending data for this month" />
      )}
    </KeyboardAwareScrollView>
  );
}

function YearTab({ bikeId }: { bikeId: string }) {
  const [targetYear, setTargetYear] = useState(format(new Date(), "yyyy"));
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useFetchData<TSpendingSummary>(
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
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <YearStepper year={targetYear} onChange={setTargetYear} />

      {isLoading ? (
        <SectionLoading count={3} />
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

  const { data, isLoading, refetch } = useFetchData<TSpendingSummary>(
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

  if (isLoading) {
    return <SectionLoading count={3} />;
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} />
      ) : (
        <EmptyState label="No lifetime spending data" />
      )}
    </ScrollView>
  );
}

function TrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];
  const latest = monthlySummary[monthlySummary.length - 1];
  const latestBreakdown = latest?.categoryBreakdown ?? [];

  const barData = monthlySummary.map((m) => ({
    value: m.totalSpending,
    label: format(parse(m.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor: COLORS.primary,
  }));

  const pieData = latestBreakdown.map((c, i) => ({
    value: c.total,
    text: c.category,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  if (isLoading) {
    return <SectionLoading count={2} />;
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Spending, last 3 months</Text>
        <BarChart
          data={barData}
          barWidth={28}
          spacing={24}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={0}
        />
      </View>

      {pieData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            By category (
            {latest
              ? format(parse(latest.targetMonth, "yyyy-MM", new Date()), "MMM yyyy")
              : ""}
            )
          </Text>
          <PieChart data={pieData} donut radius={90} innerRadius={60} />
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending</Text>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabContent: {
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

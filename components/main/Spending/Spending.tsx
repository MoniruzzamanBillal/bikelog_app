import {
  EmptyState,
  MonthStepper,
  SectionLoading,
  YearStepper,
} from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingDetails, TSpendingSummary } from "@/types/spending.types";
import { apiGet } from "@/utils/api";
import { COLORS } from "@/utils/colors";
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { AiSpendingInsightCard } from "./AiSpendingInsightCard";
import { SpendingSummaryView } from "./SpendingSummaryView";

type TPeriod = "month" | "year" | "lifetime";

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

  const { data, isLoading, refetch } = useFetchData<TSpendingSummary>(
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

      <Button
        mode="outlined"
        icon="tray-arrow-down"
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>

      {isLoading ? (
        <SectionLoading count={3} />
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

      <Button
        mode="outlined"
        icon="tray-arrow-down"
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>

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
  const [isExporting, setIsExporting] = useState(false);

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
      <Button
        mode="outlined"
        icon="tray-arrow-down"
        loading={isExporting}
        disabled={isExporting}
        onPress={handleExportPdf}
        style={styles.exportButton}
      >
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : summary && summary.totalSpending > 0 ? (
        <SpendingSummaryView summary={summary} />
      ) : (
        <EmptyState label="No lifetime spending data" />
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

      <AiSpendingInsightCard bikeId={bikeId} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBar}
      >
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
      </ScrollView>

      <View style={styles.tabContent}>
        {activeTab === "month" && <MonthTab bikeId={bikeId} />}
        {activeTab === "year" && <YearTab bikeId={bikeId} />}
        {activeTab === "lifetime" && <LifetimeTab bikeId={bikeId} />}
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
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
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
  exportButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
});

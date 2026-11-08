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
  TMonthlyCategoryBreakdown,
  TPeriodCategoryBreakdown,
  TSpendingDetails,
  TSpendingTrend,
} from "@/types/spending.types";
import { apiGet } from "@/utils/api";
import { fillBarGeometry } from "@/utils/chartGeometry";
import { CHART_COLORS, COLORS, tint } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { generateSpendingPdf } from "@/utils/generateSpendingPdf";
import {
  differenceInCalendarDays,
  format,
  getDate,
  getDayOfYear,
  getDaysInMonth,
  getDaysInYear,
  isSameMonth,
  parse,
  parseISO,
} from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  LayoutChangeEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { MonthlySpendingBreakdown } from "./MonthlySpendingBreakdown";
import { PeriodSpendingBreakdown } from "./PeriodSpendingBreakdown";

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
    if (params?.targetMonth) query.set("targetMonth", params?.targetMonth);
    if (params?.targetYear) query.set("targetYear", params?.targetYear);

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

// Year analogue of getElapsedDaysInMonth: the current year counts days elapsed so far
// (inclusive of today), a past year counts its full 365/366, a future year counts 0 so
// the per-day figure is hidden.
function getElapsedDaysInYear(targetYear: string): number {
  const year = Number(targetYear);
  const now = new Date();
  const currentYear = now.getFullYear();

  if (year > currentYear) {
    return 0;
  }
  if (year === currentYear) {
    return getDayOfYear(now);
  }
  return getDaysInYear(new Date(year, 0, 1));
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

  // ! spec 62: the Month tab reads the category drill-down endpoint (each category + its
  // ! nested records) instead of the plain summary, so the breakdown can render as
  // ! accordions. A distinct cache key ("month-breakdown") — not ["spending", bikeId,
  // ! "month", targetMonth], which BikeStatStrip already owns for the differently-shaped
  // ! summary response — but still under the ["spending", bikeId] prefix every mutation
  // ! invalidates.
  const { data, isLoading, isError, refetch } =
    useFetchData<TMonthlyCategoryBreakdown>(
      ["spending", bikeId, "month-breakdown", targetMonth],
      `/bikes/${bikeId}/spending-summary/monthly-breakdown?targetMonth=${targetMonth}`,
      { enabled: !!bikeId && !!targetMonth },
    );
  const breakdown = data?.data;

  const periodLabel = format(
    parse(targetMonth, "yyyy-MM", new Date()),
    "MMMM yyyy",
  );
  const daysElapsed = getElapsedDaysInMonth(targetMonth);
  const avgDailyExpense =
    daysElapsed > 0 ? (breakdown?.totalSpending ?? 0) / daysElapsed : 0;

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
        <View style={styles.stepperWrap}>
          <MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />
        </View>
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
      ) : breakdown && breakdown.totalSpending > 0 ? (
        <MonthlySpendingBreakdown
          data={breakdown}
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
    </ScrollView>
  );
}

function YearTab({ bikeId }: { bikeId: string }) {
  const [targetYear, setTargetYear] = useState(format(new Date(), "yyyy"));
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ! spec 65: the Year tab reads the category drill-down endpoint (each category + its
  // ! per-month time buckets) so the breakdown renders as accordions. Distinct cache key
  // ! ("year-breakdown") from BikeStatStrip's ["spending", bikeId, "year", …] summary key,
  // ! but still under the ["spending", bikeId] prefix every mutation invalidates.
  const { data, isLoading, isError, refetch } =
    useFetchData<TPeriodCategoryBreakdown>(
      ["spending", bikeId, "year-breakdown", targetYear],
      `/bikes/${bikeId}/spending-summary/period-breakdown?period=year&targetYear=${targetYear}`,
      { enabled: !!bikeId && !!targetYear },
    );
  const breakdown = data?.data;

  // Cost per day across the year, mirroring the Month tab: elapsed days for the
  // current year, the full year for a past one.
  const daysElapsed = getElapsedDaysInYear(targetYear);
  const avgDailyExpense =
    daysElapsed > 0 ? (breakdown?.totalSpending ?? 0) / daysElapsed : 0;

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
      ) : breakdown && breakdown?.totalSpending > 0 ? (
        <PeriodSpendingBreakdown
          data={breakdown}
          periodLabel={targetYear}
          avgDailyScopeLabel="this year"
          {...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}
        />
      ) : (
        <EmptyState
          icon="cash-multiple"
          title={`Nothing spent in ${targetYear}`}
          message={EMPTY_MESSAGE}
        />
      )}
    </ScrollView>
  );
}

function LifetimeTab({
  bikeId,
  purchaseDate,
}: {
  bikeId: string;
  purchaseDate?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ! spec 65: Lifetime tab reads the category drill-down (each category + its per-year
  // ! time buckets) for the accordions. Distinct "lifetime-breakdown" cache key, still
  // ! under the ["spending", bikeId] prefix every mutation invalidates.
  const { data, isLoading, isError, refetch } =
    useFetchData<TPeriodCategoryBreakdown>(
      ["spending", bikeId, "lifetime-breakdown"],
      `/bikes/${bikeId}/spending-summary/period-breakdown?period=lifetime`,
      { enabled: !!bikeId },
    );
  const breakdown = data?.data;

  // Cost per day of ownership: total ÷ days since the bike's purchase date
  // (inclusive of the purchase day). A missing or future date hides the figure.
  const rawDays = purchaseDate
    ? differenceInCalendarDays(new Date(), parseISO(purchaseDate)) + 1
    : 0;
  const daysElapsed = rawDays > 0 ? rawDays : 0;
  const avgDailyExpense =
    daysElapsed > 0 ? (breakdown?.totalSpending ?? 0) / daysElapsed : 0;

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
      ) : breakdown && breakdown?.totalSpending > 0 ? (
        <PeriodSpendingBreakdown
          data={breakdown}
          periodLabel="Lifetime"
          avgDailyScopeLabel="of ownership"
          {...(daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}
        />
      ) : (
        <EmptyState
          icon="cash-multiple"
          title="Nothing spent yet"
          message={EMPTY_MESSAGE}
        />
      )}
    </ScrollView>
  );
}

// Y-axis label gutter; the bars fill whatever width is left of it.
// Bars fill whatever width is left of this y-axis label gutter (see fillBarGeometry).
const TREND_Y_AXIS_WIDTH = 34;
const TREND_INITIAL_SPACING = 12;
const TREND_END_SPACING = 12;

function TrendTab({ bikeId }: { bikeId: string }) {
  // Which month's bar is tapped; drives the highlight and the detail strip
  // rendered ABOVE the chart (gifted-charts' own tooltip clips inside the
  // chart's scroll container, so we render our own outside it — same pattern as
  // the mileage Yearly tab).
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // Measured inner width of the chart panel, used to stretch the bars to fill it.
  const [chartWidth, setChartWidth] = useState(0);

  const { data, isLoading, isError, refetch } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=6`,
  );

  const monthlySummary = data?.data?.monthlySummary ?? [];
  const latest = monthlySummary[monthlySummary?.length - 1];
  const latestBreakdown = latest?.categoryBreakdown ?? [];
  const breakdownTotal = latestBreakdown.reduce((sum, c) => sum + c?.total, 0);

  const barData = monthlySummary.map((m, i) => ({
    value: m?.totalSpending,
    label: format(parse(m?.targetMonth, "yyyy-MM", new Date()), "MMM"),
    frontColor:
      i === selectedIndex
        ? COLORS.accent
        : i === monthlySummary?.length - 1
          ? CHART_COLORS[0]
          : tint(CHART_COLORS[0], 0.55),
  }));

  const { barWidth, spacing } = fillBarGeometry({
    chartWidth,
    barCount: monthlySummary.length,
    yAxisWidth: TREND_Y_AXIS_WIDTH,
    initialSpacing: TREND_INITIAL_SPACING,
    endSpacing: TREND_END_SPACING,
  });

  // The tapped month's figures for the detail strip above the chart.
  const selected =
    selectedIndex != null ? monthlySummary[selectedIndex] : null;
  const selMonthLabel =
    selected &&
    format(parse(selected?.targetMonth, "yyyy-MM", new Date()), "MMMM yyyy");
  const selTotal =
    selected?.totalSpending != null ? formatTaka(selected?.totalSpending) : "—";
  const selTopCat =
    selected?.categoryBreakdown && selected?.categoryBreakdown?.length > 0
      ? [...selected.categoryBreakdown].sort((a, b) => b?.total - a?.total)[0]
      : null;

  const pieData = latestBreakdown.map((c, i) => ({
    value: c?.total,
    text: c?.category,
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
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, styles.chartTitleInRow]}>
            Spending, last 6 months
          </Text>
          <Text style={styles.chartHint}>
            {selected ? selMonthLabel : "Tap a bar for detail"}
          </Text>
        </View>

        {/* Detail strip for the tapped bar — rendered here, outside the chart's
            own (clipping) container, so nothing is ever cut off. */}
        {selected ? (
          <View style={styles.selStrip}>
            <View style={styles.selItem}>
              <Text style={styles.selItemLabel}>Total spent</Text>
              <Text style={styles.selValue}>{selTotal}</Text>
            </View>
            <View style={styles.selItem}>
              <Text style={styles.selItemLabel}>Top category</Text>
              <Text style={styles.selValue} numberOfLines={1}>
                {selTopCat ? selTopCat?.category : "—"}
              </Text>
              {selTopCat ? (
                <Text style={styles.selSubValue}>
                  {formatTaka(selTopCat?.total)}
                </Text>
              ) : null}
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
              initialSpacing={TREND_INITIAL_SPACING}
              endSpacing={TREND_END_SPACING}
              yAxisLabelWidth={TREND_Y_AXIS_WIDTH}
              roundedTop
              height={180}
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              showValuesAsTopLabel
              topLabelTextStyle={{
                color: COLORS.textLight,
                fontSize: 11,
                fontWeight: "500",
              }}
              yAxisTextStyle={{
                color: COLORS.textLight,
                fontSize: 10,
                fontWeight: "500",
              }}
              xAxisLabelTextStyle={{
                color: COLORS.textLight,
                fontSize: 11,
                fontWeight: "500",
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

      {pieData?.length > 0 ? (
        <Panel style={styles.chartPanel}>
          <Text style={styles.chartTitle}>
            By category
            {latest
              ? ` · ${format(
                  parse(latest?.targetMonth, "yyyy-MM", new Date()),
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
                    ? ((c?.total / breakdownTotal) * 100).toFixed(1)
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
                      {c?.category}
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
          {activeTab === "lifetime" && (
            <LifetimeTab bikeId={bikeId} purchaseDate={bike?.purchaseDate} />
          )}
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
  stepperWrap: {
    flex: 1,
    minWidth: 0,
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
  // The trend title sits in a flex row with the tap hint, which owns the spacing.
  chartTitleInRow: {
    marginBottom: 0,
    flexShrink: 1,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
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
    height: 180,
  },
  // Tapped-bar detail, above the chart so it can never be clipped by the chart's
  // internal scroll/clip container (mirrors the mileage Yearly tab).
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
  selSubValue: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
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
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
});

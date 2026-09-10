import { ScreenHeader } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { AiMileageInsightCard } from "./AiMileageInsightCard";
import { LifetimeMileageTab } from "./LifetimeMileageTab";
import { MileageHistoryTab } from "./MileageHistoryTab";
import { MileageTrendTab } from "./MileageTrendTab";
import { MonthlyMileageTab } from "./MonthlyMileageTab";
import { YearlyMileageTab } from "./YearlyMileageTab";

type TTab = "history" | "monthly" | "yearly" | "lifetime" | "trends";

const TABS: { key: TTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "lifetime", label: "Lifetime" },
  { key: "trends", label: "Trends" },
];

export function Mileage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [activeTab, setActiveTab] = useState<TTab>("history");

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mileage" backLabel={bike?.nickname ?? "Back"} />

      <View style={styles.body}>
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
                style={[styles.tabText, activeTab === key && styles.tabTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabContent}>
          <AiMileageInsightCard bikeId={bikeId} />
          {activeTab === "history" && <MileageHistoryTab bikeId={bikeId} />}
          {activeTab === "monthly" && <MonthlyMileageTab bikeId={bikeId} />}
          {activeTab === "yearly" && <YearlyMileageTab bikeId={bikeId} />}
          {activeTab === "lifetime" && <LifetimeMileageTab bikeId={bikeId} />}
          {activeTab === "trends" && <MileageTrendTab bikeId={bikeId} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(145,132,217,0.12)",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    fontWeight: "600",
    color: COLORS.accent,
  },
  tabContent: {
    flex: 1,
  },
});

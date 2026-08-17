import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { AiMileageInsightCard } from "./AiMileageInsightCard";
import { LifetimeMileageTab } from "./LifetimeMileageTab";
import { MileageHistoryTab } from "./MileageHistoryTab";
import { MonthlyMileageTab } from "./MonthlyMileageTab";
import { YearlyMileageTab } from "./YearlyMileageTab";

type TTab = "history" | "monthly" | "yearly" | "lifetime";

const TABS: { key: TTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "lifetime", label: "Lifetime" },
];

export function Mileage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [activeTab, setActiveTab] = useState<TTab>("history");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mileage</Text>

      <AiMileageInsightCard bikeId={bikeId} />

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
        {activeTab === "history" && <MileageHistoryTab bikeId={bikeId} />}
        {activeTab === "monthly" && <MonthlyMileageTab bikeId={bikeId} />}
        {activeTab === "yearly" && <YearlyMileageTab bikeId={bikeId} />}
        {activeTab === "lifetime" && <LifetimeMileageTab bikeId={bikeId} />}
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
});

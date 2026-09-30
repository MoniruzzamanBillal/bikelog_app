import { ScreenHeader, SegmentedTabs } from "@/components/main/shared";
import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AiMileageInsightCard } from "./AiMileageInsightCard";
import { LifetimeMileageTab } from "./LifetimeMileageTab";
import { MileageHistoryTab } from "./MileageHistoryTab";
import { MonthlyMileageTab } from "./MonthlyMileageTab";
import { YearlyMileageTab } from "./YearlyMileageTab";

type TTab = "history" | "monthly" | "yearly" | "lifetime";

const TABS: { value: TTab; label: string }[] = [
  { value: "history", label: "History" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
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
      <ScreenHeader
        title="Mileage"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedTabs
          value={activeTab}
          onChange={setActiveTab}
          options={TABS}
          fill
        />

        {activeTab === "history" && <MileageHistoryTab bikeId={bikeId} />}
        {activeTab === "monthly" && <MonthlyMileageTab bikeId={bikeId} />}
        {activeTab === "yearly" && <YearlyMileageTab bikeId={bikeId} />}
        {activeTab === "lifetime" && <LifetimeMileageTab bikeId={bikeId} />}

        <AiMileageInsightCard bikeId={bikeId} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
});

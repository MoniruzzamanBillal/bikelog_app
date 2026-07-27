import { StyleSheet, Text, View } from "react-native";
import { useFetchData } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TSpendingInsight } from "@/types/spending.types";

interface AiSpendingInsightCardProps {
  bikeId: string;
}

export function AiSpendingInsightCard({ bikeId }: AiSpendingInsightCardProps) {
  const { data, isLoading } = useFetchData<TSpendingInsight>(
    ["ai", "spending-insight", bikeId],
    `/bikes/${bikeId}/ai/spending-insight`,
    { enabled: !!bikeId },
  );

  const insight = data?.data;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>AI Insight</Text>
      <Text style={styles.body}>
        {isLoading
          ? "Thinking..."
          : (insight?.insight ?? "No insight available yet.")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  body: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 4,
  },
});

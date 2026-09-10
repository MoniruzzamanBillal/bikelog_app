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
          ? "Thinking…"
          : (insight?.insight ?? "No insight available yet.")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(145,132,217,0.06)",
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.accent,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textLight,
  },
});

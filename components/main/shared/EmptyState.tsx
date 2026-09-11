import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/utils/colors";

interface EmptyStateProps {
  label: string;
}

export function EmptyState({ label }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  text: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "500",
    textAlign: "center",
  },
});

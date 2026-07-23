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
    alignItems: "center",
    paddingVertical: 40,
  },
  text: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "500",
  },
});

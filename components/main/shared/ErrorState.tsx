import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";
import { PrimaryButton } from "./PrimaryButton";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Network error. Check your connection.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={32}
        color={COLORS.danger}
        style={styles.icon}
      />
      <Text style={styles.title}>Failed to load</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <PrimaryButton onPress={onRetry} style={styles.button}>
          Retry
        </PrimaryButton>
      )}
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
    gap: 6,
  },
  icon: {
    opacity: 0.6,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  message: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  button: {
    width: "auto",
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginTop: 8,
  },
});

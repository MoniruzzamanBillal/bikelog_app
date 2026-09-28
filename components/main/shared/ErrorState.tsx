import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS, tint } from "@/utils/colors";
import { Panel } from "./Panel";
import { PrimaryButton } from "./PrimaryButton";

interface ErrorStateProps {
  message?: string;
  title?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  action?: ReactNode;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The web `StateCard`, error variant: danger icon chip + a "Try again" button. */
export function ErrorState({
  message = "Network error. Check your connection.",
  title = "Failed to load",
  icon = "cloud-off-outline",
  action,
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <Panel style={[styles.card, style]}>
      <View style={styles.chip}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action || onRetry ? (
        <View style={styles.actions}>
          {action}
          {onRetry ? (
            <PrimaryButton
              onPress={onRetry}
              variant="secondary"
              icon="refresh"
              compact
            >
              Try again
            </PrimaryButton>
          ) : null}
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tint(COLORS.danger, 0.5),
  },
  title: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textLight,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
});

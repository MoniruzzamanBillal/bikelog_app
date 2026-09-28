import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";
import { Panel } from "./Panel";

interface EmptyStateProps {
  /** Back-compat: maps to `title` when `title` isn't given. */
  label?: string;
  title?: string;
  message?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The web `StateCard`, empty variant: a panel with a glowing accent icon chip. */
export function EmptyState({
  label,
  title,
  message,
  icon = "inbox-outline",
  action,
  style,
}: EmptyStateProps) {
  return (
    <Panel style={[styles.card, style]}>
      <View style={styles.chip}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.accent} />
      </View>
      <Text style={styles.title}>{title ?? label}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
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
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
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
  action: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
});

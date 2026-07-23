import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/utils/colors";

interface StatusBadgeProps {
  label: string;
  colorKey: string;
  colors: Record<string, { bg: string; text: string }>;
}

export function StatusBadge({ label, colorKey, colors }: StatusBadgeProps) {
  const variant = colors[colorKey] ?? { bg: COLORS.textLight, text: COLORS.white };

  return (
    <View style={[styles.badge, { backgroundColor: variant.bg }]}>
      <Text style={[styles.text, { color: variant.text }]}>{label}</Text>
    </View>
  );
}

export const issueStatusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: COLORS.danger, text: COLORS.white },
  resolved: { bg: COLORS.success, text: COLORS.white },
};

export const accessoryStatusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: COLORS.warning, text: COLORS.white },
  purchased: { bg: COLORS.success, text: COLORS.white },
  cancelled: { bg: COLORS.textLight, text: COLORS.white },
};

export const accessoryUrgencyColors: Record<string, { bg: string; text: string }> = {
  immediate: { bg: COLORS.danger, text: COLORS.white },
  medium: { bg: COLORS.warning, text: COLORS.white },
  low: { bg: COLORS.success, text: COLORS.white },
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

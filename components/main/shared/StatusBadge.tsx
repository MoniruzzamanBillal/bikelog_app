import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS, tint } from "@/utils/colors";

export type TStatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

interface StatusBadgeProps {
  label: string;
  colorKey: string;
  colors: Record<string, { bg: string; text: string }>;
}

/** Nocturne tone pill. Tones come from `toneStyle`, never a raw literal. */
export const toneStyle = (tone: TStatusTone): { bg: string; text: string } => {
  switch (tone) {
    case "accent":
      return { bg: COLORS.surface3, text: COLORS.accentForeground };
    case "success":
      return { bg: tint(COLORS.success, 0.15), text: COLORS.success };
    case "warning":
      return { bg: tint(COLORS.warning, 0.15), text: COLORS.warning };
    case "danger":
      return { bg: tint(COLORS.danger, 0.15), text: COLORS.danger };
    default:
      return { bg: COLORS.surface2, text: COLORS.text };
  }
};

export function StatusBadge({ label, colorKey, colors }: StatusBadgeProps) {
  const variant = colors[colorKey] ?? toneStyle("neutral");

  return (
    <View style={[styles.badge, { backgroundColor: variant.bg }]}>
      <Text style={[styles.text, { color: variant.text }]}>{label}</Text>
    </View>
  );
}

export const issueStatusColors: Record<string, { bg: string; text: string }> = {
  open: toneStyle("warning"),
  resolved: toneStyle("success"),
};

export const accessoryStatusColors: Record<string, { bg: string; text: string }> = {
  pending: toneStyle("neutral"),
  purchased: toneStyle("success"),
  cancelled: toneStyle("neutral"),
};

export const accessoryUrgencyColors: Record<string, { bg: string; text: string }> = {
  immediate: toneStyle("danger"),
  medium: toneStyle("warning"),
  low: toneStyle("neutral"),
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

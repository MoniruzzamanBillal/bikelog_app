import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "@/utils/colors";

/**
 * The Nocturne `panel` surface: a card with a hairline `edge` outline
 * (the web's `--elev-sm`). Reuse `panelStyle`/`glowStyle` directly when a
 * component needs the look inside its own `StyleSheet`.
 */
export const panelStyle = {
  backgroundColor: COLORS.card,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: COLORS.edge,
} as const;

/** The web's `--elev-glow`: accent outline + accent bloom. */
export const glowStyle = {
  borderColor: COLORS.accent,
  shadowColor: COLORS.accent,
  shadowOpacity: 0.45,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
} as const;

interface PanelProps {
  children?: ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Panel({ children, glow, style }: PanelProps) {
  return (
    <View style={[styles.panel, glow && styles.glow, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  panel: panelStyle,
  glow: glowStyle,
});

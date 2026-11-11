import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";
import { Panel } from "./Panel";

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  glow?: boolean;
  /** Tighter padding and smaller text — for dense grids like the Monthly tab. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Label / big tabular value / optional unit + sub-line tile. */
export function StatTile({
  label,
  value,
  unit,
  sub,
  glow,
  compact,
  style,
}: StatTileProps) {
  return (
    <Panel
      glow={glow}
      style={[styles.tile, compact && styles.tileCompact, style]}
    >
      <Text
        style={[styles.label, compact && styles.labelCompact]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, compact && styles.valueCompact]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.unit, compact && styles.unitCompact]}>
            {unit}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text
          style={[styles.sub, compact && styles.subCompact]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: 14,
    gap: 2,
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  sub: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },

  // Compact variant: smaller padding + text for dense tile grids (Monthly tab).
  tileCompact: {
    padding: 11,
  },
  labelCompact: {
    fontSize: 11,
  },
  valueCompact: {
    fontSize: 19,
  },
  unitCompact: {
    fontSize: 12,
  },
  subCompact: {
    fontSize: 11,
  },
});

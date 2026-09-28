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
  style?: StyleProp<ViewStyle>;
}

/** Label / big tabular value / optional unit + sub-line tile. */
export function StatTile({
  label,
  value,
  unit,
  sub,
  glow,
  style,
}: StatTileProps) {
  return (
    <Panel glow={glow} style={[styles.tile, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
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
});

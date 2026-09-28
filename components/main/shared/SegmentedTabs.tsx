import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  style?: StyleProp<ViewStyle>;
  /**
   * Stretch to the full width and split it equally between the segments
   * instead of shrink-wrapping inside a horizontal scroller. Use it when there
   * are too many options to fit at their natural width (e.g. Mileage's five).
   */
  fill?: boolean;
}

/**
 * The Nocturne `.seg` control: hairline-bordered segments inside one rounded
 * outline, with an accent inner border on the active one.
 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  style,
  fill = false,
}: SegmentedTabsProps<T>) {
  const segments = options.map((opt, i) => {
    const active = opt?.value === value;
    return (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.7}
        style={[
          styles.segment,
          fill && styles.segmentFill,
          i > 0 && styles.segmentDivider,
          active && styles.segmentActive,
        ]}
      >
        <Text
          style={[styles.label, active && styles.labelActive]}
          numberOfLines={1}
          adjustsFontSizeToFit={fill}
          minimumFontScale={0.8}
        >
          {opt?.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (fill) {
    return (
      <View style={[styles.outline, styles.outlineFill, style]}>
        {segments}
      </View>
    );
  }

  return (
    <View style={[styles.outline, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {segments}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  outlineFill: {
    alignSelf: "stretch",
    flexDirection: "row",
  },
  track: {
    flexDirection: "row",
  },
  segment: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  segmentFill: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  segmentDivider: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  segmentActive: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    color: "rgba(233,233,237,0.85)",
  },
  labelActive: {
    color: COLORS.accent,
  },
});

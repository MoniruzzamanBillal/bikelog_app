import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  style?: StyleProp<ViewStyle>;
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
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.outline, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.segment,
                i > 0 && styles.segmentDivider,
                active && styles.segmentActive,
              ]}
            >
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  track: {
    flexDirection: "row",
  },
  segment: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    justifyContent: "center",
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

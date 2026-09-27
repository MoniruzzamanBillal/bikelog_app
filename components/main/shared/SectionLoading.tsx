import { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "@/utils/colors";
import { panelStyle } from "./Panel";

/** Gentle 1 → 0.45 opacity loop shared by every skeleton. */
function usePulse() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return pulse;
}

interface SkeletonBarProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single pulsing placeholder bar — reused by `InsightCard` and screens. */
export function SkeletonBar({ width = "100%", height = 12, style }: SkeletonBarProps) {
  const pulse = usePulse();

  return (
    <Animated.View
      style={[styles.bar, { width, height, opacity: pulse }, style]}
    />
  );
}

interface SectionLoadingProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

/** `count` panel-shaped skeletons — the loading state of every list screen. */
export function SectionLoading({ count = 3, style }: SectionLoadingProps) {
  const pulse = usePulse();

  return (
    <View style={[styles.stack, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.panel}>
          <Animated.View
            style={[styles.bar, { width: "55%", opacity: pulse }]}
          />
          <Animated.View
            style={[styles.bar, { width: "85%", opacity: pulse }]}
          />
          <Animated.View
            style={[styles.bar, { width: "40%", opacity: pulse }]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  panel: {
    ...panelStyle,
    padding: 14,
    gap: 8,
  },
  bar: {
    height: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 6,
  },
});

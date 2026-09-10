import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS } from "@/utils/colors";

interface SectionLoadingProps {
  count?: number;
}

export function SectionLoading({ count = 3 }: SectionLoadingProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.skeleton, { opacity: pulse }]}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "80%" }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.surface3,
    borderRadius: 6,
    marginBottom: 8,
  },
});

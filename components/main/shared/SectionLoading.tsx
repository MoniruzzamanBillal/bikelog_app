import { StyleSheet, View } from "react-native";
import { COLORS } from "@/utils/colors";

interface SectionLoadingProps {
  count?: number;
}

export function SectionLoading({ count = 3 }: SectionLoadingProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "80%" }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 6,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
  },
});

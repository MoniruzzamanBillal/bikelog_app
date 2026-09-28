import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";
import { Panel } from "./Panel";
import { SkeletonBar } from "./SectionLoading";

interface InsightCardProps {
  kicker: string;
  text?: string;
  isLoading?: boolean;
  isError?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Accent-kicker card for the AI mileage / spending insights. */
export function InsightCard({
  kicker,
  text,
  isLoading,
  isError,
  style,
}: InsightCardProps) {
  return (
    <Panel style={[styles.card, style]}>
      <View style={styles.kickerRow}>
        <MaterialCommunityIcons
          name="star-four-points-outline"
          size={13}
          color={COLORS.accent}
        />
        <Text style={styles.kicker}>{kicker}</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          <SkeletonBar width="100%" />
          <SkeletonBar width="92%" />
          <SkeletonBar width="60%" />
        </View>
      ) : (
        <Text style={styles.body}>
          {isError
            ? "Couldn’t generate an insight right now."
            : (text ?? "No insight available yet.")}
        </Text>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.accent,
  },
  skeletons: {
    gap: 8,
    paddingVertical: 2,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORS.text,
  },
});

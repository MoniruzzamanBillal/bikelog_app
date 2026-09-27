import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { COLORS } from "@/utils/colors";

interface RuleFadeProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * The Nocturne signature divider (web `.rule-fade`): a hairline rule that
 * fades out at both ends.
 */
export function RuleFade({ style }: RuleFadeProps) {
  return (
    <LinearGradient
      colors={["transparent", COLORS.border, COLORS.border, "transparent"]}
      locations={[0, 0.15, 0.85, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.rule, style]}
    />
  );
}

const styles = StyleSheet.create({
  rule: {
    height: 1,
    width: "100%",
  },
});

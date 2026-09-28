import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface YearStepperProps {
  year: string; // "yyyy"
  onChange: (year: string) => void;
}

/** The web `PeriodStepper`, plain variant: ‹ yyyy › */
export function YearStepper({ year, onChange }: YearStepperProps) {
  const nextDisabled = Number(year) >= new Date().getFullYear();

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange((Number(year) - 1).toString())}
        style={styles.button}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={18}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <Text style={styles.label}>{year}</Text>

      <TouchableOpacity
        onPress={() => onChange((Number(year) + 1).toString())}
        style={[styles.button, nextDisabled && styles.buttonDisabled]}
        disabled={nextDisabled}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: 4,
  },
});

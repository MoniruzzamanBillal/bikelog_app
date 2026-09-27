import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addMonths, format, isAfter, parse, startOfMonth, subMonths } from "date-fns";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface MonthStepperProps {
  targetMonth: string; // "yyyy-MM"
  onChange: (targetMonth: string) => void;
}

/** The web `PeriodStepper`, boxed variant: ‹ [Mon yyyy] › */
export function MonthStepper({ targetMonth, onChange }: MonthStepperProps) {
  const current = parse(targetMonth, "yyyy-MM", new Date());
  const nextDisabled = !isAfter(
    startOfMonth(new Date()),
    startOfMonth(current),
  );

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange(format(subMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={18}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <View style={styles.labelBox}>
        <MaterialCommunityIcons
          name="calendar-blank-outline"
          size={15}
          color={COLORS.textLight}
        />
        <Text style={styles.label}>{format(current, "MMM yyyy")}</Text>
      </View>

      <TouchableOpacity
        onPress={() => onChange(format(addMonths(current, 1), "yyyy-MM"))}
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
  labelBox: {
    flex: 1,
    maxWidth: 240,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
});

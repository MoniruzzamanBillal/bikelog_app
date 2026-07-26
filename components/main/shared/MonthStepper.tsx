import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addMonths, format, parse, subMonths } from "date-fns";
import { COLORS } from "@/utils/colors";

interface MonthStepperProps {
  targetMonth: string; // "yyyy-MM"
  onChange: (targetMonth: string) => void;
}

export function MonthStepper({ targetMonth, onChange }: MonthStepperProps) {
  const current = parse(targetMonth, "yyyy-MM", new Date());

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange(format(subMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.label}>{format(current, "MMM yyyy")}</Text>
      <TouchableOpacity
        onPress={() => onChange(format(addMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
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
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 120,
    textAlign: "center",
  },
});

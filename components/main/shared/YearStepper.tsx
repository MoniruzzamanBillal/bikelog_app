import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/utils/colors";

interface YearStepperProps {
  year: string; // "yyyy"
  onChange: (year: string) => void;
}

export function YearStepper({ year, onChange }: YearStepperProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange((Number(year) - 1).toString())}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.label}>{year}</Text>
      <TouchableOpacity
        onPress={() => onChange((Number(year) + 1).toString())}
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
    minWidth: 60,
    textAlign: "center",
  },
});

import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SwitchFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchField({
  label,
  description,
  value,
  onChange,
  disabled,
}: SwitchFieldProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => onChange(!value)}
        disabled={disabled}
        style={[styles.track, value && styles.trackOn]}
        activeOpacity={0.8}
      >
        <View style={[styles.knob, value && styles.knobOn]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  textCol: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  description: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(145,132,217,0.2)",
    borderWidth: 1,
    borderColor: "rgba(145,132,217,0.3)",
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: COLORS.accent,
    borderColor: "transparent",
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    marginLeft: 2,
  },
  knobOn: {
    marginLeft: 22,
  },
});

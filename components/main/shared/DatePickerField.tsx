import { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import { COLORS } from "@/utils/colors";

interface DatePickerFieldProps {
  label: string;
  value: string; // "yyyy-MM-dd", or "" when unset
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  style?: object;
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
  style,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={styles.box}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? format(dateValue, "dd MMM yyyy") : "Select date"}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (event.type === "set" && selectedDate) {
              onChange(format(selectedDate, "yyyy-MM-dd"));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  box: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: "center",
  },
  valueText: { fontSize: 15, color: COLORS.text },
  placeholderText: { fontSize: 15, color: COLORS.placeholder },
});

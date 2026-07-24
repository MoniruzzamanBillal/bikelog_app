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
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();

  return (
    <View style={styles.field}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={styles.touchable}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? format(dateValue, "dd MMM yyyy") : label}
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  touchable: { paddingVertical: 12 },
  valueText: { fontSize: 16, color: COLORS.text },
  placeholderText: { fontSize: 16, color: COLORS.textLight },
});

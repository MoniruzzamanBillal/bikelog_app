import { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/utils/colors";
import { fieldStyles } from "./FormField";

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
        <View style={styles.boxContent}>
          <Text style={value ? styles.valueText : styles.placeholderText}>
            {value ? format(dateValue, "dd MMM yyyy") : "Select date"}
          </Text>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={16}
            color={COLORS.textLight}
          />
        </View>
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
  ...fieldStyles,
  boxContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});

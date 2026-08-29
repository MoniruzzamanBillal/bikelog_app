import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Menu, Text, TouchableRipple } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SelectPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  disabled?: boolean;
}

export function SelectPickerField({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
}: SelectPickerFieldProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => setMenuVisible(true)}
            disabled={disabled}
            style={[styles.touchable, disabled && styles.touchableDisabled]}
          >
            <Text
              style={selectedLabel ? styles.valueText : styles.placeholderText}
            >
              {selectedLabel ?? "Select..."}
            </Text>
          </TouchableRipple>
        }
      >
        {options.map((opt) => (
          <Menu.Item
            key={opt.value}
            title={opt.label}
            onPress={() => {
              onChange(opt.value);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.text,
  },
  required: { color: COLORS.danger },
  touchable: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  touchableDisabled: {
    opacity: 0.5,
  },
  valueText: { fontSize: 16, color: COLORS.text },
  placeholderText: { fontSize: 16, color: COLORS.textLight },
});

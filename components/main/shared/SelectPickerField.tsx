import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Menu, Text, TouchableRipple } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SelectPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  disabled?: boolean;
  style?: object;
}

export function SelectPickerField({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  style,
}: SelectPickerFieldProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => setMenuVisible(true)}
            disabled={disabled}
            style={[styles.box, disabled && styles.boxDisabled]}
          >
            <View style={styles.boxContent}>
              <Text
                style={selectedLabel ? styles.valueText : styles.placeholderText}
              >
                {selectedLabel ?? "Select…"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={16}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableRipple>
        }
        contentStyle={styles.menuContent}
      >
        {options.map((opt) => (
          <Menu.Item
            key={opt.value}
            title={opt.label}
            titleStyle={styles.menuItemTitle}
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
  required: {
    color: COLORS.danger,
    textTransform: "none",
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
  boxDisabled: {
    opacity: 0.5,
  },
  boxContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: { fontSize: 15, color: COLORS.text },
  placeholderText: { fontSize: 15, color: COLORS.placeholder },
  menuContent: {
    backgroundColor: COLORS.surface2,
  },
  menuItemTitle: {
    color: COLORS.text,
  },
});

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Menu, Text, TouchableRipple } from "react-native-paper";
import { COLORS } from "@/utils/colors";
import { fieldStyles } from "./FormField";

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
  // ! react-native-paper's Menu tracks its own show/hide animation state in a ref
  // ! (`prevRendered`) that only settles ~250ms after `visible` flips, via an animation
  // ! completion callback. Reopening the menu (tap → select → tap again) before that
  // ! callback fires desyncs `visible` from the ref, and Menu silently skips its `show()`
  // ! call — the options never (re)appear. Bumping this key remounts Menu on every close,
  // ! giving it fresh internal state so the next open always runs `show()` properly.
  const [menuKey, setMenuKey] = useState(0);
  const selectedLabel = options.find((opt) => opt?.value === value)?.label;

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuKey((k) => k + 1);
  };

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Menu
        key={menuKey}
        visible={menuVisible}
        onDismiss={closeMenu}
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
                color={COLORS.textLight}
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
              closeMenu();
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  ...fieldStyles,
  boxDisabled: {
    opacity: 0.5,
  },
  boxContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuContent: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    borderRadius: 10,
  },
  menuItemTitle: {
    color: COLORS.text,
    fontSize: 14,
  },
});

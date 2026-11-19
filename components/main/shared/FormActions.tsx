import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { COLORS, tint } from "@/utils/colors";
import { PrimaryButton } from "./PrimaryButton";

interface FormActionsProps {
  /** The save button's label. */
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Nocturne modal footer: Cancel (soft red) + Save (primary), side by side. */
export function FormActions({
  children,
  onSave,
  onCancel,
  saving,
  style,
}: FormActionsProps) {
  return (
    <View style={[styles.row, style]}>
      <PrimaryButton
        onPress={onCancel}
        disabled={saving}
        // ! Every Cancel button in the app reads soft-red: `destructive` gives the red
        // ! label/icon, and `cancel` below adds the red border + light red fill.
        variant="destructive"
        style={[styles.button, styles.cancel]}
      >
        Cancel
      </PrimaryButton>
      <PrimaryButton onPress={onSave} loading={saving} style={styles.button}>
        {children}
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    width: "auto",
  },
  cancel: {
    borderColor: COLORS.danger,
    backgroundColor: tint(COLORS.danger, 0.12),
  },
});

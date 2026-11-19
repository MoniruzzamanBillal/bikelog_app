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
  /** Render Cancel in a soft red (red border + red text over a light red fill). */
  cancelDanger?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Nocturne modal footer: Cancel (secondary) + Save (primary), side by side. */
export function FormActions({
  children,
  onSave,
  onCancel,
  saving,
  cancelDanger,
  style,
}: FormActionsProps) {
  return (
    <View style={[styles.row, style]}>
      <PrimaryButton
        onPress={onCancel}
        disabled={saving}
        // ! destructive gives the red label/icon; the style below adds the red border and
        // ! the light red fill so the whole button reads soft-red (not harsh).
        variant={cancelDanger ? "destructive" : "secondary"}
        style={[styles.button, cancelDanger && styles.cancelDanger]}
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
  cancelDanger: {
    borderColor: COLORS.danger,
    backgroundColor: tint(COLORS.danger, 0.12),
  },
});

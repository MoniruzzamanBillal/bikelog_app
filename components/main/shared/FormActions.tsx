import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { PrimaryButton } from "./PrimaryButton";

interface FormActionsProps {
  /** The save button's label. */
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Nocturne modal footer: Cancel (secondary) + Save (primary), side by side. */
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
        variant="secondary"
        style={styles.button}
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
});

import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface PrimaryButtonProps {
  children: ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
}

export function PrimaryButton({
  children,
  onPress,
  loading,
  disabled,
  style,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.accent} />
      ) : (
        <Text style={styles.label}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.accent,
  },
});

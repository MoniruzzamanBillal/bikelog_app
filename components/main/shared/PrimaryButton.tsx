import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { COLORS, tint } from "@/utils/colors";

type TButtonVariant = "primary" | "secondary" | "destructive";

interface PrimaryButtonProps {
  children: ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: TButtonVariant;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Auto width instead of the default full-width block. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantColors: Record<TButtonVariant, { border: string; label: string }> = {
  primary: { border: COLORS.accent, label: COLORS.accent },
  secondary: { border: COLORS.border, label: COLORS.text },
  destructive: { border: COLORS.border, label: COLORS.danger },
};

export function PrimaryButton({
  children,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  compact,
  style,
}: PrimaryButtonProps) {
  const tone = variantColors[variant];
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.button,
        { borderColor: tone.border },
        compact && styles.compact,
        pressed && !isOff && { backgroundColor: tint(tone.label, 0.12) },
        isOff && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.label} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <MaterialCommunityIcons name={icon} size={16} color={tone.label} />
          ) : null}
          <Text style={[styles.label, { color: tone.label }]}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  compact: {
    width: "auto",
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});

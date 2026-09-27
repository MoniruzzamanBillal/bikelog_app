import { ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface FormFieldProps
  extends Omit<React.ComponentProps<typeof TextInput>, "style" | "mode"> {
  label: string;
  rightElement?: ReactNode;
  required?: boolean;
  errorText?: string;
  style?: object;
}

export function FormField({
  label,
  rightElement,
  required,
  errorText,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          !!errorText && styles.boxError,
        ]}
      >
        <TextInput
          {...inputProps}
          placeholderTextColor={COLORS.placeholder}
          textColor={COLORS.text}
          cursorColor={COLORS.accent}
          selectionColor={COLORS.accent}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          underlineStyle={{ display: "none" }}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {rightElement}
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

/** Shared by every field component, so labels/boxes stay identical. */
export const fieldStyles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: "rgba(233,233,237,0.7)",
    marginBottom: 6,
  },
  required: {
    color: COLORS.danger,
  },
  box: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  boxFocused: {
    borderColor: COLORS.accent,
  },
  boxError: {
    borderColor: COLORS.danger,
  },
  valueText: { fontSize: 15, color: COLORS.text },
  placeholderText: { fontSize: 15, color: COLORS.placeholder },
  error: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  ...fieldStyles,
  box: {
    ...fieldStyles.box,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    // Paper's flat TextInput only drops its own inner inset for a numeric
    // paddingHorizontal (spec 38a) — `padding: 0` alone doesn't reach it.
    paddingHorizontal: 0,
    fontSize: 15,
    height: 42,
  },
});

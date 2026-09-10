import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface FormFieldProps
  extends Omit<React.ComponentProps<typeof TextInput>, "style" | "mode"> {
  label: string;
  rightElement?: ReactNode;
  style?: object;
}

export function FormField({
  label,
  rightElement,
  style,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          {...inputProps}
          placeholderTextColor={COLORS.placeholder}
          textColor={COLORS.text}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          underlineStyle={{ display: "none" }}
          style={styles.input}
        />
        {rightElement}
      </View>
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
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    fontSize: 15,
  },
});

import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/utils/colors";

interface SelectPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}

export function SelectPickerField({
  label,
  value,
  onChange,
  options,
  required,
}: SelectPickerFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value || ""}
          onValueChange={onChange}
          style={styles.picker}
        >
          <Picker.Item label="Select..." value="" />
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
  },
  pickerWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  picker: {
    height: 40,
  },
});

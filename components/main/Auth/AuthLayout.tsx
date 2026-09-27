import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

interface AuthLayoutProps {
  heading: string;
  lede: string;
  children: ReactNode;
  switchPrompt: string;
  switchLabel: string;
  onSwitch: () => void;
}

/** The web's mobile `AuthLayout`: brand row, heading, lede, form, switch line. */
export function AuthLayout({
  heading,
  lede,
  children,
  switchPrompt,
  switchLabel,
  onSwitch,
}: AuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
      bottomOffset={30}
      extraKeyboardSpace={10}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandChip}>
            <MaterialCommunityIcons
              name="motorbike"
              size={15}
              color={COLORS.accent}
            />
          </View>
          <Text style={styles.brandName}>Bike Log</Text>
        </View>

        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.lede}>{lede}</Text>

        <View style={styles.form}>{children}</View>

        <View style={styles.switchRow}>
          <Text style={styles.switchPrompt}>{switchPrompt} </Text>
          <TouchableOpacity onPress={onSwitch} hitSlop={8}>
            <Text style={styles.switchLink}>{switchLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  brandChip: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  heading: {
    fontSize: 26,
    fontWeight: "500",
    color: COLORS.text,
  },
  lede: {
    fontSize: 13.5,
    color: COLORS.textLight,
    marginTop: 4,
  },
  form: {
    marginTop: 24,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  switchPrompt: {
    fontSize: 13.5,
    color: COLORS.textLight,
  },
  switchLink: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.accent,
  },
});

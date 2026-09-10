import { useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FormField, PrimaryButton } from "@/components/main/shared";
import { usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TRegisterPayload } from "@/types/global.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = usePost();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Toast.show({ type: "error", text1: "Name is required", position: "top" });
      return;
    }
    if (!trimmedEmail) {
      Toast.show({ type: "error", text1: "Email is required", position: "top" });
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Toast.show({
        type: "error",
        text1: "Enter a valid email address",
        position: "top",
      });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Password must be at least 6 characters",
        position: "top",
      });
      return;
    }

    try {
      Keyboard.dismiss();
      const payload: TRegisterPayload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
      };

      await registerMutation.mutateAsync({
        url: "/auth/register",
        payload,
      });

      Toast.show({
        type: "success",
        text1: "Registered successfully. Please log in.",
        position: "top",
      });
      setTimeout(() => router.replace("/auth"), 100);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Registration failed. Please try again.",
        position: "top",
      });
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      bottomOffset={30}
      extraKeyboardSpace={10}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <View style={styles.headerRow}>
            <Text style={styles.subtitle}>Already have one? </Text>
            <TouchableOpacity onPress={() => router.push("/auth")}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FormField
          label="Name"
          placeholder="Test Rider"
          value={name}
          onChangeText={setName}
          autoCorrect={false}
          editable={!registerMutation.isPending}
        />

        <FormField
          label="Email"
          placeholder="rider@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!registerMutation.isPending}
        />

        <FormField
          label="Password (min 6 chars)"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!registerMutation.isPending}
          style={styles.passwordField}
        />

        <PrimaryButton
          onPress={handleSubmit}
          loading={registerMutation.isPending}
        >
          Create account
        </PrimaryButton>
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
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  link: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: "600",
  },
  passwordField: {
    marginBottom: 24,
  },
});

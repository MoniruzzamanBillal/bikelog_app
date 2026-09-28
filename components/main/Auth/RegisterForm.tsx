import { useState } from "react";
import { Keyboard, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { FormField, PrimaryButton } from "@/components/main/shared";
import { usePost } from "@/hooks/useApi";
import { TRegisterPayload } from "@/types/global.types";
import { AuthLayout } from "./AuthLayout";

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
    if (password?.length < 6) {
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
    <AuthLayout
      heading="Create your account"
      lede="Start logging your first bike in a minute."
      switchPrompt="Already have an account?"
      switchLabel="Log in"
      onSwitch={() => router.push("/auth")}
    >
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
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  passwordField: {
    marginBottom: 20,
  },
});

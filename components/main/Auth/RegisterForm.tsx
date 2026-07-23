import { useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
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
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      bottomOffset={30}
      extraKeyboardSpace={10}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>BikeLog</Text>
        <Text style={styles.subtitle}>Create Account</Text>

        <View style={styles.field}>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            editable={!registerMutation.isPending}
            textColor={COLORS.text}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!registerMutation.isPending}
            textColor={COLORS.text}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <TextInput
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!registerMutation.isPending}
            textColor={COLORS.text}
            style={styles.input}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={registerMutation.isPending}
          disabled={registerMutation.isPending}
          style={styles.button}
        >
          {registerMutation.isPending ? "Registering..." : "Register"}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/auth")}>
            <Text style={styles.link}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 32,
  },
  field: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  input: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  button: {
    width: "100%",
    paddingVertical: 4,
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
});

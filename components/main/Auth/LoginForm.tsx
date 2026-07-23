import { useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Button, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { useUserContext } from "@/context/user.context";
import { usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TLoginPayload, TUserToken } from "@/types/global.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TLoginResponse = {
  success: boolean;
  message: string;
  data: null;
  token: string;
};

export function LoginForm() {
  const router = useRouter();
  const { handleSetToken, handleSetUser } = useUserContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = usePost();

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();

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
    if (!password.trim()) {
      Toast.show({ type: "error", text1: "Password is required", position: "top" });
      return;
    }

    try {
      Keyboard.dismiss();
      const payload: TLoginPayload = { email: trimmedEmail, password };

      const result = (await loginMutation.mutateAsync({
        url: "/auth/login",
        payload,
      })) as TLoginResponse;

      if (result?.token) {
        const decoded = jwtDecode<TUserToken>(result.token);

        handleSetToken(result.token);
        handleSetUser({ _id: decoded.userId, email: decoded.userEmail });

        Toast.show({
          type: "success",
          text1: "Logged in successfully",
          position: "top",
        });
        setTimeout(() => router.replace("/"), 100);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to log in. Please try again.",
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
        <Text style={styles.subtitle}>Log In</Text>

        <View style={styles.field}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loginMutation.isPending}
            textColor={COLORS.text}
            style={styles.input}
          />
        </View>

        <View style={[styles.field, styles.passwordField]}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loginMutation.isPending}
            textColor={COLORS.text}
            style={[styles.input, styles.passwordInput]}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loginMutation.isPending}
          disabled={loginMutation.isPending}
          style={styles.button}
          labelStyle={{ color: COLORS.white }}
        >
          {loginMutation.isPending ? "Logging in..." : "Log In"}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.link}>Register</Text>
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
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeIcon: {
    paddingHorizontal: 4,
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

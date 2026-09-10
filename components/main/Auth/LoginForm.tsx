import { FormField, PrimaryButton } from "@/components/main/shared";
import { useUserContext } from "@/context/user.context";
import { usePost } from "@/hooks/useApi";
import { TLoginPayload, TUserToken } from "@/types/global.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";

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
      Toast.show({
        type: "error",
        text1: "Email is required",
        position: "top",
      });
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
      Toast.show({
        type: "error",
        text1: "Password is required",
        position: "top",
      });
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
      style={styles.screen}
      contentContainerStyle={styles.content}
      bottomOffset={30}
      extraKeyboardSpace={10}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>bikeLog</Text>
          <Text style={styles.subtitle}>
            Track every ride, fill-up &amp; service.
          </Text>
        </View>

        <FormField
          label="Email"
          placeholder="rider@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loginMutation.isPending}
        />

        <FormField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loginMutation.isPending}
          style={styles.passwordField}
          rightElement={
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          }
        />

        <PrimaryButton
          onPress={handleSubmit}
          loading={loginMutation.isPending}
          style={styles.button}
        >
          Sign In
        </PrimaryButton>

        <View style={styles.footer}>
          <Text style={styles.footerText}>No account? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.link}>Register</Text>
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
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  passwordField: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  link: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "600",
  },
});

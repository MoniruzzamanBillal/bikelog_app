import { FormField, PrimaryButton } from "@/components/main/shared";
import { useUserContext } from "@/context/user.context";
import { usePost } from "@/hooks/useApi";
import { TLoginPayload, TUserToken } from "@/types/global.types";
import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { AuthLayout } from "./AuthLayout";

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
  // Inline server error (wrong password is a 403, never the 401 session path).
  const [serverError, setServerError] = useState<string | null>(null);

  const loginMutation = usePost();

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    setServerError(null);

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
      const message = error?.message || "Failed to log in. Please try again.";
      setServerError(message);
      Toast.show({
        type: "error",
        text1: message,
        position: "top",
      });
    }
  };

  return (
    <AuthLayout
      heading="Welcome back"
      lede="Log in to your garage."
      switchPrompt="New to Bike Log?"
      switchLabel="Create an account"
      onSwitch={() => router.push("/register")}
    >
      {serverError ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={16}
            color={COLORS.danger}
          />
          <Text style={styles.errorText}>{serverError}</Text>
        </View>
      ) : null}

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
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        }
      />

      <PrimaryButton onPress={handleSubmit} loading={loginMutation.isPending}>
        Log in
      </PrimaryButton>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tint(COLORS.danger, 0.4),
    backgroundColor: tint(COLORS.danger, 0.08),
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
  },
  passwordField: {
    marginBottom: 20,
  },
});

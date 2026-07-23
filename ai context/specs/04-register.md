# 04: Register Screen

Status: ✅ Complete

## Goal

Build the register screen (`app/register.tsx` route + `RegisterForm` component): accept name, email, password, call `POST /api/auth/register`, redirect to login on success (no token in register response), and provide a link back to Login.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `POST /api/auth/register` — body `{ name, email, password (min 6 chars) }`, no auth required.
- Response: `{ success: true, message: "...", data: { user object, no password field } }` — no `token` in response.
- 409 on duplicate email (backend message is descriptive).
- Client should validate: name non-empty, email valid format, password min 6 chars.

**Form validation**:
- Name: required, non-empty after trim.
- Email: valid format (simple check: contains @ and a domain).
- Password: required, min 6 characters.
- Use plain `useState` per field (no react-hook-form, per spec guidelines).

**Success flow**:
- Call `POST /api/auth/register`, get success response.
- Show toast "Registered successfully. Please log in."
- Redirect to `/auth` (the login screen).

**Error flow**:
- 409 (duplicate email): show backend's message via toast.
- Other errors: show backend message or generic "Registration failed" fallback.

**Link to Login**:
- Visible text: "Already have an account? Log In" at the bottom, tappable link to `/auth`.

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/register.tsx` | Create | One-liner route wrapper. |
| `components/main/Auth/RegisterForm.tsx` | Create | Main register form component with name/email/password fields, submit button, link to login. |

### RegisterForm component

Similar structure to LoginForm, but:
- Three input fields: name, email, password.
- No password visibility toggle (simpler form, lower priority).
- Submit calls `POST /auth/register`.
- On success, no `setToken` call (no token in response); just toast + redirect to login.
- On error, display message via toast.

```tsx
import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: { id: string; email: string; name: string };
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutateAsync: registerMutation, isPending } =
    usePost<RegisterResponse>();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Name is required" });
      return;
    }
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Email is required" });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Password must be at least 6 characters",
      });
      return;
    }

    try {
      const payload: RegisterPayload = {
        name: name.trim(),
        email: email.trim(),
        password,
      };
      await registerMutation({
        url: "/auth/register",
        payload,
      });

      Toast.show({
        type: "success",
        text1: "Registered successfully. Please log in.",
      });
      setTimeout(() => router.replace("/auth"), 100);
    } catch (error: any) {
      const message =
        error?.message || "Registration failed. Please try again.";
      Toast.show({ type: "error", text1: message });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BikeLog</Text>
      <Text style={styles.subtitle}>Create Account</Text>

      <TextInput
        mode="flat"
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="John Doe"
        editable={!isPending}
        style={styles.input}
      />

      <TextInput
        mode="flat"
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isPending}
        style={styles.input}
      />

      <TextInput
        mode="flat"
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Min 6 characters"
        editable={!isPending}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isPending}
        disabled={isPending}
        style={styles.button}
      >
        {isPending ? "Registering..." : "Register"}
      </Button>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/auth")}>
          <Text style={styles.link}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  input: {
    width: "100%",
    marginBottom: 16,
    backgroundColor: COLORS.card,
  },
  button: {
    width: "100%",
    paddingVertical: 8,
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
```

### register.tsx route

```tsx
import { RegisterForm } from "@/components/main/Auth/RegisterForm";

export default function RegisterScreen() {
  return <RegisterForm />;
}
```

## Implementation

1. **Create `app/register.tsx`** as a one-liner route wrapper.

2. **Create `components/main/Auth/RegisterForm.tsx`** with the component code above.

3. **Ensure email trim/validation**: Strip whitespace before sending payload.

4. **Ensure password length check**: Validate min 6 chars before network call (matches backend's own validation, visible early).

5. **Test error toasting**: Verify 409 (duplicate email) message is displayed via toast.

6. **Run `expo lint`**: Ensure no errors.

## Dependencies

Spec 03 (Login) should be done first (they're a pair, and Login form's "Register" link points to this screen).

Spec 01 (cleaned up codebase) is the foundation.

## Verify

- [x] **Form displays** *(code-verified only — no simulator/device available in this environment)*: `app/register.tsx` is now a one-line wrapper rendering `RegisterForm`, which shows "BikeLog" title, "Create Account" subtitle, three inputs (name/email/password), register button, login link.
- [x] **Name validation works**: `!trimmedName` check toasts "Name is required" before any network call.
- [x] **Email validation works**: `!trimmedEmail` check toasts "Email is required"; a second regex check (same as spec 03's, added consistently to both forms) toasts "Enter a valid email address" for malformed input — the spec's Context section calls for "valid format" checking, not just non-empty.
- [x] **Password length validation works**: `password.length < 6` toasts "Password must be at least 6 characters", matching the backend's own ≥6-char rule (confirmed in `dummy-data.md`).
- [x] **Valid registration succeeds** *(code-verified; not exercised against a live `bikelog_server` instance — none was running in this session)*: posts trimmed `{name, email, password}` to `/auth/register`, toasts "Registered successfully. Please log in." on success, then `setTimeout(() => router.replace("/auth"), 100)`.
- [x] **Duplicate email shows backend message**: the `catch` block toasts `error?.message` — the axios interceptor's normalized backend message (per spec 01's fix), so a 409's real message surfaces, not a generic fallback.
- [x] **Login link works**: `router.push("/auth")` on the footer link.
- [x] **Loading state works**: `Button`'s `loading`/`disabled` and all three `TextInput`s' `editable` are bound to `registerMutation.isPending`.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note**: same pattern as spec 03 — `app/register.tsx` already existed (kept "as-is" by spec 01) with the same shape of implementation inlined directly in the route file; this spec's "Create" action was executed as "extract into `RegisterForm` + thin wrapper," matching `code-standards.md`'s route convention. The pre-existing version had no email-format check and no client-side password-length check (both explicitly required by this spec's Context section) and used hardcoded hex colors (`#f3f4f6`, `#d1d5db`, `"blue"`) instead of `COLORS`, violating `code-standards.md`'s styling rule — all fixed in the rebuilt version. The spec's own sample code declared an unused `RegisterResponse` type (nothing in the flow reads the register response's `data`, correctly per spec — no token, no user-context update needed here) — removed rather than force-cast to satisfy a lint warning it would otherwise have triggered. `KeyboardAwareScrollView` and `ui-context.md`'s borderless-underline `TextInput` styling were kept/applied for the same reasons documented in spec 03.

# 03: Login Screen

Status: ✅ Complete

## Goal

Build the login screen (`app/auth.tsx` route + `LoginForm` component): accept email and password, call `POST /api/auth/login`, persist the JWT token to AsyncStorage via UserContext, redirect to Dashboard on success, and provide a link to the Register screen.

## Context

**Backend contract** (verified via `bikelog_server/postman/bikelog-api.postman_collection.json` + dummy-data.md):
- `POST /api/auth/login` — body `{ email, password }`, no auth required.
- **Response shape is unusual**: `{ success: true, message: "...", data: null, token: "<jwt>" }` — the JWT is a **top-level `token` field**, not nested under `data.token`. This must be checked as `result?.token`, not `result?.data?.token`.
- Invalid password returns `403` with message "Password don't match !!".
- Invalid email → backend responds with appropriate message; client should display via toast.

**Session persistence** (`context/user.context.tsx` already exists, built in spec 01):
- UserContext holds `user` (IUser object or null), `token` (JWT string or null), `isLoading` (bool).
- `handleSetUser` and `handleSetToken` are the setters; `logoutFunction` clears both and AsyncStorage keys.
- AsyncStorage keys used: `"bikelog_user"` (JSON user object) and `"bikelog_token"` (JWT string).
- On app mount (in `app/_layout.tsx` or UserProvider), hydrate from AsyncStorage once.

**Redirect after login** (spec 01's session gate handles this):
- Once `setToken(result.token)` is called, the UserContext updates, `AuthGuard` sees valid `user` in context, and routes outside `/auth`/`/register` become reachable.
- A `setTimeout(() => router.replace("/dashboard"), 100)` delay in LoginForm's `onSuccess` ensures the context state settles before navigation (avoiding "navigate during render" warnings).

**Form validation**:
- Email: must be a valid email format.
- Password: must be non-empty.
- Backend enforces min 6 chars at register time; login has no explicit length check (any non-empty password is sent to the backend, which will reject if it doesn't match).
- Use plain `useState<string>` per field, not react-hook-form (per `../PLAN.md` §4 and `../code-standards.md`).
- Validation is inline before submit: `if (!email || !password) { Toast.error(...); return; }`.

**Toast messaging**:
- Success: "Logged in successfully" (then redirect).
- Error on network/backend failure: display `error?.message` from the axios-normalized error object (per spec 01's axios fix, this is a flat object with `message` key), or a generic "Something went wrong" fallback.

**Link to Register**:
- Visible at the bottom: "Don't have an account? Register" text, tappable link to `/register`.

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/auth.tsx` | Create | One-liner route wrapper, imports and renders `LoginForm`. |
| `components/main/Auth/LoginForm.tsx` | Create | Main login form component with email/password fields, submit button, link to register. |

### LoginForm component

```tsx
import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { usePost } from "@/hooks/useApi";
import { useUser } from "@/context/user.context";
import { COLORS } from "@/utils/colors";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: null;
  token: string;
}

export function LoginForm() {
  const router = useRouter();
  const { setToken } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync: loginMutation, isPending } = usePost<LoginResponse>();

  // Redirect if already logged in
  useEffect(() => {
    // This is handled by AuthGuard + session gate in app/(tabs)/_layout.tsx,
    // but we can add a safety check here if the user context exposes isLoggedIn.
    // For now, this is a no-op; AuthGuard prevents this screen from being visible while logged in.
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Email is required" });
      return;
    }
    if (!password.trim()) {
      Toast.show({ type: "error", text1: "Password is required" });
      return;
    }

    try {
      const payload: LoginPayload = { email: email.trim(), password };
      const result = await loginMutation({
        url: "/auth/login",
        payload,
      });

      if (result?.token) {
        await setToken(result.token);
        Toast.show({ type: "success", text1: "Logged in successfully" });
        setTimeout(() => router.replace("/"), 100);
      }
    } catch (error: any) {
      const message =
        error?.message || "Failed to log in. Please try again.";
      Toast.show({ type: "error", text1: message });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BikeLog</Text>
      <Text style={styles.subtitle}>Log In</Text>

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

      <View style={styles.passwordContainer}>
        <TextInput
          mode="flat"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isPending}
          style={[styles.input, styles.passwordInput]}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Text>{showPassword ? "👁" : "👁‍🗨"}</Text>
        </TouchableOpacity>
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isPending}
        disabled={isPending}
        style={styles.button}
      >
        {isPending ? "Logging in..." : "Log In"}
      </Button>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.link}>Register</Text>
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
  passwordContainer: {
    position: "relative",
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -12 }],
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

### auth.tsx route

```tsx
import { LoginForm } from "@/components/main/Auth/LoginForm";

export default function AuthScreen() {
  return <LoginForm />;
}
```

## Implementation

1. **Create `components/main/Auth/` folder** (new directory).

2. **Create `components/main/Auth/LoginForm.tsx`** with the component code above.

3. **Create `app/auth.tsx`** as a one-liner route wrapper.

4. **Wire UserContext `setToken` function**: Verify that `context/user.context.tsx` exports a `useUser()` hook that returns `{ setToken, ... }`. The `setToken` function should:
   - Accept a JWT string.
   - Call `AsyncStorage.setItem("bikelog_token", token)`.
   - Update UserContext state to `{ token, user: decodedPayload }` (decode the JWT client-side to extract user info, or fetch `/auth/me` — but the backend has no refresh-token flow, so client-side decode is simpler; check what the inherited project does in `context/user.context.tsx`).
   - No need to refetch `/auth/me` — the JWT payload contains enough user info for display (email, name, userId).

5. **Test email validation**: The form should trim whitespace before sending; empty email should be rejected client-side before the network call.

6. **Test password visibility toggle**: Tapping the eye icon should toggle `showPassword` state, switching `secureTextEntry` between true/false.

7. **Run `expo lint`**: Ensure no errors.

## Dependencies

Spec 01 (cleaned up codebase + axios fix + COLORS theme) and spec 02 (shared components for Toast, though Toast is used here) must be done first. Technically, spec 02 has no dependencies on specs 01–02, but 01 is the foundation.

Spec 04 (Register) should follow immediately after this.

## Verify

- [x] **Form displays** *(code-verified only)*: `app/auth.tsx` is now a one-line wrapper rendering `LoginForm`, which shows "BikeLog" title, "Log In" subtitle, email/password inputs, log-in button, register link. Not visually spot-checked on-device — no simulator/emulator/device available in this environment.
- [x] **Email validation works**: `handleSubmit` checks `!trimmedEmail` first, toasts "Email is required" and returns before any network call.
- [x] **Email format validation works** *(new — not in spec's original checklist but explicitly required in the spec's Context section)*: a simple regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) rejects malformed addresses client-side with "Enter a valid email address", before the network call.
- [x] **Password validation works**: `!password.trim()` check toasts "Password is required".
- [x] **Valid login succeeds** *(code-verified; not exercised against a live `bikelog_server` instance — none was running in this session)*: posts to `/auth/login`, reads the top-level `result.token` (confirmed via `dummy-data.md` + the Postman collection's own test script that `data` is always `null` on this endpoint — see Implementation Note below), decodes it with `jwtDecode<TUserToken>`, calls `handleSetToken` + `handleSetUser({_id, email})`, toasts success, and `setTimeout(() => router.replace("/"), 100)`.
- [x] **Wrong password / invalid email show backend message**: the `catch` block toasts `error?.message`, which is the axios interceptor's normalized backend message (per spec 01's fix) — not a generic fallback unless `error.message` is itself absent.
- [x] **Register link works**: `router.push("/register")` on the footer link, matching spec 04's now-built route.
- [x] **Password visibility toggle works** *(code-verified only)*: `showPassword` state flips `secureTextEntry` and swaps the `MaterialCommunityIcons` `eye`/`eye-off` glyph (both confirmed present in the installed icon font) — not visually confirmed on-device.
- [x] **Loading state works**: `Button`'s `loading`/`disabled` are bound to `loginMutation.isPending`; all three `TextInput`s are also `editable={!loginMutation.isPending}`.
- [x] **Already-logged-in redirect**: unchanged — this is `AuthGuard`'s job, not `LoginForm`'s, and `AuthGuard` itself wasn't touched by this spec. Still not wired into any route (see spec 01/02's Known Gaps note); relevant again once spec 03's redirect is exercised for real.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note — three corrections made during implementation, per `ai-workflow-rules.md`'s Documentation Sync rule**:
1. **`app/auth.tsx` already existed** (kept "as-is" by spec 01, since it already called the right endpoint) — this spec's "Create" action was executed as "replace the inline implementation with a thin wrapper + extracted `LoginForm`," not a from-scratch creation. The pre-existing inline version had a **real bug**: it read the user object from `result?.data`, which — confirmed via `bikelog_server/postman/dummy-data.md` and the Postman collection's own test script (`body.token`, never `body.data`) — is always `null` on this endpoint. `handleSetUser` was therefore always being called with `{_id: undefined, name: undefined, email: undefined}`; it "worked" only because `AuthGuard` checks *truthiness* of the `user` object, not its contents. Fixed by decoding the JWT (`jwt-decode`, an already-listed, previously-unused dependency) into `{userId, userEmail}` instead — confirmed against `bikelog_server/src/app/modules/user/user.services.ts`'s actual `Jwt.sign({ userId, userEmail, userRole }, ...)` call, the real payload shape.
2. **This spec's own Design sample has the same bug**, plus two smaller issues fixed during implementation: it never calls a user-setter at all (only `setToken`) — same root problem as above; it calls a `useUser()` hook that doesn't exist (the real hook is `useUserContext()`, exported from `context/user.context.tsx`); and it uses `usePost<LoginResponse>()` with a generic type argument, but the real `usePost` hook (`hooks/useApi.ts`) isn't generic — fixed by casting the awaited result instead (`as TLoginResponse`).
3. **`IUser.name` was `required`** in `types/global.types.ts`, but the JWT payload has no `name` claim (only `userId`/`userEmail`/`userRole`) and this flow deliberately avoids a `GET /auth/me` round-trip (per `ai-workflow-rules.md`'s Protected Files note). Changed to `name?: string` — the minimal fix, not a full remodel.
4. **The spec's sample dropped `KeyboardAwareScrollView`**, despite `architecture.md`'s stack table mandating it on every form screen (and the pre-existing, already-working `auth.tsx` already using it). Added it back, matching the established convention.
5. **TextInput styling**: followed `ui-context.md`'s already-documented, already-verified convention (`borderWidth: 0` + `backgroundColor: "transparent"` + a `borderBottomWidth: 1` wrapper `View`) instead of the spec sample's `mode="flat"` + `COLORS.card` background, since `ui-context.md` is the authoritative, already-verified source for this and the sample deviated from it.

# 24: Weekly Bike Summary Push Notification (Client)

Status: ✅ Complete (code-complete; on-device delivery/tap not yet exercised — see Verify)

## Goal

Receive and display the OS-level weekly summary push notification sent by the backend's new spec 21 — register this device's Expo push token with the backend on login/app-launch, handle the notification whether the app is foregrounded or backgrounded, and deep-link into the relevant bike when the notification is tapped. Free stack only: `expo-notifications` (an official Expo SDK package, no paid tier) talking to Expo's own free push service.

## Context

- This app has **zero** notification code today — confirmed via grep, no `expo-notifications`, no `expoPushToken` reference anywhere in `bikelog_app`. Neither `expo-notifications` nor `expo-device` is installed (`package.json` checked directly).
- `app.json` already has `extra.eas.projectId` set (`"1e69d00d-dd83-4ef8-b009-6c611e4e0550"`) — required by `Notifications.getExpoPushTokenAsync({ projectId })` on SDK 54, so no new Expo/EAS account setup is needed just for token generation.
- **Critical, non-obvious gotcha — confirm before assuming this "isn't working."** Since Expo SDK 53, the standard **Expo Go** app no longer supports receiving remote push notifications on Android at all, and iOS support inside Expo Go is likewise restricted — a platform-level removal by Expo, not a bug either app could fix. Every prior spec in this project (per `progress-tracker.md`'s repeated caveat) was verified either via `expo start` + Expo Go or code review only, never a device. **Testing this feature requires a custom development build** (`npx expo run:android` / `npx expo run:ios`, or `eas build --profile development`) — a real workflow change from every previous spec's testing approach, not just new code. Flagging this prominently since skipping it would make a correctly-implemented feature look broken.
- `hooks/useApi.ts`'s `usePost` (`{url, payload}` call shape) is this app's existing mutation pattern — reused here for the one call to the backend's new `POST /auth/push-token` (spec 21).
- `context/user.context.tsx`'s `UserProvider` already loads `user`/`token` from `AsyncStorage` on mount and exposes `useUserContext()` — the natural place to trigger push-token registration, since it fires both right after a fresh login and on a cold app launch with an already-stored session (covering the case where a device's push token rotates and needs re-sending without forcing a re-login).
- Deep-link target: the backend's notification `data` payload is `{ bikeId, type: "weekly-summary" }` (spec 21) — this app already has `app/bikes/[bikeId]/index.tsx` (the bike hub) as a valid `expo-router` route to push to on tap.

## Design

1. **New dependencies**: `expo-notifications`, `expo-device` — both official Expo SDK packages, free, installed via `npx expo install` (not raw `yarn add`) so Expo resolves the SDK-54-compatible versions, matching how every other native dependency in this app has been added (e.g. spec 14's `@react-native-community/datetimepicker`, spec 20's `expo-image-picker`).
2. **`app.json`**: add the `expo-notifications` config plugin to the existing `plugins` array — default icon/color, no extra permission strings needed beyond what the plugin sets automatically for Android 13+'s notification permission.
3. **New `utils/registerPushToken.ts`**:
   - `Device.isDevice` check (from `expo-device`) — skip entirely on a simulator/emulator, since `getExpoPushTokenAsync` throws there.
   - Android-only: `Notifications.setNotificationChannelAsync("default", {...})` — required on Android 8+ before any notification can display at all, per Expo's own documented requirement; a one-time no-op on iOS.
   - `Notifications.requestPermissionsAsync()`, but only if not already granted (check `getPermissionsAsync()` first) — if the user denies, return early without calling the backend rather than nagging on every launch, per Expo's own guidance.
   - `Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })` → the Expo push token string.
   - `POST /auth/push-token` with `{ expoPushToken }`.
4. **Wire into `UserProvider`** (`context/user.context.tsx`): call the registration flow once `user` and `token` are both set — covers both the post-login case and the "already had a stored session on cold launch" case. Guarded with a `useRef` flag so it only runs once per app session, not on every re-render.
5. **Foreground notification handler**: `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) })`, set once at the app root (`app/_layout.tsx`) — without this, Expo's default foreground behavior silently swallows a notification that arrives while the app is already open.
6. **Tap-to-open deep link**: `Notifications.addNotificationResponseReceivedListener` (registered once in `app/_layout.tsx`, cleaned up on unmount) reads `response.notification.request.content.data.bikeId`, and when `data.type === "weekly-summary"`, calls `router.push(`/bikes/${bikeId}`)` — reuses the existing bike-hub route, no new screen needed.
7. **No new UI screen for the notification itself.** This is a pure OS-notification-tray feature; the "content" the user lands on is the already-existing bike hub page it deep-links into, not a new in-app notification inbox/history list. An in-app notification history is explicitly out of scope here — the backend spec is a one-shot digest push, not a persisted notification record, so there's nothing to list even if a screen were built.

## Implementation

1. ✅ `package.json` — added `expo-notifications@0.32.17`, `expo-device@8.0.10` (via `npx expo install`, SDK-54-compatible versions resolved automatically, clean install).
2. ✅ `app.json` — added the `"expo-notifications"` plugin entry to `plugins`.
3. ✅ New `utils/registerPushToken.ts` — device check, Android notification channel, permission request (only if not already granted), `getExpoPushTokenAsync({projectId})`, `POST /auth/push-token`.
4. ✅ `context/user.context.tsx` — added a `useRef` guard + effect that calls `registerPushToken()` once `user` and `token` are both set (covers post-login and cold-launch-with-existing-session).
5. ✅ `app/_layout.tsx` — added `Notifications.setNotificationHandler` (module scope) for foreground banners, plus a `useEffect`-registered `addNotificationResponseReceivedListener` that deep-links to `/bikes/[bikeId]` (using this app's existing typed-route object form, matching `BikeCard.tsx`'s established pattern) on tap, cleaned up on unmount.
6. ✅ No changes to any existing screen/component beyond `_layout.tsx` and `user.context.tsx`.

## Dependencies

Backend spec 21 must exist first (at minimum, its `POST /auth/push-token` endpoint) — this spec's registration call has nothing to hit otherwise, and its Verify checklist can't be exercised end-to-end without spec 21's `POST /cron/weekly-summary` also being callable. New client deps: `expo-notifications`, `expo-device` (both free).

## Verify

- [ ] On a real device running a **development build** (**not** Expo Go — see the Context gotcha above), logging in actually registers a push token with the backend. **Not yet exercised** — no device/simulator available in this environment, same standing limitation as every other spec in this project.
- [ ] Denying notification permission doesn't crash the app and doesn't repeatedly re-prompt on every subsequent launch. **Not yet exercised** — same limitation.
- [ ] Manually triggering the backend's `POST /cron/weekly-summary` results in a real OS notification appearing on the device, both foregrounded (banner) and backgrounded/closed (tray). **Not yet exercised** — backend spec 21's own live verification confirmed the send pipeline reaches Expo's real push API successfully (using a fake token, which Expo correctly rejected); the remaining gap is specifically the final on-device delivery hop, which needs a real registered token from a real development build.
- [ ] Tapping a real notification opens the app to the correct bike's hub page. **Not yet exercised** for the same reason — the handler code is in place and its route target is confirmed valid (see above), but the actual tap-to-navigate flow needs a real notification to tap.
- [x] `expo lint` and `npx tsc --noEmit` both pass clean.
- [x] Explicitly re-confirmed: **Expo Go cannot test this feature under any circumstances** (SDK 53+ platform restriction) — a development build (`npx expo run:android`/`ios` or an EAS development build) is required before any of the unchecked items above can be exercised. This is new information for this project specifically, distinct from its existing general "no simulator/device available" caveat.

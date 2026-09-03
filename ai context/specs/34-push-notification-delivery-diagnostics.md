# 34: Diagnose Why Weekly Push Notifications Never Arrive on Device

Status: 🔄 In progress (diagnostic logging shipped and code-verified; `eas credentials`, on-device run, and the paired backend spec 29 trigger all require the user — see Implementation)

## Goal

Per direct user report: they never receive the weekly bike-summary push notification, despite testing with a real EAS development build (not Expo Go — spec 24's own Context section already flagged Expo Go as categorically incapable of receiving remote push on SDK 53+, and the user confirms that's not what's happening here). Find the actual break point on the client/EAS side and get one real notification delivered on device, adding only enough logging to make a silent failure visible — not a full production-hardening pass.

## Context

- Spec 24 shipped `utils/registerPushToken.ts` and wired it into `context/user.context.tsx` + `app/_layout.tsx`, but its own Verify section left every on-device item unchecked: "no device/simulator available in this environment... needs a real registered token from a real development build." This spec is that missing verification pass, now that a real device build exists.
- `utils/registerPushToken.ts`'s current flow has **three silent early-return/failure paths**, none of which log anything useful:
  - `Device.isDevice` check — correct to no-op on a simulator, not a concern on a real device build, but worth ruling out first if the "dev build" is actually running in an emulator.
  - Permission not granted after `requestPermissionsAsync()` — returns silently, no log, no user-facing message. If permission was denied once (even accidentally, e.g. during an earlier test), there's no re-prompt and no visible signal that this is why nothing arrives.
  - Missing `projectId` (`Constants.expoConfig?.extra?.eas?.projectId`) — returns silently. `app.json` does have `extra.eas.projectId` set (`"1e69d00d-dd83-4ef8-b009-6c611e4e0550"`), so this is unlikely to be the cause, but worth confirming it actually resolves at runtime in the built binary (a stale/cached build predating a config change could still carry an old value).
  - The final `try { getExpoPushTokenAsync(...); apiPost(...) } catch (error) { console.log(...) }` — the only path that logs anything at all, and only to Metro's console, easy to miss.
- **Most likely root cause given a confirmed real dev build**: Android push delivery via Expo's push service depends on the EAS project having FCM V1 credentials provisioned (`eas credentials -p android`). There is no `google-services.json` in this repo and no confirmation anywhere in `progress-tracker.md` that `eas credentials` was ever run to generate/upload a Google Service Account Key for this project (owner `moniruzzaman3018`, project id `1e69d00d-dd83-4ef8-b009-6c611e4e0550`). Without this, Expo's push API can accept a message and hand back an `"ok"` ticket while the actual FCM delivery to the device fails — invisible from the client, and only detectable server-side via a receipt check that the paired backend spec 29 also doesn't do today.
- `utils/envConfig.ts` hardcodes `baseURL = "https://bikelog-server.vercel.app"` with no local/dev override — the push-token POST always targets the deployed backend regardless of what else the developer is running locally. Confirm this deployed backend is actually up and has spec 21's `/auth/push-token` route live.
- iOS is explicitly out of scope (per user direction) — `app.json` has no `ios.bundleIdentifier` set at all, which would block any iOS build/APNs setup entirely if ever needed later.

## Design

### Manual verification (do first, no code)

1. Run `eas credentials -p android` in this project and check whether a Google Service Account Key (FCM V1) is already configured. If not, this is very likely the root cause — provision it (requires a Firebase project + service account JSON uploaded via this command).
2. On the device, confirm notification permission is actually granted (device Settings → Apps → this app → Notifications), not just assumed from app behavior.
3. Confirm the deployed backend (`https://bikelog-server.vercel.app`) is reachable and has the `/auth/push-token` route live.

### `utils/registerPushToken.ts`

Add minimal diagnostic logging only — no behavior change:

- Log before the `Device.isDevice` check whether it passed or the function is bailing (`console.log("[push] Device.isDevice:", Device.isDevice)`).
- Log the permission status at the point of the silent early return (`console.log("[push] permission not granted, status:", status)`).
- Log when `projectId` is missing (`console.log("[push] missing EAS projectId, aborting")`).
- Log the resolved token value right before the `POST /auth/push-token` call (`console.log("[push] obtained token:", expoPushToken)`) so a successful fetch-but-failed-POST case is distinguishable from a failed fetch.

These are pure `console.log` additions matching the file's existing best-effort/silent-by-design behavior (per its own comment) — no retry logic, no UI, no Toast added; that's deferred (see Dependencies).

## Implementation

1. ⬜ `eas credentials -p android` — check/provision FCM V1 credentials for this EAS project (external action, not a code change). **Blocked on the user**: this environment's `eas` CLI (`eas-cli/23.0.0`, confirmed installed) is not logged in (`eas whoami` → `Not logged in`) — provisioning FCM V1 credentials is an account-affecting action against the real EAS project (owner `moniruzzaman3018`) that requires the developer's own Expo login, so it wasn't attempted here. The user needs to run `eas login` then `eas credentials -p android` themselves and report back what it shows.
2. ✅ `utils/registerPushToken.ts` — added the four diagnostic `console.log` points described above (`[push] Device.isDevice:`, `[push] permission not granted, status:`, `[push] missing EAS projectId, aborting`, `[push] obtained token:`). Pure logging, no behavior change. `expo lint` and `npx tsc --noEmit` both pass clean.
3. ⬜ Rebuild/reinstall the dev client only if native config changed (FCM credential provisioning doesn't require a rebuild by itself; a JS-only logging change needs just a Metro reload). Depends on step 1's outcome.
4. ⬜ Launch the app on the real device, log in, watch Metro logs for: `Device.isDevice: true` → permission granted → `projectId` resolved → token obtained → POST succeeded. Requires the real device + Metro session — needs the user.
5. ⬜ Cross-check the backend (paired `bikelog_server` spec 29): confirm `expoPushToken` is now populated on this user's DB record, then use spec 29's manual trigger step to send a real notification and confirm it actually appears on the device (backgrounded banner, foreground display, and tap-to-deep-link into the bike hub — completing spec 24's originally unchecked Verify items). Paired-project step, out of this spec's own scope to execute — see Dependencies.
6. ⬜ `ai context/progress-tracker.md` — flip this row Not Started → Complete once a real notification is confirmed delivered end-to-end, and note the actual root cause found (also update spec 24's own Verify checkboxes if this resolves them). Deferred until steps 1/3/4/5 are confirmed by the user.

## Dependencies

Paired with `bikelog_server` spec 29 (server-side diagnostics + manual trigger) — this spec's fix is only confirmed once spec 29's manual trigger produces a real notification on this device. **Not in scope for either spec**: client-side user-facing error UI (Toast/banner on registration failure), a re-prompt flow for previously-denied permission, or a dedicated debug/test-trigger screen — these are production-hardening items deferred per the user's own scope decision; log as a Known Gap in `progress-tracker.md` if the eventual root cause is something one of these would have caught sooner.

## Verify

- [ ] `eas credentials -p android` confirms FCM V1 credentials are configured for this project (provisioned during this spec if missing).
- [ ] Metro logs during login show the full successful chain: device check → permission granted → projectId resolved → token obtained → POST succeeded — completing spec 24's first unchecked Verify item.
- [ ] The test user's DB record has a real, non-null `expoPushToken` (e.g. `ExponentPushToken[...]`) after login.
- [ ] After `bikelog_server` spec 29's manual trigger, a real OS notification banner appears on the backgrounded device — completing spec 24's third unchecked Verify item.
- [ ] Foreground receipt (banner while app is open) also confirmed.
- [ ] Tapping the notification opens the app to the correct bike's hub page — completing spec 24's fourth unchecked Verify item.
- [ ] Denying permission (tested by revoking it in device Settings, then relaunching) doesn't crash the app — completing spec 24's second unchecked Verify item.
- [ ] `npx tsc --noEmit` clean; `expo lint` clean.

# 36a: Findings from implementing spec 36 (widget entry point + click hand-off)

Per direct user instruction: "if you find any error during implementation, make an
implementation plan .md file for solving this and fix the issue based on it." Two
real things were found while implementing spec 36's §3 (the widget itself), both
resolved in the same pass — this file is the record of what was found and how it
was fixed, not a plan still to be executed.

## Finding 1 — spec's own open question resolved: `OPEN_URI` deep-link works

Spec 36 §3 said to build the AsyncStorage `pendingDeepLink` relay first, and only
switch to a direct `client://...` URI launch "if a short spike into the installed
library's own docs/example app confirms its click-action API supports launching an
arbitrary deep link directly."

Did that spike (read `react-native-android-widget`'s installed source directly —
`src/widgets/utils/click-action.ts` — plus its `example-expo/` and `example/`
reference apps on GitHub, not assumed from memory). Confirmed: `clickAction:
"OPEN_URI"` with `clickActionData: { uri: "..." }` is a first-class, documented
feature — the reference app's own `ClickDemoWidget.tsx` uses it to open a real
in-app deep link (`androidwidgetexample://list/fitness`). This action is handled
entirely natively (opens the URI and, if it resolves to the app's own scheme,
launches straight into that route) — it never round-trips through the JS task
handler's `WIDGET_CLICK` branch at all.

**Result**: built the simpler design. The widget's tap target uses `clickAction:
"OPEN_URI"` with `clickActionData: { uri: "client://bikes/<bikeId>/fuel-logs/new" }`
(or `"client://"` for the Dashboard fallback face) — resolved once, up front, in
the task handler when the widget is added/updated/resized. No AsyncStorage
`pendingDeepLink` key, and no new `app/_layout.tsx` `useEffect` to poll it — both
dropped entirely from the design as unnecessary. `bikelog_app`'s existing
`scheme: "client"` (already in `app.json` before this spec) makes this launch
straight into the correct nested route via expo-router's own already-working
deep-link handling — the exact same mechanism `app/_layout.tsx`'s push-notification
tap handler proved out in spec 24, just via the OS `Linking` path instead of a
`router.push()` call.

## Finding 2 — real regression risk: the new native dependency could crash Android Expo Go entirely, not just the widget

`react-native-android-widget`'s own `src/NativeAndroidWidget.ts` calls
`TurboModuleRegistry.getEnforcing('AndroidWidget')` at **module scope** — this
throws synchronously and unconditionally on Android if the native module isn't
actually compiled into the running binary (confirmed by reading the installed
package's source directly, not assumed). `src/AndroidWidget.ts` guards this
behind `Platform.OS === 'android'`, so iOS and web fall back to a safe no-op
module — but on Android specifically, any binary without the native module
compiled in (Expo Go, or a dev client from before this dependency was added)
throws hard the moment the module is imported.

This matters more here than for any prior native-dependency spec in this app
(image picker, document picker, push notifications) because of **where** the
import would have landed: spec 36's own design calls for registering the widget
task handler from the app's entry point (`registerWidgetTaskHandler` must run at
JS-bundle-load time, the same constraint push notifications' background handlers
have). A plain top-level `import { registerWidgetTaskHandler } from
"react-native-android-widget"` in the new `index.ts` entry file — the
straightforward way to wire this up, and what this library's own official
`example-expo/index.ts` reference does — is an ES import, which Metro always
hoists and executes before anything else in the file runs. That would mean **the
entire app**, every screen, not just the new widget feature, crashes on launch
the moment this dependency is installed, for as long as the developer is running
Android via Expo Go rather than a rebuilt dev client. Every prior native-only
spec in this app (20, 22, 24) only made its own specific feature untestable in
Expo Go; none of them could take down every other already-shipped screen too.

**Fix applied**: in `index.ts`, the `react-native-android-widget` and
`./widgets/quickAddFuelWidgetTaskHandler` imports are done via a runtime
`require()` call (not a static `import`) inside `if (Platform.OS === "android")
{ try { ... } catch { ... } }`. Unlike an `import` declaration, an inline
`require()` call is **not** hoisted by Metro — it executes exactly where it's
written, so the `try/catch` around it actually has a chance to run before the
throw propagates. Net effect: on a real dev-client/EAS build that includes the
native module, this behaves identically to the straightforward version (the
widget task handler registers normally); on Expo Go (or a stale dev client),
the `require()` throws, the `catch` swallows it, and the rest of the app —
every other already-shipped screen — boots exactly as it did before this spec,
with only the widget itself silently unavailable until a real build exists.

Verified this fix doesn't break anything else: `npx tsc --noEmit` clean, `npx
eslint index.ts widgets` clean (0 issues, in addition to `expo lint`'s own
`app`+`components` scope, same as this project's established pattern for
`utils/*.ts`-adjacent files per spec 27's precedent), and a full `npx expo
export --platform web` (the same extra verification depth spec 33 used for a
structurally risky change) bundled all 18 routes — including the new
`/bikes/[bikeId]/fuel-logs/new` and the moved `/bikes/[bikeId]/fuel-logs` —
with zero errors. **Still not verified**: that the guard's `try/catch` actually
prevents the crash on a real Android device running Expo Go — that requires a
real device, which this environment doesn't have (same standing gap as every
spec in this project); the fix is reasoned from the library's own source and
Metro's documented hoisting behavior for `import` vs. `require()`, not observed
live. This is the single highest-priority thing to confirm once a device is
available, ahead of the widget's own on-device checks in spec 36's Verify
section — a regression across every screen would be far worse than the new
feature itself not working yet.

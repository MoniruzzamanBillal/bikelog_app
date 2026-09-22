# 36: Quick-Add Fuel Log — Android Home-Screen Widget

## Status

🔄 In progress

## Goal

Per direct user request, for day-to-day usage: fuel logging is the single most frequent action in this app, and today it requires Dashboard → bike → Fuel Logs tab → "+" → blank form. Add a real Android home-screen widget that opens straight into a fuel-log create form prefilled with the last-used station and price, cutting that down to one tap from the home screen.

## Context

- Create form: `components/main/FuelLog/FuelLogFormModal.tsx`, a `react-native-paper` `Modal` (not a routed screen) toggled via local state inside `components/main/FuelLog/FuelLog.tsx`. It currently only prefills when _editing_ (`initialFuelLog` prop) — the "new entry, but seed sticky fields from the last log" behavior does not exist and is net new here.
- Route file today: `app/bikes/[bikeId]/fuel-logs.tsx` (flat file, no nested directory) — needs converting to `fuel-logs/index.tsx` to add a `fuel-logs/new.tsx` sibling, per expo-router's file-based nesting convention.
- `TCreateFuelLogPayload` (`types/fuel-log.types.ts`): `odometerReading`/`litersAdded` required and must always be entered fresh (never prefillable); `isFullTank` defaults `false`; `pricePerLiter`/`fuelStation` are the two fields worth prefilling from the previous fuel log.
- No dedicated "latest fuel log" endpoint exists — `GET /bikes/:bikeId/fuel-logs?limit=1` (default sort `-date`, confirmed in `bikelog_server`'s `buildPrismaListQuery.ts`) already returns the most recent log including `fuelStation`/`pricePerLiter`. No backend change needed for this spec.
- No "last-used bike" concept exists anywhere in this app (confirmed: no matching `AsyncStorage` key; `context/user.context.tsx`/`utils/axiosInstance.ts` only handle auth tokens). A widget needs this to know which bike to log fuel against when it isn't pinned to one bike.
- `app.json` already declares `"scheme": "client"` (expo-router's default deep-link scheme) — reusable, no change needed there beyond the widget plugin entry below.
- No widget/quick-action library is installed today. `react-native-android-widget` (config-plugin based — works with EAS Build, does not require a full bare-workflow eject) is the new dependency this spec introduces.
- **This is the app's second feature (after spec 24, push notifications) that cannot be tested in Expo Go at all** — a custom native widget module requires a dev-client build (`eas build --profile development --platform android`, or a local `expo prebuild` + `expo run:android`). Every native-layer change (widget layout/handler, not the JS routes it launches into) needs a fresh build.
- iOS is explicitly out of scope — an iOS home-screen widget needs separate native Swift/WidgetKit work with no equivalent Expo config-plugin path, and is a materially different effort than this spec covers.

## Design

### 1. "Last-used bike" tracking

New file `utils/lastUsedBike.ts`:

```ts
const KEY = "lastUsedBikeId";
export async function setLastUsedBike(bikeId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, bikeId);
  } catch {
    /* best-effort */
  }
}
export async function getLastUsedBike(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}
```

- Call `setLastUsedBike(bikeId)` from `BikeDetailPage.tsx` on mount, and from `FuelLogFormModal.tsx`'s create-success path (not the edit path).
- Resolution/fallback order when the widget or quick-create route needs a bike and none was passed explicitly:
  1. Exactly one bike registered → use it, skip storage entirely.
  2. A stored `lastUsedBikeId` that still resolves (bike exists) → use it.
  3. Zero bikes, or 2+ bikes with no usable stored value (first run, storage cleared, or the stored bike was deleted) → route to the Dashboard bike list instead of guessing — logging fuel against the wrong bike is worse than one extra tap.

### 2. New prefilled quick-create route

- Move `app/bikes/[bikeId]/fuel-logs.tsx` → `app/bikes/[bikeId]/fuel-logs/index.tsx` (mechanical file move, no logic change). Add sibling `app/bikes/[bikeId]/fuel-logs/new.tsx`.
- New `components/main/FuelLog/QuickAddFuelLogScreen.tsx`: resolves `bikeId` (route param, or falls back through §1's resolution order), fetches `GET /bikes/:bikeId/fuel-logs?limit=1&sort=-date` for seed data, then renders the **existing** `FuelLogFormModal` (not a fork) with a new optional prop:
  ```ts
  seedFromLastLog?: { fuelStation?: string; pricePerLiter: number };
  ```
- Extend `FuelLogFormModal`'s existing "no `initialFuelLog`" `useEffect` branch (which currently blanks `station`/`pricePerLiter` on every open) to use `seedFromLastLog` when present, leaving `odometerReading`/`litersAdded` blank regardless.
- Confirm `app/bikes/_layout.tsx`'s `<AuthGuard><Slot /></AuthGuard>` still wraps the new nested path correctly (same check this project's own spec 19 explicitly performed for its new nested route).

### 3. The widget itself

- Added `react-native-android-widget@0.22.1` via `npx expo install` (resolved/added automatically to `package.json`'s `dependencies`); `app.json`'s `plugins` array got a `["react-native-android-widget", { widgets: [...] }]` entry — `expo install` itself auto-appended the bare plugin name, then the widget config (`name: "QuickAddFuelWidget"`, `minWidth: "180dp"`, `minHeight: "110dp"`) was added by hand, read from the installed package's own `config-plugin.type.ts`, not guessed.
- **Click hand-off — resolved in favor of the direct deep-link option, not the AsyncStorage relay this section originally planned.** Per this section's own instruction to spike into the installed library's docs/example before choosing, its real source (`src/widgets/utils/click-action.ts`) and its `example-expo`/`example` reference apps (fetched from the library's own GitHub repo) confirmed `clickAction: "OPEN_URI"` + `clickActionData: { uri: "..." }` is a first-class, natively-handled feature — it opens an arbitrary deep link (including the app's own `client://` scheme) without ever round-tripping through the JS task handler. **Built the simpler version**: the widget's task handler (`widgets/quickAddFuelWidgetTaskHandler.tsx`) resolves the bike once (via §1's `resolveBikeId`) and sets `clickActionData.uri` to `client://bikes/<bikeId>/fuel-logs/new` (or `client://` for the Dashboard fallback) directly on the rendered `FlexWidget`. No `pendingDeepLink` `AsyncStorage` key, and no new `app/_layout.tsx` `useEffect` — both dropped as unneeded. Full detail in `36a-widget-implementation-findings.md`.
- **v1 widget face — deliberately minimal, built as planned**: bike nickname (`TextWidget`, truncated to 1 line) + one large "+ Add Fuel" tap target (`widgets/QuickAddFuelWidget.tsx`, a `FlexWidget`/`TextWidget` tree — no live odometer/mileage stats, per this section's original reasoning about `RemoteViews`' limited surface).
- One generic widget provider (`QuickAddFuelWidget`, declared once in `app.json`) that dynamically resolves "the" bike via §1's `resolveBikeId` on every `WIDGET_ADDED`/`WIDGET_UPDATE`/`WIDGET_RESIZED`, rather than a per-bike configurable widget — built as planned, no `widgetFeatures` config needed.
- **Real regression found and fixed during implementation, not part of the original plan**: registering the widget's task handler requires a custom app entry point (`index.ts`, replacing `package.json`'s `"main": "expo-router/entry"`), and a plain top-level `import` of `react-native-android-widget` there would crash the **entire app** on launch on Android whenever the native module isn't compiled into the running binary (Expo Go, or a stale dev client) — not just make the widget feature itself untestable, unlike every other native-dependency spec in this app. Fixed with a `Platform.OS === "android"`-gated, `try`/`catch`-wrapped runtime `require()` instead of a static `import` (Metro doesn't hoist `require()` calls the way it hoists `import`s, so the `catch` actually has a chance to run). Full detail, including why this was worth its own write-up, in `36a-widget-implementation-findings.md`.

### 4. Build order (in-app first, widget last)

1. §1 (last-used-bike plumbing) — pure JS/AsyncStorage, testable in plain Expo Go.
2. §2 (quick-create route + prefill), reachable via manual navigation for now (still Expo-Go-testable, zero widget dependency) — confirm prefill correctness and that the create/mileage-closure flow is otherwise unaffected before touching anything native.
3. §3 (the widget) — only after §2 works standalone. Isolates all new native/build risk into a phase where what it launches into is already known-good.

## Implementation

- [x] `utils/lastUsedBike.ts` — new file, `setLastUsedBike`/`getLastUsedBike`, plus a `resolveBikeId` helper shared by the quick-create screen and the widget task handler (not in the original Design sketch, but the fallback order it implements is exactly §1's).
- [x] `BikeDetailPage.tsx` — calls `setLastUsedBike` on mount (`useEffect` keyed on `bikeId`).
- [x] `FuelLogFormModal.tsx` — calls `setLastUsedBike` on create success (not edit); added `seedFromLastLog` prop, wired into the existing new-entry `useEffect` branch (deliberately left out of that effect's dependency array — it seeds once when the modal opens rather than re-seeding under the user while they type; see the file's own inline comment).
- [x] Moved `app/bikes/[bikeId]/fuel-logs.tsx` → `app/bikes/[bikeId]/fuel-logs/index.tsx` (via `git mv`, no logic change).
- [x] `app/bikes/[bikeId]/fuel-logs/new.tsx` — new route file.
- [x] `components/main/FuelLog/QuickAddFuelLogScreen.tsx` — new component (bike resolution via route param, seed fetch from `?limit=1&sort=-date`, renders `FuelLogFormModal` only once both fetches resolve so the seed data is present the one time the modal's seeding effect runs).
- [x] Added `react-native-android-widget@0.22.1` dependency + `app.json` plugin config (widget name/min-size/description).
- [x] `widgets/QuickAddFuelWidget.tsx` (widget face) + `widgets/quickAddFuelWidgetTaskHandler.tsx` (resolves the bike, renders the face, sets the `OPEN_URI` deep link) — see Design §3.
- [x] `index.ts` — new custom entry point (`package.json`'s `"main"` now points here instead of directly at `"expo-router/entry"`), registers the widget task handler behind the `Platform.OS === "android"` + `require()` + `try`/`catch` guard from `36a-widget-implementation-findings.md`. Replaces the originally-planned `app/_layout.tsx` `pendingDeepLink`-consuming `useEffect`, which is no longer needed (Finding 1 in `36a-...md`).
- [ ] First EAS dev-client build (`eas build --profile development --platform android`) or local prebuild, to make the widget testable at all. **Blocked on the user** — this is an account-affecting action against the real EAS project (needs the developer's own `eas login`), same category of blocker as spec 34's credentials step; this session has no device/emulator/EAS session to run it against, so this is the one Implementation item left for the user's own next session.
- [x] `ai context/progress-tracker.md` — spec's row + Recent Activity entry added.

## Verify

- [x] `expo lint` / `npx tsc --noEmit` clean — both run repeatedly through this spec's implementation, 0 issues at each step. `widgets/` and `index.ts` sit outside `expo lint`'s default `app`+`components` scope (same gap noted for `utils/*.ts` since spec 27) — separately linted with `npx eslint index.ts widgets`, also 0 issues.
- [x] In-app-only check (no widget yet): code-traced, not device-run — `QuickAddFuelLogScreen` only opens `FuelLogFormModal` once both the bike and latest-fuel-log fetches resolve, passing `seedFromLastLog={{ fuelStation, pricePerLiter }}` from the most recent log; `odometerReading`/`litersAdded` stay blank in the form's own new-entry branch regardless of `seedFromLastLog`. The create path is the same, unmodified `handleSubmit`/`createMutation` `FuelLogFormModal` has always used, so mileage-closure behavior is unaffected by construction, not something this spec touched.
- [x] Last-used-bike fallback: code-traced against `resolveBikeId`'s 3-branch logic (exactly one bike → use it and skip storage; a stored id that still resolves → use it; otherwise `null`, and both the quick-create screen's route-param requirement and the widget's own `DASHBOARD_URI` fallback mean "can't resolve" routes to the Dashboard rather than guessing) — not exercised against real seeded multi-bike data, no device/backend session available in this environment.
- [x] Full `npx expo export --platform web` (18 routes, including the new/moved fuel-logs routes) bundled with zero errors — a real Metro/Babel pass over every changed file, going beyond this spec's own originally-planned verification depth, following spec 33's precedent for a structurally risky change (the new custom entry point). Confirms the `Platform.OS === "android"` guard in `index.ts` is inert (and therefore safe) on web, as designed.
- [ ] **Requires a real Android device or emulator with a home screen** (cannot be done in Expo Go or via any in-app check, and blocked on the same EAS dev-client build as the unchecked Implementation item above): add the widget to the home screen, confirm the bike nickname renders, tap it, confirm the app opens directly into the prefilled quick-create form for the correct bike. Also unverified: that Expo Go on Android still boots normally after this spec's changes (the specific thing `36a-widget-implementation-findings.md`'s Finding 2 fix is meant to guarantee) — this is the single highest-priority thing to check first, before the widget's own tap-through, once a device is available.
- [ ] Flagged explicitly, per this project's own standing pattern (see spec 24, 34): **not verified on-device.** Everything above this line is code/type/lint-verified and, where feasible without a device, bundle-verified; nothing about the actual widget on a home screen has been observed.

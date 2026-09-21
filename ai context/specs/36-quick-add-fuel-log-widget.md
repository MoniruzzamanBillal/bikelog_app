# 36: Quick-Add Fuel Log — Android Home-Screen Widget

## Status

⛔ Not Started

## Goal

Per direct user request, for day-to-day usage: fuel logging is the single most frequent action in this app, and today it requires Dashboard → bike → Fuel Logs tab → "+" → blank form. Add a real Android home-screen widget that opens straight into a fuel-log create form prefilled with the last-used station and price, cutting that down to one tap from the home screen.

## Context

- Create form: `components/main/FuelLog/FuelLogFormModal.tsx`, a `react-native-paper` `Modal` (not a routed screen) toggled via local state inside `components/main/FuelLog/FuelLog.tsx`. It currently only prefills when *editing* (`initialFuelLog` prop) — the "new entry, but seed sticky fields from the last log" behavior does not exist and is net new here.
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
  try { await AsyncStorage.setItem(KEY, bikeId); } catch { /* best-effort */ }
}
export async function getLastUsedBike(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
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

- Add `react-native-android-widget` to `package.json`; add it to `app.json`'s `plugins` array with whatever config the plugin's own docs specify (read at install time — not yet confirmed, this codebase has never used it before).
- **Click hand-off, build against this first**: mirror the already-working pattern in `app/_layout.tsx`'s existing push-notification-tap `useEffect` (`Notifications.addNotificationResponseReceivedListener` → `router.push({ pathname: "/bikes/[bikeId]", ... })`). The widget's task handler writes `AsyncStorage` key `pendingDeepLink: { bikeId, screen: "fuel-logs/new" }` before launching the app; a new `useEffect` in `app/_layout.tsx` checks for and consumes (then clears) that key on mount/foreground, then `router.push`es into the quick-create route. Only revisit in favor of a direct `client://bikes/<bikeId>/fuel-logs/new` URI launch later if a short spike into the installed library's own docs/example app confirms its click-action API supports launching an arbitrary deep link directly — don't assume either way before installing it.
- **v1 widget face — deliberately minimal**: bike nickname + one large "+ Add Fuel" tap target. No live odometer/mileage stats in v1 — widget layouts compile to native Android `RemoteViews`, a far more restrictive and slower-to-iterate surface than normal React Native, and adding a stat display would stack new layout risk on top of the actually novel risk here (the tap → correct-screen hand-off). A stat-tile face (current odometer / lifetime avg km/L, both already available via existing `useFetchData` hooks elsewhere in the app) is a natural v2 once v1's plumbing is confirmed working live — not part of this spec.
- One generic widget provider that dynamically resolves "the" bike via §1's fallback order, rather than a per-bike configurable widget (which would need a native widget-configuration activity) — appropriate for a garage of 1–2 bikes; revisit only if the developer's garage grows meaningfully.

### 4. Build order (in-app first, widget last)

1. §1 (last-used-bike plumbing) — pure JS/AsyncStorage, testable in plain Expo Go.
2. §2 (quick-create route + prefill), reachable via manual navigation for now (still Expo-Go-testable, zero widget dependency) — confirm prefill correctness and that the create/mileage-closure flow is otherwise unaffected before touching anything native.
3. §3 (the widget) — only after §2 works standalone. Isolates all new native/build risk into a phase where what it launches into is already known-good.

## Implementation

- [ ] `utils/lastUsedBike.ts` — new file, `setLastUsedBike`/`getLastUsedBike`.
- [ ] `BikeDetailPage.tsx` — call `setLastUsedBike` on mount.
- [ ] `FuelLogFormModal.tsx` — call `setLastUsedBike` on create success (not edit); add `seedFromLastLog` prop and wire it into the existing new-entry `useEffect` branch.
- [ ] Move `app/bikes/[bikeId]/fuel-logs.tsx` → `app/bikes/[bikeId]/fuel-logs/index.tsx`.
- [ ] `app/bikes/[bikeId]/fuel-logs/new.tsx` — new route file.
- [ ] `components/main/FuelLog/QuickAddFuelLogScreen.tsx` — new component (bike resolution, seed fetch, renders `FuelLogFormModal`).
- [ ] Add `react-native-android-widget` dependency + `app.json` plugin config.
- [ ] Widget task handler + minimal v1 widget face (bike nickname + "+ Add Fuel").
- [ ] `app/_layout.tsx` — new `useEffect` consuming `pendingDeepLink` from `AsyncStorage`.
- [ ] First EAS dev-client build (`eas build --profile development --platform android`) or local prebuild, to make the widget testable at all.
- [ ] `ai context/progress-tracker.md` — add this spec's row, Recent Activity entry once implemented.

## Verify

- [ ] `expo lint` / `npx tsc --noEmit` clean.
- [ ] In-app-only check (no widget yet): navigating to the quick-create route manually shows `pricePerLiter`/`fuelStation` prefilled from a real, most-recent fuel log; `odometerReading`/`litersAdded` are blank; submitting still triggers the existing mileage-closure behavior unchanged.
- [ ] Last-used-bike fallback: with 2+ bikes and no stored value, confirm it routes to the Dashboard bike list rather than picking one; with exactly 1 bike, confirm it's used with no storage read needed.
- [ ] **Requires a real Android device or emulator with a home screen** (cannot be done in Expo Go or via any in-app check): add the widget to the home screen, confirm the bike nickname renders, tap it, confirm the app opens directly into the prefilled quick-create form for the correct bike.
- [ ] If unavailable in a given work session, flag this explicitly as "not verified on-device" per this project's own standing pattern (see spec 24) rather than claiming it works.

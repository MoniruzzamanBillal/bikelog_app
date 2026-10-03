# 47: Update odometer from Settings (app side)

Status: ✅ Complete — implemented 2026-10-03; verified on Expo web (not on a physical device).

App half of a three-repo feature. Depends on `bikelog-server/context/specs/44-manual-odometer-update.md` (✅ implemented 2026-10-03, server commit `9fb3627`; deploy it before shipping this client — `utils/envConfig.ts` points at the deployed backend). Web counterpart: `bikelog_client(web)/context/specs/29-settings-update-odometer.md`.

---

## Goal

Add an **Odometer** panel to the Settings tab where the rider enters their latest odometer reading for a bike, without logging a fuel fill-up or a maintenance entry.

Today there is no such input: the odometer only moves when a fuel log or maintenance log with a higher reading is saved, and `BikeFormModal` only accepts an odometer when _creating_ a bike (edit mode clears it and `TUpdateBikePayload` omits it).

## Design

### UX

A new panel at the **top** of the Settings screen, above "Maintenance types":

- Header in the existing `PanelIcon` style (icon `speedometer`, `COLORS.primary`), title **"Odometer"**, subtitle "Set your bike's latest reading".
- More than one bike → `SelectPickerField` labelled "Bike". Default selection via `resolveBikeId(bikes)` (`utils/lastUsedBike.ts`), falling back to the first bike. Exactly one bike → no picker, just the nickname.
- Helper line: **"Current: 12,345 km"**, read live from the bikes query.
- `FormField` "New odometer reading (km)" with a decimal keyboard.
- `PrimaryButton` "Update odometer" — disabled while the request is pending or the input is empty.
- No bikes → a one-line "Add a bike first" message and no input.

### Behaviour

- Format check with the same `DECIMAL_REGEX` used in `components/main/Bike/BikeFormModal.tsx`.
- Client-side guard: value must be `>= current` → otherwise error toast "Must be at least {current} km". The server stays the authority (rule: never lower than the current reading).
- Mutation: `usePatch` → `PATCH /bikes/:id/odometer` with `{ currentOdometer }`.
  Invalidate `["bikes"]`, `["bikes", bikeId]` and `["reminders", bikeId]` (key shape from `RemindersBanner.tsx`) so the Garage card, bike hub and reminders banner refresh.
- Success: `Toast.show({ type: "success", text1: "Odometer updated", position: "top" })`, clear the input.
- Error: `utils/axiosInstance.ts`'s response interceptor **already** toasts API errors. Do **not** add a second `Toast.show` in the `catch` — that is the known double-toast problem described in spec 45 (Design → "Three pre-existing issues"). The `catch` only needs to swallow the rejection.

### Why this is safe for existing screens

`currentOdometer` is read by `BikeCard`, `BikeDetailPage` and `RemindersBanner` for display / "overdue by" math only. Writing a new value through the new endpoint changes what they show and nothing else. Mileage and spending screens use fuel-log readings, not `currentOdometer`. Full analysis in server spec 44.

---

## Implementation

### Progress checklist

- [x] 1. Types (`TUpdateOdometerPayload`)
- [x] 2. Extract `PanelIcon` to its own file (so the new panel can reuse it without a circular import)
- [x] 3. `OdometerPanel.tsx`
- [x] 4. Wire into `SettingsCatalog.tsx`
- [x] 5. Verification (`npx tsc --noEmit`, `expo lint`, behaviour checked)
- [x] 6. Docs (tracker, spec status)

### 1. Types — `types/bike.types.ts`

```ts
export type TUpdateOdometerPayload = { currentOdometer: number };
```

`TBike.currentOdometer` already exists. `TUpdateBikePayload` is left untouched.

### 2. New component — `components/main/SettingsCatalog/OdometerPanel.tsx`

`SettingsCatalog.tsx` is already ~900 lines, so the panel is its own file. Reuse, do not reinvent:

- `Panel`, `FormField`, `PrimaryButton`, `SelectPickerField` from `@/components/main/shared`
- `useFetchData<TBike[]>(["bikes"], "/bikes")` and `usePatch` from `@/hooks/useApi`
- `COLORS` / `tint` from `@/utils/colors`, and the same panel-header layout / `PanelIcon` treatment as the other panels in `SettingsCatalog.tsx` (extract `PanelIcon` to a shared spot or duplicate the few lines — prefer re-exporting over copying)
- `Toast` from `react-native-toast-message`

### 3. Wire it in — `components/main/SettingsCatalog/SettingsCatalog.tsx`

Render `<OdometerPanel />` as the first child inside the `ScrollView`. No change to `app/(tabs)/settings.tsx` or navigation.

### 4. Not changing

- `BikeFormModal.tsx` — create flow keeps its optional starting odometer; edit flow stays without one.
- Any fuel-log / maintenance-log screens.

---

## Test plan

Static: `npx tsc --noEmit`, `expo lint` clean.

Manual (against a server with spec 44 deployed):

1. One bike: no picker; "Current" matches the Garage card.
2. Two bikes: picker defaults to the last-used bike; switching changes "Current".
3. Enter a higher value → success toast; Garage card, bike hub and reminders banner show it without a manual refresh.
4. Enter a lower value → blocked client-side; also verify the server 400 path shows **one** toast, not two.
5. Empty input → button disabled. Non-numeric input → format error.
6. Add a fuel log afterwards (above and below the manual value) → no errors; mileage screens unchanged.
7. No bikes → "Add a bike first".

---

## As built / deviations

1. `PanelIcon` was extracted from `SettingsCatalog.tsx` into `SettingsCatalog/PanelIcon.tsx` (spec step 2) — a straight move, no visual change.
2. Default bike: `resolveBikeId(bikes)` runs in an effect; if it returns `null` the first bike is used.
3. The panel keeps its own small copy of the panel-header styles rather than exporting them from `SettingsCatalog.tsx` (which would be a circular import).

## Verification results

`npx tsc --noEmit` clean · `expo lint` clean · Expo web in headless Chrome, 13/13 at 390×844 against a throwaway local server (details in `progress-tracker.md`). **Not run on a physical device.**

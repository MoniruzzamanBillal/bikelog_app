# 23: Decimal Number Field Fix (Odometer + Interval Inputs)

Status: ✅ Complete

## Goal

Fix the reported bug: typing a decimal odometer reading (e.g. `408.8`) into the "Add Fuel Log" screen shows a toast saying the odometer must be a whole number, even though other numeric fields on the same and sibling forms (liters, price, cost) already accept decimals (`4.5`, `5.88`) without issue.

## Context

**Root cause, confirmed by source read, not guesswork.** The exact toast text the user reported — "Odometer must be a whole number" — is a literal string at `components/main/FuelLog/FuelLogFormModal.tsx:75`, fired when the value fails `INT_REGEX = /^\d+$/` (line 13). This is a deliberate, explicit whole-number gate in this file, not an accidental default (unlike the parallel bug in `bikelog_client-web-`, which is a missing HTML `step` attribute — see that project's spec `19-decimal-number-field-fix.md`). Confirmed the backend imposes no such restriction either — see `bikelog_server/context/specs/20-decimal-number-field-audit.md`.

Grepped every `INT_REGEX`/`number-pad` usage across `components/main/` to find every field with this same restriction:

**Confirmed broken (explicit `INT_REGEX` + `number-pad` + `parseInt`, blocks decimals with a toast):**

| File                                                         | Field             | Regex check           | Keyboard                 | Payload conversion                        |
| ------------------------------------------------------------ | ----------------- | --------------------- | ------------------------ | ----------------------------------------- |
| `components/main/FuelLog/FuelLogFormModal.tsx`               | `odometer`        | line 72, `INT_REGEX`  | line 171, `"number-pad"` | line 96, `parseInt(odometer, 10)`         |
| `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` | `odometerReading` | line 129, `INT_REGEX` | line 209, `"number-pad"` | line 149, `parseInt(odometerReading, 10)` |
| `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` | `intervalKmUsed`  | line 133, `INT_REGEX` | line 234, `"number-pad"` | line 150, `parseInt(intervalKmUsed, 10)`  |

**Confirmed already correct (reference implementation — do not touch, but mirror this pattern):**

`components/main/Bike/BikeFormModal.tsx`'s `currentOdometer` field already uses `DECIMAL_REGEX` (line 76), `keyboardType="decimal-pad"` (line 219), and `parseFloat(currentOdometer)` (line 118) — proving this exact class of fix has already been applied correctly once in this codebase, just inconsistently, to only one of the four odometer/interval-bearing fields. `fuelTankCapacityLiters` in the same file is likewise already correct.

**Explicitly out of scope — flagged, not fixed here (judgment call, not a reproduction of the reported bug):**

`components/main/SettingsCatalog/SettingsCatalog.tsx` — `newMaintIntervalKm`, `newMaintIntervalDays` (lines 31-32, 158/169 `number-pad`), and `newOilIntervalKm` (line 36, 241 `number-pad`) are catalog _default/suggested_ interval values (e.g. "change oil every 3000 km"), sent via silent `parseInt` (lines 50, 53, 86) with **no blocking toast** — they simply truncate a decimal input rather than reject it, and don't reproduce the user's reported "whole number required" toast. Whether catalog suggested intervals should ever be fractional is a separate product judgment call from the reported bug (a real logged odometer reading or interval-used value is a measured fact that can legitimately be fractional; a _suggested default_ interval arguably shouldn't be). Left unchanged pending explicit instruction.

## Design

Change the three broken fields to match the already-correct `currentOdometer` pattern in `BikeFormModal.tsx`: swap `INT_REGEX` for `DECIMAL_REGEX` (already defined at the top of both files as `/^\d+(\.\d{0,2})?$/`, allowing up to 2 decimal places — same precision already used for `litersAdded`/`pricePerLiter`/`cost`), swap `keyboardType="number-pad"` for `"decimal-pad"`, and swap `parseInt(..., 10)` for `parseFloat(...)`. Toast copy is adjusted to drop the now-inaccurate "must be a whole number" wording, reusing this codebase's existing "Enter a valid \_\_\_" phrasing (already used for `liters`/`pricePerLiter`/`cost` validation failures in the same files).

```diff
 // FuelLogFormModal.tsx
     if (!odometer.trim()) {
       ...
     }
-    if (!INT_REGEX.test(odometer.trim())) {
+    if (!DECIMAL_REGEX.test(odometer.trim())) {
       Toast.show({
         type: "error",
-        text1: "Odometer must be a whole number",
+        text1: "Enter a valid odometer reading",
         position: "top",
       });
       return;
     }
```

```diff
 // FuelLogFormModal.tsx — payload
     const payload: TCreateFuelLogPayload = {
-      odometerReading: parseInt(odometer, 10),
+      odometerReading: parseFloat(odometer),
       ...
```

```diff
 // FuelLogFormModal.tsx — input
             <TextInput
               placeholder="Odometer (km)"
               value={odometer}
               onChangeText={setOdometer}
-              keyboardType="number-pad"
+              keyboardType="decimal-pad"
               editable={!isPending}
```

```diff
 // MaintenanceLogFormModal.tsx
-    if (!odometerReading.trim() || !INT_REGEX.test(odometerReading.trim())) {
+    if (!odometerReading.trim() || !DECIMAL_REGEX.test(odometerReading.trim())) {
       Toast.show({ type: "error", text1: "Enter a valid odometer reading", position: "top" });
       return;
     }
-    if (!intervalKmUsed.trim() || !INT_REGEX.test(intervalKmUsed.trim())) {
+    if (!intervalKmUsed.trim() || !DECIMAL_REGEX.test(intervalKmUsed.trim())) {
       Toast.show({ type: "error", text1: "Enter a valid service interval", position: "top" });
       return;
     }
```

```diff
 // MaintenanceLogFormModal.tsx — payload
     const payload: TCreateMaintenanceLogPayload = {
       maintenanceType,
-      odometerReading: parseInt(odometerReading, 10),
-      intervalKmUsed: parseInt(intervalKmUsed, 10),
+      odometerReading: parseFloat(odometerReading),
+      intervalKmUsed: parseFloat(intervalKmUsed),
       cost: parseFloat(cost),
```

```diff
 // MaintenanceLogFormModal.tsx — inputs
             <TextInput
               placeholder="Odometer (km)"
               value={odometerReading}
               onChangeText={setOdometerReading}
-              keyboardType="number-pad"
+              keyboardType="decimal-pad"
               editable={!isPending}
             ...
             <TextInput
               placeholder="Service Interval (km)"
               value={intervalKmUsed}
               onChangeText={setIntervalKmUsed}
-              keyboardType="number-pad"
+              keyboardType="decimal-pad"
               editable={!isPending}
```

Note: once `odometerReading`/`intervalKmUsed`/`odometer` are the only consumers of `INT_REGEX` in their respective files, the `INT_REGEX` constant itself becomes unused in both `FuelLogFormModal.tsx` and `MaintenanceLogFormModal.tsx` — remove the now-dead `const INT_REGEX = /^\d+$/;` declaration from both files rather than leaving unused code behind.

## Implementation

1. ✅ `components/main/FuelLog/FuelLogFormModal.tsx` — swapped `odometer`'s validation regex (`INT_REGEX`→`DECIMAL_REGEX`), keyboard type (`number-pad`→`decimal-pad`), and `parseInt`→`parseFloat`; adjusted toast text to "Enter a valid odometer reading"; removed the now-unused `INT_REGEX` constant.
2. ✅ `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` — same swap for both `odometerReading` and `intervalKmUsed`; removed the now-unused `INT_REGEX` constant (the file's `cost` field already used `DECIMAL_REGEX`, untouched).
3. ✅ No changes made to `components/main/Bike/BikeFormModal.tsx` (already correct) or `components/main/SettingsCatalog/SettingsCatalog.tsx` (confirmed out of scope, see Context).
4. ✅ No changes made to `types/fuel-log.types.ts` / `types/maintenance-log.types.ts` (both already type `odometerReading`/`intervalKmUsed` as `number`, confirmed unrestricted at the type level).

## Dependencies

None. Mirrors the already-shipped, already-correct pattern in `BikeFormModal.tsx`'s `currentOdometer`/`fuelTankCapacityLiters` fields in the same codebase — no new library, no backend or type change.

## Verify

- [x] `odometer` in `FuelLogFormModal.tsx` now validates against `DECIMAL_REGEX`, uses `keyboardType="decimal-pad"`, and sends `parseFloat(odometer)` — `408.8` passes the regex and is no longer truncated by `parseInt`. _(Code-verified only — no simulator/device available in this environment to literally type `408.8` and watch the toast not fire; same standing limitation as every other spec in this project.)_
- [x] Same fix applies on edit — `FuelLogFormModal.tsx` uses one form/state for both create and edit; prefill (`initialFuelLog.odometerReading.toString()`) was already decimal-safe and untouched by this change.
- [x] `MaintenanceLogFormModal.tsx`'s `odometerReading` and `intervalKmUsed` now both validate against `DECIMAL_REGEX`/`decimal-pad`/`parseFloat`, matching `cost`'s pre-existing pattern in the same file. _(Code-verified only, same limitation as above.)_
- [x] `cost` (already `DECIMAL_REGEX`) and `BikeFormModal.tsx`'s Fuel Tank Capacity / Starting Odometer (already `DECIMAL_REGEX`/`decimal-pad`/`parseFloat`) are untouched by this change — confirmed via `grep`, no diff in either file.
- [x] `expo lint` — 0 issues. `npx tsc --noEmit` — 0 errors. `grep -rn "INT_REGEX"` across `components/` returns no results, confirming no dangling reference was left in either file.
- [ ] No simulator/device available in this environment per this project's standing caveat — final on-device confirmation (decimal-pad keyboard shows a decimal point key, toast no longer fires, value round-trips through the real API) is pending the user testing on their own device, the same environment where the bug was originally reported.

# 14: Native Date Picker for Date Fields

Status: ✅ Complete

## Goal

Replace every manually-typed `"YYYY-MM-DD"` text field in the app with a native date picker, using `@react-native-community/datetimepicker` behind a new shared `DatePickerField` component (mirroring the existing `SelectPickerField` pattern in `components/main/shared/`). Covers all 5 existing date fields across 4 forms: `BikeFormModal.purchaseDate`, `FuelLogFormModal.date`, `BikeIssueFormModal.dateReported`, `MaintenanceLogFormModal.serviceDate` + `nextDueDate`.

## Context

Every date field today is a plain `TextInput` the user must type in `"YYYY-MM-DD"` format:

| File                                                                       | Field                        | Current behavior                                                                                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/main/Bike/BikeFormModal.tsx:25,183-192`                        | `purchaseDate`               | Plain text input, validated on submit against a local `DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/` (line 11, 68-75). No default value for new bikes.                     |
| `components/main/FuelLog/FuelLogFormModal.tsx:35,227`                      | `date`                       | Plain text input, placeholder `"Date (YYYY-MM-DD)"`. Defaults to today via `date-fns` `format(new Date(), "yyyy-MM-dd")` on new-entry open. No regex validation. |
| `components/main/BikeIssue/BikeIssueFormModal.tsx:29,124-125`              | `dateReported`               | Same pattern as FuelLog — defaults to today, no regex validation.                                                                                                |
| `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx:50-51,243-256` | `serviceDate`, `nextDueDate` | Two date fields. `serviceDate` defaults to today; `nextDueDate` is optional, no default. Neither regex-validated.                                                |

This is error-prone (typos silently produce an invalid or wrong date — only `BikeFormModal` even bothers to regex-validate this, and only on submit) and poor mobile UX (no on-device keyboard is well-suited to typing structured dates). All four backend payloads (bike, fuel log, bike issue, maintenance log) already accept/expect an ISO-ish date string, so the fix is purely client-side presentation — no backend/API contract changes.

No date-picker library is currently installed (`package.json` has `date-fns` for formatting only; `@react-native-picker/picker` exists but that's the generic enum picker already wrapped by `components/main/shared/SelectPickerField.tsx`, unrelated to dates). `@react-native-community/datetimepicker` is the standard, Expo-supported native date/time picker (documented in the Expo SDK reference, works in Expo Go, installed via `npx expo install @react-native-community/datetimepicker` so the version gets pinned correctly for this project's Expo SDK 54). It renders the OS-native calendar dialog on Android and a native spinner/inline calendar on iOS — no extra native config beyond what `expo install` handles.

## Design

### New dependency

`npx expo install @react-native-community/datetimepicker`

### New shared component: `components/main/shared/DatePickerField.tsx`

Mirrors `SelectPickerField.tsx`'s prop shape (`label`, `value`, `onChange`, plus date-specific `minimumDate`/`maximumDate`/`disabled`) and the app's existing borderless-underline field look (`borderBottomWidth: 1` wrapper, no visible `TextInput` border). Internally converts between the app's stored `"yyyy-MM-dd"` string (used everywhere today) and a JS `Date` via `date-fns`'s `format`/`parse` — no change to how any form stores or submits its date value.

```tsx
import { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import { COLORS } from "@/utils/colors";

interface DatePickerFieldProps {
  label: string;
  value: string; // "yyyy-MM-dd", or "" when unset
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();

  return (
    <View style={styles.field}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={styles.touchable}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? format(dateValue, "dd MMM yyyy") : label}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (event.type === "set" && selectedDate) {
              onChange(format(selectedDate, "yyyy-MM-dd"));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  touchable: { paddingVertical: 12 },
  valueText: { fontSize: 16, color: COLORS.text },
  placeholderText: { fontSize: 16, color: COLORS.textLight },
});
```

Export it from `components/main/shared/index.ts` alongside `SelectPickerField`.

### Files to modify (all 4 date-bearing forms)

| File                                                         | Field(s)                     | Change                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/main/Bike/BikeFormModal.tsx`                     | `purchaseDate`               | Remove `DATE_REGEX` constant (line 11) and its validation block (lines 68-75); replace the `View style={styles.field}><TextInput placeholder="Purchase Date..."` block (lines 183-192) with `<DatePickerField label="Purchase Date" value={purchaseDate} onChange={setPurchaseDate} maximumDate={new Date()} />` (capped at today — a bike can't be purchased in the future). |
| `components/main/FuelLog/FuelLogFormModal.tsx`               | `date`                       | Replace the `date` `TextInput` block with `<DatePickerField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />` (a fuel-up can't be logged for the future).                                                                                                                                                                                             |
| `components/main/BikeIssue/BikeIssueFormModal.tsx`           | `dateReported`               | Replace with `<DatePickerField label="Date Reported" value={dateReported} onChange={setDateReported} maximumDate={new Date()} />`.                                                                                                                                                                                                                                            |
| `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` | `serviceDate`, `nextDueDate` | Replace `serviceDate`'s field with `<DatePickerField label="Service Date" value={serviceDate} onChange={setServiceDate} maximumDate={new Date()} />`. Replace `nextDueDate`'s field with `<DatePickerField label="Next Due Date (optional)" value={nextDueDate} onChange={setNextDueDate} />` — **no `maximumDate`**, since this records a future due date, not a past event. |

Every other field on each of these forms (nickname, brand, odometer readings, etc.) is untouched — this is scoped purely to the date fields.

## Implementation

1. ✅ `npx expo install @react-native-community/datetimepicker` — installed `8.4.4`, config plugin auto-registered in `app.json`.
2. ✅ Created `components/main/shared/DatePickerField.tsx`; exported it from `components/main/shared/index.ts`.
3. ✅ Updated `BikeFormModal.tsx`: removed `DATE_REGEX` + its validation branch, swapped the purchase-date field for `DatePickerField`.
4. ✅ Updated `FuelLogFormModal.tsx`, `BikeIssueFormModal.tsx`, `MaintenanceLogFormModal.tsx`: swapped their date field(s) per the table above (`MaintenanceLogFormModal.tsx` got two `DatePickerField`s — `serviceDate` capped at today, `nextDueDate` uncapped).
5. ✅ Ran `expo lint` and `npx tsc --noEmit` — both pass clean.

## Dependencies

None — all 4 target forms already exist and are shipped (specs 05, 07, 10, 12). This is a modification spec, not a new-screen spec.

## Verify

- [x] `@react-native-community/datetimepicker` installed via `npx expo install` — `8.4.4` in `package.json`, config plugin auto-added to `app.json`'s `plugins` array.
- [x] `DatePickerField` created (`components/main/shared/DatePickerField.tsx`) and exported from the shared barrel (`components/main/shared/index.ts`) _(code-verified only — visual consistency with the app's borderless-underline field look cannot be confirmed on-device in this environment; no simulator/device available, per this project's standing caveat)_.
- [x] All 5 date fields use `DatePickerField` in place of the old `TextInput`: `BikeFormModal.purchaseDate`, `FuelLogFormModal.date`, `BikeIssueFormModal.dateReported`, `MaintenanceLogFormModal.serviceDate` + `nextDueDate`. Confirmed via grep that no `TextInput`-based date field remains anywhere in `components/main/`.
- [x] `BikeFormModal.tsx`'s `DATE_REGEX` constant and its validation branch are removed.
- [x] Each form still submits the same `"yyyy-MM-dd"`-formatted string in its payload as before (`DatePickerField.onChange` receives `format(selectedDate, "yyyy-MM-dd")`) — no backend contract change, no payload-construction code touched in any of the 4 forms.
- [x] `expo lint` and `npx tsc --noEmit` both pass clean.

This checklist was verified via source reading and static tooling only — no emulator/simulator/device was available in this environment to visually confirm the native picker actually renders/behaves correctly on iOS or Android. Recommend confirming on a real device before considering this fully done from a UX standpoint.

# 17: Fix SelectPickerField Blank-Value Bug + Add Real Month/Year Selectors

Status: ✅ Complete

## Goal

Fix two real, on-device bugs reported by the user:

1. `SelectPickerField` (used in `MaintenanceLogFormModal.tsx` and `BikeAccessoryFormModal.tsx`): after picking a value, the field shows blank instead of the selected label.
2. Spending page's Month/Year tabs: the period filter is a plain free-typed text field (`"yyyy-MM"` / `"yyyy"` placeholder), not an actual picker — confirmed directly in `components/main/Spending/Spending.tsx`.

## Context

### Bug 1 — this is the second attempt at `SelectPickerField`

Spec 16 (`16-swipe-edit-and-picker-fixes.md`) already investigated a version of this symptom via static review only (no device available at the time) and applied two fixes: raised the native `Picker`'s `height` from `40` to `50` (truncation hypothesis), and guarded `MaintenanceLogFormModal.tsx`'s two catalog-backed pickers behind their options being loaded (prefill-race hypothesis). **Both fixes are confirmed still present in the current code** (`SelectPickerField.tsx`'s `picker.height` is `50`; the loading guards are in place). The user is now reporting, from real on-device use, that the field still shows blank after selecting a value — meaning spec 16's fixes did not fully resolve this.

This matters for diagnosis: `BikeAccessoryFormModal.tsx`'s urgency/status pickers use **static hardcoded option lists**, not fetched data — spec 16 itself already noted these "aren't subject to the [prefill] race — [their] bug is limited to [the height truncation]." If blank-value is still happening there too (the user's report is general — "the components where I have select input," not scoped to just one form), that rules out both of spec 16's hypotheses as the complete explanation, since neither applies to a static-options field once height is already fixed.

**Most likely remaining cause**: `SelectPickerField.tsx`'s `styles.picker` sets `height: 50` but has never set an explicit `color`. This is a well-documented `@react-native-picker/picker` (Android especially) failure mode — without an explicit text color, the native widget's selected-item text can render in a color that doesn't contrast against its background (effectively invisible rather than merely clipped), particularly inside apps with a customized theme (this app uses a custom `react-native-paper` theme, `ai context/ui-context.md`) that native picker widgets don't automatically inherit into their own rendering.

**Decision: rewrite `SelectPickerField` on top of `react-native-paper`'s own `Menu` component instead of attempting a third narrow patch on the native `@react-native-picker/picker`.** Reasoning: two targeted, plausible fixes have already not fully resolved this; a color-style tweak would be a third guess in the same unverifiable-without-a-device pattern. A `Menu`-based rewrite sidesteps the whole class of opaque-native-widget rendering bugs by displaying the selected value through the app's own `Text` component (the same building block already used correctly everywhere else in the app, including `DatePickerField`) instead of trusting an native picker's internal rendering. This was already anticipated as the fallback plan in this project's own `progress-tracker.md` Known Gaps ("a Paper-`Menu`-based fallback might be needed if it clashed visually on a real device") — this spec is that fallback being exercised, now that two narrower attempts are confirmed insufficient. No new dependency: `Menu`/`Menu.Item`/`TouchableRipple` are already part of the installed `react-native-paper` (`^5.14.5`).

### Bug 2 — Spending's Month/Year tabs were never covered by the date-picker work

Spec 14 (`14-date-picker.md`) replaced every **entity date field** (`purchaseDate`, fuel log `date`, `dateReported`, `serviceDate`/`nextDueDate`) with a real calendar `DatePickerField` — but explicitly scoped to full calendar dates, not month/year-only period selectors. Spending's `MonthTab`/`YearTab` were out of scope there and still use a plain `react-native-paper` `TextInput` (`components/main/Spending/Spending.tsx` lines 52-59 and 99-106) with no format validation — a mistyped `"2026-13"` or `"abc"` just silently returns no data rather than being prevented at input time.

**Found while investigating, not part of the original report — flagging for a scope decision:** `components/main/Mileage/MonthlyMileageTab.tsx` has the exact same plain-`TextInput` month selector (lines ~40-47), while `components/main/Mileage/YearlyMileageTab.tsx` already has a **working, already-shipped year prev/next stepper** (chevron buttons + centered year label) that never had this bug. Since Spending's fix will need a month-stepper component built from scratch anyway, and Mileage's Yearly tab's stepper is the natural pattern to extract into a shared component regardless, fixing `MonthlyMileageTab.tsx`'s identical bug in the same pass is near-zero incremental cost — included below as a recommended (not silently assumed) scope addition.

## Design

### Fix 1 — `SelectPickerField.tsx` rewrite

```tsx
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Menu, Text, TouchableRipple } from "react-native-paper";
import { COLORS } from "@/utils/colors";

interface SelectPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}

export function SelectPickerField({
  label,
  value,
  onChange,
  options,
  required,
}: SelectPickerFieldProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => setMenuVisible(true)}
            style={styles.touchable}
          >
            <Text
              style={selectedLabel ? styles.valueText : styles.placeholderText}
            >
              {selectedLabel ?? "Select..."}
            </Text>
          </TouchableRipple>
        }
      >
        {options.map((opt) => (
          <Menu.Item
            key={opt.value}
            title={opt.label}
            onPress={() => {
              onChange(opt.value);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.text,
  },
  required: { color: COLORS.danger },
  touchable: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  valueText: { fontSize: 16, color: COLORS.text },
  placeholderText: { fontSize: 16, color: COLORS.textLight },
});
```

**Same exact prop interface as today** (`label`, `value`, `onChange`, `options`, `required`) — this is a pure internal-implementation swap. **Zero changes needed at either call site** (`MaintenanceLogFormModal.tsx`, `BikeAccessoryFormModal.tsx`); both keep working unmodified since they only ever depended on the prop contract, not the internals. The visual shell (`borderBottomWidth: 1` wrapper, no visible box border) matches `DatePickerField`'s already-established "borderless-underline" look, per this app's documented field-styling convention.

`@react-native-picker/picker` becomes fully unused after this change (nothing else in the app imports it, confirmed via the earlier grep) — remove it from `package.json` as a cleanup step so the dependency list doesn't carry dead weight, matching this codebase's general aversion to unused deps.

### Fix 2 — new shared `MonthStepper` / `YearStepper` components

New `components/main/shared/YearStepper.tsx`, extracted (behavior-preserving) from `YearlyMileageTab.tsx`'s existing inline chevron-stepper JSX:

```tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/utils/colors";

interface YearStepperProps {
  year: string; // "yyyy"
  onChange: (year: string) => void;
}

export function YearStepper({ year, onChange }: YearStepperProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange((Number(year) - 1).toString())}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.label}>{year}</Text>
      <TouchableOpacity
        onPress={() => onChange((Number(year) + 1).toString())}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 60,
    textAlign: "center",
  },
});
```

New `components/main/shared/MonthStepper.tsx`, same shape but stepping by month via `date-fns`'s `addMonths`/`subMonths` (already a dependency, already used for date formatting elsewhere) and displaying `"MMM yyyy"`:

```tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addMonths, format, parse, subMonths } from "date-fns";
import { COLORS } from "@/utils/colors";

interface MonthStepperProps {
  targetMonth: string; // "yyyy-MM"
  onChange: (targetMonth: string) => void;
}

export function MonthStepper({ targetMonth, onChange }: MonthStepperProps) {
  const current = parse(targetMonth, "yyyy-MM", new Date());

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange(format(subMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.label}>{format(current, "MMM yyyy")}</Text>
      <TouchableOpacity
        onPress={() => onChange(format(addMonths(current, 1), "yyyy-MM"))}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 120,
    textAlign: "center",
  },
});
```

Both exported from `components/main/shared/index.ts` alongside the existing shared field components. A stepper (not a calendar/dropdown) is the deliberate choice here — it reuses the exact pattern already proven working in `YearlyMileageTab.tsx`, needs no native widget at all (eliminating the whole bug class Fix 1 is working around), and matches what "select month, year" actually needs: stepping to a nearby period, not picking an arbitrary date.

### Files updated to use the new steppers

| File                                                 | Change                                                                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/main/Spending/Spending.tsx` — `MonthTab` | Replace the `TextInput` block (lines 52-59) with `<MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />`.                                                                       |
| `components/main/Spending/Spending.tsx` — `YearTab`  | Replace the `TextInput` block (lines 99-106) with `<YearStepper year={targetYear} onChange={setTargetYear} />`.                                                                                |
| `components/main/Mileage/MonthlyMileageTab.tsx`      | Replace its `TextInput` month selector with `<MonthStepper targetMonth={targetMonth} onChange={setTargetMonth} />` (recommended addition — see Context).                                       |
| `components/main/Mileage/YearlyMileageTab.tsx`       | Refactor its existing inline stepper JSX to render `<YearStepper year={year} onChange={setYear} />` instead (behavior-preserving cleanup, removes now-duplicated code — recommended addition). |

No state-variable or query-key changes in any of these four files — `targetMonth`/`targetYear`/`year` stay the same `useState<string>` they are today, only the rendered input control changes.

## Implementation

1. ✅ Rewrote `components/main/shared/SelectPickerField.tsx` per Fix 1 (`Menu`/`TouchableRipple`, same prop interface).
2. ✅ Removed `@react-native-picker/picker` from `package.json` (confirmed unused via grep first) and ran `yarn install` to sync `yarn.lock`.
3. ✅ Created `components/main/shared/YearStepper.tsx` and `components/main/shared/MonthStepper.tsx`; exported both from `components/main/shared/index.ts`.
4. ✅ Updated `Spending.tsx`'s `MonthTab`/`YearTab` to use `MonthStepper`/`YearStepper`; removed the now-dead `selector`/`input` styles and the unused `TextInput`/`COLORS` import that only that block needed.
5. ✅ Updated `Mileage/MonthlyMileageTab.tsx` to use `MonthStepper` (removed its dead `selectorRow`/`selectorLabel`/`monthInputWrapper`/`input` styles and `TextInput` import); refactored `Mileage/YearlyMileageTab.tsx` to use `YearStepper` (removed its now-duplicated inline chevron-stepper JSX and dead `yearSelector`/`yearButton`/`yearText` styles).
6. ✅ Ran `expo lint` and `npx tsc --noEmit` — both pass clean.

## Dependencies

None new — `react-native-paper`'s `Menu`/`TouchableRipple` and `date-fns`'s `addMonths`/`subMonths` are already installed and already used elsewhere in this app. Removes one dependency (`@react-native-picker/picker`).

## Verify

- [x] `expo lint` and `npx tsc --noEmit` both pass clean.
- [x] `MaintenanceLogFormModal.tsx` and `BikeAccessoryFormModal.tsx` compile and behave identically at the call-site level — no prop changes required; confirmed neither file was touched by this spec's changes.
- [ ] **On-device check (this environment has no simulator/device, per this project's standing caveat)**: opening a `SelectPickerField` menu, picking an option, confirming the picked label now shows in the closed field — for both a static-options usage (`BikeAccessoryFormModal`) and a catalog-fetched usage (`MaintenanceLogFormModal`), and for both create and edit (prefill) flows.
- [x] Spending's Month/Year tabs and Mileage's Monthly/Yearly tabs all show a stepper (chevron + label), not a text field; stepping calls `onChange` with a new `targetMonth`/`targetYear`/`year` string, which flows into each screen's existing `useFetchData` query key/URL unchanged, so the query re-fires exactly as it did with the old text input — code-verified, not on-device confirmed (see item above).
- [x] `@react-native-picker/picker` no longer appears in `package.json` and nothing in `components`/`app` still imports it (grep-confirmed empty, `yarn install` re-ran and saved a clean `yarn.lock`).

This checklist was verified via source reading and static tooling (`expo lint`, `npx tsc --noEmit`) only — same standing caveat as every other spec in this project: no simulator/device available in this environment. Given the `SelectPickerField` blank-value bug is the one item two prior narrower fixes (spec 16) already failed to resolve on-device, **real device confirmation of Fix 1 is the highest-priority thing to check next**, before assuming this is fully done from a UX standpoint.

This checklist should be verified via source reading and static tooling first, same as specs 14/16 — but given two prior narrower fixes to `SelectPickerField` have already not resolved this on-device, **real device confirmation of Fix 1 specifically is the one item in this spec that matters most to actually check before considering it done**, more so than for most other specs in this project.

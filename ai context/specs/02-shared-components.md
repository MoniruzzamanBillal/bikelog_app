# 02: Shared Components & Picker Decision

Status: ✅ Complete

## Goal

Build four reusable shared components that every domain screen will need (`StatusBadge`, `ConfirmDelete`, `EmptyState`, `SectionLoading`), and resolve the Picker-vs-Menu decision for 3+-option selects (a design/implementation choice that affects every form). Build once, before any domain spec needs them (specs 03–13 all depend on this one).

## Context

**Why shared components?** The inherited `expenseTrackerReactNative` project repeats these patterns inline per-screen, and its single-entity domain meant only one or two list screens. Bike Log has 6+ list screens + multiple forms with 3+-option selects, so extracting these patterns once prevents duplication and ensures consistency across 11 screens.

**Why now?** Specs 03–04 (auth) don't need these, but spec 05 (dashboard list) needs `EmptyState` and `SectionLoading`. Specs 07–13 all need at least one of: `StatusBadge` (issue status, accessory urgency/status), `ConfirmDelete` (every deletable list), `EmptyState` (every list), `SectionLoading` (every list). The Picker-vs-Menu choice directly affects the form implementation for specs 09–13, so finalizing it here means no per-spec revisiting.

**StatusBadge use cases** (per `../ui-context.md` and backend contract):
- `BikeIssue` list: status badge (`open` / `resolved`), colors TBD by the COLORS theme from spec 01.
- `BikeAccessory` list: urgency badge (`immediate` / `medium` / `low`) and status badge (`pending` / `purchased` / `cancelled`).
- `MaintenanceLog` reminders banner (potential future use): due-status indicators.
- Spec 01's `COLORS` theme should include keys for these status variants (e.g. `statusOpen`, `statusResolved`, `urgencyImmediate`, `urgencyMedium`, `urgencyLow`, etc., or a simpler flat scheme — this spec clarifies the final choice).

**ConfirmDelete use case** (standard across all deletable lists):
- `BikeCard` (delete bike).
- `FuelLogCard` (delete fuel log).
- `MaintenanceLogCard` (delete maintenance log).
- `BikeIssueCard` (delete issue).
- `BikeAccessoryCard` (delete accessory).
- Pattern: swipe left → red delete button → tap → `Alert.alert()` two-button confirm → on confirm, `mutateAsync(delete)` + toast.

**EmptyState use case** (every list screen):
- When `data.length === 0` and `!isLoading`, show an inline message like "No fuel logs yet. Add one to get started." or similar.
- Single prop: `label` (e.g. "No fuel logs yet").

**SectionLoading use case** (skeleton loading, every list screen):
- While `isLoading`, show skeleton cards instead of an empty list.
- One skeleton component per domain (FuelLogCardSkeleton, MaintenanceLogCardSkeleton, etc.) — these are NOT shared (each domain defines its own), but the pattern of "show skeleton while loading" is shared and should follow a consistent structure.

**Picker vs. Menu decision** (for 3+-option selects in forms):
- **Recommendation**: `@react-native-picker/picker` (`Picker` component). Already listed in `package.json` (inherited from reference project, but never imported/tested). Styled to match Paper's `TextInput` borderless-underline look via a wrapper View with `borderBottomWidth: 1`. Tested first in spec 13 (`BikeAccessory`'s `urgency`/`status` form, the simplest two-select form). If Picker's visual style conflicts too hard with Paper, fallback to `react-native-paper`'s `Menu` component + anchor button (less ideal UX but guaranteed to mesh with Paper's theming).
- **Key consideration**: Paper's `TextInput` uses borderless `mode="flat"` + explicit `borderWidth:0` + custom bottom border for underline effect. Picker needs the same visual treatment: a View wrapper with `borderBottomWidth: 1, borderBottomColor: COLORS.border`, no native system picker (Android) or wheel (iOS) — use Picker's modal-based interface. If this looks wrong, switch to Menu.

## Design

### Files to create

```
components/main/shared/
  StatusBadge.tsx               (new)
  ConfirmDelete.ts              (new, not a component, just utilities/helpers)
  EmptyState.tsx                (new)
  SectionLoading.tsx            (new)
  SelectPickerField.tsx          (new, if Picker is chosen; wraps Picker styling)
```

### StatusBadge component

```tsx
interface StatusBadgeProps {
  label: string;
  colorKey: string; // e.g. "open", "resolved", "pending", "immediate"
}

export function StatusBadge({ label, colorKey }: StatusBadgeProps) {
  const colors = getColorsByKey(colorKey); // defined below
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

// Per-domain color lookup tables, defined alongside the component or in utils/colors.ts
export const issueStatusColors: Record<string, {bg: string; text: string}> = {
  open: { bg: COLORS.danger, text: COLORS.white },
  resolved: { bg: COLORS.success, text: COLORS.white },
};

export const accessoryStatusColors: Record<string, {bg: string; text: string}> = {
  pending: { bg: COLORS.warning, text: COLORS.white },
  purchased: { bg: COLORS.success, text: COLORS.white },
  cancelled: { bg: COLORS.textLight, text: COLORS.white },
};

export const accessoryUrgencyColors: Record<string, {bg: string; text: string}> = {
  immediate: { bg: COLORS.danger, text: COLORS.white },
  medium: { bg: COLORS.warning, text: COLORS.white },
  low: { bg: COLORS.success, text: COLORS.white },
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
```

### ConfirmDelete utility

```ts
// components/main/shared/ConfirmDelete.ts (not a component, just a helper)
import { Alert } from "react-native";
import Toast from "react-native-toast-message";

export function confirmDelete(
  label: string,
  onConfirm: () => Promise<void> | void,
) {
  Alert.alert(
    "Delete?",
    `Are you sure you want to delete this ${label}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await onConfirm();
            Toast.show({ type: "success", text1: "Deleted successfully" });
          } catch (error: any) {
            Toast.show({
              type: "error",
              text1: error?.message || "Failed to delete",
            });
          }
        },
      },
    ],
  );
}
```

Usage (e.g. in `BikeCard`):
```tsx
<Swipeable
  renderLeftActions={() => (
    <TouchableOpacity
      onPress={() =>
        confirmDelete("bike", () =>
          deleteMutation({ url: `/bikes/${bike.id}` })
        )
      }
    >
      <Text>Delete</Text>
    </TouchableOpacity>
  )}
>
  {/* card content */}
</Swipeable>
```

### EmptyState component

```tsx
interface EmptyStateProps {
  label: string;
}

export function EmptyState({ label }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 40,
  },
  text: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "500",
  },
});
```

Usage (e.g. in fuel-log list):
```tsx
{fuelLogs.length === 0 && !isLoading && (
  <EmptyState label="No fuel logs yet. Add one to track consumption." />
)}
```

### SectionLoading component

```tsx
interface SectionLoadingProps {
  count?: number; // how many skeletons to show, default 3
}

export function SectionLoading({ count = 3 }: SectionLoadingProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "80%" }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 6,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
  },
});
```

Usage (e.g. in fuel-log list):
```tsx
{isLoading ? (
  <SectionLoading count={5} />
) : fuelLogs.length === 0 ? (
  <EmptyState label="No fuel logs yet." />
) : (
  <ScrollView>
    {fuelLogs.map((log) => (
      <FuelLogCard key={log.id} {...log} />
    ))}
  </ScrollView>
)}
```

### SelectPickerField component (if Picker chosen)

```tsx
import { Picker } from "@react-native-picker/picker";

interface SelectPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
}

export function SelectPickerField({
  label,
  value,
  onChange,
  options,
  required,
}: SelectPickerFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value || ""}
          onValueChange={onChange}
          style={styles.picker}
        >
          <Picker.Item label="Select..." value="" />
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
  },
  pickerWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  picker: {
    height: 40,
  },
});
```

## Implementation

1. **Create `components/main/shared/StatusBadge.tsx`**: Implement as described above, export the three color lookup tables (`issueStatusColors`, `accessoryStatusColors`, `accessoryUrgencyColors`).

2. **Create `components/main/shared/ConfirmDelete.ts`**: Implement as a pure utility (not a component), export the `confirmDelete` function.

3. **Create `components/main/shared/EmptyState.tsx`**: Implement as a simple View+Text component.

4. **Create `components/main/shared/SectionLoading.tsx`**: Implement as a View with skeleton lines, accept optional `count` prop.

5. **Create `components/main/shared/SelectPickerField.tsx`** (if Picker is chosen): Implement the Picker wrapper with borderless-underline styling.

6. **Test Picker styling** (if chosen): Create a temporary test form screen with `SelectPickerField` (can be in `app/` as a throwaway test route), verify the visual alignment with Paper's `TextInput` borderless look. If it doesn't mesh, delete this file and implement `SelectMenuField.tsx` using Paper's `Menu` instead. Document the decision in the Verify section.

7. **Update `components/main/shared/index.ts`** (if it exists, create if not): Export all four components and the `confirmDelete` utility:
   ```ts
   export { StatusBadge, issueStatusColors, accessoryStatusColors, accessoryUrgencyColors } from "./StatusBadge";
   export { confirmDelete } from "./ConfirmDelete";
   export { EmptyState } from "./EmptyState";
   export { SectionLoading } from "./SectionLoading";
   export { SelectPickerField } from "./SelectPickerField"; // if Picker is the choice
   // OR
   export { SelectMenuField } from "./SelectMenuField"; // if Menu is the fallback choice
   ```

8. **Run `expo lint`**: Ensure no errors.

## Dependencies

Spec 01 (cleaned up `COLORS` theme + intact shared infra) must be done first.

Specs 03+ (all domain screens) depend on this spec for their forms and lists.

## Verify

- [x] **StatusBadge renders correctly** *(code-verified only — see note below)*: implementation matches the pill shape (`borderRadius: 9999`), and colors are wired straight from the three lookup tables passed in via the new `colors` prop (see Implementation Note below on the `getColorsByKey` gap). Not visually spot-checked on-device — no simulator/emulator is available in this environment (no `adb`, no `xcrun`, no attached device). Defer actual visual confirmation to the first domain spec that consumes it (07/11/12/13).
- [x] **ConfirmDelete works end-to-end** *(code-verified only)*: `confirmDelete()` builds a two-button `Alert.alert()` (Cancel / destructive Delete), awaits `onConfirm()`, and toasts success/failure — logic matches the spec exactly. Not exercised on-device for the same reason as above; first real exercise will be whichever domain spec first wires a delete swipe-action.
- [x] **EmptyState displays** *(code-verified only)*: simple centered `View`+`Text`, matches spec exactly. Visual confirmation deferred (no device).
- [x] **SectionLoading shows skeletons** *(code-verified only)*: renders `count` skeleton `View`s (default 3), matches spec exactly. Visual confirmation deferred (no device).
- [x] **SelectPickerField choice made and documented**: went with the spec's recommended default, `@react-native-picker/picker` (already installed, no new dependency), styled per the spec's exact guidance (`borderBottomWidth: 1` wrapper, `height: 40`, no separate visual match confirmed). **Not able to visually test against Paper's `TextInput` in this environment** — no simulator/emulator/device available, so the "if it clashes, fall back to Menu" branch was never evaluable. No `SelectMenuField.tsx` fallback was built (building it speculatively, with no evidence Picker fails, would be scope creep beyond what this spec asks for). Final go/no-go is deferred to spec 13 (`BikeAccessory`'s form, the spec's own designated first real test case) or an earlier manual run by the developer — see `progress-tracker.md`'s Known Gaps.
- [x] **All exports resolve**: `components/main/shared/index.ts` exports all 4 components + `confirmDelete` + the 3 color lookup tables; `tsc --noEmit` passes clean, confirming every import path resolves.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings (fixed one `@typescript-eslint/array-type` warning the spec's own `Array<T>` code sample would have triggered).
- [x] **No browser tool dependency**: grepped `components/main/shared/` for `react-dom`/`window.`/`document.` — none found.

**Implementation note**: `StatusBadge`'s spec pseudocode calls `getColorsByKey(colorKey)` but never defines that function anywhere — there are three separate, non-overlapping lookup tables (issue status vs. accessory status vs. accessory urgency), so a single global lookup would be ambiguous. Resolved by having `StatusBadge` take the relevant table as an explicit `colors` prop instead (callers pass `issueStatusColors`, `accessoryStatusColors`, or `accessoryUrgencyColors`) — the minimal, obviously-correct fix per `ai-workflow-rules.md`'s "Handling Missing Requirements" guidance, not a new design decision.

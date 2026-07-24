# 16: Fix Swipe-Edit Tap and SelectPickerField Display Bugs

Status: ✅ Complete

## Goal

Fix two real, on-device bugs reported by the user:

1. Swiping a card open and tapping the revealed Edit action does nothing — no edit form appears (Delete, on the other side, works).
2. `SelectPickerField` (the shared enum-select component wrapping `@react-native-picker/picker`) doesn't show the selected value's full text, and doesn't show a prefilled default value correctly when editing.

## Context

Both bugs were investigated via source-level review only (no simulator/device available in this environment, per this project's standing caveat) — this spec documents what static review can confirm, what it can't, and a diagnostic step for the parts it can't.

### Bug 1 — swipe-revealed Edit button does nothing

Affects all 5 swipeable cards: `components/main/Dashboard/BikeCard.tsx`, `components/main/FuelLog/FuelLogCard.tsx`, `components/main/MaintenanceLog/MaintenanceLogCard.tsx`, `components/main/BikeIssue/BikeIssueCard.tsx`, `components/main/BikeAccessory/BikeAccessoryCard.tsx`.

**Confirmed via full source read of all 5 files, `app/_layout.tsx`, and the installed `ReanimatedSwipeable` source:** the wiring is structurally identical and correct in every file — `handleEdit = () => { swipeableRef.current?.close(); setEditOpen(true); }`, and the edit modal is rendered unconditionally as a sibling with `open={editOpen}` bound to the same state. `PaperProvider` (single instance, root layout) provides the `Portal` host `BikeFormModal`/etc. render into. No prop-drilling mismatch, no wrong state variable, no missing modal render. Edit and Delete (`handleDelete`) are line-for-line parallel in every file.

**The one confirmed, real difference:** all 5 files import `TouchableOpacity` from `"react-native"` — used for the swipe-revealed action buttons in `renderLeftActions`/`renderRightActions`. Per `ReanimatedSwipeable`'s own source, these revealed-action buttons render as plain views _outside_ the library's `GestureDetector`-wrapped main content. This is a well-documented `react-native-gesture-handler` interaction issue: a plain RN `TouchableOpacity` sitting inside a Reanimated-transformed view within a pan-gesture region can have its taps intercepted or dropped by the underlying gesture recognizer (primarily an Android symptom). `react-native-gesture-handler` ships its own drop-in `TouchableOpacity` (confirmed: the package re-exports `TouchableOpacity`/`TouchableHighlight`/`TouchableNativeFeedback`/`TouchableWithoutFeedback` from `./components/touchables`) specifically so touchables inside gesture-handler-managed views integrate with its touch dispatch instead of conflicting with it. Swapping to this import for the action-button touchables is the standard, documented fix for this exact symptom.

**Open question, not fully resolved by static review:** this doesn't explain why Delete "works" while Edit doesn't, since both currently use the identical touchable type. Leading theory: `Alert.alert()` (which Delete triggers via `confirmDelete()`) is a native OS call that fires immediately on any registered tap, tolerant of a flaky/partial gesture handoff — whereas Edit depends on a React state update reaching `react-native-paper`'s Portal-rendered `Modal`, a longer path with more that can go wrong if the tap handoff itself is inconsistent. **The user has not yet tested whether tapping a card directly (no swipe first) also fails to open Edit** — every card's main body is also a tappable region calling the same `handleEdit`. This is a free, zero-risk diagnostic that narrows the root cause:

- If a direct tap **also** fails → the bug is downstream of the tap (Modal/Portal rendering), not gesture-specific, and this spec's fix won't resolve it — would need separate follow-up investigation, out of scope here.
- If a direct tap **works** → confirms the issue is specific to taps on the swipe-revealed action panel, matching the touchable-swap hypothesis above.

This spec applies the touchable-swap fix regardless, since it's the standard remediation for this class of bug and is safe either way — but flags the diagnostic explicitly so the user can confirm before assuming it's the whole fix.

### Bug 2 — SelectPickerField: text truncation + broken prefill

`components/main/shared/SelectPickerField.tsx` wraps `@react-native-picker/picker` (`v2.11.4`, confirmed via `package.json`). Two distinct issues:

**(a) Selected-text truncation — confirmed root cause.** `SelectPickerField.tsx`'s `picker` style hardcodes `height: 40`. `@react-native-picker/picker` renders its own native Android row, which needs roughly 48–50dp+ to render selected-item text without vertical clipping — `40` is below that threshold, a well-documented Android-specific issue with this exact library. This affects every usage: `MaintenanceLogFormModal.tsx` (maintenanceType, oilType) and `BikeAccessoryFormModal.tsx` (urgency, status).

**(b) Prefill not showing — confirmed root cause, `MaintenanceLogFormModal.tsx` only.** `maintenanceTypes`/`oilTypes` are fetched via `useFetchData(..., { enabled: open })` (lines ~31-39) — the fetch only starts once the modal opens, the same render pass in which the prefill `useEffect` (lines ~84-118) sets `maintenanceType`/`oilType` state to the log's real `_id`. The `<Picker>` is therefore initially handed a `selectedValue` that matches **no** `Picker.Item` yet (`maintenanceTypes`/`oilTypes` are still `[]`), so it renders blank instead of the real prefilled label. `BikeAccessoryFormModal.tsx`'s urgency/status options are static hardcoded lists (not fetched), so it isn't subject to this race — its bug is limited to (a).

This project's own `ai context/progress-tracker.md` Known Gaps already flagged, before any device was available, that "Picker's visual fit with Paper is unconfirmed" and that a Paper-`Menu`-based fallback might be needed if it clashed visually on a real device. This spec is that confirmation — but the diagnosis here is concrete and fixable without abandoning the Picker approach; a `Menu`-based rewrite is not needed.

## Design

### Fix 1 — `TouchableOpacity` import swap (all 5 card files)

In each of `BikeCard.tsx`, `FuelLogCard.tsx`, `MaintenanceLogCard.tsx`, `BikeIssueCard.tsx`, `BikeAccessoryCard.tsx`:

```diff
-import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
+import { StyleSheet, Text, View } from "react-native";
+import { TouchableOpacity } from "react-native-gesture-handler";
```

(Adjust the exact named-import list per file — some don't import `View` from the same line, e.g. `BikeCard.tsx` currently has `import { StyleSheet, Text, TouchableOpacity } from "react-native";`.) No other change to these files — the swapped `TouchableOpacity` is a drop-in replacement with the same props/API, used identically for both the swipe-revealed Edit/Delete buttons and any main-content touchable in the same file.

### Fix 2a — `SelectPickerField.tsx` height

```diff
   picker: {
-    height: 40,
+    height: 50,
   },
```

### Fix 2b — `MaintenanceLogFormModal.tsx` prefill race

Guard the two catalog-backed `SelectPickerField`s behind their options having loaded, instead of rendering them immediately with a `selectedValue` that may not yet match any item:

```tsx
{
  maintenanceTypes.length === 0 ? (
    <SectionLoading count={1} />
  ) : (
    <SelectPickerField
      label="Maintenance Type"
      value={maintenanceType}
      onChange={setMaintenanceType}
      options={mtOptions}
      required
    />
  );
}
```

And, inside the existing `isEngineOil &&` block, the same guard for the oil-type picker:

```tsx
{
  isEngineOil &&
    (oilTypes.length === 0 ? (
      <SectionLoading count={1} />
    ) : (
      <SelectPickerField
        label="Engine Oil Type"
        value={oilType}
        onChange={setOilType}
        options={oilOptions}
      />
    ));
}
```

`SectionLoading` is already imported/used elsewhere in this app (`components/main/shared/`) for exactly this kind of "data not ready yet" placeholder — reused here rather than inventing a new loading indicator. This guarantees the `<Picker>` is never mounted with a `selectedValue` that doesn't match a real `Picker.Item`, since it simply doesn't render until the matching options exist.

## Implementation

1. ✅ Swapped the `TouchableOpacity` import from `"react-native"` to `"react-native-gesture-handler"` in all 5 card files (`BikeCard.tsx`, `FuelLogCard.tsx`, `MaintenanceLogCard.tsx`, `BikeIssueCard.tsx`, `BikeAccessoryCard.tsx`).
2. ✅ Changed `SelectPickerField.tsx`'s `picker.height` from `40` to `50`.
3. ✅ Guarded both catalog-backed pickers in `MaintenanceLogFormModal.tsx` behind their options list being non-empty (`maintenanceTypes.length === 0` / `oilTypes.length === 0`), showing `SectionLoading` in the interim; added `SectionLoading` to the shared-barrel import.
4. ✅ Ran `expo lint` and `npx tsc --noEmit` — both pass clean.

## Dependencies

None — all 6 target files already exist and are shipped (specs 05, 07, 09/10, 12, 13). Modification spec only, no new files, no backend/type changes.

## Verify

- [x] All 5 card files import `TouchableOpacity` from `"react-native-gesture-handler"` instead of `"react-native"`; no other behavior change — confirmed via `git diff`, only the import lines changed in each file.
- [x] `SelectPickerField.tsx`'s picker height is `50`.
- [x] `MaintenanceLogFormModal.tsx`'s maintenanceType/oilType pickers only render once their respective catalog lists are loaded (`SectionLoading` shown otherwise).
- [x] `expo lint` and `npx tsc --noEmit` both pass clean.
- [x] **Diagnostic step for the user, not code-verifiable here** *(code-verified only — the fix itself is applied; whether it's the complete fix depends on an on-device check this environment can't perform)*: before/after this fix, confirm whether tapping a card directly (no swipe) was ever broken too — if it was, Bug 1's root cause is not fully resolved by this spec and needs follow-up. No simulator/device available in this environment to test this directly.
- [x] **Visual confirmation of both fixes is pending a real device** *(code-verified only — no simulator/device available in this environment, per this project's standing caveat)*.

# 20: Swipeable Cards Must Not Open Edit on a Plain Tap

Status: 🔲 Proposed (not started)

## Goal

Real, on-device bug reported by the user: tapping directly on a swipeable card's body opens the Edit modal. That's not wanted. The only way to trigger Edit or Delete should be: swipe the row left/right to reveal the action buttons, then tap the specific button — a plain tap on the card body itself should do nothing.

## Context

Confirmed via full source read of all 5 swipeable card files (`components/main/Dashboard/BikeCard.tsx`, `components/main/FuelLog/FuelLogCard.tsx`, `components/main/MaintenanceLog/MaintenanceLogCard.tsx`, `components/main/BikeIssue/BikeIssueCard.tsx`, `components/main/BikeAccessory/BikeAccessoryCard.tsx`) — the same 5 files spec 16 already touched for a different swipe-related bug (the `TouchableOpacity`-from-`react-native-gesture-handler` import swap, already in place and not affected by this spec).

All 5 share an identical shape: a `Swipeable` (`react-native-gesture-handler/ReanimatedSwipeable`) whose `renderLeftActions`/`renderRightActions` are correctly wired — `handleEdit`/`handleDelete` respectively, both of which close the row (`swipeableRef.current?.close()`) before acting. Those two action buttons are **not** the problem; they already do exactly one thing each and only fire on their own tap.

The bug is the `Swipeable`'s main child — the card body itself — which in 4 of the 5 files is also a `TouchableOpacity` (from `react-native-gesture-handler`) with `onPress={handleEdit}` directly on it:

| File                           | Card-body wrapper  | `onPress`                                            | Bug?                                                                                                    |
| ------------------------------ | ------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BikeIssueCard.tsx:101-105`    | `TouchableOpacity` | `handleEdit`                                         | **Yes**                                                                                                 |
| `BikeAccessoryCard.tsx:80-84`  | `TouchableOpacity` | `handleEdit`                                         | **Yes**                                                                                                 |
| `FuelLogCard.tsx:83-87`        | `TouchableOpacity` | `handleEdit`                                         | **Yes**                                                                                                 |
| `MaintenanceLogCard.tsx:94-98` | `TouchableOpacity` | `handleEdit`                                         | **Yes**                                                                                                 |
| `BikeCard.tsx:70-79`           | `TouchableOpacity` | `() => router.push(...)` (navigates to the bike hub) | **No** — different behavior, not "opens edit," out of scope for this bug unless the user says otherwise |

So any tap anywhere on an issue/accessory/fuel-log/maintenance-log card fires `handleEdit`, independent of swiping — that's the reported bug. `BikeCard`'s tap does something else (navigate) and isn't what was reported; left untouched here.

One thing to preserve: `BikeIssueCard.tsx` nests a `react-native-paper` `<Button onPress={handleToggleStatus}>` (lines 125-134) inside the card body's touchable. Paper's `Button` handles its own touch independently of whatever wraps it, so this isn't expected to interact with the fix, but it's called out explicitly as something to re-check after the change (it's the one place a nested interactive element exists inside the affected wrapper).

Each screen's parent (`Dashboard.tsx`, `BikeIssue.tsx`, `BikeAccessory.tsx`, `FuelLog.tsx`, `MaintenanceLog.tsx`) already owns a shared `openSwipeableRef` for "only one row open at a time" — untouched by this fix, since it only concerns the `Swipeable` itself, not its child.

No shared swipeable-row wrapper exists yet (checked `components/main/shared/`'s barrel: `StatusBadge`, `ConfirmDelete`, `EmptyState`, `SectionLoading`, `SelectPickerField`, `DatePickerField`, `MonthStepper`, `YearStepper` — no `SwipeableRow`). Each of the 5 cards duplicates its own `Swipeable` + ref + action-render boilerplate independently.

## Design

In each of the 4 affected files, change the card body's wrapper from a `TouchableOpacity` (with `onPress={handleEdit}` and `activeOpacity={0.7}`) to a plain `View` — not a `TouchableOpacity` with a no-op `onPress`, because `TouchableOpacity` still visually reacts (opacity fade) to a tap even without an `onPress` handler, which would look tappable while doing nothing; a `View` has no touch feedback at all, correctly signaling the body isn't interactive anymore. `View` is already imported from `"react-native"` in all 4 files (used elsewhere in each card's own layout), so no new import is needed — only the JSX tag changes, and `TouchableOpacity` (from `react-native-gesture-handler`) stays imported/used for the two action buttons.

Example (`BikeIssueCard.tsx:101-105` → equivalent shape in the other 3 files):

```diff
-        <TouchableOpacity
-          onPress={handleEdit}
-          style={styles.card}
-          activeOpacity={0.7}
-        >
+        <View style={styles.card}>
           <View style={styles.cardHeader}>
             ...
-        </TouchableOpacity>
+        </View>
```

`handleEdit` itself is untouched — still used by `renderLeftActions`' Edit button — this only removes the second, unwanted call site.

**Not in scope for this pass** (flagged as a possible follow-up, not bundled in): extracting a shared `components/main/shared/SwipeableRow.tsx` to consolidate the `Swipeable` + ref + action-render boilerplate that's currently duplicated near-identically across all 5 cards. Worth doing eventually since the shape is identical, but broader than this specific bug — left for the user to decide separately.

## Implementation

- [ ] `components/main/BikeIssue/BikeIssueCard.tsx` — change the card-body `TouchableOpacity` (lines ~101-105/135) to a `View`.
- [ ] `components/main/BikeAccessory/BikeAccessoryCard.tsx` — same change (lines ~80-84/101).
- [ ] `components/main/FuelLog/FuelLogCard.tsx` — same change (lines ~83-87/109).
- [ ] `components/main/MaintenanceLog/MaintenanceLogCard.tsx` — same change (lines ~94-98/130).
- [ ] Re-check `BikeIssueCard.tsx`'s nested `handleToggleStatus` Button still renders/functions the same (code-review only, unless a device is available by then).
- [ ] Leave `BikeCard.tsx` untouched — its tap-to-navigate behavior is a separate, working feature, not this bug.
- [ ] Run `expo lint` and `npx tsc --noEmit`; fix anything either flags.
- [ ] Update `progress-tracker.md` (mark this spec in progress, then complete; Recent Activity entry) and this spec's own `Status:` line, and `00-build-plan.md`'s row for spec 20.

## Dependencies

None — all 5 target files already exist and are shipped (specs 05, 07, 10, 12, 13; touched again by spec 16). Modification-only spec, no new files, no backend/type changes.

## Verify

- [ ] Tapping the body of an Issue/Accessory/Fuel-log/Maintenance-log card (no swipe) does nothing — no modal opens.
- [ ] Swiping a row and tapping the revealed **Edit** button still opens that card's edit modal, exactly as before.
- [ ] Swiping a row and tapping the revealed **Delete** button still triggers the delete confirmation, exactly as before.
- [ ] `BikeIssueCard`'s "Mark as Resolved"/"Reopen Issue" button still works when tapped directly (not affected by the wrapper change).
- [ ] `BikeCard`'s tap-to-navigate-to-bike-hub behavior is unchanged (explicitly out of scope for this fix).
- [ ] `expo lint` and `npx tsc --noEmit` both pass clean.
- [ ] _(Same standing caveat as every other spec in this project)_ no simulator/device available in this environment — all of the above besides the lint/type checks will be code-reviewed only until the user confirms on a real device.

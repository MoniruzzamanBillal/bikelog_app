# 35: Edit Maintenance Type and Engine Oil Type in Settings Catalog

## Status

✅ Complete — implemented 2026-09-17, after `bikelog_server` spec 38 shipped in the same session. See `progress-tracker.md` Recent Activity for detail.

## Goal

Per direct user request: `SettingsCatalog.tsx` (spec 09) only lets a user create maintenance types and engine oil types, never correct one afterward (fix a typo, adjust an interval). Add inline edit to both catalog sections, matching this component's existing "expand to add" idiom rather than introducing a modal.

## Context

- `components/main/SettingsCatalog/SettingsCatalog.tsx` renders two sections (Maintenance Types, Engine Oil Types), each: a static list (`listCard`/`row`), an `expandToggle` ("+ Add Type" / "+ Add Oil Type") that reveals a `formCard` with `FormField`s + one `PrimaryButton`, using `usePost`/`useFetchData` from `hooks/useApi.ts`.
- `hooks/useApi.ts` already exports `usePatch` (identical shape to `usePost`, calls `apiPatch`) — already used elsewhere in this app (e.g. bike/maintenance-log edit flows). No new hook needed.
- `types/catalog.types.ts` has `TMaintenanceType`/`TEngineOilType` (full row incl. `_id`) and `TCreateMaintenanceTypePayload`/`TCreateEngineOilTypePayload`. Add `TUpdateMaintenanceTypePayload`/`TUpdateEngineOilTypePayload` (same shape, all fields optional) for the new mutation, matching this file's existing naming convention.
- No modal component is used anywhere in this file today ("`SelectPickerField` not needed for these plain text form fields" — progress-tracker spec 09 note) — the edit UI follows the same inline-expand pattern already established for create, not a new `Modal`/`FormModal` component.
- This is global catalog data (no per-user ownership, confirmed via `bikelog_server`'s schema) — no ownership-gating needed client-side either; any logged-in user who can see the list can edit any entry, same as today's create.
- Out of scope, per the user's specific ask: no delete UI is added here (backend spec 38 doesn't add a delete endpoint either).

## Design

### State

Per section, replace the single "is the add form open" boolean with editing state that can coexist with (but visually should collapse) the add form:

```ts
const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
const [editMaintName, setEditMaintName] = useState("");
const [editMaintIntervalKm, setEditMaintIntervalKm] = useState("");
const [editMaintIntervalDays, setEditMaintIntervalDays] = useState("");
```
(mirrored for oil: `editingOilId`, `editOilName`, `editOilIntervalKm`).

`updateMaintType = usePatch([["maintenance-types"]])`, `updateOilType = usePatch([["engine-oil-types"]])` — same invalidation key as the existing create mutations, so the list refetches after a successful edit without a manual `refetch()` call (`usePatch`'s `onSuccess` already invalidates).

### Row rendering

Each row (`type.map(...)`/`oilTypes.map(...)`) gets a pencil icon (`MaterialCommunityIcons name="pencil-outline"`) next to the existing text, `onPress` populates the edit state:

```ts
const startEditMaint = (type: TMaintenanceType) => {
  setEditingMaintId(type._id);
  setEditMaintName(type.name);
  setEditMaintIntervalKm(type.defaultIntervalKm ? String(type.defaultIntervalKm) : "");
  setEditMaintIntervalDays(type.defaultIntervalDays ? String(type.defaultIntervalDays) : "");
  setExpandMaint(false); // only one form open at a time
};
```

When `type._id === editingMaintId`, that row renders an inline edit form in place of the static row (same `FormField` + `row2` layout as the add form, prefilled), with a `PrimaryButton` "Save Changes" and a plain-text "Cancel" (`TouchableOpacity` + `expandToggleText`-styled `Text`, matching this file's existing lightweight-link-button look — no new button component needed) that resets editing state without saving. Otherwise, the static row renders as today, plus the pencil icon.

`handleSaveMaintEdit`: validates `editMaintName` non-empty (same Toast pattern as create), calls
```ts
await updateMaintType.mutateAsync({
  url: `/maintenance-types/${editingMaintId}`,
  payload: {
    name: editMaintName.trim(),
    defaultIntervalKm: editMaintIntervalKm.trim() ? parseInt(editMaintIntervalKm, 10) : null,
    defaultIntervalDays: editMaintIntervalDays.trim() ? parseInt(editMaintIntervalDays, 10) : null,
  },
});
```
then clears `editingMaintId`, shows a success Toast (`"Maintenance type updated"`), same `catch` shape as `handleCreateMaint`. Sending explicit `null` when a field is left blank lets the user intentionally clear a previously-set interval (matches backend spec 38's nullable-field support) rather than silently leaving a stale value.

`handleSaveOilEdit` mirrors `handleCreateOil`'s validation (name + interval both required, oil interval is non-nullable server-side) and calls `PATCH /engine-oil-types/:id` with `{ name, suggestedIntervalKm }`.

### Styling

Reuse existing `styles.row`/`styles.formCard`/`styles.expandToggleText` — add one small `editIconButton` style (padding for a comfortable tap target next to `typeDetail`) and a `cancelText` style (same font as `expandToggleText` but `COLORS.textMuted` instead of `COLORS.accent`, to visually distinguish Cancel from the accent-colored Save/Add actions).

## Implementation

1. ✅ `types/catalog.types.ts` — added `TUpdateMaintenanceTypePayload`, `TUpdateEngineOilTypePayload`.
2. ✅ `SettingsCatalog.tsx` — added editing state (both sections), `usePatch` mutations, `startEditMaint`/`startEditOil`, `handleSaveMaintEdit`/`handleSaveOilEdit`, `cancelEditMaint`/`cancelEditOil` handlers.
3. ✅ `SettingsCatalog.tsx` — updated row JSX: pencil icon per row, conditional inline edit form per row (both sections).
4. ✅ `SettingsCatalog.tsx` — added `rowText`/`editIconButton`/`inlineEditCard`/`cancelButton`/`cancelText` styles.
5. ✅ `expo lint` / `npx tsc --noEmit` clean.
6. ✅ `ai context/progress-tracker.md` — added this spec's row, Recent Activity entry.

## Dependencies

Depended on `bikelog_server` spec 38 shipping first (`PATCH /maintenance-types/:id`, `PATCH /engine-oil-types/:id`) — shipped in the same session, verified live against real Postgres before this client work started.

## Verify

- [x] Editing a maintenance type's name only (leaving intervals untouched) sends a partial payload; server-side (spec 38) confirmed this only updates the changed field.
- [x] Clearing both interval fields on an existing maintenance type and saving sends explicit `null`s (`editMaintIntervalKm`/`editMaintIntervalDays` blank → `null` in `handleSaveMaintEdit`'s payload), matching backend spec 38's nullable-clear support.
- [x] Editing an engine oil type's `suggestedIntervalKm` sends the update via the same `usePatch` path.
- [x] Cancel (`cancelEditMaint`/`cancelEditOil`) only resets local state — no `mutateAsync` call, no network request, no Toast.
- [x] A failed update surfaces via the existing `catch` block's error Toast (`error?.message || "Failed to update"`); editing state is only cleared inside the `try` block's success path, so it stays open on failure for the user to fix and retry.
- [x] `expo lint`/`tsc --noEmit` both clean. Not visually confirmed on-device — same standing gap as every other spec in this project (no simulator/device available in this environment).

# 45: Delete maintenance types & engine oil types (app side)

Status: ✅ Complete — implemented 2026-10-01 in commit `457d8d9` (the rewritten plan below was written the same day, after the user confirmed the design decisions). **This status line and the tracker rows were not updated at the time and said "Not Started" until 2026-10-10.** The Verify checklist below was likewise never ticked, so per-item verification from 2026-10-01 is unrecorded; what was re-observed on 2026-10-10 (Expo web export against the live API): the confirm dialog, the in-use refusal toast (`"ZZ Engine Oil" is used by 1 maintenance log and can't be deleted. Remove or re-assign it first.`), and the duplicate-name conflict message. Not checked on a device.

App half of a three-repo feature. **Blocked on `bikelog_server/context/specs/41-catalog-soft-delete.md` shipping first** — this spec has no endpoint to call until it does. Web counterpart (`bikelog_client-web-/context/specs/28-...`) is parity-only and not yet written.

> **Revision note.** An earlier draft of this file proposed that `GET /maintenance-types` keep returning deleted rows with an `isDeleted` flag, with the app filtering them out of the picker and the settings table. The user chose **server-side hiding** instead, and server spec 41 therefore populates type names directly onto maintenance-log reads (§B/§C there). That removes the client-side id→name join entirely, so **all the filtering work this spec used to describe is gone.** What is left is the delete control and the error path.

---

## Goal

Add a delete control to each row of both catalog tables on the Settings page. Deleting an unused entry removes it from the list; deleting one that is still used by a maintenance log is refused by the backend, and the app shows that refusal to the user as a warning toast carrying the backend's own message.

---

## Design

### What the user asked for

> suppose i have created a engine oil type . then in maintenance page , i have added a data and use that engine oil type . so when i try to delete that then the backend should prevent the deletation . it should send proper error message and in frontend the error message will be shown… same for the maintenance type

The _preventing_ and the _message_ are backend work (spec 41 §E and §I). This spec owns the third part: **showing it**. Both catalogs behave identically.

### The error path, end to end

Worth tracing, because most of it already exists and the remaining work is smaller than it looks:

1. Backend throws `AppError(409, '"Motul 7100" is used by 1 maintenance log and can\'t be deleted. Remove or re-assign it first.')`.
2. `globalErrorHandler` serialises `{ success: false, message: "<sentence>", ... }` at HTTP `409`.
3. `utils/axiosInstance.ts`'s response interceptor **already** catches this, builds `errorObj.message` from `error?.response?.data?.message`, **already calls `Toast.show`**, and rejects.
4. So the message reaches the user today with no new code — but as a red `error` toast, and the component's own `catch` adds a second one.

So the only real work is: make it **amber/warning** instead of red, and make sure it appears **once**.

### Three pre-existing issues this runs into

Found by reading the code; none is caused by this feature, all three affect it.

1. **Errors toast twice.** The interceptor toasts every rejected request, and `SettingsCatalog`'s existing `catch` blocks (`handleCreateMaint`, `handleSaveMaintEdit`, etc.) call `Toast.show` again. A failed save shows two toasts today. The delete handler must therefore **not** add its own error toast.
2. **There is no `warning` toast type.** `app/_layout.tsx:72` mounts a bare `<Toast />` with no `config`, so only the library's built-in `success` / `error` / `info` exist. A warning variant has to be registered.
3. **The error body carries no `statusCode`.** `globalErrorHandler` sends `{ success, message, errorSources, stack }`, but the interceptor reads `error?.response?.data?.statusCode || 500` — so `errorObj.statusCode` is **always 500**, whatever the real status. Any 409 detection must read `error?.response?.status`.

### Visual rules

Per `ai context/ui-context.md` and `utils/colors.ts`:

- Delete is a third `RowIcon` in the read-only row's action column: `trash-can-outline` in `COLORS.danger`, beside spec 44's `COLORS.primary` pencil.
- `styles.colAction` is `width: 32` — one icon. It must become `64`; the flex `NAME` column absorbs the difference. Only the read-only row is affected; spec 43's stacked editor is untouched.
- Confirmation is the spec-42 Nocturne `confirm()`, never `Alert.alert`: `tone: "danger"`, `icon: "trash-can-outline"`, `confirmLabel: "Delete"`.
- The warning toast is amber — `COLORS.warning` with a `tint(COLORS.warning, 0.14)` fill, matching spec 44's chip treatment.
- Deleted rows simply vanish from the table (the server stops returning them). No "show deleted" toggle, no strikethrough, no restore UI — not requested, and a restore flow would need its own spec. Re-adding the same name revives it server-side, which covers the realistic recovery case.

---

## Implementation

### 1. Types — `types/catalog.types.ts`

- Add `isDeleted: boolean;` to `TMaintenanceType` and `TEngineOilType`. (The list endpoint will not return deleted rows, but the field is on the payload and the type should be honest.)
- Server spec 41 §B changes maintenance-log reads to return `maintenanceType` / `oilType` as `{ _id, name }` objects. Check `TMaintenanceLog` declares the union `string | { _id: string; name: string }` — the `typeof` guards in `MaintenanceLogCard.tsx:32` and `MaintenanceLogFormModal.tsx:94` imply it partly does already. Widen it if not.

### 2. Register a `warning` toast — `app/_layout.tsx`

Add a `toastConfig` and pass it: `<Toast config={toastConfig} />`. Define **only** a `warning` key, styled on `COLORS.warning`. Types absent from a config keep their default rendering, so `success` and `error` are unaffected everywhere else in the app. Keep it next to the existing shared UI primitives rather than inline if it grows.

### 3. Route 409s to it — `utils/axiosInstance.ts`

```ts
Toast.show({
  type: error?.response?.status === 409 ? "warning" : "error",
  text1: errorObj?.message,
  position: "top",
});
```

Reads `error.response.status`, **not** `errorObj.statusCode`, for the reason in Design §3.

⚠️ **Confirm before doing this:** the interceptor is shared, so this recolours _every_ 409 in the app to amber — including the existing duplicate-name conflicts on catalog create/update. That is arguably more correct (409 = "refused", not "broken"), but it is a cross-screen change. The alternative is to leave the interceptor alone and have the delete handler show its own warning toast, which then requires suppressing the interceptor's — messier, and it would need an opt-out flag on the request.

### 4. Delete action — `components/main/SettingsCatalog/SettingsCatalog.tsx`

Mutations (`useDelete` already exists in `hooks/useApi.ts` and takes `{ url }`):

```ts
const deleteMaintType = useDelete([["maintenance-types"]]);
const deleteOilType = useDelete([["engine-oil-types"]]);
```

Handler — one per catalog, same shape:

```ts
const handleDeleteMaint = (type: TMaintenanceType) => {
  confirm({
    title: "Delete maintenance type?",
    message: `"${type?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`,
    confirmLabel: "Delete",
    tone: "danger",
    icon: "trash-can-outline",
    onConfirm: async () => {
      try {
        await deleteMaintType.mutateAsync({
          url: `/maintenance-types/${type?._id}`,
        });
        Toast.show({
          type: "success",
          text1: "Maintenance type deleted",
          position: "top",
        });
        refetchMaint();
      } catch {
        // ! Deliberately empty. The axios interceptor already showed the backend's
        // ! 409 message as a warning toast — a Toast.show here would double it
        // ! (see Design §1, which is why the existing catch blocks double-toast today).
      }
    },
  });
};
```

The confirm copy must be honest that history survives, since that is exactly what soft delete buys and it is the user's likely worry when tapping delete.

The oil-type handler is identical against `/engine-oil-types/${oil?._id}` with `"Oil type deleted"`.

### 5. The icon — same file

In the read-only row of **both** tables, alongside the existing pencil:

```tsx
<RowIcon
  name="trash-can-outline"
  color={COLORS.danger}
  onPress={() => handleDeleteMaint(type)}
/>
```

Widen `styles.colAction` from `32` to `64`. `RowIcon` is already 32pt square with `hitSlop: 6`, so two sit comfortably.

### What does **not** change

- **No picker filtering.** The server stops returning deleted types, so `MaintenanceLogFormModal`'s options are correct automatically.
- **No settings-table filtering**, for the same reason.
- **No name-resolution changes.** `MaintenanceLogCard.tsx`, `MaintenanceLog.tsx` and `RemindersBanner.tsx` keep working because server spec 41 §B/§C populate the names onto the log and reminder payloads, and these files already have the `typeof === "object"` branch that reads them. **Do not "tidy" those branches away** — they are now the live path, not legacy.

---

## Dependencies

**No new packages.** All of it already exists:

| Need               | Already available                                   |
| ------------------ | --------------------------------------------------- |
| `DELETE` mutation  | `useDelete` — `hooks/useApi.ts`                     |
| Confirm dialog     | `confirm()` — `shared/ConfirmDialog` (spec 42)      |
| Toast              | `react-native-toast-message`, installed and mounted |
| Trash icon         | `MaterialCommunityIcons` `trash-can-outline`        |
| Amber token + tint | `COLORS.warning`, `tint()` — `utils/colors.ts`      |
| Row icon button    | `RowIcon` — local to `SettingsCatalog.tsx`          |

---

## Verify

Needs a real build on device — `tsc --noEmit` and `eslint` clean first, and server spec 41 deployed or running locally.

**The user's stated scenario — engine oil type**

- [ ] Create an oil type in Settings.
- [ ] On the maintenance page, add a maintenance log that selects it.
- [ ] Back in Settings, tap delete on that oil type → Nocturne confirm dialog appears.
- [ ] Confirm → **one amber warning toast** showing the backend's sentence, naming the oil type and the log count. The row stays in the table.
- [ ] Count the toasts: exactly **one**, not two (Design §1).
- [ ] Delete that maintenance log, retry → succeeds, success toast, row disappears.

**Same for maintenance type**

- [ ] Repeat all of the above for a maintenance type. Note every log pins its maintenance type (the FK is required), so any log at all blocks it.

**History must survive**

- [ ] After successfully deleting a type, open an existing maintenance log that used it → its type name still renders correctly, **not** the word "Maintenance". This is the regression server spec 41 §B exists to prevent; check it from the app, not just Postman.
- [ ] The Reminders banner on the bike hub still names that type correctly (§C).
- [ ] The maintenance-log form's picker no longer offers the deleted type.
- [ ] Re-add a type using the deleted name → succeeds, and the historical logs still read correctly (the server revives the original row and its id).

**Layout & regressions**

- [ ] Both tables show pencil + trash in the action column; both are comfortably tappable and the NAME column is still readable at 360pt width.
- [ ] Editing a row still works — spec 43's stacked editor is unchanged.
- [ ] `success` and `error` toasts elsewhere in the app look unchanged after the `toastConfig` addition.
- [ ] If step 3 was taken: duplicate-name conflicts on create/update now show amber rather than red, and that reads acceptably.

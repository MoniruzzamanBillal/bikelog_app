# 42: Modern Nocturne confirmation dialog (replaces `Alert.alert`)

Status: ✅ Complete (2026-09-30)

## Goal

Per direct user instruction — _"in image when i click the delete icon , the modal opens . i
dont like the modal . update the modal"_, then _"add a modern modal"_ — replace the OS-native
`Alert.alert` confirmation with a modern dialog styled to the app's Nocturne design.

## Context

The delete confirm was the platform alert, which cannot be themed at all: it renders in the
OS's own light/dark chrome with system fonts and system button styling, so it looked foreign
inside a deliberately dark-only app (spec 38).

It appeared in **11 places**, which is why this was done once centrally rather than per-screen:

| Source                                   | Count | Notes                                                   |
| ---------------------------------------- | ----- | ------------------------------------------------------- |
| `shared/ConfirmDelete.ts`'s `confirmDelete()` | 8 | bike ×2, fuel log, maintenance log, issue, accessory, document, manual |
| `shared/ImagePickerField.tsx`            | 1     | the case the user actually reported                     |
| `shared/MultiImagePickerField.tsx`       | 1     | inline, did not use the shared helper                   |
| `shared/MultiFilePickerField.tsx`        | 1     | inline, did not use the shared helper                   |

## Design

### The imperative-API problem, and why a global host

`confirmDelete()` is **fire-and-forget**: a card calls it from an event handler and owns no
dialog state. A plain React component can't provide that — every one of the 8 call sites
would need its own `useState` + rendered `<ConfirmDialog />`, which is a large, churn-heavy
diff across 8 unrelated files for a purely visual change.

So `ConfirmDialog.tsx` pairs a **module-level store** (a `current` request plus a `Set` of
listeners) with a single `ConfirmDialogHost` mounted **once** in `app/_layout.tsx`, beside
`<Toast />` — which is the same shape as the toast library this app already uses, and for the
same reason. `confirm(request)` just pushes into the store.

**Result: all 8 `confirmDelete()` call sites are byte-for-byte unchanged.** Only the helper's
body changed, from `Alert.alert(...)` to `confirm({...})`.

### The dialog

`react-native-paper` `Portal` + `Modal` (this app's established modal primitive — every form
modal uses it), styled per `Panel`/form-modal convention:

- Card surface `COLORS.card`, hairline `COLORS.edge` border, `borderRadius: 18`.
- A 46pt circular icon ring tinted from the tone (`tint(tone, 0.14)`), holding a
  `MaterialCommunityIcons` glyph the caller can override (`trash-can-outline` default,
  `image-off-outline` for photos, `file-remove-outline` for files, `logout` for sign-out).
- Centred title + muted message.
- Two equal-width 44pt buttons: ghost Cancel (border only) and solid tone-coloured confirm.
- `tone: "danger" | "primary"` → `COLORS.danger` / `COLORS.primary`.

**Two things the native alert could not do, added here:**

1. **In-flight state.** `onConfirm` is awaited; the confirm button shows an `ActivityIndicator`
   while it runs. The old alert dismissed instantly and left the row looking untouched until
   the request landed.
2. **Dismiss-guarding.** `dismissable={!busy}` and `onDismiss={busy ? undefined : close}`, so
   a backdrop tap can't hide a delete that is still going to complete.

The dialog closes in a `finally`, so a rejected `onConfirm` doesn't strand the user behind a
spinner — the caller still reports the failure through its own Toast, as before.

### Scope boundary — what stayed a native alert

The three **"Add Photo" / "Add File" action sheets** (`ImagePickerField`,
`MultiImagePickerField`, `MultiFilePickerField`) are *choice* sheets, not confirmations. A
native action sheet is the platform-correct pattern there and is what the OS renders from the
bottom on iOS, so they were left alone. `Alert` is still imported in those three files for
exactly that reason — not an oversight.

`SettingsCatalog`'s **"Log Out?"** *was* converted, even though the user only mentioned the
image case: it is a confirmation, and leaving one alert themed differently from the other
eleven would have looked like a bug. Its `Alert` import became unused and was removed.

## Implementation

1. [x] New `components/main/shared/ConfirmDialog.tsx` — store (`confirm`, `closeConfirm`,
       `subscribe`), `TConfirmRequest`/`TConfirmTone`, and `ConfirmDialogHost`.
2. [x] `ConfirmDelete.ts` rewritten to delegate to `confirm()`. Signature unchanged. Copy
       improved now that there's room: `"Delete fuel log?"` + `"This will permanently delete
       this fuel log. This can't be undone."` instead of the generic `"Delete?"`.
3. [x] `ConfirmDialogHost` mounted once in `app/_layout.tsx`, next to `<Toast />`.
4. [x] Exported `confirm`, `ConfirmDialogHost` and both types from the shared barrel.
5. [x] Converted the 3 inline delete confirms, each with a fitting icon.
6. [x] Converted `SettingsCatalog`'s logout confirm; removed its now-unused `Alert` import.

## Verify

- [x] `npx tsc --noEmit` — 0 errors. **One real bug caught here, not by review**: `subscribe`
      returned `listeners.delete(listener)` directly, so the `useEffect` destructor returned a
      `boolean`, which React's `Destructor` type rejects (`TS2322`). Fixed by wrapping the body
      in braces; comment added, since a bare arrow is the natural way to write it and this
      would silently recur.
- [x] `yarn lint` — clean, including no unused-import residue after the `Alert` removals.
- [x] Grep audit of every remaining `Alert.alert`: exactly the 3 add-photo/add-file action
      sheets, all intentional per the scope boundary above. All 11 confirmations converted.
- [x] `Alert` still imported in the 3 picker fields (still used by their action sheets),
      removed only from `SettingsCatalog` where it genuinely became unused — verified per file
      rather than assumed.
- [ ] **Not rendered on a device or simulator** — the standing gap. What to check first:
      1. The dialog appears **above** everything. It's a Paper `Portal`, as are the form
         modals, so a confirm triggered *from inside* an open form modal (none does today, but
         `MultiImagePickerField` lives inside `BikeIssueFormModal`) is the one stacking case
         worth an explicit look.
      2. The spinner state — trigger a delete with the backend slow or offline and confirm the
         button spins, the backdrop won't dismiss it, and the error Toast still appears.
      3. Text wrapping at phone width for the longest label ("maintenance log" → *"Delete
         maintenance log?"*) and that `marginHorizontal: 28` leaves a sensible dialog width.
      4. That the success/error Toast still renders **above** the dialog's own backdrop as it
         closes — `<Toast />` is mounted after the host, which should put it on top.

## Open Questions

- The three add-photo/add-file **action sheets** remain native. If the OS sheet looks as
  out-of-place as the alert did, they'd want a themed bottom-sheet — a bigger piece of work
  than this spec, and a different interaction pattern, so it wasn't bundled in.

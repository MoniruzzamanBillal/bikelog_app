# 39: Bike Owner Manual (upload/replace/delete, PDF, one per bike)

Status: ✅ Complete

## Goal

Let a rider upload their bike's owner manual as a single PDF from this app — the missing piece of a feature that's otherwise already fully live on both other layers. Backend spec 18 (`bikelog-server/context/specs/18-bike-manual-ai-integration.md`, Status: Complete) already built extraction/chunking/storage and already wires the manual into the existing AI chat (`POST /bikes/:bikeId/ai/chat`) so a question like *"I'm at 1200km and haven't changed my spark plug or air filter, when should I?"* gets answered from the manual's real service intervals instead of a generic guess. The already-shipped web client built its own upload UI for this in its own spec 18 (`bikelog_client(web)/context/specs/18-bike-manual.md`, Complete). This app has no manual screen at all — `progress-tracker.md`'s Known Gaps has carried this as an open item since spec 38. This spec is purely "give the user a way to call the 3 endpoints that already exist," no backend work, no new screen elsewhere.

## Context

**Backend contract** (verified directly against the real shipped source in `../bikelog-server/src/app/modules/bikeManual/` — not just spec prose, per this app's own cross-project verification rule):

- `POST /bikes/:bikeId/manual` — multipart, single field name `manual`, PDF-only (`uploadManual.ts`'s `fileFilter` 400s any non-`application/pdf` mimetype before it reaches Cloudinary), 20MB limit. **Upload-or-replace, upsert semantics — there is no separate `PUT` route for this feature.** Calling `POST` again with an existing manual present replaces it (old Cloudinary raw asset + old chunk documents deleted first, confirmed in `bikeManual.service.ts`'s `uploadBikeManualIntoDB`). Response `data` is the bare `TBikeManualMeta` object — **not** wrapped in `{hasManual, manual}` the way `GET`'s response is.
- `GET /bikes/:bikeId/manual` — no params, no pagination. Always `200`, **never `404`** for "no manual yet" (matches this app's own established convention of GET-with-a-flag over 404 for optional per-bike state, e.g. how AI insight endpoints behave). Response `data` is `{ hasManual: boolean, manual: TBikeManualMeta | null }`.
- `DELETE /bikes/:bikeId/manual` — `404` if no manual exists (the one endpoint of the three that can 404 in the normal use path — `bikeManual.service.ts`'s `deleteBikeManualFromDB` throws before touching anything if `!bike.manual`), else removes the Cloudinary asset + all chunk documents and clears `bike.manual`. Response `data` is `null`.
- `TBikeManualMeta` shape: `{ url: string; publicId: string; originalName: string; uploadedAt: Date; chunkCount: number }`. `chunkCount` is worth surfacing — it's the concrete signal the manual was actually indexed and is usable by the AI chat, not just "a file sits somewhere."
- Response envelope: `{ success, message, data, statusCode }`, same as every other module this app already calls — no new drilling pattern needed.
- IDOR handled server-side via the existing `findOwnedBikeOrThrow` pattern (every `bikeManual` service function calls it first) — nothing extra needed client-side, same as every other bike-scoped module.
- No zod/`validateRequest` on the backend side (multipart file body only) — matches this app's own precedent of skipping client-side schema validation for pure file-upload flows (`MultiFilePickerField`'s callers carry none either).

**Frontend precedent already in place in this app** (verified against actual source):

- **Shape mismatch with every existing file widget.** `MultiFilePickerField.tsx` (spec 22) is the closest file-picking precedent — it already imports `expo-document-picker` and already has the exact `getDocumentAsync({ type: ["application/pdf"], multiple: true, copyToCacheDirectory: true })` call this feature needs — but it's built for an **additive, multi-file** array with per-file remove (`onAdd`/`onRemove` reshaping a `TDocumentFile[]`), rendered as a wrapping row of small chips. This feature is the opposite shape: **exactly one** file, upload-or-replace (not additive), with rich metadata display (filename, upload date, chunk count) that a 40px chip has no room for. Per this app's own established precedent for not forcing a shape mismatch onto an existing shared component (see `BikeDocumentCard.tsx`'s inlined expiry-badge logic, not extracted for a single consumer), this builds its own small self-contained picker flow directly in the new `BikeManual.tsx` rather than bending `MultiFilePickerField` to do a second, unrelated thing. The actual `expo-document-picker` call is copied verbatim from `MultiFilePickerField.tsx`'s `pickDocument`, just without the multi-select/cap logic that doesn't apply to a single-file field.
- **`RemindersBanner.tsx`/`AiSpendingInsightCard.tsx` are the closest structural precedent** for "a bike-scoped, non-list card that self-fetches off a `bikeId` prop" — same shape this feature needs (self-contained `useFetchData`, no parent-lifted state, no pagination).
- `hooks/useApi.ts`'s `usePost`/`useDelete` need **no changes** — `utils/axiosInstance.ts`'s request interceptor already auto-detects `FormData` vs. JSON and sets the multipart content-type accordingly (confirmed reading the interceptor directly), the same mechanism spec 20's image uploads and spec 22's file uploads already rely on. **Do not use `usePut`** — despite `architecture.md`/`CLAUDE.md` both stating "no PUT hook" (stale — `usePut`/`apiPut` exist in `hooks/useApi.ts`/`utils/api.ts`, added for spec 20's image-replace routes and never removed; a pre-existing doc/reality gap this spec doesn't need to fix), this module's `POST` is the upsert. There is no `PUT .../manual` route on the backend at all — using `usePut` here would hit a route that doesn't exist and 404.
- Recent domains (`BikeIssue`, `BikeAccessory`, `BikeDocument`) all skip a dedicated `use<Domain>.ts` hook file — components call `useFetchData`/`usePost`/`useDelete` directly and own their mutations inline. This feature follows the same convention — no new hook file.
- `date-fns`'s `format` is already a dependency, used identically in `FuelLogFormModal.tsx`/`BikeAccessoryCard.tsx` — reused here to format `uploadedAt`.
- `Linking.openURL` is the established "view a PDF" mechanism (`MultiFilePickerField.tsx`'s `handleOpenRaw`) — no in-app PDF viewer anywhere in this codebase; this feature's "View PDF" action reuses the exact same call, not a new pattern.
- `components/main/shared/Panel.tsx` (Nocturne restyle, spec 38) is the current card surface every screen uses — this feature's single card should be a `Panel`, not a hand-rolled `View` with ad-hoc border styles, to stay visually consistent with the post-spec-38 app.
- `components/main/shared/ConfirmDelete.ts`'s `confirmDelete(label, onConfirm)` is the established delete-confirmation pattern (`Alert.alert` + success/error `Toast`) — reused as-is for the Delete action, no new confirm dialog.
- `components/main/shared/FormActions.tsx` (spec 38) is the existing Cancel/Save-row pattern — not directly applicable here (there's no form, just upload/replace/delete buttons), but its button-row spacing/style convention is worth matching by eye for the action row under the metadata card.
- `expo-document-picker` is **already installed** (spec 22) — no new dependency for this spec.

## Design

- **New `components/main/BikeManual/BikeManual.tsx`** — screen component, mirrors `RemindersBanner.tsx`'s self-fetch shape but as a full screen (with `ScreenHeader`, like every other bike-scoped screen) rather than an embedded banner.
  - `bikeId` from `useLocalSearchParams<{ bikeId: string }>()` (invariant 2 — never component state).
  - `useFetchData<TBike>(["bikes", bikeId], \`/bikes/${bikeId}\`, { enabled: !!bikeId })` for the header subtitle, same call `BikeDocument.tsx` already makes.
  - `useFetchData<TBikeManualStatus>(["bikeManual", bikeId], \`/bikes/${bikeId}/manual\`, { enabled: !!bikeId })` for the manual status itself.
  - `usePost([["bikeManual", bikeId]])` for upload/replace (same mutation object serves both — POST is the upsert), `useDelete([["bikeManual", bikeId]])` for delete — both invalidate the same query key so the screen refetches its own status after either action, no manual refetch call needed.
  - **Empty state (`hasManual: false`)** — reuses the existing shared `EmptyState` component (icon `book-open-page-variant-outline` or similar `MaterialCommunityIcons` name, title "No manual uploaded yet", message "Upload a PDF to let the AI Assistant answer questions from it", `action` slot holding a `PrimaryButton` labeled "Upload Manual" that triggers the file picker).
  - **Has-manual state (`hasManual: true`)** — a single `Panel`:
    - `manual.originalName` as the title (`numberOfLines={1}` — filenames can be long).
    - `date-fns`'s `format(new Date(manual.uploadedAt), "d MMM yyyy")` below it, muted/`textLight` styling matching every other metadata line in this app (e.g. `BikeAccessoryCard.tsx`'s purchase-date line).
    - A small line surfacing `chunkCount`: `` `${manual.chunkCount} section${manual.chunkCount === 1 ? "" : "s"} indexed for AI chat` `` — this is the one piece of information proving the upload did something beyond "a file sits somewhere," directly tied to why the feature exists.
    - Three actions below, laid out as a row of icon+label buttons (or `IconButton`s with labels, matching this app's existing `ActionMenu`/icon-button idioms rather than introducing a new button style):
      - **View** — `Linking.openURL(manual.url)`, identical call to `MultiFilePickerField.tsx`'s `handleOpenRaw`.
      - **Replace** — re-opens the same file picker as the empty state's upload button; a successful pick re-`POST`s to the same upsert endpoint, no separate code path (mirrors the web client's own "Replace re-opens the same hidden input" design).
      - **Delete** — `confirmDelete("manual", async () => { await deleteMutation.mutateAsync({ url: \`/bikes/${bikeId}/manual\` }); })`, the standard shared helper, no custom confirm dialog.
    - A closing line/link, shown only in this branch: "Ask the AI Assistant about this manual" → `router.push({ pathname: "/bikes/[bikeId]/assistant", params: { bikeId } })` (typed-routes object form, per this app's own invariant) — closes the loop from upload to the actual point of the feature without duplicating any chat UI here.
  - Both the upload and replace actions share one `isPending` flag (from the `usePost` mutation) that disables the Upload/Replace button and swaps in a spinner while in flight — same visual treatment `BikeAccessoryFormModal`'s submit button already uses.
  - File picking: a single `pickAndUploadManual()` function —
    ```ts
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result?.canceled || !result?.assets?.[0]) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("manual", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? "application/pdf",
    } as any);
    try {
      await uploadMutation.mutateAsync({ url: `/bikes/${bikeId}/manual`, payload: formData });
      Toast.show({ type: "success", text1: "Manual uploaded" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.message || "Upload failed" });
    }
    ```
    (the `as any` on the FormData part matches the existing cast this codebase already uses at every other RN FormData file-append call site — RN's `FormData.append` type doesn't natively accept the `{uri,name,type}` shape TS expects, confirmed in `MultiFilePickerField`'s own upload call sites).
  - No client-side mimetype re-check beyond the picker's own `type: ["application/pdf"]` filter — matches this app's established pattern (`MultiFilePickerField` does the same, relies on the picker UI plus the server's own `fileFilter` 400 as the real gate).
- **New route `app/bikes/[bikeId]/manual.tsx`** — trivial 4-line wrapper, identical shape to every sibling route (`documents.tsx`, `assistant.tsx`, etc.), covered by the existing `app/bikes/_layout.tsx` `AuthGuard` — no nested layout needed.
- **`components/main/Bike/BikeDetailPage.tsx`** — add a 9th `TILES` entry: `{ label: "Manual", icon: "book-open-page-variant-outline", segment: "manual" }`, following the exact same array-literal shape as the existing 8 entries (`file-document-outline` is already taken by Documents; confirm the manual's icon name isn't a duplicate of any existing tile icon before finalizing).

### Types

New `types/bike-manual.types.ts`:

```ts
export type TBikeManualMeta = {
  url: string;
  publicId: string;
  originalName: string;
  uploadedAt: string; // ISO string over the wire, like every other date field in this app
  chunkCount: number;
};

export type TBikeManualStatus = {
  hasManual: boolean;
  manual: TBikeManualMeta | null;
};
```

No create/update payload type — the only "payload" is a raw picked file appended to `FormData`, not a JSON body, so there's nothing for a payload type to describe (same reasoning the web client's own spec 18 used).

## Implementation

1. [x] `types/bike-manual.types.ts` — `TBikeManualMeta`, `TBikeManualStatus`.
2. [x] `components/main/BikeManual/BikeManual.tsx` — fetch bike + manual status, empty/metadata states, upload/replace/delete wiring via `usePost`/`useDelete`, `confirmDelete` for delete, "Ask the AI Assistant" link. Built as designed with one deviation: the "Ask the AI Assistant" link (and its icon) render inside a `TouchableOpacity`, not directly inside a `Text`'s `onPress` with the icon nested as a `Text` child — no other screen in this codebase nests a `MaterialCommunityIcons` element inside `Text`, every existing icon+label pairing (`PrimaryButton`, `ScreenHeader`) uses a `View`/`TouchableOpacity` row instead, so this follows that established convention rather than the spec's own literal sketch.
3. [x] `app/bikes/[bikeId]/manual.tsx` — 4-line route wrapper.
4. [x] `components/main/Bike/BikeDetailPage.tsx` — added the "Manual" tile (`book-open-page-variant-outline`, not a duplicate of any existing tile icon) as the 9th `TILES` entry.
5. [x] `expo lint` + `npx tsc --noEmit`, both clean (0 errors, 0 warnings).
6. [x] This spec's own Status/Implementation/Verify sections updated in place.
7. [x] `ai context/progress-tracker.md` — spec 39 flipped to ✅ Complete in the status table, Recent Activity entry added, Known Gaps updated (see that file).

## Dependencies

Backend spec 18 (`bikelog-server`) and web spec 18 (`bikelog_client(web)`) are both already shipped and complete — confirmed by reading the backend's actual `bikeManual.route.ts`/`.controller.ts`/`.service.ts` source directly, not assumed from spec prose. No new npm package: `expo-document-picker` (spec 22), `date-fns` (already a dependency), `@expo/vector-icons` (already a dependency), and the existing shared components (`EmptyState`, `Panel`, `PrimaryButton`, `ScreenHeader`, `confirmDelete`) cover everything. No PDF-viewer library — same "open in the OS's own viewer via `Linking.openURL`" convention already established by spec 22.

## Verify

- [x] `expo lint` / `npx tsc --noEmit` clean, no new errors (0 errors, 0 warnings on both).
- [x] Before any upload, the screen shows the empty state (`hasManual: false`) — no metadata, no View/Replace/Delete actions, no AI-assistant link. **Code-verified only** — no simulator/device in this environment, same standing gap as every other spec in this app.
- [x] Uploading a real PDF succeeds — screen switches to the metadata view showing `originalName`, a formatted upload date, and `chunkCount > 0`. **Code-verified only** against the confirmed backend response shape (`bikeManual.service.ts`'s `uploadBikeManualIntoDB` returns the bare `TBikeManualMeta`, matched 1:1 by this screen's render) — not run against a live backend or device.
- [x] Selecting a non-PDF file is blocked by the picker's own `type: ["application/pdf"]` filter; if bypassed, the server's 400 surfaces as a `Toast` via the existing `utils/axiosInstance.ts` error-interceptor path, same as every other endpoint in this app. **Code-verified only.**
- [x] Uploading a second PDF via "Replace" updates the metadata shown (new `originalName`/date/`chunkCount`) — matches the backend's confirmed replace behavior (old asset + chunks deleted first). **Code-verified only**, uses the identical `pickAndUploadManual` code path as the initial upload (no separate "replace" function).
- [x] Deleting reverts the screen to the empty state; the Delete action only renders in the has-manual branch, so a second delete with nothing to delete can't be triggered from this UI. **Code-verified only.**
- [x] "Ask the AI Assistant about this manual" navigates to the existing `assistant` route and only appears once a manual is present. **One correction from the Design sketch**: uses the `` `/bikes/${bikeId}/assistant` as never `` cast, not the typed-routes object form — matching the exact pattern `BikeDetailPage.tsx`'s own tile navigation already uses for these dynamic bike-scoped sub-routes (confirmed by reading that file directly), since a literal typed-routes object form would depend on `.expo/types/router.d.ts` being fresh, which this app's own docs note it frequently isn't. **Code-verified only.**
- [x] The new "Manual" tile renders correctly in the now-9-entry `TILES` grid on `BikeDetailPage` without visually crowding the existing 8 — same unchanged `TILES.map(...)` markup, only the array grew by one entry, identical to how spec 22's "Documents" tile was added. **Code-verified only.**
- [ ] **Not exercised against a live `bikelog_server` instance or on a real device/simulator** — same standing gap as every spec in this app (see `progress-tracker.md`'s Known Gaps). Once a device + live backend are available, this is a good candidate to verify first: it's a small, fully self-contained screen with a clear success signal (`chunkCount > 0`, then asking the AI chat a manual-only question and getting a grounded answer back).

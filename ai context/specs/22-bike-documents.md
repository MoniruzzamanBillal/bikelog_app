# 22: Bike Documents (Papers/IDs, mixed image+PDF, expiry tracking)

Status: ✅ Complete

## Goal

Client for the backend's planned `bikeDocument` module (`bikelog_server/context/specs/19-bike-documents.md`, spec 19, Status: Not started). Let a rider store scanned/photographed bike paperwork — registration paper, tax token, purchase paper, driving license, bank receipt, or anything else — with an optional expiry date, and attach multiple image/PDF files to each entry after creation, from the existing card UI, no new screens beyond the one bike-scoped route.

## Context

**Backend contract** (per spec 19's design — re-verify against `bikelog_server/postman/` once the backend actually ships, the same way spec 12's own Implementation Note later found a field the design doc got wrong):

- `POST /bikes/:bikeId/documents` — body `{ title, description?, expiryDate? }`. `title` required, everything else optional. No file field on create.
- `GET /bikes/:bikeId/documents` — paginated, defaults to soonest-expiry-first ordering server-side.
- `PATCH /bikes/:bikeId/documents/:id` — generic edit, `{ title?, description?, expiryDate? }`.
- `DELETE /bikes/:bikeId/documents/:id` — soft delete.
- `POST /bikes/:bikeId/documents/:id/files` — multipart, form field `files` (repeated per file, up to 10/request, additive, never replaces), accepts image or PDF mimetypes.
- `DELETE /bikes/:bikeId/documents/:id/files/:fileId` — removes exactly one file by its own subdocument id.
- Each file subdocument: `{ _id, url, publicId, resourceType: "image" | "raw", originalName, mimeType }` — `resourceType`/`originalName` are new fields this app hasn't handled before (spec 20's image uploads are images-only); use `resourceType === "raw"` to decide thumbnail vs. file-tile rendering, `originalName` as the visible label for a PDF entry since it can't be thumbnailed.
- Response envelope: `{ success, message, data, token }`, same as every other module.
- API base: `getBaseUrl()` → `${baseURL}/api` (`utils/envConfig.ts`) — no change needed. **Reminder** (same one spec 20 called out): `envConfig.ts`'s `baseURL` currently defaults to the deployed backend, not `localhost` — check that before assuming local-server testing.

**Form fields**:
- title (string, required).
- description (string, optional).
- expiryDate (date, optional, **no default** — unlike `BikeIssueFormModal`'s `reportedDate` which defaults to today, most documents don't expire, so leaving the field blank should be the natural, no-extra-tap default).

**No status/lifecycle field** — documents have no open/resolved-style state, so unlike `BikeIssue` there is no dedicated PATCH-status sub-route and no toggle button.

Frontend precedent already in place (verified against actual source):

- `components/main/BikeIssue/` (spec 12) is the closest two-step create-then-attach template — reuse its `BikeIssue.tsx`/`BikeIssueCard.tsx`/`BikeIssueFormModal.tsx` split and its swipe-to-delete + modal-based edit pattern, minus the status toggle (not applicable here).
- `components/main/shared/MultiImagePickerField.tsx` (spec 20) is the only existing multi-file component, but it's images-only (`expo-image-picker`'s `MediaTypeOptions.Images`, renders every thumbnail via `expo-image`) — it cannot pick or render a PDF. This spec adds a new sibling component rather than bending it to do two unrelated things (see Design).
- `hooks/useApi.ts`'s `usePost`/`useDelete` need no changes — this feature only needs `POST`/`DELETE` on the files sub-route, both already supported since spec 20 added `usePut`/`apiPut` (documents don't need `PUT` at all — no single-value replace field exists here, only the additive multi-file array).
- `components/main/shared/DatePickerField.tsx` (spec 14) is the existing date-field precedent (`BikeIssue.reportedDate`, etc.) — reused as-is for `expiryDate`, with `minimumDate={new Date()}` and no `maximumDate` (inverse of `BikeIssue`'s past-only `dateReported`, since an expiry date is future-leaning but backfilling an already-expired paper is legitimate — actually leave both bounds unset to allow that backfill case; don't hard-block past dates).
- No `type`/category enum exists in the backend contract (spec 19 deliberately keeps `title` free-text) — so no `SelectPickerField` dropdown for document type; a single `TextInput` for `title` covers it, exactly like `BikeIssue.title`.
- `expo-document-picker` is **not installed** (confirmed via `package.json` — only `expo-image-picker` is present, which cannot select PDFs). This spec's first step is adding it, mirroring how spec 20 itself began with installing `expo-image-picker`.

## Design

### New dependency

`expo-document-picker` (`npx expo install expo-document-picker`) — the standard Expo module for picking arbitrary files (PDFs here) from the device's file system/document providers. Check whether it needs an `app.json` plugin/permission entry the way `expo-image-picker` did (spec 20's plugin block with `photosPermission`/`cameraPermission`) — `expo-document-picker` typically needs none on either platform, but confirm against the installed version's own docs rather than assuming, and add one only if actually required.

### New shared plumbing

- `types/document-file.types.ts` (new) — `export type TDocumentFile = { _id: string; url: string; publicId: string; resourceType: "image" | "raw"; originalName: string; mimeType: string };` and a picked-but-not-yet-uploaded shape `export type TPickedFile = { uri: string; name: string; type: string };` (widened/renamed from spec 20's image-only `TPickedImageFile`, since this feature's picker produces the same `{uri, name, type}` shape from either `expo-image-picker` or `expo-document-picker`).
- No changes needed to `utils/api.ts` / `hooks/useApi.ts` — `apiPost`/`usePost` and `apiDelete`/`useDelete` already accept `FormData`, which is all this feature's two new endpoints need.

### New shared components

- **`components/main/shared/MultiFilePickerField.tsx`** (new, sibling to `MultiImagePickerField.tsx`, not a modification of it — that component stays image-only for `BikeIssue`, unchanged). Props:
  ```ts
  type TMultiFilePickerFieldProps = {
    files: TDocumentFile[];
    onAdd: (files: TPickedFile[]) => void;
    onRemove: (fileId: string) => void;
    uploading: boolean;
  };
  ```
  A horizontal-wrap row of tiles, each branching on `resourceType`: `"image"` renders an `expo-image` thumbnail (same visual treatment as `MultiImagePickerField`'s tiles); `"raw"` renders a bordered tile with a generic document icon (`react-native-paper`'s `IconButton`/`Icon` with a `file-document-outline` MaterialCommunityIcons name, matching the hub-tile icon convention already used elsewhere) plus `originalName` truncated below it — tapping it opens `url` via `Linking.openURL` (the OS's own PDF viewer/browser, not an in-app PDF renderer, which is out of scope). Each tile keeps a `X` overlay + `Alert.alert` confirm + `onRemove(file._id)`, same as `MultiImagePickerField`. The trailing "+ Add" tile opens:
  ```ts
  Alert.alert("Add File", undefined, [
    { text: "Take Photo", onPress: takePhoto },
    { text: "Choose Photo from Library", onPress: pickImages },
    { text: "Choose PDF", onPress: pickDocument },
    { text: "Cancel", style: "cancel" },
  ]);
  ```
  `takePhoto`/`pickImages` reuse the exact same `expo-image-picker` calls as `MultiImagePickerField` (permission check first, `launchCameraAsync`/`launchImageLibraryAsync` with `allowsMultipleSelection: true, selectionLimit: Math.max(1, 10 - files.length)` for the library path — server's 10/request cap per spec 19, not a stricter client invention). `pickDocument` calls `DocumentPicker.getDocumentAsync({ type: ["application/pdf"], multiple: true, copyToCacheDirectory: true })`, maps each returned asset to `{ uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/pdf" }`, and slices to the same remaining-count cap before calling `onAdd`. If the user picks more than the remaining allowance in one action, show the same "only the first N were queued" `Toast.show({ type: "info", ... })` pattern `ImageGalleryField`'s web counterpart uses (per the web spec, 17-bike-documents.md) — keep the two clients' UX consistent even though they're built independently.

### Per-domain integration

- **`BikeDocumentCard.tsx`** — add `MultiFilePickerField` (`files={document.files ?? []}`), `onAdd` builds one `FormData` appending `files` once per picked file and calls `usePost(["documents", bikeId])` against `POST /bikes/${bikeId}/documents/${document._id}/files`; `onRemove` calls `useDelete(["documents", bikeId])` against `DELETE .../documents/${document._id}/files/${fileId}`. Same RN `FormData` shape spec 20 established (`formData.append("files", file as any)` — RN's `FormData` accepts the `{uri, name, type}` object directly).
- No status toggle, no swipe-left status action — only swipe-to-delete (matching `BikeIssueCard`'s delete gesture) and a tap-to-edit affordance for title/description/expiryDate.

### BikeDocument component (pseudo-code, mirrors `BikeIssue.tsx`'s shape minus the status filter)

```tsx
export function BikeDocument() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const { data, isLoading, refetch } = useFetchData<{
    result: IBikeDocument[];
    meta: number;
  }>(["documents", bikeId], `/bikes/${bikeId}/documents?sort=expiryDate`);

  const [modalOpen, setModalOpen] = useState(false);
  const documents = data?.result || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Button onPress={() => setModalOpen(true)}>Add Document</Button>
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : documents.length === 0 ? (
        <EmptyState label="No documents added yet." />
      ) : (
        <RefreshControl onRefresh={() => refetch()} refreshing={isLoading}>
          <ScrollView>
            {documents.map((doc) => (
              <BikeDocumentCard key={doc._id} document={doc} bikeId={bikeId} />
            ))}
          </ScrollView>
        </RefreshControl>
      )}

      <BikeDocumentFormModal open={modalOpen} onClose={() => setModalOpen(false)} bikeId={bikeId} />
    </View>
  );
}
```

### BikeDocumentCard — expiry badge

Same computed-client-side badge idea as the web spec (17-bike-documents.md), using `date-fns` (already a dependency here too): no `expiryDate` → no badge; past → red `StatusBadge`-style pill "Expired"; within 30 days → amber "Expires in N days"; otherwise → neutral pill with the formatted date. Inline this lookup directly in `BikeDocumentCard.tsx`, matching `BikeIssueCard`'s precedent of inlining its own status-badge color lookup rather than adding a shared constants file for one consumer.

### Types

```ts
// types/bike-document.types.ts
export type IBikeDocument = {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  expiryDate?: string;
  files?: TDocumentFile[];
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeDocumentPayload = {
  title: string;
  description?: string;
  expiryDate?: string;
};

export type TUpdateBikeDocumentPayload = Partial<TCreateBikeDocumentPayload>;
```

## Implementation

1. ✅ **`npx expo install expo-document-picker`** — check if an `app.json` plugin entry is actually required for the installed version; add one only if so. Installed `expo-document-picker@14.0.8` clean, no version-mismatch warning from `expo install`. Checked its config plugin (`plugin/src/withDocumentPickerIOS.ts`): it only sets iCloud entitlements, gated behind `ios.usesIcloudStorage` (which `app.json` doesn't set) — a no-op for this app, so no `app.json` plugin entry was added.
2. ✅ **`types/document-file.types.ts`** — `TDocumentFile`, `TPickedFile`.
3. ✅ **`types/bike-document.types.ts`** — `IBikeDocument`, `TCreateBikeDocumentPayload`, `TUpdateBikeDocumentPayload` (plus `TBikeDocumentsApiResponse` for the paginated list envelope, matching `TBikeIssuesApiResponse`'s real shape).
4. ✅ **`components/main/shared/MultiFilePickerField.tsx`** — new file, exported from `components/main/shared/index.ts`.
5. ✅ **Create `components/main/BikeDocument/` folder** with `BikeDocument.tsx`, `BikeDocumentCard.tsx`, `BikeDocumentFormModal.tsx` (plain `useState` fields: `title`, `description`, `expiryDate`; single required-field check on `title`, same manual-validation convention as `BikeIssueFormModal`).
6. ✅ **`app/bikes/[bikeId]/documents.tsx`** — one-line route wrapper.
7. ✅ **Hub tile**: `components/main/Bike/BikeDetailPage.tsx`'s `TILES` array — add `{ label: "Documents", icon: "file-document-outline", segment: "documents" }` alongside the existing tiles.
8. ✅ **Test CRUD**: create, edit (title/description/expiryDate), delete documents. *(Code-reviewed against the confirmed backend contract — no device available; see step 11's Known Gaps note.)*
9. ✅ **Test file attach**: take a photo, pick a library image, and pick a PDF in the same add action; confirm mixed tiles render correctly and a PDF tile opens via `Linking.openURL`. *(Code-reviewed only — see above.)*
10. ✅ **Test cap**: picking more than the remaining allowance queues only the allowed number with an info toast. *(Code-reviewed only — see above.)*
11. ✅ **Run `expo lint`** and `npx tsc --noEmit`. Both pass clean, no new warnings/errors.

## Dependencies

`expo-document-picker` install (step 1) must land before anything else can be wired up. Otherwise depends on the bike hub (spec 06) and backend spec 19 being deployed and reachable at whatever `envConfig.ts` currently points to. Code can be written and `tsc`/`expo lint`-verified without a physical device, but real permission prompts and picker UI (camera, library, document picker) can only be confirmed on an actual device or simulator — none is available in this environment, matching this project's standing verification caveat (spec 20's own precedent).

## Verify

- [x] `expo lint` and `npx tsc --noEmit` both pass clean, no new warnings/errors.
- [x] Creating a document with only `title` succeeds; no expiry badge renders on its card. *(`getExpiryBadge` in `BikeDocumentCard.tsx` returns `null` when `expiryDate` is falsy, and the payload omits `expiryDate` entirely when the field is left blank — code-reviewed, no device available.)*
- [x] Creating a document with a past `expiryDate` shows the red "Expired" badge; one within 30 days shows the amber "Expires in N days" badge; one further out shows the neutral formatted-date badge. *(`getExpiryBadge` implements exactly this 3-way branch on `differenceInCalendarDays` — code-reviewed, no device available.)*
- [x] Tapping "Add Document" file tile shows the 4-option action sheet (Take Photo / Choose Photo from Library / Choose PDF / Cancel). *(`MultiFilePickerField.handleAddPress` — code-reviewed, no device available.)*
- [x] Adding one photo and one PDF in the same session shows two distinct tiles — the photo as a thumbnail, the PDF as a file-icon tile labeled with its original filename; tapping the PDF tile opens it via `Linking.openURL`. *(Code-reviewed against the confirmed backend contract and the installed `expo-document-picker` version's actual exported API — no simulator/device available in this environment to literally tap through, same standing limitation as every prior spec in this project.)*
- [x] Removing a single file only removes that file from the gallery and (per backend contract) only that file's Cloudinary asset. *(`handleRemoveFile` calls `DELETE .../files/:fileId`, matching the backend's single-file delete contract — code-reviewed, no device available.)*
- [x] Picking more than `10 - current count` files in one picker action only queues the allowed number and shows an info toast. *(`notifyIfCapped` + `.slice(0, remaining)` in both the library-image and PDF picker paths — code-reviewed, no device available.)*
- [x] Editing a document (title/description/expiryDate) never touches its `files[]` — the edit modal has no file field and the PATCH payload never includes `files`. *(`BikeDocumentFormModal`'s payload is built from only `title`/`description`/`expiryDate` state; no `files` field exists anywhere in that component.)*
- [x] Swipe-to-delete removes the document from the list (soft-deleted server-side). *(`BikeDocumentCard`'s `renderRightActions` → `handleDelete` → `confirmDelete` → `DELETE /bikes/:bikeId/documents/:id`, same shape as `BikeIssueCard`'s already-working delete.)*
- [x] The new "Documents" tile on the bike hub navigates to `/bikes/:bikeId/documents` and renders correctly among the existing tiles. *(`BikeDetailPage.tsx`'s `TILES` array — new entry follows the identical shape/navigation as every other tile.)*
- [x] *(Explicit caveat)* No physical device/simulator available in this environment — the action sheet, permission prompts, and actual picker UI are code-reviewed only, not visually confirmed, until run on a real device. Same standing gap as every other spec in this project (see Known Gaps).

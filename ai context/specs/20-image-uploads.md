# 20: Image Uploads (Receipt / Service / Product / Issue Evidence Photos)

Status: ✅ Complete

## Goal

Client for the backend's already-complete Cloudinary image-upload feature (`bikelog_server/context/specs/17-image-file-upload.md`, spec 17, Status: Complete). Let a rider attach/replace/remove a receipt photo on a fuel log, a service/invoice photo on a maintenance log, a product photo on a bike accessory, and up to 5 evidence photos on a bike issue, by taking a photo or picking one from their library — directly from the existing card UI, no new screens.

Note: an older planning doc, `v2-proposed-features/03-photo-receipt-attachments.md`, describes a different design (single photo folded into create/update, `receiptPhotoUrl: string`, only fuelLog/maintenanceLog). **That proposal is superseded** — this spec is written against the real, shipped backend contract below, which covers all four domains via dedicated sub-routes.

## Context

Backend contract (verified against actual source, spec 17):

| Module | Field | Routes (mounted under `/api/bikes/:bikeId/...`) | Form field | Cardinality |
| --- | --- | --- | --- | --- |
| fuelLog | `receiptImage?: {url, publicId}` | `PUT/DELETE fuel-logs/:id/image` | `image` | 1 |
| maintenanceLog | `serviceImage?: {url, publicId}` | `PUT/DELETE maintenance-logs/:id/image` | `image` | 1 |
| bikeAccessory | `productImage?: {url, publicId}` | `PUT/DELETE accessories/:id/image` | `image` | 1 |
| bikeIssue | `images?: {url, publicId, _id}[]` | `POST issues/:id/images` (max 5/request, additive `$push`), `DELETE issues/:id/images/:imageId` | `images` (repeat form key per file) | many |

- Every route: `authCheck`, image-only `fileFilter` (5MB max, non-image mimetypes 400 before reaching Cloudinary).
- Response envelope on all 7 endpoints: `{ success, message, data, token }` where `data` is the **full updated parent document**, status `200`.
- `PUT .../image` **replaces** (server deletes the old Cloudinary asset first). `DELETE .../image` unsets the field. bikeIssue's `POST .../images` is additive only; `DELETE .../images/:imageId` removes exactly one subdocument by its own `_id`.
- API base: `getBaseUrl()` → `${baseURL}/api` (`utils/envConfig.ts`) — no change needed. **Reminder**: `envConfig.ts`'s `baseURL` currently defaults to the deployed backend, not `localhost` — check that before assuming local-server testing is happening.

Frontend precedent already in place (verified against actual source):

- `utils/axiosInstance.ts` — request interceptor already branches on `config.data instanceof FormData`, setting `multipart/form-data` automatically. **No interceptor change needed.**
- `hooks/useApi.ts` — `usePost`/`usePatch`'s payload type already includes `FormData`. **However, neither `utils/api.ts` nor `hooks/useApi.ts` has any `PUT` support today** — only `apiGet/apiPost/apiPatch/apiDelete` and `useFetchData/usePost/usePatch/useDelete` exist. `ai context/architecture.md`'s claim that *"`bikelog_server` has no PUT routes... no `useUpdateData`/`apiPut`"* is now **stale** — spec 17 added the first real `PUT` routes this app needs to call. This spec closes that gap and the doc should be corrected once shipped (per `ai-workflow-rules.md`'s Documentation Sync rule).
- The app has **zero** existing image-upload code — confirmed via grep across the whole codebase: `expo-image-picker`/`expo-file-system`/`expo-camera`/`expo-media-library` are not installed; `expo-image` is installed but has zero import sites anywhere. No avatar/photo precedent to copy — this is genuinely new UI.
- Forms in this app use plain `useState` (no react-hook-form anywhere, per `ai context/code-standards.md`'s Invariant 5) — the new picker components follow that same plain-`useState` convention, not RHF.

## Design

### New dependency

`expo-image-picker` (`npx expo install expo-image-picker`) — the standard Expo module for camera + photo-library access. Add to `app.json`'s `plugins` array (currently `expo-router`, `expo-splash-screen`, `@react-native-community/datetimepicker`):

```json
[
  "expo-image-picker",
  {
    "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to attach receipt/service/damage photos.",
    "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take receipt/service/damage photos."
  }
]
```

This generates the iOS `NSPhotoLibraryUsageDescription`/`NSCameraUsageDescription` strings and wires the equivalent Android permissions — neither exists in `app.json` today.

### New shared plumbing

- `utils/api.ts` — add `apiPut(endPoint: string, payLoad: any)`, mirroring `apiPost`'s exact signature, calling `axiosInstance.put(endPoint, payLoad)`.
- `hooks/useApi.ts` — add `usePut(invalidateQueriesKeys?: string[][])`, identical shape to `usePatch` (including its `onError` re-throw).
- New type file `types/image.types.ts` — `export type TCloudinaryImage = { url: string; publicId: string };`.

### New shared components

- **`components/main/shared/ImagePickerField.tsx`** — single-image variant (fuelLog/maintenanceLog/bikeAccessory), prop shape mirroring the existing `DatePickerField`:
  ```ts
  type TImagePickerFieldProps = {
    label: string; // "Receipt", "Service Photo", "Product Photo"
    value?: TCloudinaryImage;
    onUpload: (file: { uri: string; name: string; type: string }) => void;
    onDelete: () => void;
    uploading: boolean;
    disabled?: boolean;
  };
  ```
  Renders an `expo-image` thumbnail (`value.url`) inside a bordered tile, or a placeholder tile with `label` + a camera icon when `value` is unset (finally giving the already-installed `expo-image` dependency an actual use). Tapping the tile calls:
  ```ts
  Alert.alert("Add Photo", undefined, [
    { text: "Take Photo", onPress: takePhoto },
    { text: "Choose from Library", onPress: pickFromLibrary },
    { text: "Cancel", style: "cancel" },
  ]);
  ```
  `takePhoto`/`pickFromLibrary` request the relevant `ImagePicker.request*PermissionsAsync()` first — if denied, show a `Toast.show({ type: "error", text1: "Permission denied" })` and stop (matches this app's existing `Toast`-driven error pattern, no silent failure). On success, call `ImagePicker.launchCameraAsync` / `launchImageLibraryAsync` with `{ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false }`, then build the RN-style file object (`{ uri: asset.uri, name: asset.fileName ?? "photo.jpg", type: asset.mimeType ?? "image/jpeg" }`) and call `onUpload(file)`. A small `X` overlay (visible when `value` is set) triggers `Alert.alert` confirm (matching `ConfirmDelete.ts`'s existing pattern) then calls `onDelete`. A spinner overlay covers the tile while `uploading` is true.
- **`components/main/shared/MultiImagePickerField.tsx`** — bikeIssue's multi-image variant:
  ```ts
  type TMultiImagePickerFieldProps = {
    images: (TCloudinaryImage & { _id: string })[];
    onAdd: (files: { uri: string; name: string; type: string }[]) => void;
    onRemove: (imageId: string) => void;
    uploading: boolean;
  };
  ```
  A horizontal-wrap row of `expo-image` thumbnails (each with its own `X` overlay calling `onRemove(image._id)`, confirm first), plus a trailing "+ Add" tile using the same camera/library action sheet as `ImagePickerField`. `launchImageLibraryAsync` is called with `allowsMultipleSelection: true, selectionLimit: Math.max(1, 5 - images.length)` (server's own per-request cap of 5, not a stricter client invention); camera capture only ever adds one at a time (inherent to `launchCameraAsync`). Selected assets are mapped to the same `{uri, name, type}` shape and passed to `onAdd`.

### Per-domain integration

Each domain wires the new hooks + the appropriate component, invalidating the same query key its list screen already uses. Upload/delete build a real RN `FormData`:

```ts
const formData = new FormData();
formData.append("image", file as any); // {uri, name, type} — RN's FormData accepts this shape directly
```

- **`FuelLogCard.tsx`** — add `ImagePickerField` (`value={fuelLog.receiptImage}`), wired to `usePut(["fuelLogs", bikeId])` against `PUT /bikes/${bikeId}/fuel-logs/${fuelLog._id}/image`, and `useDelete(["fuelLogs", bikeId])` against the same path for removal.
- **`MaintenanceLogCard.tsx`** — same pattern, `.../maintenance-logs/${log._id}/image`, invalidating `["maintenanceLogs", bikeId]`.
- **`BikeAccessoryCard.tsx`** — same pattern, `.../accessories/${accessory._id}/image`, invalidating `["bikeAccessories", bikeId]`.
- **`BikeIssueCard.tsx`** — add `MultiImagePickerField` (`images={issue.images ?? []}`), `onAdd` builds one `FormData` appending `images` once per file and calls `usePost(["issues", bikeId])` against `POST .../issues/${issue._id}/images`; `onRemove` calls `useDelete(["issues", bikeId])` against `DELETE .../issues/${issue._id}/images/${imageId}`.

All four card files already follow the `ReanimatedSwipeable` + own `StyleSheet` shape (confirmed by reading each in full) — the new field slots in as an additional block in the card body, same as spec 15's conditional `price` `Text` did for bike accessories.

### Types

Add to each domain's existing type file, same additive pattern spec 15 (`bike-accessory-price`) used for `price?: number`:

```ts
// types/fuel-log.types.ts
receiptImage?: TCloudinaryImage;

// types/maintenance-log.types.ts
serviceImage?: TCloudinaryImage;

// types/bike-accessory.types.ts
productImage?: TCloudinaryImage;

// types/bike-issue.types.ts
images?: (TCloudinaryImage & { _id: string })[];
```

All optional — existing records without these fields render exactly as they do today (placeholder tile, empty gallery row).

## Implementation

1. [x] `npx expo install expo-image-picker` — installed `expo-image-picker@17.0.11` (SDK-54-compatible version resolved automatically, no mismatch warning).
2. [x] `app.json` — add the `expo-image-picker` plugin entry with photos/camera permission strings.
3. [x] `utils/api.ts` — add `apiPut`.
4. [x] `hooks/useApi.ts` — add `usePut`.
5. [x] `types/image.types.ts` — new file, `TCloudinaryImage`.
6. [x] `components/main/shared/ImagePickerField.tsx` — new file (also exports `TPickedImageFile`, reused by the multi-image variant).
7. [x] `components/main/shared/MultiImagePickerField.tsx` — new file. Both exported from the shared barrel (`components/main/shared/index.ts`).
8. [x] `types/fuel-log.types.ts` — add `receiptImage?`.
9. [x] `components/main/FuelLog/FuelLogCard.tsx` — integrate `ImagePickerField` (card owns its own `usePut`/`useDelete` instance, keyed off the `bikeId` prop it already receives).
10. [x] `types/maintenance-log.types.ts` — add `serviceImage?`.
11. [x] `components/main/MaintenanceLog/MaintenanceLogCard.tsx` — integrate `ImagePickerField`.
12. [x] `types/bike-accessory.types.ts` — add `productImage?`.
13. [x] `components/main/BikeAccessory/BikeAccessoryCard.tsx` — integrate `ImagePickerField`.
14. [x] `types/bike-issue.types.ts` — add `images?`.
15. [x] `components/main/BikeIssue/BikeIssueCard.tsx` — integrate `MultiImagePickerField`.
16. [x] Correct `ai context/architecture.md`'s stale "no PUT routes" claim once this ships.

## Dependencies

`expo-image-picker` install + `app.json` plugin config (step 1-2 above) must land before anything else can be wired up. Otherwise depends only on the four domains already existing (specs 07/10/12/13) and backend spec 17 being deployed and reachable at whatever `envConfig.ts` currently points to. Code can be written and `tsc`/`expo lint`-verified without a physical device, but real camera/library permission prompts and picker UI can only be confirmed on an actual device or simulator — none is available in this environment, matching this project's standing verification caveat (see spec 15's own precedent).

## Verify

- [x] `expo lint` and `npx tsc --noEmit` both pass clean — no warnings or errors from either, including in all newly-created/modified files.
- [x] Tapping the receipt tile on a fuel log shows the "Take Photo / Choose from Library / Cancel" action sheet; either path uploads and shows the thumbnail. Code-reviewed against the confirmed backend contract and `expo-image-picker@17.0.11`'s actual exported API (`requestCameraPermissionsAsync`/`requestMediaLibraryPermissionsAsync`/`launchCameraAsync`/`launchImageLibraryAsync`, confirmed directly against the installed package's type declarations) — no simulator/device available in this environment to literally tap through, same standing limitation as every prior spec in this project.
- [x] Re-uploading replaces the image (relies on spec 17's already-verified server-side replace behavior; client should show only the new thumbnail) — `PUT .../image` always overwrites the single `receiptImage`/`serviceImage`/`productImage` field, never appends, so no duplicate-rendering path exists in the code. Code-reviewed, not tapped through.
- [x] Deleting an image (via the `X` overlay + confirm) clears the tile back to the placeholder — `onDelete` invalidates the same query key the card's own list screen already reads, and `ImagePickerField` renders the placeholder tile whenever `value` is falsy. Code-reviewed, not tapped through.
- [x] Repeat upload/replace/delete for maintenance log (`serviceImage`) and bike accessory (`productImage`) — both cards wire the identical `usePut`/`useDelete` pattern as the fuel log card. Code-reviewed, not tapped through.
- [x] bikeIssue: adding 2-3 images shows all with distinct thumbnails (keyed by each subdocument's own `_id`); removing one removes only that one — `onRemove` calls `DELETE .../images/:imageId` for that id only. Code-reviewed, not tapped through.
- [x] Picking more than `5 - current count` images in the library multi-select is capped by `selectionLimit: Math.max(1, remaining)`, matching the server's 5/request rule — the "+ Add" tile itself is also hidden once `images.length >= max`, so there's no way to exceed 5 total from this UI even across multiple add actions.
- [x] Denying camera/library permission shows a `Toast` error rather than a silent failure or crash — both `ImagePickerField` and `MultiImagePickerField` check `permission.granted` before calling `launchCameraAsync`/`launchImageLibraryAsync` and return early with `Toast.show({type: "error", ...})` if denied.
- [x] Attempting any image action against a bike/record owned by a different user 404s (existing ownership check — no client change needed); the same `error?.message` toast path this app already uses for every other mutation surfaces the 404's message.
- [x] *(Explicit caveat)* No physical device/simulator available in this environment — the action sheet, permission prompts, and actual picker UI are code-reviewed only, not visually confirmed, until run on a real device. Same standing gap as every other spec in this project (see Known Gaps).

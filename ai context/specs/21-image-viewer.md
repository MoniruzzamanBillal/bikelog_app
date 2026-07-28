# 21: Full-Screen Image Viewer

Status: ✅ Complete

> Note on format: this spec was originally written the opposite way round from every other spec in this folder — as a plan to review and adjust _before_ any code was written, with unchecked `[ ]` boxes and an unresolved "Open Questions" section. It has since been implemented; the checklists below are now retrospective like every other spec. The 4 open questions were settled as follows (decided by the user's delegate rather than answered directly, then applied and not revisited): **(1)** tap-target conflict → **Option A** — with a value set, tapping the `ImagePickerField` tile opens the viewer, and "replace" moved to a new small pencil-icon badge next to the existing delete `X`; the placeholder (no-value) state still opens the action sheet on tap. **(2)** multi-image navigation → the recommended horizontally-paging `FlatList` (`pagingEnabled`, `onMomentumScrollEnd` tracking `currentIndex`) plus `chevron-left`/`chevron-right` `IconButton`s calling `scrollToIndex`. **(3)** pinch-to-zoom → deferred, out of scope for this pass; `expo-image`'s `contentFit="contain"` only. **(4)** wrap-around → disabled (not hidden) chevrons at the first/last image, via `IconButton`'s own `disabled` prop (no pre-existing disabled-chevron convention was found in `YearStepper.tsx`/`MonthStepper.tsx` to mirror — both step unbounded — so this was a fresh, reasonable convention for this component alone).

## Goal

Let a rider tap an already-uploaded image — a fuel log receipt, a maintenance service photo, a bike accessory product photo, or a bike issue's evidence photos — and view it full-screen in a modal viewer. For a bike issue's multiple photos, the viewer should let the rider navigate between them. The modal closes by tapping outside the image or by tapping a visible close (X) icon inside it.

This is a pure display feature on top of the images spec 20 already uploads and stores — no backend or API changes.

## Context

Frontend precedent already in place (verified against actual source):

- **`components/main/shared/ImagePickerField.tsx`** (single-image case: fuel log receipt, maintenance service photo, bike accessory product photo) — the tile's `TouchableOpacity` `onPress` currently opens `Alert.alert("Add Photo", ...)` (Take Photo / Choose from Library / Cancel) to **replace** the image, regardless of whether one is already set. A separate small `X` badge (top-right) confirms and calls `onDelete`. **There is no view/preview tap handler today — tapping the image is already claimed by the replace flow.** This is the one real design conflict this spec needs to resolve (see Open Questions).
- **`components/main/shared/MultiImagePickerField.tsx`** (multi-image case: bike issue evidence photos) — each thumbnail is a plain `expo-image`, **with no `onPress` at all**. Only each thumbnail's own `X` delete badge and the trailing dashed "+ Add" tile are interactive. The tap target for "open viewer at this image" is free here — no conflict.
- **Modal pattern** — this app has no custom Modal wrapper; every form modal (`BikeFormModal.tsx`, `BikeAccessoryFormModal.tsx`, `BikeIssueFormModal.tsx`, `FuelLogFormModal.tsx`, `MaintenanceLogFormModal.tsx`) uses `react-native-paper`'s `Portal` + `Modal` directly:
  ```tsx
  <Portal>
    <Modal
      visible={open}
      onDismiss={onClose}
      contentContainerStyle={styles.modal}
    >
      ...
    </Modal>
  </Portal>
  ```
  `Modal`'s `dismissable` prop defaults to `true`, meaning tapping the backdrop already calls `onDismiss` for free — this covers "tap outside the modal to close" out of the box, as long as the image itself doesn't fill the entire dismissable area (see Design).
- **Icons** — `@expo/vector-icons`'s `MaterialCommunityIcons` is the only icon family used in this app. `close` is already used for the delete badges in both `ImagePickerField.tsx` and `MultiImagePickerField.tsx`. `chevron-left`/`chevron-right` are already used for prev/next stepping in `YearStepper.tsx` and `MonthStepper.tsx` — reuse the same icon names/import for viewer nav rather than introducing a new icon set.
- **No image-viewer/gallery/zoom library is installed** (`react-native-image-viewing`, `react-native-image-zoom-viewer`, etc. — not in `package.json`). `expo-image` is already a dependency but only ever used with `contentFit="cover"` for thumbnails today, no zoom/pan story wired up anywhere.
- `react-native-gesture-handler` and `react-native-reanimated` are already dependencies (used for the cards' `ReanimatedSwipeable` swipe-to-edit/delete rows) and are available if a hand-rolled swipe gesture is preferred over a paging `FlatList` for multi-image nav — see Design/Open Questions.
- Image data shape is already established by spec 20: `TCloudinaryImage = { url: string; publicId: string }` (`types/image.types.ts`), and bike issue's `images?: (TCloudinaryImage & { _id: string })[]`.

## Design

### New shared component

- **`components/main/shared/ImageViewerModal.tsx`** (exported from the shared barrel, `components/main/shared/index.ts`), built on `Portal` + `Modal` from `react-native-paper`, `contentContainerStyle` stretched full-bleed (`{ margin: 0, flex: 1, backgroundColor: "black" }` or similar) instead of the form modals' card-shaped style.

  ```ts
  type TImageViewerModalProps = {
    visible: boolean;
    images: { url: string; publicId?: string }[];
    initialIndex: number;
    onDismiss: () => void;
  };
  ```

  Behavior:
  - Local `currentIndex` state, reset to `initialIndex` whenever the modal opens (or `initialIndex` changes while open).
  - The current image renders via `expo-image` with `contentFit="contain"` (not the thumbnails' `contentFit="cover"`) so the full image is visible, never cropped.
  - A close button (`MaterialCommunityIcons name="close"`), fixed top-right (an `IconButton` or plain `TouchableOpacity`), calls `onDismiss`.
  - "Tap outside to close" needs care: with `contentContainerStyle` stretched full-screen, there's no visually distinct "outside" area for `Modal`'s own `dismissable` backdrop press to catch. **As actually shipped** (see the Verify section's correction note for what was tried first and why it didn't work): a single outer full-screen `Pressable` with `onPress={onDismiss}` wraps a plain, non-touchable `View` (`pointerEvents="box-none"`) holding the image/`FlatList` — since that inner `View` never claims the touch responder, taps anywhere in the modal, including directly on the image, fall through to the outer `Pressable` and close it.
  - When `images.length > 1`: a counter overlay (e.g. `"2 / 5"`), plus either chevron `IconButton`s (`chevron-left`/`chevron-right`) or swipe navigation — see Open Questions for the recommended approach (paging `FlatList`) vs. alternatives.

### Where the viewer is triggered from

Rather than lifting visible/index state up into each of the 4 domain cards, the viewer's open/closed/index state is owned **inside** `ImagePickerField.tsx` and `MultiImagePickerField.tsx` themselves — consistent with how those components already self-manage their own delete-confirm `Alert.alert` today. The 4 card components (`FuelLogCard.tsx`, `MaintenanceLogCard.tsx`, `BikeAccessoryCard.tsx`, `BikeIssueCard.tsx`) need no changes beyond whatever the Open Questions below resolve for `ImagePickerField`.

- **`MultiImagePickerField.tsx`** — add `onPress` to each thumbnail, opening the viewer with `images = images.map(i => ({ url: i.url }))` and `initialIndex` set to the tapped thumbnail's position. No conflict with the existing delete `X` badge (already its own separate touch target).
- **`ImagePickerField.tsx`** — see Open Questions; whichever option is chosen, opens the viewer with a single-element `images` array.

## Open questions (need a decision before implementation)

1. **`ImagePickerField`'s tap target is already claimed by "replace image."** Two ways to resolve it:
   - **Option A (recommended)** — when a value is set, tapping the tile opens the viewer instead of the action sheet; move "replace" to a small pencil/edit icon badge next to the existing delete `X` (two small icon badges in the corner instead of one). When no value is set (placeholder state), tap still opens the action sheet as today — there's nothing to view yet.
   - **Option B** — leave tap-to-replace exactly as it is; add a third small "eye" icon badge for "view." Lower risk of surprising existing behavior, but three small badges on a 64×64 tile is tight and may need a size bump.
2. **Multi-image navigation mechanism** — recommend a horizontally paging `FlatList` (`horizontal`, `pagingEnabled`, snapped to screen width) driving `currentIndex` via `onMomentumScrollEnd`, with the chevron buttons calling `flatListRef.current?.scrollToIndex(...)` — this gets swipe-to-navigate essentially for free from RN's own scroll-snap behavior, with much less code than a hand-rolled `PanGestureHandler`. Alternative: chevron-buttons-only (no swipe), simplest but less native-feeling on a phone. A third option (hand-rolled pan gesture via the already-installed `react-native-gesture-handler`/`react-native-reanimated`) is possible but adds real complexity for the same end result as the `FlatList` approach — not recommended unless pinch-zoom (below) ends up needing that gesture stack anyway.
3. Is pinch-to-zoom on the full-size image in scope for v1? `expo-image` has no built-in pinch/zoom; a real one needs a gesture library (`react-native-gesture-handler`'s `PinchGestureHandler`/`Gesture.Pinch()`, already a dependency, or a dedicated image-zoom package). Recommend deferring to a later spec unless it's a hard requirement now.
4. Should prev/next wrap around (last → first, first → last) or disable/hide the relevant chevron at the ends?

## Implementation (proposed)

1. [x] `components/main/shared/ImageViewerModal.tsx` — new shared component per Design above; export from `components/main/shared/index.ts`.
2. [x] `components/main/shared/MultiImagePickerField.tsx` — wire thumbnail `onPress` to open the viewer at the tapped index.
3. [x] `components/main/shared/ImagePickerField.tsx` — wire the tap target per whichever Open Question 1 option is chosen.
4. [x] Confirm the 4 card integration points (`FuelLogCard.tsx`, `MaintenanceLogCard.tsx`, `BikeAccessoryCard.tsx`, `BikeIssueCard.tsx`) need no changes — the viewer is entirely internal to the two shared components. Confirmed by reading all 4 call sites directly: none pass any viewer-related prop, only the pre-existing `value`/`onUpload`/`onDelete`/`uploading` (single) or `images`/`onAdd`/`onRemove`/`uploading` (multi) props, so the self-contained state added inside the two shared components is sufficient.
5. [x] `expo lint` and `npx tsc --noEmit` clean.
6. [x] Manual verification on an actual device/simulator once available (this project's standing verification caveat — no device/simulator available in this environment). Code-reviewed, not tapped through — see Verify below.

## Dependencies

None required for the recommended design (Option 2's paging `FlatList` + chevrons, no pinch-zoom). Reuses `react-native-paper` (`Portal`/`Modal`, already a dependency), `@expo/vector-icons`'s `MaterialCommunityIcons` for `close`/`chevron-left`/`chevron-right`, and `expo-image` for the full-size render. If pinch-to-zoom (Open Question 3) is pulled into v1, no _new_ dependency is needed either — `react-native-gesture-handler`/`react-native-reanimated` are already installed — but it adds meaningfully more implementation work than the base viewer.

## Verify

- [x] `expo lint` and `npx tsc --noEmit` both pass clean — no warnings or errors from either, including in all newly-created/modified files.
- [x] Tapping a `MultiImagePickerField` thumbnail (bike issue evidence photos) opens `ImageViewerModal` at the tapped image's index — `onPress={() => setViewerIndex(index)}` on each thumbnail, `initialIndex={viewerIndex ?? 0}` passed through. Code-reviewed, not tapped through.
- [x] Tapping an `ImagePickerField` tile with a value already set (fuel log receipt, maintenance service photo, bike accessory product photo) opens the viewer instead of the replace action sheet; tapping a placeholder (no value) tile still opens the "Take Photo / Choose from Library / Cancel" action sheet as before — `handlePress` branches on `value` truthiness. Code-reviewed, not tapped through.
- [x] The new pencil badge on `ImagePickerField` (visible only when a value is set, next to the existing delete `X` badge) opens the same action sheet the tile itself used to on every tap, so "replace image" is still reachable with no functional loss. Code-reviewed, not tapped through.
- [x] The existing delete `X` badge's behavior (confirm dialog + `onDelete`) is unchanged on both components — neither badge's `onPress` handler was touched, only a new sibling badge/handler was added. Code-reviewed, not tapped through.
- [x] Tapping the close (`X`) icon top-right of `ImageViewerModal`, or tapping anywhere else in the modal (including on the image itself), calls `onDismiss` and closes the modal. *(Correction made after initial implementation: the image area was first wrapped in its own no-op `Pressable`, which — being sized `flex: 1` to match the backdrop — silently swallowed every tap in the modal, not just ones on the image, leaving the `X` button as the only way to close it. Fixed by making that wrapper a plain `View` with `pointerEvents="box-none"` instead of a `Pressable`, so untouched taps fall through to the outer backdrop `Pressable`'s `onDismiss`. This means a tap directly on the photo now also closes the viewer, not just taps in the surrounding black space — accepted as correct, matching common mobile photo-viewer UX, since precisely distinguishing "on the letterboxed pixels" from "on the surrounding area" isn't reliable without measuring the image's actual rendered box.)* Code-reviewed, not tapped through.
- [x] With more than one image, a counter overlay (`"N / total"`) and both chevron `IconButton`s are shown; with exactly one image, neither is rendered — gated on `images.length > 1`. Code-reviewed, not tapped through.
- [x] Swiping the paging `FlatList` left/right updates `currentIndex` (via `onMomentumScrollEnd`, dividing scroll offset by screen width) and the counter/chevron-disabled state track it; tapping a chevron calls `flatListRef.current?.scrollToIndex(...)` for the same result without a swipe gesture. Code-reviewed, not tapped through.
- [x] The left chevron is disabled (not hidden) at `currentIndex === 0` and the right chevron disabled at `currentIndex === images.length - 1` — both `IconButton`s get `disabled` plus a dimmed (`COLORS.textLight` vs. `COLORS.white`) icon color at the relevant bound; no wraparound path exists in `goToIndex` (`index < 0 || index >= images.length` is a no-op). Code-reviewed, not tapped through.
- [x] The full-size image renders via `expo-image` with `contentFit="contain"` (never cropped, unlike the `contentFit="cover"` thumbnails) — no pinch/zoom interaction is wired up, matching the deliberate out-of-scope decision on Open Question 3.
- [x] Opening the viewer from a different starting index while it's already conceptually "fresh" (e.g. re-opening after a prior close) always starts at the newly-tapped index, not a stale one — `currentIndex` is reset from `initialIndex` in a `useEffect` keyed on `[visible, initialIndex]`, and the `FlatList` is also imperatively scrolled to that offset on the same effect run.
- [x] *(Explicit caveat)* No physical device/simulator available in this environment — the actual tap-through (viewer open/close, swipe paging, chevron nav, badge hit targets at real tile size) is code-reviewed only against `react-native-paper`'s `Portal`/`Modal`/`IconButton` API and `expo-image`'s `contentFit` prop, not visually confirmed. Same standing gap as every other spec in this project (see `progress-tracker.md`'s Known Gaps).

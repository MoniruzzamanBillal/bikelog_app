# 46: Slightly larger image thumbnails

Status: ✅ Complete — implemented and verified 2026-10-01, see `ai context/progress-tracker.md`'s Recent Activity entry.

## Goal

Make the image thumbnails on the cards a bit bigger — noticeably easier to see, without becoming a dominant element. Per direct user request: _"in my app , make the image a bit large not significantly large"_.

## Design

Every image tile in the app was **56pt**, set in four places:

| Where | What it shows | Before | After |
| --- | --- | --- | --- |
| `FuelLogCard.tsx:165` | fuel receipt | `size={56}` | `size={64}` |
| `MaintenanceLogCard.tsx:140` | service photo | `size={56}` | `size={64}` |
| `BikeAccessoryCard.tsx:133` | product photo | `size={56}` | `size={64}` |
| `MultiImagePickerField.tsx` | bike-issue gallery tiles | `SIZE = 56` | `SIZE = 64` |

**64pt, a ~14% increase.** Chosen over 72 or 80 to honour "not significantly large": it is a visible step up while keeping the thumb clearly secondary to the card's text, and it lands exactly on `ImagePickerField`'s own documented default (`const SIZE = 64`), which until now no caller actually used. So the explicit `size=` props and the component default finally agree.

`COMPACT_BELOW` stays at **48**, so 64 remains non-compact exactly as 56 was — `compact` is `false` at both sizes, meaning the badge diameter (16) and placeholder icon (20) are unchanged. No badge re-tuning was needed for the size change itself.

### The one thing to check by eye

The two badge offsets in `ImagePickerField` are **hand-tuned literals, not derived from `size`**:

- delete badge `{ top: -66 }` — anchored to the tile's **top** edge, so a size change does not move it at all.
- replace badge `{ bottom: 50, right: 18 }` — anchored to the **bottom** edge, so growing the tile by 8pt moves it 8pt **down** relative to the top edge. Its distance from the bottom edge is unchanged.

Net: the two badges end up 8pt closer together than before. That is a small shift and may well look fine or better, but it was not re-tuned here — those values were set by hand and second-guessing them is out of scope for a sizing request. A `NOTE` comment was added above them recording that they are size-independent, so the next person changing `size` knows to re-check.

`MultiImagePickerField`'s `deleteBadge` (`top: -65, right: -6`) is likewise untouched.

Deliberately **not** changed: `ImageViewerModal` (full-screen, already unconstrained), the form modals' pickers, and every badge/icon size.

## Implementation

1. `size={56}` → `size={64}` in the three card files.
2. `const SIZE = 56` → `64` in `MultiImagePickerField.tsx`.
3. Refreshed two comments in `ImagePickerField.tsx` that cited 56 as the caller size (one in the `COMPACT_BELOW` note, one in the badge-placement note), and added the size-independence `NOTE` described above.

No props, types, handlers or API calls changed. Purely presentational.

## Dependencies

None — no new packages, no new components.

## Verify

- [x] `npx tsc --noEmit` clean.
- [x] `npx eslint` clean on all five touched files.
- [ ] On device: fuel-log, maintenance-log and accessory cards all show a visibly larger thumb, still clearly secondary to the card text, with no card-height jump or layout reflow.
- [ ] On device: bike-issue gallery tiles are larger and still wrap correctly in their row at phone width (the row holds one fewer tile per line if it was tight at 56).
- [ ] On device: tap-to-view, pencil-to-replace and X-to-delete all still work at the new size.
- [ ] **Check the two badges by eye** — they are now 8pt closer together (see Design). Re-tune `bottom: 50` / `top: -66` in `ImagePickerField.tsx` if the spacing reads worse.

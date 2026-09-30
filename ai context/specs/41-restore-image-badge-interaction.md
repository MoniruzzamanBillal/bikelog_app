# 41: Restore tap-to-view + pencil/close badges on image thumbnails

Status: ✅ Complete (2026-09-30)

## Goal

Per direct user instruction, restore the pre-Nocturne image interaction:

- **Tap the image → the image opens** full-screen.
- **Pencil icon → re-upload/replace** the file.
- **Close (X) icon → delete**, behind a confirmation warning.

Replacing the current behavior, where tapping a thumbnail opens a
**View / Replace / Delete** action sheet and no badges are visible at all.

**This restores spec 21's own resolved design**, not a new one. `21-image-viewer.md`'s
Open Question 1 was settled as **Option A**, quoted from its header note: _"with a value
set, tapping the `ImagePickerField` tile opens the viewer, and 'replace' moved to a new
small pencil-icon badge next to the existing delete `X`; the placeholder (no-value) state
still opens the action sheet on tap."_ Spec 38a's action sheet overrode that; this spec
puts it back. The user pointed at spec 21 as the reference for what "the old app" did, and
it matches item-for-item.

## Context — why the action sheet appeared

`ImagePickerField` already implemented exactly the wanted behavior, but **only for a
64pt tile**. Spec 38a added a `compact` branch (`size < COMPACT_BELOW`, i.e. `< 64`) that
swapped the badges for an action sheet, because the badges' hardcoded `top: -75` did not
place correctly at smaller sizes.

**All three call sites pass a size under 64**, so in practice the action sheet was the
*only* behavior the user ever saw:

| Caller                   | `size` | Label   |
| ------------------------ | ------ | ------- |
| `FuelLogCard.tsx`        | 32     | Receipt |
| `MaintenanceLogCard.tsx` | 56     | Service |
| `BikeAccessoryCard.tsx`  | 56     | Product |

**The root cause of the bad placement, which spec 38a worked around instead of fixing:**
`top: -75` predates Nocturne (it is unchanged since spec 21's commit `eac64f4`, and spec
29 confirmed it on-device *in the old layout*). Spec 38 then re-laid out every card. In the
current layout the tile sits in a `styles.right` **column**, under a 32pt `ActionMenu`, in
a wrapper whose height is exactly `size` — so a `-75` top offset floats the badge ~75pt
*above* the thumbnail regardless of tile size. It was never going to work at 32 or 56; the
number was tuned for a card layout that no longer exists.

`MultiImagePickerField` (used by `BikeIssueCard`) already tapped-to-open with no action
sheet, but carried the **same class of bug**: `top: -70` against a wrapper exactly `SIZE`
(56) tall.

## Design

Drop the action-sheet branch entirely and make badge geometry derive from the tile instead
of a magic constant, so one interaction model holds at every size.

| Path                                            | Change                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `components/main/shared/ImagePickerField.tsx`    | Remove the `compact && value` action-sheet branch from `handlePress`; drop the `!compact` guards so both badges always render; replace the fixed `top: -75` / `right: 16` with runtime `badgeBox` sizing. |
| `components/main/shared/MultiImagePickerField.tsx` | `deleteBadge.top: -70` → `-6`, so it overlaps the tile's top-right corner as intended.                                      |

**Badge geometry.** Two 18pt badges cannot share one edge of a 32pt tile (18+18 > 32), so
they take **opposite corners** — delete top-right, pencil bottom-right — and scale down
slightly on small tiles:

- `badge = size < 64 ? 16 : 18`; `badgeOffset = -(badge / 3)`
- delete: `top: badgeOffset, right: badgeOffset`
- pencil: `bottom: badgeOffset, right: badgeOffset`
- icon glyphs scale with the badge (`badge - 6` / `badge - 7`)

`COMPACT_BELOW` is kept but now only influences **sizing** (badge diameter, placeholder
icon `plus` vs `camera-plus-outline`) — never behavior.

**One deliberate deviation from spec 21**, called out because that spec is the reference for
this work: spec 21 places the pencil **"next to"** the delete `X` — side by side on the top
edge (`right: 16` vs `right: -6` at the same `top`). That was written when every tile was
64pt. It cannot hold at 32pt, where two 18pt badges need 36pt of edge. Rather than make the
*layout* size-conditional — the exact mistake that produced spec 38a's size-conditional
*behavior* and this bug — both badges keep fixed corners at every size: **delete top-right,
pencil bottom-right**. At 56pt and 64pt they would have fit side by side; consistency across
all three cards was preferred over matching spec 21's arrangement on the larger two only.
If the side-by-side look matters more, the alternative is in Open Questions.

### Resulting behavior, all sizes

| Action                  | Result                                             |
| ----------------------- | -------------------------------------------------- |
| Tap a thumbnail with an image | Opens `ImageViewerModal` full-screen          |
| Tap an empty tile       | "Add Photo" sheet (Take Photo / Choose from Library) |
| Pencil badge            | Same "Add Photo" sheet, replacing the current file |
| Close badge             | `Alert` — "Are you sure you want to delete this <label>?" |

### Not changed

- `ImageViewerModal`, the upload/delete handlers, and every caller — no call site needed
  editing, since the `size` props stay as they are.
- `MultiFilePickerField` (bike documents) — mixed image/PDF, its own action sheet is about
  *file type* handling, not this view/replace/delete pattern, and the user did not mention it.
- `MultiImagePickerField` gains **no** pencil badge: it is an add/remove list, so
  "replace one of N" has no meaning there. Only its badge position was wrong.

## Implementation

1. [x] `handlePress`: removed the `compact && value` action-sheet branch; an existing image
       always opens the viewer, an empty tile always opens the picker.
2. [x] Removed `!compact` from both badge render guards.
3. [x] Added runtime `badge` / `badgeOffset` / `badgeBox`; stripped
       `top`/`right`/`width`/`height`/`borderRadius` out of the static `deleteBadge`/
       `editBadge` styles, leaving only `position`/colour/centering there.
4. [x] Moved the pencil badge to the **bottom**-right so it cannot collide with delete at 32pt.
5. [x] `MultiImagePickerField.tsx`: `top: -70` → `-6`, with a comment recording why.
6. [x] Docs: this spec, `00-build-plan.md` row, `progress-tracker.md` row + Recent Activity,
       and the stale spec-38 Known Gaps line about the action sheet.

## Verify

- [x] `npx tsc --noEmit` — 0 errors.
- [x] `yarn lint` (`expo lint`) — clean. `Alert` is still imported and used (add-photo sheet
      + delete confirm), and `compact` is still used (badge/icon sizing), so nothing was
      left dangling by the removals.
- [x] All three `ImagePickerField` call sites re-read — none passes a prop this changes, so
      no caller edits were required.
- [ ] **Not rendered on a device or simulator** — the standing gap for every UI change here,
      and it carries **more weight than usual for this spec**, because the thing being
      changed is exactly what static checking cannot see. Specifically worth checking:
      1. Both badges are actually visible and on the tile (top-right ✕, bottom-right ✏) at
         **32pt** in `FuelLogCard` and **56pt** in the Maintenance/Accessory cards. The old
         `-75`/`-70` values are gone, so placement is *reasoned from the box model*, not
         inherited from anything previously confirmed on a device.
      2. Tap targets at 32pt — a 16pt badge is small; `hitSlop={8}` is meant to cover it,
         but two badges 8pt apart on a 32pt tile could overlap in *touch* area even though
         they don't visually. If a tap hits the wrong one, increase the tile size rather
         than shrinking `hitSlop`.
      3. Tapping the image centre (not a badge) still opens the viewer, i.e. the badges
         aren't swallowing the whole tile's touches.
      4. `BikeIssueCard`'s multi-image ✕ now sits on the thumbnail corner instead of far above it.

## Follow-up (same session) — 41a: larger receipt thumb, badges actually separated

User feedback after reloading: _"in fuel log page , make the image a bit large and currently
the edit and delete icon are in same place . fix this ."_

**They were right, and it was worse than cosmetic.** On the 32pt receipt thumb the two badges
shrank to 16pt (`compact`) and, with `hitSlop={8}` on each, their **touch areas overlapped by
5.3pt** — computed from the box model:

| Tile | Badge | Visual gap | Touch gap (incl. `hitSlop` 8) |
| ---- | ----- | ---------- | ----------------------------- |
| 32pt (old) | 16pt | 10.7pt | **−5.3pt → overlapping** |
| 56pt (new) | 18pt | 32.0pt | +16.0pt |
| 64pt        | 18pt | 40.0pt | +24.0pt |

So a tap near the middle of the right edge could land on either icon — delete or replace,
non-deterministically. That is exactly the "same place" symptom, and it is the specific risk
flagged in this spec's own Verify item 2, now confirmed by arithmetic rather than a device.

### Changes

| Path                    | Change                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `FuelLogCard.tsx`        | `size={32}` → `size={56}`, so all three cards now use one tile size.   |
| `ImagePickerField.tsx`  | `COMPACT_BELOW` `64` → `48`, so a 56pt tile gets the full 18pt badges instead of the shrunken 16pt ones. Nothing passes under 48 any more. |

`COMPACT_BELOW` still governs sizing only, never behavior. With every caller at 56 the
`compact` path is currently unreachable — kept deliberately, since it is the graceful
fallback if a future caller does want a small tile.

### Verify

- [x] `npx tsc --noEmit` 0 errors; `yarn lint` clean.
- [x] Separation recomputed from the box model for 56 and 64 (table above) — positive touch
      gap at both, so no ambiguous taps remain.
- [x] All three call sites now pass `56` — grep-confirmed, no stragglers.
- [ ] **Still not seen on a device.** The numbers above are geometry, not a screenshot. Worth
      confirming the taller 56pt tile doesn't unbalance `FuelLogCard` — its right column is
      now `ActionMenu` (32) + gap 6 + tile (56) = 94pt, up from 70pt, which may make the card
      taller than its left-hand text column.

## Open Questions

- ~~If the 32pt receipt thumb proves too small for two badges on a real device, the better fix
  is bumping `FuelLogCard`'s `size={32}` to ~48~~ — **done, see Follow-up 41a above**: the user
  hit exactly this, and it is now 56 (matching the other two cards) with full-size badges.
- **Corner placement vs. spec 21's side-by-side** (see Design): if the user wants the exact
  original arrangement — pencil immediately left of the `X` on the top edge — the clean way
  is to raise `FuelLogCard`'s tile from 32 to ≥48 so side-by-side fits everywhere, then set
  both badges to `top: badgeOffset` with the pencil at `right: badge - 2`. Not done here
  because it changes a caller's layout on an unverified guess about available width in
  `FuelLogCard`'s `styles.right` column; worth doing if the corner look is disliked on-device.

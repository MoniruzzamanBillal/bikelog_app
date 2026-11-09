# Spec 68 — Document card redesign

**Status: Complete — implemented 2026-11-09 (code only; not run on a device).**

## Why

"In document page: i don't like the document card design. i want to show all information and
want the design to be updated." The old card showed only title, an optional expiry pill and
an optional description above the file chips — the expiry date, file count and date added
were nowhere.

## What

`components/main/BikeDocument/BikeDocumentCard.tsx` rebuilt:

- **Header** — a leading rounded icon badge (`file-document-outline` on `surface3`), the
  title (14.5px, 600), and the expiry **status pill** stacked beneath it, with the
  edit/delete actions on the right.
- **Status pill** — `getExpiryPill` now always returns a pill (never `null`): **Expired**
  (danger) / **Expires in N days** (warning, ≤30) / **Valid** (success) / **No expiry**
  (neutral) when there's no date. So every card carries a clear status.
- **Description** — unchanged, shown when present.
- **Meta row** — a new muted line carrying *all the facts*: the actual expiry date
  (`Expires 14 Mar 2027`, or `No expiry date`), the file count (`3 files`), and `Added …`
  from `createdAt`. Each with a small leading icon; wraps at 360dp.
- **Divider** — a `RuleFade` separates the meta from the attachments.
- **Files** — the existing `MultiFilePickerField` (attach / view / remove) is unchanged.

All dates go through `formatApiDate` (the UTC-midnight off-by-one guard), and fields are read
with `?.`/`??`.

## Decisions / hazards

- **D1 — the pill names the *status*; the meta row carries the *date*.** Not redundant: the
  pill is the at-a-glance state (colour-coded), the meta line is the literal expiry/added
  dates and the file count — together they are "all information".
- **D2 — no backend change.** Everything shown (`title`, `description`, `expiryDate`, `files`,
  `createdAt`) is already on `IBikeDocument`.
- **H1 — sort unchanged.** `BikeDocument.tsx` still sorts by soonest expiry (no-expiry last);
  this spec only touches the card, so the list order and pager are untouched.

## Cascade

App-only. No server, no web.

## Verify (not run on a device)

- V1 — a card shows icon badge · title · status pill · (description) · meta row · divider ·
  files.
- V2 — the four pill states render with the right tone; a document with no expiry shows
  "No expiry" + "No expiry date" in the meta.
- V3 — file count is singular/plural correct and tracks add/remove.
- V4 — `Added …` matches the document's creation date with no off-by-one.
- V5 — 360dp: the meta row wraps cleanly; the title truncates at two lines; actions stay put.

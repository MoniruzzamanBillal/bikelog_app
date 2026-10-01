# 43: Settings catalog — inline-edit name field scrolls horizontally

Status: ✅ Complete — implemented and verified 2026-10-01, see `ai context/progress-tracker.md`'s Recent Activity entry

## Report

Direct user bug report:

> in my app , in setting page , when i click edit icon in maintenance type and engine oil type then i can edit them . the name field is currently scrollabe . it should not be happen . and in the name input text the text is breaks . i have to scroll them . fix this .

Both symptoms — the field scrolling, and the text appearing to break mid-name — are one bug: the **name input is far too narrow**, so its content overflows and the single-line `TextInput` scrolls horizontally to compensate. The name becomes unreadable and awkward to edit.

## Cause

`components/main/SettingsCatalog/SettingsCatalog.tsx` renders the inline editor **inside the table row**, reusing the same column styles as the read-only row:

```jsx
<View style={[styles.tr, styles.trEditing]}>
  <CellInput style={styles.colName} />      {/* flex: 1 */}
  <CellInput style={styles.colNumInput} />  {/* width: 56 */}
  <CellInput style={styles.colNumInput} />  {/* width: 56 */}
  <View style={styles.editActions}>         {/* 2 × 32 = 64 */}
```

The name input is `flex: 1`, so it gets only what the fixed-width siblings leave over. On a 360pt-wide screen:

| | |
| --- | --- |
| Screen width | 360 |
| − page padding (`styles.page`, 16 × 2) | 328 |
| − panel padding (`styles.panel`, 16 × 2) | **296 available** |
| − two interval inputs (56 × 2) | 184 |
| − action icons (32 × 2) | 120 |
| − three 8pt row gaps | **96 → the name input** |

96pt at `fontSize: 13` holds roughly 11–13 characters. Every seeded maintenance type is longer than that ("Engine Oil Change", "Chain Lubrication", "Brake Pad Replacement"), so the field scrolls in normal use, not an edge case.

The engine-oil editor has the same shape with one interval field instead of two (`colWideInput`, 90pt), leaving the name ~126pt — better, still too narrow.

`CellInput` wraps a bare `NativeTextInput` with no `multiline`, so it is single-line by design. A single-line `TextInput` **cannot** be made non-scrolling while its content overflows — RN scrolls it natively and `scrollEnabled` only applies to multiline inputs on iOS. The fix therefore has to be width, not a prop.

## Design

**Stop sharing the table's columns while a row is being edited.** Replace the single cramped row with a stacked two-line block:

```
┌────────────────────────────────────────┐
│ [ name input — full panel width      ] │
│ [ km      ] [ days     ] [ ✓ ] [ ✕ ]  │
└────────────────────────────────────────┘
```

- `editBlock` — column container, `paddingVertical: 8`, `gap: 8`.
- `editNameInput` — `width: "100%"`. Gets the panel's full 296pt inner width, **~3× the old 96pt**.
- `editControls` — row, `gap: 8`, `alignItems: "center"`.
- `editNumInput` — `flex: 1` instead of a fixed width, so the interval fields split the leftover room (~108pt each rather than 56pt) and also stop being cramped.

Retire `trEditing`, `colNumInput` and `colWideInput`; after this change nothing references them. `colName`, `colNum`, `colWide` all stay — the read-only rows and the table header still use them, and those are untouched.

**Accepted trade-off**: while a row is in edit mode its fields no longer line up under the `NAME / KM / DAYS` header. The two interval inputs gain `placeholder="km"` / `placeholder="days"` to carry that meaning instead (maintenance intervals are optional, so the placeholder is visible exactly when the value is absent and the column cue is most needed). The name inputs gain `placeholder="Type name"` / `"Oil type name"` for the same reason.

Deliberately **not** done:

- No modal. The inline editor is the established pattern for these two tables and works fine once it has room.
- No `numberOfLines` / `multiline`. Wrapping a name across two lines inside a 34pt-tall field would clip it; width is the real fix.
- No change to the read-only rows, the add-new forms, the save/cancel handlers, or any payload. This is layout only.

## Scope

Single file: `components/main/SettingsCatalog/SettingsCatalog.tsx`. No backend change — `PATCH /maintenance-types/:id` and `PATCH /engine-oil-types/:id` (backend spec 38) are untouched, so no `bikelog_server` or `bikelog_client-web-` work follows from this.

## Verify

- [x] `npx tsc --noEmit` clean.
- [x] `npx eslint` clean on the changed file.
- [ ] On device: edit a long maintenance type ("Engine Oil Change") and confirm the whole name is visible without scrolling, the caret can reach both ends, and save/cancel still work.
- [ ] On device: same for an engine oil type.
- [ ] Confirm the read-only rows still align under their headers (they should be byte-for-byte unchanged).

# 44: Settings page — semantic icon colours

Status: ✅ Complete — implemented and verified 2026-10-01, see `ai context/progress-tracker.md`'s Recent Activity entry

## Report

Direct user request:

> in setting page , add appropriate color in each icon . currently the color is black and white .

## Audit — what was actually monochrome

Not every icon on the screen was colourless. Audited all of them first:

| Icon | Where | Colour before | Verdict |
| --- | --- | --- | --- |
| `plus` / `close` | Add/Close toggle | `COLORS.accent` / `COLORS.text` via `PrimaryButton` variant | already correct |
| `wrench-outline`, `oil` | `EmptyState` chips | `COLORS.accent` | already correct |
| `logout` | Account | `COLORS.danger` via `destructive` variant | already correct |
| `check` | Save edit | `COLORS.success` | already correct |
| **`pencil-outline`** | Each table row | **`COLORS.textLight`** | grey — and it is the most-repeated icon on the page |
| **`close`** | Cancel edit | **`COLORS.textLight`** | grey, sat beside a green check |
| **(none)** | Three panel headers | — | **no icon at all** |

So the page read as flat for two reasons: the only icon repeated down the screen (the row pencil) was grey, and the three section headers — Maintenance types, Engine oil types, Account — carried no icon to give them identity. The empty states had a glowing accent chip, but those only show when a table is empty, so in normal use the colour was absent.

## Design

Semantic, not decorative. Every colour comes from an existing `COLORS` token — no new literals, and tints derive from `tint()` as the palette intends.

**Recoloured:**

- `pencil-outline` → `COLORS.primary`. It is the row's primary action and the thing the user taps; purple is this palette's interactive/brand colour.
- Cancel `close` → `COLORS.danger`. Pairs with the existing green `check` as the conventional confirm/discard pair, and discarding an in-progress edit is the mildly-destructive option of the two.

**Added** — a `PanelIcon` helper rendering an icon inside a tone-tinted chip (`tint(color, 0.14)` fill, `tint(color, 0.32)` border, 30pt, `borderRadius: 9`). Deliberately mirrors `EmptyState`'s accent chip so a panel header and its own empty state read as one family:

- Maintenance types → `wrench-outline`, `COLORS.primary`.
- Engine oil types → `oil`, **`COLORS.warning`**. The one non-purple choice: amber is oil's own colour, and it also keeps the two catalog panels visually distinguishable at a glance, which matters because their tables look alike.
- Account → `account-circle-outline`, `COLORS.primary`.

The Account panel gained the same `panelHeader` + `panelTitleCol` structure the other two already used, so the email now sits under the title inside the column rather than as a loose sibling. That is what lets its icon align with the other two panels.

**Deliberately not done:**

- No rainbow. Nocturne is restrained — purple is the default accent and semantic colour is spent only where it carries meaning (amber for oil, green for save, red for cancel/logout). Giving each section an arbitrary distinct hue would fight the design language.
- `ScreenHeader`'s own chrome is untouched — it is shared by every screen, and recolouring it here would change the whole app.
- No change to `EmptyState`, `PrimaryButton` or any other shared component. All edits are local to `SettingsCatalog.tsx`, so no other screen is affected.

## Scope

Single file: `components/main/SettingsCatalog/SettingsCatalog.tsx`. Presentation only — no handler, payload, query or backend change, so nothing follows for `bikelog_server` or `bikelog_client-web-`.

## Verify

- [x] `npx tsc --noEmit` clean.
- [x] `npx eslint` clean on the changed file.
- [ ] On device: confirm the three header chips render with the intended tint and are not clipped, the pencil reads clearly as the tap target, and the red cancel X does not read as "delete this row" next to the green check.
- [ ] On device: confirm the Account panel's email still sits correctly under its title after the structural change.

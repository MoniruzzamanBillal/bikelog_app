# UI Context

Pulled directly from `../../expenseTrackerReactNative`'s actual `StyleSheet.create()` calls and `utils/colors.ts` — not invented, not aspirational, same policy as the web app's `ui-context.md`. If this app's real usage stops matching what's described here, fix this doc, don't let it drift.

## Component Library

`react-native-paper` — `Button` (`mode="contained"`, `disabled={isPending}`, `labelStyle`), `TextInput` (borderless-underline look: `borderWidth: 0, backgroundColor: "transparent", padding: 0`, paired with a `borderBottomWidth: 1` wrapper `View` instead of Paper's own outlined/flat variants), `Text` (used for nearly all text, not RN's core `<Text>` directly, since Paper's inherits theme typography for free), `Modal`+`Portal` (edit dialogs), `IconButton`. No component library beyond Paper — no NativeWind, no Tamagui, no styled-components.

Icons: `@expo/vector-icons`'s `MaterialCommunityIcons` exclusively — one icon family, referenced by string name (`"delete"`, `"book-edit-outline"`, `"chevron-left"`, `"cash-multiple"`, `"cash-minus"`, `"arrow-up"`/`"arrow-down"`, `"calendar-today"`). Pick names from the [MaterialCommunityIcons set](https://icons.expo.fyi) for consistency; don't mix in `Ionicons`/`FontAwesome`/etc.

## Colors

`utils/colors.ts` exports one theme, `THEMES.nocturne`, wired as `COLORS` — the **Nocturne** palette, retuned in spec 38 to the redesigned web client's `.dark` token block (`bikelog_client-web-/app/globals.css`) so both clients read as one product. Dark-only by user decision; there is no light variant.

| Token | Value | Web token | Use |
| --- | --- | --- | --- |
| `background` | `#161826` | `--background` | page background |
| `card` / `surface` | `#232532` | `--card` | panels, modals, inputs |
| `surface2` | `#1f2130` | `--muted` | skeletons, bar tracks, file chips, neutral tags |
| `surface3` | `#2b2741` | `--accent` | accent-tinted bg: user chat bubble, image thumbs, accent tags |
| `accent` / `primary` | `#9184d9` | `--primary` | CTAs, active states, icons |
| `accentForeground` | `#d2cefd` | `--accent-foreground` | text on `surface3` |
| `text` | `#e9e9ed` | `--foreground` | primary text |
| `textLight` | `#9397ab` | `--muted-foreground` | secondary text, labels, meta |
| `textMuted` | `#75798c` | — | tertiary text (rare) |
| `placeholder` | `#595d6c` | — | input placeholders |
| `border` | `rgba(233,233,237,0.14)` | `--border` | control outlines, rules |
| `borderSubtle` | `rgba(233,233,237,0.10)` | — | quieter dividers |
| `edge` | `#3f424d` | `--elev-sm` | the hairline outline on every panel |
| `success` | `#7cbf8e` | `--success` | |
| `warning` | `#d8a657` | `--warning` | |
| `danger` | `#e0786e` | `--destructive` | |

`CHART_COLORS` is the web's `--chart-1..5` ramp: `["#968ae0", "#d2cefd", "#75798c", "#5d5294", "#b2b6ca"]`. Categories take index `min(i, 4)`, like the web.

**Tints come from `tint(hex, alpha)`**, never a literal: `tint(COLORS.danger, 0.15)` → `rgba(224,120,110,0.15)`. Every old `rgba(...)` status literal was replaced by this in spec 38. The only raw colour values left in components are true black overlays (`rgba(0,0,0,…)`) and the web's 70%/85%-alpha foreground used for field labels and inactive segments (`rgba(233,233,237,0.7)` / `0.85`).

## Status Badges

Status pills are **tone pills**, built by `toneStyle(tone)` in `components/main/shared/StatusBadge.tsx` (exported from the barrel), which returns a `{ bg, text }` pair:

| Tone | Background | Text |
| --- | --- | --- |
| `neutral` | `COLORS.surface2` | `COLORS.text` |
| `accent` | `COLORS.surface3` | `COLORS.accentForeground` |
| `success` / `warning` / `danger` | `tint(c, 0.15)` | `c` |

Shape: `paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11` — a small rounded tag, not a full pill. `StatusBadge({label, colorKey, colors})` keeps its original signature; its exported maps are remapped to the web tones:

- `issueStatusColors`: open → warning, resolved → success
- `accessoryStatusColors`: pending → neutral, purchased → success, cancelled → neutral
- `accessoryUrgencyColors`: immediate → danger, medium → warning, low → neutral

Screens mostly call `toneStyle()` directly for one-off tags (Full/Partial on fuel logs, Overdue/Upcoming on reminders, document expiry, the oil-type tag, the dashboard reg number).

## Spacing & Radius

Screens follow one page rhythm: **16 horizontal / 14 top padding, 10–12 gap between blocks** (`paddingHorizontal: 16, paddingTop: 14, gap: 12` on the scroll container).

| Radius | Use |
| --- | --- |
| 6 | tags / status pills |
| 7 | the auth brand chip |
| 8 | controls — buttons, inputs, segmented tabs, steppers, chips, image thumbs |
| 10 | cards / panels, icon chips |
| 12 | chat bubbles (with one 4pt corner) and the AI composer |
| 14 | modals |

Heights: inputs and stepper/pager buttons 40–44, compact buttons ≥36, table rows 44, file chips 40, bike-hub tiles 76. Icon hit boxes are 32×32 (card actions) or 36–40 (header back, ⋯ triggers).

Use the shared pieces instead of re-deriving these: `Panel` (+ `panelStyle` for use inside a local `StyleSheet`), `RuleFade` for freestanding dividers, `StatTile`, `SegmentedTabs`, `FormActions`.

## Typography

System font only — no `expo-font`/Inter (spec 38 guardrail: no new dependencies). **Headings use `fontWeight: "500"`, not bold**; `"600"` appears only for markdown `strong`.

| Size | Use |
| --- | --- |
| 34 | spending total |
| 30 | odometer, rolling-average km/l |
| 26 | auth heading |
| 24 | card hero numbers (dashboard odometer, `StatTile` value) |
| 20 | modal title |
| 18 | fuel-log cost, AI empty-state title |
| 17 | `EmptyState`/`ErrorState` title, record km/l, year stepper |
| 15 | screen header title, panel titles, mini-stat values |
| 13.5 | body, list-row names, AI chat text (line height 21) |
| 13 | secondary body, segment labels, descriptions |
| 12 / 12.5 | meta lines, field labels, stat labels |
| 11 | tags, kickers, header subtitle |

**Kickers** (section labels like `EXACT RECORDS`, `BY CATEGORY`): `fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: COLORS.textLight` (accent for the AI insight kicker).

**Numbers**: `fontVariant: ["tabular-nums"]` on every odometer, money, liter and km/l value. `fontFamily: "monospace"` is no longer used anywhere.

**Money**: always `formatTaka(n)` (`utils/formatTaka.ts`) — `৳` prefix, whole taka unless the value actually has decimals, matching the web exactly.

## Shadows / Elevation

Nocturne elevation is an **outline, not a drop shadow**:

- **Panel** (every card): `backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.edge` — the web's `--elev-sm` hairline. No `shadow*`/`elevation`.
- **Glow** (the one highlighted element per screen — first bike card, rolling average, spending total, empty-state icon chips, the AI composer while empty, auth brand chip): `glowStyle` from `Panel.tsx` = `borderColor: COLORS.accent` + `shadowColor: COLORS.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: {0,0}` + `elevation: 6`. `shadow*` + `elevation` appear nowhere else — except that the three glowing icon chips (`EmptyState`, the AI assistant's empty state, the auth brand chip) repeat these same values inline rather than spreading `glowStyle`, because they also set their own size/radius; keep them in sync if the glow changes.
- **Tone outline** (reminders, efficiency alert, error states, login banner): a panel with `borderColor: tint(COLORS.warning | COLORS.danger, 0.4)`.
- **Modals**: `COLORS.card` + `edge` outline + radius 14, no shadow.

⚠️ The glow has only been seen on Expo web, where it renders faintly (and RN-web warns `shadow*` is deprecated in favour of `boxShadow`). Its look on iOS (shadow) vs Android (`elevation`, which ignores `shadowColor` on older versions) is unverified — see the progress tracker's Known Gaps.

## Screen-size target

No responsive breakpoint system — RN layouts are typically single-column and fluid (`width: "90%", alignSelf: "center"` is the reference project's near-universal page-wrapper pattern) rather than breakpoint-driven like the web app's Tailwind `sm:`/`md:`. Build for phone screens; tablet/foldable is not a target for either sibling project and isn't one here either.

## Theming

No dark-mode system, no theme toggle — `COLORS` is a fixed, single active palette (see above), matching the reference project's actual behavior (the 3 unused alternates were never wired to a switcher, and neither is the web app's dark-only `next-themes` setup meant to imply this app needs light/dark parity). If a theme switcher is ever wanted, `THEMES` already has the shape to support it — not worth building for a single-user tool now.

## Conventions

- **Toasts**: `react-native-toast-message`'s global `<Toast />` (mounted once in `app/_layout.tsx`), triggered via `Toast.show({ type: "success"|"error", text1, text2?, position: "top" })` — always `position: "top"` for consistency (the reference project is inconsistent about this — some calls omit `position` or use `"bottom"` — standardize on `"top"` here rather than perpetuating the inconsistency).
- **Pull-to-refresh**: every list screen wraps its `ScrollView` in a `RefreshControl` bound to a local `refreshing` boolean + the query's `refetch()` — matches every list screen in the reference project (`HomePage`, `MonthlyTransaction`, `HistoryPage`), no exceptions.
- **Swipe actions**: `Swipeable` from `react-native-gesture-handler`, left-swipe reveals delete (red background), right-swipe reveals edit (green background) — track "only one row open at a time" via a `useRef<Swipeable|null>` passed down from the parent list as `onSwipeOpen`, exactly as `HomePage.tsx` does.
- **Currency**: `৳` prefix literal on every money value, matching both sibling projects exactly.
- **Rich text / animation**: none, matching both sibling projects' stance — see `project-overview.md`'s Out of Scope. **Charts**: `react-native-gifted-charts` (`BarChart`, `PieChart`), scoped to the Spending/Mileage trend tabs only. (Spec 18 added `react-native-gifted-charts` for the Spending/Mileage trend tabs; spec 25 removed it per direct user instruction — the actual complaint was the donut chart's missing legend; spec 28 restored it with a custom legend below the donut — color swatch + category name + amount + percentage per slice, fixing the actual gap instead of re-removing the chart.)

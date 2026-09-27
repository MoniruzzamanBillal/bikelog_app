# 38: Nocturne Web Parity (restyle the app to match the redesigned web client)

## Status

⛔ Not started. Spec written 2026-09-27 per direct user request, to be implemented in a **fresh session**. Everything that session needs is in this file. Read it top to bottom before touching code.

## Goal

Make `bikelog_app` look like the redesigned web client (`bikelog_client-web-`, its spec 27, "Nocturne"), using the web's **mobile (375px) layouts** as the target. This is a **visual refinement pass only**:

- same data
- same hooks, URLs and payloads
- same navigation
- same features

## Decisions already made by the user (don't re-ask)

| Question | Decision |
|---|---|
| Light theme + toggle like the web? | **No. Dark only.** Retune the existing dark palette to the web's `.dark` values. |
| Adopt the web's in-bike bottom tab bar (Overview/Fuel/Service/Spend/More)? | **No. Keep the app's navigation.** The `(tabs)` Garage/Settings tab bar and the stacked `app/bikes/[bikeId]/*` screens with `ScreenHeader` + back stay as they are. No routing changes. |
| Which repo / branch? | Only `bikelog_app/`. Stay on the **current branch `dev/monir`**, and never create or switch branches (a standing user preference). Don't touch `bikelog_client-web-/` or `bikelog_server/`. |
| New features? | None. The web has a **Manual** screen and an **Admin** screen the app lacks. They're **out of scope**: they'd be features, not design. Leave them in Known Gaps. |
| Android widget? | `widgets/QuickAddFuelWidget.tsx` is **untouched**. Spec 36 is still in progress, and the widget renders through its own native pipeline. |

## Background (for a session with no memory of this)

- **Web redesign (done)**: the web client was restyled on 2026-09-27 from a Claude Design export.
  - Commits `a99cd36` (tokens, shell, shared components) and `5640ab5` (all screens) on `bikelog_client-web-` `dev/monir`.
  - Its record is in `bikelog_client-web-/context/specs/27-nocturne-redesign.md`, `bikelog_client-web-/context/progress-tracker.md` (Recent Activity, 2026-09-27) and `bikelog_client-web-/context/ui-context.md` (the tokens and shared pieces, documented).
- **App's current state**: the app **already** uses an older "Nocturne" dark palette (`utils/colors.ts`: bg `#161826`, accent `#9184d9`). It came from an earlier mobile-only Claude Design merge (see the note at the top of `utils/colors.ts`). So the hues are already close. What differs:
  - the card/surface values, the softer status colours and the muted text
  - elevation (hairline edge + glow), the tag style, the empty/error cards
  - segmented tabs, stat tiles, and the per-screen layouts
- **Reference material, in priority order**:
  1. **Web source**: `bikelog_client-web-/components/(main)/<Domain>/*.tsx`. Use the markup that renders below `lg` (1024px). Classes prefixed `lg:` are desktop-only; ignore them. Shared web pieces live in `bikelog_client-web-/components/shared/{StateCard,StatTile,StatusTag,SegmentedTabs,PeriodStepper,InsightCard}/` and `components/layout/AppShell.tsx` (mobile header).
  2. **Web tokens**: `bikelog_client-web-/app/globals.css`, the `.dark { … }` block and `:root, .dark { … }`.
  3. **Design mockups**: `redesign/extracted/<Screen>.html` at the workspace root (not in any repo). Each file has `isMob` branches with exact inline styles for 375px.
     - Screens: `Dashboard`, `BikeHub`, `FuelLogs`, `Mileage`, `Spending`, `Maintenance`, `Records` (issues/accessories/documents), `Assistant`, `Settings`, `Auth`, `ShellNav`.
     - `redesign/Bike Log redesign.pdf` has the rendered screenshots.
- **Existing app conventions to keep**:
  - `react-native-paper` `Text`, `StyleSheet.create` with static `COLORS`, `@expo/vector-icons` `MaterialCommunityIcons`
  - `KeyboardAwareScrollView`, `react-native-toast-message`, `react-native-gifted-charts`
  - `expo-linear-gradient` is already a dependency; use it for fading rules.
  - Shared components are exported from `components/main/shared/index.ts`.

## Guardrails (apply to every phase)

1. **Don't change data flow.** Every `useFetchData`/`usePost`/`usePatch`/`usePut`/`useDelete` call, query key, URL and payload stays byte-identical. The one allowed addition is a **read-only `useFetchData` that reuses an existing query key** (listed per screen below). Before each commit, run this audit and confirm that only additions appear, and only the ones this spec lists:
   ```bash
   git -C bikelog_app diff -U0 -- components app | grep -E '^[-+].*(useFetchData|usePost|usePatch|usePut|useDelete|url:|payload:|mutateAsync)'
   ```
2. **No new dependencies.** That includes fonts: keep the system font. Inter would need `expo-font` + asset wiring, which isn't worth it.
3. Keep shared component **props backward-compatible**. Only add optional props.
4. Checkpoint after each phase: `npx tsc --noEmit` and `yarn lint` must be clean (compare against the pre-existing warning baseline). Commit per phase on `dev/monir`. Don't push unless asked.
5. Before each commit, run `git -C bikelog_client-web- status --short` and `git -C bikelog_server status --short`. Both must be empty.

## Design

### A. Tokens: `utils/colors.ts` (and `utils/theme.ts`)

Retune the `nocturne` object to the web's `.dark` values:

| Key | Current | Target (web `.dark`) | Notes |
|---|---|---|---|
| `background` | `#161826` | `#161826` | unchanged |
| `surface` / `card` | `#1e2030` | `#232532` | web `--card` |
| `surface2` | `#252840` | `#1f2130` | web `--muted` (skeletons, bar tracks, file chips) |
| `surface3` | `#2e3150` | `#2b2741` | web `--accent` (accent-tinted bg: user chat bubble, image thumbs, active nav) |
| `accent` / `primary` | `#9184d9` | `#9184d9` | unchanged |
| **new** `accentForeground` | — | `#d2cefd` | text on `surface3` |
| `text` | `#e9e9ed` | `#e9e9ed` | unchanged |
| `textLight` | `#a0a3b8` | `#9397ab` | web `--muted-foreground` |
| `textMuted` | `#6b6f8a` | `#75798c` | |
| `placeholder` | `#4a4e6a` | `#595d6c` | |
| `border` | `rgba(255,255,255,0.1)` | `rgba(233,233,237,0.14)` | web `--border` |
| `borderSubtle` | `rgba(255,255,255,0.06)` | `rgba(233,233,237,0.10)` | |
| **new** `edge` | — | `#3f424d` | hairline card elevation (web `--elev-sm`) |
| `success` | `#4ade80` | `#7cbf8e` | |
| `warning` | `#fbbf24` | `#d8a657` | |
| `danger` | `#f87171` | `#e0786e` | |

- `CHART_COLORS`: set it to the web ramp `["#968ae0", "#d2cefd", "#75798c", "#5d5294", "#b2b6ca"]`. Categories use index `min(i, 4)`, like the web.
- Add a helper to `utils/colors.ts`:
  ```ts
  export const tint = (hex: string, alpha: number) => { /* #rrggbb → rgba(r,g,b,alpha) */ };
  ```
  Then **replace every hard-coded old-status literal** with `tint(COLORS.x, a)`. The old literals are the `rgba(74,222,128,…)`, `rgba(251,191,36,…)`, `rgba(248,113,113,…)`, `rgba(145,132,217,…)`, `rgba(30,32,48,…)` and `rgba(46,49,80,…)` values, plus the hex text colours `#fde68a` (`RemindersBanner.tsx:89`) and `#fca5a5` (`EfficiencyAlertBanner.tsx:57`). Those two become `COLORS.warning` and `COLORS.danger`.
  - Find them all with `grep -rn "rgba(\|#f[cd]" components app --include=*.tsx`. As of writing there are ~37 hits across ~22 files: BikeDetailPage, BikeCard, cards for Issue/Accessory/Document/FuelLog/MaintenanceLog, RemindersBanner, EfficiencyAlertBanner, the Mileage and Spending files, the AI cards, SettingsCatalog, and shared `SwitchField`/`ImagePickerField`/`ImageViewerModal`.
  - Leave true black overlays (`rgba(0,0,0,…)`) alone.
- `utils/theme.ts` `paperTheme`: it picks up the new `COLORS` automatically. Also set `surfaceVariant: COLORS.surface2` and `outline: COLORS.border` (already mapped), and `error: COLORS.danger`.

### B. Design rules translated to React Native

| Web concept | RN implementation |
|---|---|
| `panel` card | `backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.edge`. Put this in a shared `Panel` component or a `panelStyle` constant. |
| `shadow-glow` (highlighted card) | `borderColor: COLORS.accent` + `shadowColor: COLORS.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset {0,0}` + `elevation: 6` on Android. Used for: the first bike card, rolling average, spending total, empty-state icon chip, AI composer when empty, active pager number. |
| Tone-tinted outline (reminders, errors) | `borderColor: tint(COLORS.warning or COLORS.danger, 0.4)`, `borderWidth: 1` |
| `.rule-fade` divider | `expo-linear-gradient` horizontal: `[transparent, COLORS.border, COLORS.border, transparent]` with `locations={[0, 0.15, 0.85, 1]}`, height 1 |
| Radii | cards 10, controls/buttons/inputs 8, tags 6, modals 14, pills/segment 8 |
| Type scale | page/hero numbers 30 (odometer), 24 (card hero), 18 (cost), 17 (card title), 15 (header title), 13.5 (body), 13, 12 (meta), 11 (tag, kicker). Kickers: `fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: COLORS.textLight`. Headings use `fontWeight: "500"`, not bold. |
| Numbers | `fontVariant: ["tabular-nums"]` on every odometer, money, liter and km/l value |
| Primary button | **Accent outline**: `borderWidth: 1, borderColor: COLORS.accent`, label `COLORS.accent`, weight 500, height 40–44, radius 8. Pressed state: bg `tint(accent, 0.12)`. |
| Secondary button | `borderColor: COLORS.border`, label `COLORS.text` |
| Destructive button | `borderColor: COLORS.border`, label `COLORS.danger` |
| Tag / status pill | `paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11`. Tones: neutral = bg `COLORS.surface2` / text `COLORS.text`; accent = `surface3` / `accentForeground`; success/warning/danger = bg `tint(c, 0.15)` / text `c`. |
| Money | `৳` prefix. Whole taka unless the value has decimals (web's `formatTaka`). |

### C. Shared components (`components/main/shared/`)

Restyle these to rules B. New props are optional.

- **`ScreenHeader.tsx`**: the web mobile header.
  - Height 52, bottom border `COLORS.border`, bg `COLORS.background`.
  - The back control becomes a **chevron-only** 36×36 hit box. Keep the `backLabel` prop working, but stop rendering its text; it's now just a flag that back exists.
  - Title 15/500, left-aligned after the chevron.
  - New optional `subtitle?: string`, rendered 11px `textLight` under the title. Screens pass the bike nickname: the hub passes `brand model`, and sub-screens pass the nickname.
  - Keep `rightIcon`/`onRightPress` (icon colour `textLight`, 40×40).
- **`PrimaryButton.tsx`**: rules B. Add `variant?: "primary" | "secondary" | "destructive"` (default primary) and `icon?: MaterialCommunityIcons name` (rendered before the label). The default `width: "100%"` stays for back-compat, and an optional `compact?: boolean` gives auto width.
- **`StatusBadge.tsx`**: switch to tone pills (rules B), keeping the `StatusBadge({label, colorKey, colors})` signature working. Remap the exported maps to the web tones:
  - `issueStatusColors`: open → warning, resolved → success
  - `accessoryStatusColors`: pending → neutral, purchased → success, cancelled → neutral
  - `accessoryUrgencyColors`: immediate → danger, medium → warning, low → neutral
  - Store each entry as `{ bg: tint(c, 0.15), text: c }`, or `{ bg: COLORS.surface2, text: COLORS.text }` for neutral.
- **`EmptyState.tsx` / `ErrorState.tsx`**: the web `StateCard`.
  - A panel with left-aligned content: an icon chip (40×40, radius 10), a title (17/500), a message (13 `textLight`), and an optional action.
  - The empty icon chip is accent-coloured with a glow. The error chip is danger-coloured with a `tint(danger, 0.5)` border.
  - `ErrorState` keeps `onRetry` and renders a secondary "Try again" button with a `refresh` icon.
  - Add optional `icon`, `title`, `message` and `action` props, keeping the existing `label` prop working (it maps to the title).
- **`SectionLoading.tsx`**: panels (radius 10, `COLORS.card` + edge) holding `COLORS.surface2` bars with a gentle opacity pulse (`Animated` loop 1 → 0.45, 800ms). Keep the `count` prop.
- **`FormField.tsx`, `SelectPickerField.tsx`, `DatePickerField.tsx`, `SwitchField.tsx`**:
  - Label 12px `rgba(233,233,237,0.7)`, 6px below it the control.
  - Input bg `COLORS.card`, border `COLORS.border` (`COLORS.accent` when focused), radius 8, height 44, 14–15px text, placeholder `COLORS.placeholder`.
  - Error text 12px `COLORS.danger`; required asterisk `COLORS.danger`.
  - `SwitchField` on-track colour `COLORS.accent`.
- **`MonthStepper.tsx` / `YearStepper.tsx`**: the web `PeriodStepper`. That's 40×40 chevron buttons with a `COLORS.border` outline, and a centre label (month: a boxed input-look with a calendar icon; year: plain 17/500 tabular). Disable next when at the current period.
- **New `Panel.tsx`**: `View` with the panel style, plus props `glow?: boolean` and `style`.
- **New `StatTile.tsx`**: label (12 `textLight`), value (24/500 tabular) plus optional unit (13 `textLight`), optional sub (12 `textLight`). It sits inside a Panel with padding 14–16.
- **New `SegmentedTabs.tsx`**:
  - Props `{ value, onChange, options: {value,label}[] }`.
  - A horizontal `ScrollView` of segments inside a 1px `COLORS.border` rounded (8) outline.
  - Each segment has padding 7×12 and 13px text. Segments after the first get a left border.
  - The active segment gets an inner 1px `COLORS.accent` border and accent text; inactive text is `rgba(233,233,237,0.85)`.
- **New `InsightCard.tsx`**:
  - Props `{ kicker, text?, isLoading?, isError? }`.
  - Kicker row: `creation` / `star-four-points-outline` icon 13px + an uppercase 11px kicker in `COLORS.accent`.
  - Body 13.5/lh 21. The loading state shows 3 skeleton bars.
- Export all new pieces from `components/main/shared/index.ts`.
- **Tab bar** (`app/(tabs)/_layout.tsx`): keep the Garage/Settings screens and labels.
  - bg `COLORS.background`, top border `COLORS.border`, active `COLORS.accent`, inactive `COLORS.textLight`, label 11px.
  - Add the web's **2px × 20px active mark** at the top of the active tab. Use a custom `tabBarIcon` wrapper that renders a small `View` above the icon when `focused`.

### D. Screens

Each screen keeps its hooks and handlers. Only JSX layout and `StyleSheet` values change. Every screen needs:
- **loading**: `SectionLoading` shaped like the content
- **error**: `ErrorState` with `onRetry={refetch}`
- **empty**: `EmptyState` with the web's copy (quoted below)

Page padding is 16 horizontal / 14 top, and the gap between blocks is 10–12.

1. **Dashboard**: `components/main/Dashboard/Dashboard.tsx`, `BikeCard.tsx`. Web ref: `components/(main)/Dashboard/Dashboard.tsx`, `Bike/BikeCard.tsx`; mockup `Dashboard.html` (isMob).
   - Top row: `"{n} bikes"` (13 `textLight`) on the left, and a compact primary "Add bike" button with a `plus` icon on the right.
   - Card, top to bottom:
     - nickname 16/500 over `brand model` 12.5 `textLight`, with a chevron-right on the right
     - a baseline row with the odometer 24/500 + "km", and on the right a neutral tag with the reg number (drop `-METRO`, like the mockup's `regShort`, only if it doesn't lose information; otherwise use the full number truncated)
     - a meta line in 12 `textLight`: `"{current−initial} km logged · {tank} L tank · Since MMM yyyy"`
   - The first card gets the glow.
   - Empty: "No bikes yet" / "Add your first bike to start logging fuel, service and spending." with an Add bike action.
   - Data: the existing `["bikes"]`.
2. **Bike hub**: `components/main/Bike/BikeDetailPage.tsx`. Web ref: `Bike/BikeDetailPage/BikeDetailPage.tsx` (mobile branch); mockup `BikeHub.html` (isMob).
   - Header: `ScreenHeader title={nickname} subtitle={brand model}`, back to Garage. The edit pencil moves into the ⋯ menu below.
   - **Odometer panel**:
     - Kicker "ODOMETER" and 30/500 value + "km".
     - Top-right, a 40×40 outlined ⋯ button that opens an action menu (a Paper `Menu`, already in the deps via react-native-paper) with: **Log fuel** (routes to the existing `app/bikes/[bikeId]/fuel-logs/new.tsx` quick-add screen, or opens `FuelLogFormModal` if that's how the fuel screen adds), **Edit bike** (existing `BikeFormModal`), and **Delete bike** (existing `confirmDelete` flow, in danger colour).
     - Then a fading rule, then a 3-column mini-stat row (12 `textLight` label over a 15px value): **Avg mileage**, **{MMM} spend**, **Lifetime**.
   - **Mini-stat data**. These are the allowed new read-only fetches, and they reuse the exact existing keys:
     - `["mileage", "history", bikeId]` → `/bikes/${bikeId}/mileage`. Avg = mean `mileageKmPerLiter` of the latest ≤5 `exactRecords` (by `periodEndDate`), else `approximate.mileageKmPerLiter`, else "—". Same logic as the web's `getAvgMileage`.
     - `["mileage", "lifetime", bikeId]` → `/bikes/${bikeId}/mileage/lifetime` → `totalDistanceKm`.
     - `["spending", bikeId, "month", format(now,"yyyy-MM")]` → `/bikes/${bikeId}/spending-summary?period=month&targetMonth=yyyy-MM` → `totalSpending`. **Check the exact URL string `Spending.tsx` uses for the month period, and use the same one** so it's one cache entry.
   - Then `RemindersBanner` (restyled, below), then `EfficiencyAlertBanner` (restyled: danger-tinted outline, `alert` icon, text `COLORS.text`/`textLight`).
   - **Section tiles**: a 3-column grid of panels, each 76 tall with padding 12. An accent icon (18) sits top-left and the label (12.5) bottom-left. Keep the existing `TILES` list: 8 tiles, no Manual, which is out of scope.
   - Remove the old stats strip and the bottom "Delete Bike" button; delete now lives in the ⋯ menu.
   - **`RemindersBanner.tsx`** (`components/main/MaintenanceLog/`), per reminder row:
     - Panel with tone outline: overdue → danger, else warning.
     - Icon: `alert-outline` if overdue, `clock-outline` if upcoming.
     - Name 13.5/500.
     - Distance line 12 `textLight`:
       - `nextDueOdometer != null`: overdue → `"{bike.currentOdometer − nextDueOdometer} km past due"` (the server clamps `kmRemaining` to 0 once overdue, so derive it from the bike, `["bikes", bikeId]` cache), else `"{kmRemaining} km left"`
       - else `daysRemaining` → `"{|d|} days past due"` / `"{d} days left"`
     - Right-aligned status pill "Overdue" (danger) or "Upcoming" (warning).
     - Web ref: `MaintenanceLog/RemindersBanner.tsx` (`getDistanceLine`).
3. **Fuel logs**: `components/main/FuelLog/FuelLog.tsx`, `FuelLogCard.tsx`. Web ref: `fuelLog/FuelLog.tsx` (mobile card rows); mockup `FuelLogs.html` (isMob).
   - Top row: `"{meta} fill-ups"` + a compact "Add" button.
   - **Card row** (panel, padding 12/12/12/14, row layout):
     - Left column:
       - date (12 `textLight`) + Full (success) or Partial (neutral) tag
       - cost 18/500 `৳x,xxx.xx` + `"{liters} L · ৳{ppl}/L"` (13 `textLight`)
       - `"{odometer} km · {station}"` (12 `textLight`, 1 line)
     - Right column: a ⋯ menu (Edit/Delete) on top and a 32×32 receipt thumb below.
       - Thumb with image: `surface3` bg.
       - Thumb without: `border` outline + `plus` icon.
   - Keep the existing per-log mileage badge if `FuelLogCard` shows one: a small accent tag "44.9 km/l".
   - Pager (if paginated): `"1–10 of 46"` + 40×40 prev/next + `"1 / 5"`.
   - **Closed-period lock (optional, only if cheap)**: `types/mileage.types.ts` already has `fuelLogIds: string[]` on records. If `FuelLog.tsx` already reads `["mileage","history",bikeId]` (spec 37 notes that it does), build `Map<fuelLogId, "Locked — part of a closed mileage period (d MMM → d MMM)">`. For locked logs, disable Edit/Delete in the ⋯ menu and show the note. The server rejects edits of these logs anyway (`fuelLog.service.ts` "part of a closed mileage record").
   - Empty: "No fill-ups yet" / "Mark full-tank fills so Bike Log can work out exact km/l."
4. **Mileage**: `components/main/Mileage/*`. Web ref: `Mileage/*`; mockup `Mileage.html` (isMob, tabs history/monthly/yearly/lifetime/trends).
   - `Mileage.tsx`: `SegmentedTabs` (History/Monthly/Yearly/Lifetime/Trends) replaces the current tab control, with `InsightCard` ("AI mileage insight") below the tab content.
   - The `EfficiencyAlertBanner` placement stays as it is today.
   - **History**:
     - A glow panel: "Rolling average" (12 `textLight`) with 30/500 value + km/l. On the right, "Based on last N fills" and "Exact · full tanks" (success) or "Estimate · partial fills" (warning).
     - Then the "EXACT RECORDS" kicker and a record panel per record: period `dd MMM → dd MMM yyyy` (12.5 `textLight`), `"{dist} km · {liters} L"`, km/l 17/500 on the right, and a 3px bar at the bottom (track `surface2`, fill `CHART_COLORS[0]`, width = kmpl / max kmpl).
     - Empty: "No mileage data yet" / "Mileage is calculated when a full-tank fill closes a period. Log two full-tank fills to see your first exact km/l."
   - **Monthly**: `MonthStepper` + a 2×2 `StatTile` grid: Distance km, Fuel used L, Fill-ups, Average (derived) km/l.
   - **Yearly**: `YearStepper`, then a "Distance by month" panel with the gifted-charts `BarChart` (12 months, bar colour `CHART_COLORS[0]`, axis labels `textLight`, no rules/axis lines), then a panel list of month rows (Month / distance / liters / fills).
   - **Lifetime**: the same 2×2 `StatTile` grid (Total distance, Fuel used, Fill-ups, Average).
   - **Trends** (`MileageTrendTab.tsx`): "Distance, last 6 months" panel. Bars are `CHART_COLORS[0]`, with earlier months at 55% opacity (`tint`) and the current month solid; value labels go on top.
5. **Spending**: `components/main/Spending/*`. Web ref: `Spending/*`; mockup `Spending.html` (isMob).
   - `SegmentedTabs` (Month/Year/Lifetime/Trend) + the period control (`MonthStepper`/`YearStepper`) + the existing PDF export button as a compact secondary button "PDF" with a `download` icon.
   - Summary:
     - Glow panel: `"Total spending · {period label}"` (12 `textLight`) and the total at 34/500 tabular.
     - On Month, a right-aligned `"৳x.xx / day"` + `"over N days this month"`, reusing the existing avg-daily-expense logic from spec 26.
   - "BY CATEGORY" kicker, then one panel with a row per category (sorted desc): an 8×8 colour square `CHART_COLORS[min(i,4)]`, name, amount on the right, and a second line with a 3px bar (width = total / max) and `"{pct}%"` right-aligned.
   - Trend (`SpendingSummaryView`/chart file):
     - Bars as in Mileage Trends.
     - The donut (existing gifted-charts `PieChart`) is recoloured to the ramp, with the legend beside it: colour square, name, %.
   - `InsightCard` "AI spending insight".
   - Empty: `"Nothing spent in {period}"` / "Fuel logs, maintenance logs and purchased accessories dated in this period will appear here."
6. **Maintenance**: `components/main/MaintenanceLog/MaintenanceLog.tsx`, `MaintenanceLogCard.tsx`. Web ref: `MaintenanceLog/*`; mockup `Maintenance.html` (isMob).
   - Top row: `"{n} services logged"` + Add, then `RemindersBanner`, then log panels.
   - Log panel, top to bottom:
     - Top row: 56×56 service image thumb (existing `ImagePickerField`/thumb, radius 8), type name 500 + oil tag (accent tone, if `oilType` is an object with `name`), `"dd MMM yyyy · {odo} km"` 12 `textLight`, and edit/trash icon buttons 32×32 on the right.
     - A 3-column grid: Cost (`৳`, 13.5/500), Interval (`{intervalKmUsed} km` or —), Next due (`{nextDueOdometer} km`, else `nextDueDate` formatted, else —).
     - Service center + parts as neutral tags, and notes (12.5 `textLight`), when present.
   - Empty: "No service history yet" / "Log a service with an interval (km) or a next due date and Bike Log will remind you when it's due."
7. **Issues / Accessories / Documents**: `components/main/BikeIssue/*`, `BikeAccessory/*`, `BikeDocument/*`. Web ref: the same-named folders; mockup `Records.html` (isMob).
   - **Issues**:
     - Keep the existing status filter (spec 32: Open default, no "All"), restyled as `SegmentedTabs`.
     - Card: title 500 + Open (warning) / Resolved (success) pill, `"Reported dd MMM yyyy"` 12 `textLight`, and 3 icon buttons (edit, toggle `check` in success colour or `undo`, trash).
     - Description 13 `textLight`, then image thumbs at 56×56 radius 8 (`surface3` bg), plus an add tile (outline, `plus`, `"{5−n} left"` 10px).
     - Empty: "No issues reported" / "Note down rattles, leaks or warning lights with photos so you can show the mechanic."
   - **Accessories**:
     - Keep the existing status filter (spec 32: Pending default), restyled as `SegmentedTabs`.
     - Card: 56×56 product thumb, name 13.5/500 + ⋯ menu (edit/delete), an urgency tone pill + price (`৳` or "No price" `textLight`), and `"Purchased dd MMM yyyy"` when purchased. Cancelled cards render at opacity 0.6.
     - The web groups by status under "PENDING 2" style kickers. Since the app filters by status already, show a single kicker for the current filter with its count.
     - Empty: "Wishlist is empty" / "Track accessories you plan to buy. Marking one purchased adds its price to spending."
   - **Documents**:
     - Card: title 500 + expiry pill (≤0 days "Expired" danger; ≤30 days `"Expires in N days"` warning; else `"Expires dd MMM yyyy"` neutral), description 12.5 `textLight`, 2 icon buttons.
     - Files as 40-tall chips (`surface2` bg, accent file/image icon, truncated name), plus an "Attach" outline chip with a `paperclip` icon.
     - Sort the page's documents soonest-expiry first, with no-expiry last (a client-side sort only, like the web).
     - Empty: "No documents yet" / "Keep registration, tax token, insurance and licence copies here with their expiry dates."
8. **AI Assistant**: `components/main/AiAssistant/AiAssistant.tsx`. Web ref: `AiAssistant/AiAssistant.tsx`; mockup `Assistant.html` (isMob).
   - **Empty state**:
     - A glow icon chip, `"Ask about {nickname}"` 18/500, and "Answers use this bike's fuel, mileage, maintenance and spending." (13.5 `textLight`).
     - Tappable starter-prompt chips (outline, radius 8, 13px) that send the prompt: "When is my next oil change due?", "Why did my mileage change recently?", "How much did I spend on fuel this year?", "What tyre pressure does the manual recommend?".
   - User bubble: `surface3` bg, `accentForeground` text, radius 12/12/4/12, max 80%.
   - Assistant bubble: card + edge, radius 12/12/12/4, max 86%, existing markdown renderer restyled (bold 600, list indent 18, code bg `surface2`).
   - "AI is thinking…" bubble with an `ActivityIndicator`.
   - Composer: a panel with radius 12 and padding 6 (glow when there are no messages), the multiline input, and a 40×40 accent-outline send button.
   - The nickname comes from the existing `["bikes", bikeId]` cache (a read-only reuse).
9. **Settings catalog**: `components/main/SettingsCatalog/SettingsCatalog.tsx` (`app/(tabs)/settings.tsx`). Web ref: `SettingsCatalog/{Catalog,CatalogCard,MaintenanceTypeSection,EngineOilTypeSection}.tsx`; mockup `Settings.html` (isMob).
   - Two panels: "Maintenance types" (sub: "Shared catalog · used by maintenance logs and reminders") and "Engine oil types" (sub: "Suggested interval pre-fills the Engine Oil service form").
   - Each panel has a header row with a compact Add button that toggles the existing add form, then a mini table: uppercase 11px headers NAME / KM / DAYS (or SUGGESTED KM), 44-tall rows with a fading bottom rule, and values right-aligned in `textLight` ("—" for null).
   - The pencil button uses the existing inline edit (spec 35); edit mode swaps the row to inputs + check/close icons.
   - **No delete** (no API route).
   - Keep the rest of the Settings screen (logout etc.) as-is, restyled with shared buttons.
10. **Auth**: `app/auth.tsx`, `app/register.tsx`, `components/main/Auth/LoginForm.tsx`, `RegisterForm.tsx`. Web ref: `feature/auth/{AuthLayout,LoginForm,RegisterForm}.tsx`; mockup `Auth.html` (isMob).
    - Layout top to bottom:
      - brand row (26×26 radius-7 accent-glow chip with a `motorbike` icon + "Bike Log" 16/500)
      - heading 26/500: "Welcome back" / "Create your account"
      - lede 13.5 `textLight`: "Log in to your garage." / "Start logging your first bike in a minute."
      - fields (44 tall)
      - a full-width primary button: "Log in" / "Create account"
      - the switch line: "New to Bike Log? **Create an account**" / "Already have an account? **Log in**" in accent
    - **Login error**: an inline banner above the fields (danger-tinted bg `tint(danger,0.08)`, danger outline, `alert` icon, the server message) instead of, or in addition to, the toast. Keep the toast if removing it is risky.
    - The server returns **403** for a wrong password. Don't route 401 handling through this: `utils/axiosInstance.ts`'s 401 path clears the session.
11. **Form modals + quick add**: `*FormModal.tsx` in each domain, `FuelLog/QuickAddFuelLogScreen.tsx`, `app/bikes/[bikeId]/fuel-logs/new.tsx`.
    - They pick up the restyled shared fields and buttons automatically.
    - Also set the modal/sheet surface to `COLORS.card` with radius 14 at the top (or all corners for centred dialogs), the title 20/500, and the actions row as Cancel (secondary) + Save (primary).
    - `ConfirmDelete.ts` uses the native `Alert` and stays as-is.

## Implementation order (commit after each, on `dev/monir`)

1. **Phase 1, tokens**: section A. Commit message: `feat(ui): retune Nocturne tokens to web parity (spec 38)`.
2. **Phase 2, shared**: section C, including the tab bar. Screens should still render; verify quickly.
3. **Phase 3, screens**: section D in order 1 → 11. You may split this into 2–3 commits (e.g. 1–3, 4–6, 7–11).
4. **Phase 4, docs**:
   - spec status → ✅, with an Implementation notes section added here
   - the `progress-tracker.md` row + a Recent Activity entry
   - a spec 38 row in `specs/00-build-plan.md` (that index currently stops at spec 30, a pre-existing gap; don't backfill 31–37 unless asked)
   - rewrite `ai context/ui-context.md`'s "Colors", "Status Badges", "Spacing & Radius", "Typography" and "Shadows / Elevation" sections to the new values
   - the Known Gaps: Manual screen, Admin screen, no light theme

## Verify

- [ ] `npx tsc --noEmit` clean; `yarn lint` shows no new warnings versus the baseline.
- [ ] The guardrail 1 audit shows only the allowed read-only additions: the hub's 3 reuse fetches, the optional fuel-lock reuse, and the assistant nickname reuse.
- [ ] `bikelog_client-web-` and `bikelog_server` `git status` are empty.
- [ ] **Visual check on Expo web** (`yarn web`) with Playwright at **375×812**:
  - `utils/envConfig.ts` points at the **production** API (`https://bikelog-server.vercel.app`). **Don't create test data there.**
  - Mock `https://bikelog-server.vercel.app/api/**` with fixtures. The web session's script is reusable: `…/scratchpad/shots.py` from the 2026-09-27 web session may be gone, so rebuild it. It fulfilled each route with `{success:true,statusCode:200,message:"ok",data}` shaped per the `types/*.types.ts` files.
  - Seed the session: `context/user.context.tsx` reads AsyncStorage keys **`token`** and **`user`** (JSON). On web, AsyncStorage maps to `localStorage`, so set them via `add_init_script` before load. The token is any JWT-shaped string with a future `exp`.
  - Screenshot every screen and compare against the web's dark mobile screens (`bikelog_client-web-` running `yarn dev` with the same mocks) or the mockups in `redesign/extracted/`.
- [ ] Remind the user that a **real-device pass** (Expo Go / dev client) is still needed. Shadows/glow, gifted-charts, the date pickers and Paper `Menu` positioning render differently on native.

## Known gaps carried forward (don't build in this spec)

- **Manual screen** (`/bikes/[bikeId]/manual`) exists on the web but not in the app. It's a feature, and would need its own spec.
- **Admin error-log screen**: web only (web spec 26). Already noted in the web tracker.
- **Light theme**: the user chose dark-only for the app.

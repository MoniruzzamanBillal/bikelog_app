# UI Context

Pulled directly from `../../expenseTrackerReactNative`'s actual `StyleSheet.create()` calls and `utils/colors.ts` — not invented, not aspirational, same policy as the web app's `ui-context.md`. If this app's real usage stops matching what's described here, fix this doc, don't let it drift.

## Component Library

`react-native-paper` — `Button` (`mode="contained"`, `disabled={isPending}`, `labelStyle`), `TextInput` (borderless-underline look: `borderWidth: 0, backgroundColor: "transparent", padding: 0`, paired with a `borderBottomWidth: 1` wrapper `View` instead of Paper's own outlined/flat variants), `Text` (used for nearly all text, not RN's core `<Text>` directly, since Paper's inherits theme typography for free), `Modal`+`Portal` (edit dialogs), `IconButton`. No component library beyond Paper — no NativeWind, no Tamagui, no styled-components.

Icons: `@expo/vector-icons`'s `MaterialCommunityIcons` exclusively — one icon family, referenced by string name (`"delete"`, `"book-edit-outline"`, `"chevron-left"`, `"cash-multiple"`, `"cash-minus"`, `"arrow-up"`/`"arrow-down"`, `"calendar-today"`). Pick names from the [MaterialCommunityIcons set](https://icons.expo.fyi) for consistency; don't mix in `Ionicons`/`FontAwesome`/etc.

## Colors

`utils/colors.ts` defines a `THEMES` object with 4 alternates (`coffee`, `forest`, `purple`, `ocean`), each the same shape:

```ts
{
  primary: string;      // accent / CTA color
  background: string;   // page/card background
  text: string;          // primary text
  border: string;        // hairline borders
  white: string;          // always "#FFFFFF"
  textLight: string;     // secondary/muted text
  expense: string;        // negative/destructive amounts (domain-specific to the reference project)
  income: string;          // positive amounts (domain-specific to the reference project)
  card: string;             // always same as background in every theme so far
  shadow: string;            // always "#000000"
}
```

`COLORS = THEMES.coffee` is the one actually wired up (`const COLORS = THEMES.coffee`); the other three are dead code, never referenced. **For Bike Log**: define one theme object shaped like the above (minus the `expense`/`income` keys, which are transaction-domain-specific — replace with whatever this app's own semantic colors turn out to need, e.g. a `danger`/`warning`/`success` triplet for the status badges `../PLAN.md` §7 calls for), pick it as `COLORS`, and don't port the other 3 unused alternates forward — build the one palette this app will actually use.

Every component reads colors via `COLORS.foo`, never a hardcoded hex, with exactly one class of exception: one-off gradient/decorative colors used nowhere else (e.g. `TotalBalanceCard`'s `LinearGradient` stops, `["#f7dfd2", "#ebccbc"]`) are inlined at their single use site rather than added to `COLORS` for a color nothing else needs.

## Status Badges (new for this app — no direct precedent)

The reference project has no 3+-state colored-pill pattern to copy (see `../PLAN.md` §7) — `StatusBadge.tsx` needs to be built from scratch as a `View`+`Text` pill: rounded (`borderRadius: 9999` matches the reference project's own pill-shaped buttons, e.g. `yearContainerWrapper`'s `borderRadius: 9999`), `paddingHorizontal`/`paddingVertical` small (the reference project's comparable "current month" chip uses `paddingVertical: 6, paddingHorizontal: 12`), `fontSize` small (`10`–`12` range, matching the reference project's smallest label text), background/text color pair driven by a `Record<Status, {bg: string; text: string}>` lookup passed in as a prop — the RN equivalent of the web app's inline two-tone Tailwind pill classes, just as an actual component since RN has no utility-class shortcut.

## Spacing & Radius

No formal spacing scale exists in the reference project — margins/padding are literal numbers chosen per-component (`marginVertical: 5`, `padding: 12`, `gap: 16`, etc.), not derived from a shared scale. Radius values seen in practice: `6` (cards, buttons), `8` (modals), `10` (gradient card), `20`/`25` (pill buttons), `9999` (fully-round chips/pills). Reuse these same values rather than inventing new ones — e.g. a new list card should be `borderRadius: 6` like every other card in the reference project (`TransactionCard`, `AddTransactionPage`'s wrapper), not a new arbitrary value.

## Typography

No `next/font`-equivalent custom font loading beyond the scaffold's unused `SpaceMono-Regular.ttf` — text uses the system font (`fontFamily: "System"` where set explicitly, otherwise Paper's default). Weight is set via numeric-string `fontWeight` (`"500"`, `"600"`, `"700"`, `"800"`, `"900"`) or the literal `"bold"`, mixed within the same file in the reference project — no strict rule on which to use where; match whichever the nearest existing similar-weight text in the same file already uses. Size range observed: `10`–`30`, with `14`–`16` as the default body-text size and `18`–`30` reserved for headings/totals/prices.

## Shadows / Elevation

Every card-like `View` pairs an iOS shadow (`shadowColor: "#000", shadowOffset: {width:0,height:1-4}, shadowOpacity: 0.1-0.2, shadowRadius: 1-6`) with an Android `elevation` (`1`–`5`, roughly matching the shadow's visual weight) — always both together, never one without the other, since RN doesn't unify these across platforms. Match the existing weight tiers: `elevation: 1` for a plain list row, `elevation: 3`–`5` for a modal/prominent card.

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

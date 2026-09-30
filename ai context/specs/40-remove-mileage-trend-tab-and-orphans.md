# 40: Remove the Mileage Trends tab + orphan-code sweep

Status: ✅ Complete (2026-09-30)

## Goal

Two things, per direct user instruction in one session:

1. Remove the **Trends** tab from the Mileage screen — _"in milage page , i dont need the trand tab .. remove this section"_.
2. _"remove orphan code"_ — sweep the app for code left dead, both by (1) and from earlier work.

## Context — how this differs from spec 25

This is the *third* time the trend charts have moved: spec 18 added them to both
Spending and Mileage, spec 25 removed both **and uninstalled the charting library**,
spec 28 restored both, spec 30 fixed their window to 6 months.

**This spec is deliberately narrower than spec 25.** The instruction named the Mileage
page only, so:

- **Spending's Trend tab stays.** Not mentioned by the user, so not touched.
- **`react-native-gifted-charts` + `react-native-svg` stay installed.** Unlike at spec 25,
  they are no longer used solely by the trend tabs — `YearlyMileageTab.tsx` and
  `Spending.tsx` both still render charts. Verified by grep before deciding, rather than
  reusing spec 25's conclusion, which no longer holds.
- **`CHART_COLORS` / `tint` stay.** Now used by 12 files (`BikeCard`, `StatusBadge`,
  `PrimaryButton`, `EfficiencyAlertBanner`, …), not just charts.

## Design

### Part 1 — Mileage Trends tab

| Path                                          | Action | Notes                                                                                              |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `components/main/Mileage/MileageTrendTab.tsx`  | Delete | Whole file is the chart; referenced only by `Mileage.tsx` (grep-confirmed, single importer).        |
| `components/main/Mileage/Mileage.tsx`         | Modify | Drop `"trends"` from `TTab`, its `TABS` entry, the import, and the render branch.                   |
| `types/mileage.types.ts`                      | Modify | Remove `TMileageTrend` (sole consumer was the deleted file). **Keep `TMonthlySummary`** — still referenced by `TYearlyMileage` in the same file, which the first naive grep missed. |

Backend `GET /bikes/:bikeId/mileage/trend` is **not** touched — shared with the web client
and with `bikelog_server`'s own `ai.service.ts` for mileage insights, and cross-project
rules make this repo read-only w.r.t. it regardless.

### Part 2 — orphan sweep

Swept every `.ts`/`.tsx` under `app/ components/ hooks/ utils/ types/ context/ widgets/`
plus `index.ts` for files never imported and exports never referenced. The first pass
produced **many false positives**; each was re-checked before anything was deleted:

| Flagged                                                            | Verdict         | Why                                                                             |
| ------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------- |
| `components/ui/icon-symbol.tsx`, `.ios.tsx`                        | **Deleted**     | Stock `create-expo-app` template. `IconSymbol` has zero references; this app uses `MaterialCommunityIcons` directly. |
| `hooks/use-color-scheme.ts`, `.web.ts`                             | **Deleted**     | Stock template. `useColorScheme` has zero references; the app is deliberately dark-only (spec 38). |
| `components/ui/` directory                                         | **Deleted**     | Empty after the above.                                                          |
| `widgets/quickAddFuelWidgetTaskHandler.tsx`                         | Kept            | Referenced from `index.ts` (widget entry), not by a TS import.                   |
| `widgets/QuickAddFuelWidget.tsx`                                   | Kept            | Referenced from `app.json`'s `react-native-android-widget` plugin block.         |
| `types/images.d.ts`                                                | Kept            | Ambient declaration — consumed implicitly by `tsc`, never imported by design.    |
| `unstable_settings` (`app/_layout.tsx`)                            | Kept            | `expo-router` framework convention, read by the router not by app code.          |
| `TMonthlySummary`, `TApproximateMileage`, `TEfficiencyAlert`, …     | Kept            | False positives — used **within their own file** by other types. First pass only checked cross-file references. |
| `TUpdate*Payload` / `TCreate*Payload` (10 types)                   | **Kept — flagged** | Genuinely unreferenced, but `architecture.md`/`CLAUDE.md` **invariant 3** explicitly asks for server-derived-field constraints to be encoded as types rather than remembered. Deleting them would work against a standing invariant, so this is the user's call, not a silent cleanup. See Open Questions. |

### Part 3 — orphaned dependencies

Cross-checked every `package.json` dependency for any import in source or reference in
`app.json`/`eas.json`. Most no-import hits are **framework/peer requirements and were
kept**: `@react-navigation/*` (expo-router internals), `expo-font`/`expo-linking`/
`expo-system-ui`/`expo-splash-screen`, `react-native-screens`/`reanimated`/`worklets`/
`web`/`react-dom`, and `react-native-svg` (peer of the still-used gifted-charts).

Four were genuinely dead and **removed** via `yarn remove`:

| Package                    | Why dead                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| `expo-symbols`             | Only consumer was `icon-symbol.ios.tsx`, deleted above.             |
| `expo-haptics`             | Stock template (`HapticTab`); never imported in this app.           |
| `expo-web-browser`         | Stock template; never imported.                                     |
| `react-native-collapsible` | Installed at some point, never imported anywhere.                   |

All four confirmed absent from `app.json`'s `plugins` array before removal.

## Implementation

1. [x] Deleted `components/main/Mileage/MileageTrendTab.tsx`.
2. [x] `Mileage.tsx`: removed the `MileageTrendTab` import, `"trends"` from the `TTab`
       union, the `{ value: "trends", label: "Trends" }` `TABS` entry, and the
       `{activeTab === "trends" && …}` render branch. Tab bar is now
       History / Monthly / Yearly / Lifetime; default `"history"` unchanged.
3. [x] `types/mileage.types.ts`: removed `TMileageTrend`; kept `TMonthlySummary`.
4. [x] Grepped for `MileageTrendTab` and `TMileageTrend` — zero remaining references.
5. [x] Orphan sweep as tabled above; deleted the 4 stock-template files + empty
       `components/ui/`.
6. [x] `yarn remove expo-symbols expo-haptics expo-web-browser react-native-collapsible`.
7. [x] Docs: this spec, `00-build-plan.md` row (annotating the 18→25→28→30→40 chain),
       `progress-tracker.md` status row + Recent Activity.

## Verify

- [x] `npx tsc --noEmit` — 0 errors, run after the tab removal **and** again after the
      file/dependency deletions.
- [x] `yarn lint` (`expo lint`) — clean, both times. No unused-import residue.
- [x] Zero remaining references to `MileageTrendTab`/`TMileageTrend` anywhere.
- [x] `package.json` diff contains **only** the 4 intended removals — confirmed by reading
      the diff, so nothing was pulled transitively by mistake.
- [x] Spending's Trend tab left intact; `YearlyMileageTab`'s chart left intact — the two
      reasons the charting library had to stay.
- [ ] **Not rendered on a device or simulator** — the standing gap for every UI change in
      this app. What to eyeball once one is available: the 4-pill `SegmentedTabs` row at
      phone width (it was tuned with 5 pills and uses `fill`, so the pills get wider), and
      that landing on Mileage still defaults to History.
- [ ] **`yarn.lock` changed, which matters for the pending EAS build.** Spec 36's widget is
      still blocked on the user's own `eas build --profile development --platform android`;
      that build will now resolve a lockfile with 4 fewer native packages. Expected to be
      strictly less to link, not more, but it has not been built.

## Open Questions

- **The 10 unused `TUpdate*Payload`/`TCreate*Payload` types** were left in place on purpose
  (invariant 3 wants them; they are also live documentation of which fields the server
  rejects). They are nonetheless dead code by a strict reading of "remove orphan code."
  Say the word and they go — it is a one-line-each deletion across 6 `types/*.ts` files.
- **`npx expo install --check` reports pre-existing version drift** (`expo@54.0.32` vs
  `~54.0.37`, `expo-router`, `expo-constants`, `expo-file-system`, `expo-font`,
  `expo-linking`, and `react-native-gesture-handler@2.30.0` vs the expected `~2.28.0`).
  **None of the four removed packages appear in that list** — this drift predates this spec
  and was deliberately not "fixed", since upgrading the Expo stack is a separate,
  unrequested change with real native-build risk.

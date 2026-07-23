# Bike Log — Mobile App Plan

This file is the brief to hand to Claude Code when mobile work actually starts. It captures: the coding approach to follow (reverse-engineered from `expenseTrackerReactNative`, a finished personal project by the same developer), the backend contract to build against (`bikelog_server`, already complete), and the full feature set to port (`bikelog_client(web)`, already complete and verified end-to-end against the backend). No mobile code exists yet — this folder currently holds only this plan.

## 1. Why this approach

Rather than inventing new conventions, this app should feel like the same hand wrote it as `expenseTrackerReactNative` — that project is finished, works, and represents the developer's actual React Native habits. Sections 2–4 below are a direct analysis of that codebase (file paths cited so they can be re-checked later), not a generic RN template. Section 5 is the backend contract (already fully verified live against `bikelog_server` while building the web app — see `bikelog_client(web)/context/progress-tracker.md` for the trail). Section 6 is the full page list this app needs to reach feature-parity with the web version.

## 2. Stack (reused as-is from `expenseTrackerReactNative`)

| Concern           | Library                                                                             | Notes                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework         | Expo (SDK 54) + `expo-router`                                                       | File-based routing, same as `app/` in the reference project                                                  |
| UI kit            | `react-native-paper`                                                                | `Button`, `TextInput`, `Text`, `Modal`+`Portal`, `IconButton` — no NativeWind/Tailwind, no styled-components |
| Styling           | Plain `StyleSheet.create()` per file, inline style objects for one-offs             | No global design-token file beyond `utils/colors.ts`                                                         |
| Server state      | `@tanstack/react-query` v5                                                          | Same generic hook shape as the web app's `hooks/useApi.ts`, adapted for RN (see §4)                          |
| HTTP              | `axios` with a single configured instance + interceptors                            | `utils/axiosInstance.ts`                                                                                     |
| Auth persistence  | `@react-native-async-storage/async-storage`                                         | No cookies on RN — token + user JSON stored as two AsyncStorage keys                                         |
| Auth state        | React Context (`context/user.context.tsx`), not Redux/Zustand                       | One provider, wraps the whole app in `app/_layout.tsx`                                                       |
| Icons             | `@expo/vector-icons` (`MaterialCommunityIcons`)                                     | Consistent icon family throughout                                                                            |
| Toasts            | `react-native-toast-message`                                                        | `Toast.show({ type, text1, text2?, position })` — RN's equivalent of the web app's `sonner`                  |
| Gestures          | `react-native-gesture-handler` (`Swipeable`)                                        | Swipe-to-reveal delete/edit actions on list rows                                                             |
| Keyboard handling | `react-native-keyboard-controller` (`KeyboardProvider` + `KeyboardAwareScrollView`) | Every form screen is wrapped in `KeyboardAwareScrollView`, not a plain `ScrollView`                          |
| Dates             | `date-fns`                                                                          | `format(date, "dd-MMM-yyy")` style, used at render time only                                                 |
| Confirmation      | `Alert.alert(title, message, [Cancel, Destructive])`                                | RN's equivalent of the web app's `confirm()`                                                                 |

## 3. Folder structure (mirrors `expenseTrackerReactNative` 1:1)

```
app/                              expo-router routes — THIN WRAPPERS ONLY
  _layout.tsx                     Root providers (see §4)
  auth.tsx                        Login screen (outside any tab group)
  register.tsx                    Register screen (outside any tab group)
  (tabs)/
    _layout.tsx                   Tabs.Screen definitions, wraps children in AuthGuard
    index.tsx                     -> renders <Dashboard /> (bike list)
    settings.tsx                  -> renders <SettingsCatalog /> (maintenance types + oil types)
  bikes/
    [bikeId]/
      index.tsx                   -> renders <BikeDetailPage />
      fuel-logs.tsx                -> renders <FuelLog />
      mileage.tsx                  -> renders <Mileage />
      maintenance-logs.tsx         -> renders <MaintenanceLog />
      spending.tsx                  -> renders <Spending />
      issues.tsx                   -> renders <BikeIssue />
      accessories.tsx               -> renders <BikeAccessory />

components/
  main/
    Dashboard/
      Dashboard.tsx                Bike list + create-bike modal
      BikeCard.tsx
    Bike/
      BikeDetailPage.tsx           Hub: info, edit/delete, 6 nav tiles (fuel/mileage/maint/spending/issues/accessories)
      BikeFormModal.tsx
    FuelLog/
      FuelLog.tsx
      FuelLogFormModal.tsx
      FuelLogCard.tsx
    Mileage/
      Mileage.tsx                  Tab switcher: History / Monthly / Yearly / Lifetime
      MileageHistoryTab.tsx
      MonthlyMileageTab.tsx
      YearlyMileageTab.tsx
      LifetimeMileageTab.tsx
    MaintenanceLog/
      MaintenanceLog.tsx
      MaintenanceLogFormModal.tsx
      MaintenanceLogCard.tsx
      RemindersBanner.tsx
    Spending/
      Spending.tsx                 Tab switcher: Month / Year / Lifetime
      SpendingSummaryView.tsx
    BikeIssue/
      BikeIssue.tsx
      BikeIssueFormModal.tsx
      BikeIssueCard.tsx
    BikeAccessory/
      BikeAccessory.tsx
      BikeAccessoryFormModal.tsx
      BikeAccessoryCard.tsx
    SettingsCatalog/
      SettingsCatalog.tsx          Maintenance-type + engine-oil-type inline create + list
    shared/
      StatusBadge.tsx              Generic colored pill (see §7)
      ConfirmDelete.ts              Thin Alert.alert() wrapper (see §7)
      EmptyState.tsx
      SectionLoading.tsx

context/
  user.context.tsx                 Same shape as the reference project's UserProvider

hooks/
  useApi.ts                        useFetchData / usePost / usePatch / useDelete

types/
  global.types.ts                  IUser, TLoginPayload, TRegisterPayload
  bike.types.ts
  fuel-log.types.ts
  mileage.types.ts
  maintenance-type.types.ts
  engine-oil-type.types.ts
  maintenance-log.types.ts
  spending.types.ts
  bike-issue.types.ts
  bike-accessory.types.ts

utils/
  api.ts                           apiGet/apiPost/apiPatch/apiDelete (drop apiPut — bikelog_server has no PUT routes)
  axiosInstance.ts                 See §4 for the one deliberate fix vs. the reference project
  colors.ts                        THEMES object, COLORS = the active one (pick a Bike Log palette, not "coffee")
  envConfig.ts                     baseURL + getBaseUrl()
  AuthGuard.tsx
  SplashScreen.tsx

constants/
  bikeIssueStatus.constant.ts
  bikeAccessoryStatus.constant.ts
```

**Naming note**: the reference project's own domain folders are inconsistently cased (`AddTransaction`, `HistoryPage`, `weeklyTransactionsPage`, `smartAdd`) — don't try to "fix" that inconsistency here by inventing a stricter rule; just default to PascalCase for new folders (`FuelLog`, `BikeIssue`, etc.) since that's the majority pattern, and don't burn time reconciling the reference project's own casing.

## 4. Approach for building things (the "how", not just the "where")

- **Route file = one line.** Every `app/**/*.tsx` file's entire job is `import X from "@/components/main/.../X"; export default function Screen() { return <X />; }`. All logic, state, and JSX lives in the `components/main/` file. This matches both the reference RN project and `bikelog_client(web)`'s established pattern — don't put fetch calls or `useState` in route files.
- **Forms are plain `useState` per field, not react-hook-form.** The reference project has zero react-hook-form usage anywhere (`AddTransactionPage.tsx`, `UpdateTransactionModal.tsx`, `auth.tsx` — all plain `useState<string|null>` per field). This is a deliberate difference from `bikelog_client(web)` (which uses RHF) — don't import react-hook-form into this project just because the web sibling uses it. Validate by hand before submit (`if (!title?.trim()) { Toast.show({type:"error", ...}); return; }`), same shape every time.
- **One `usePost`/`usePatch` call per mutation, invalidate a fixed array of query keys.** E.g. `usePost([["bikeIssues", bikeId]])`, exactly like the reference project's `usePost([["daily-transaction"], ["monthly-transaction"], ...])`. `mutateAsync({ url, payload })` at the call site, never baked into the hook.
- **List screens**: `useFetchData` at the top of the domain page component, a `RefreshControl`-wrapped `ScrollView` (pull-to-refresh is standard here — the web app has no equivalent since browsers don't need it), a skeleton component while `isLoading`, an inline empty-state `<Text>` when the array is empty. Reuse the reference project's `TransactionCardSkeleton`-shape pattern: one skeleton component per list type, not a generic one.
- **Row actions**: wrap each list card in `<Swipeable renderLeftActions={...} renderRightActions={...}>` for delete (left, red) and edit (right, green) — this is the reference project's actual interaction model (see `TransactionCard.tsx`), not tap-to-reveal icon buttons like the web app's card action row. Track "only one row open at a time" via a `useRef<Swipeable|null>` passed down as `onSwipeOpen`, exactly as `HomePage.tsx` does.
- **Delete confirmation**: `Alert.alert(title, message, [{text:"Cancel", style:"cancel"}, {text:"Delete", style:"destructive", onPress: ...}])`. Never a custom modal for this — the reference project never builds one.
- **Edit modals**: `react-native-paper`'s `<Portal><Modal visible={open} onDismiss={...}>...</Modal></Portal>`, not a full-screen route. Same `KeyboardAwareScrollView` wrapper inside as the create form. Pre-fill via a `useEffect` keyed on the `initialValue` prop (see `UpdateTransactionModal.tsx`) — this is one place the RN project's convention differs from the web app's `defaultValues`-on-remount trick (Paper's `Modal` doesn't unmount its children the same way Radix's `Dialog` does, so `defaultValues`-only would go stale on reopen without a fresh key).
- **Two-way toggle fields** (e.g. income/expense) are a pair of `TouchableOpacity` "pill" buttons with an active/inactive style pair, not a native picker. **3+-option fields** (bikeIssue's future-proofed fields, `bikeAccessory`'s `urgency`/`status`, `maintenanceLog`'s `maintenanceType`/`oilType` catalog pickers) have **no working precedent in the reference project** — `@react-native-picker/picker` is a listed dependency but is never actually imported anywhere in the app (confirmed by grep), so treat it as available-but-unproven. Recommended default: `@react-native-picker/picker`'s `<Picker>` for catalog/enum selects, styled to match the rest of the form's borderless-underline look. Fall back to `react-native-paper`'s `Menu` component if `Picker`'s visual style fights too hard with Paper's `TextInput`s. This is a real open decision — resolve it once, in one shared component, not per-form.
- **Colors**: everything reads from `COLORS` (`utils/colors.ts`), never a hardcoded hex except inside `THEMES` itself. Pick one theme object as `Bike Log`'s palette (the reference project ships 4 unused alternates — `coffee`/`forest`/`purple`/`ocean` — and only `coffee` is ever active; don't port all 4, just build the one this app will actually use, `THEMES` can grow later if theming is ever wanted).
- **Currency**: `৳` prefix literal, matching both sibling projects.

## 5. Backend contract (already built and fully verified — `bikelog_server`)

Same backend as the web app, already live-verified via `curl` for every module during this session (see `bikelog_client(web)/context/progress-tracker.md`'s Recent Activity for the full trail). Do not re-derive this from scratch — read `bikelog_server/CLAUDE.md` first, then these key shared facts:

- **Envelope**: `{ success, message, data, token? }` — HTTP status is the status code, never a `statusCode` key in the body.
- **List pagination**: `data: { result: T[], meta: number }` — `meta` is a **raw total-count number**, not a rich pagination object. `totalPages = Math.ceil(meta / limit)` computed client-side, every time, every module.
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login` (returns `{ token }` top-level, `data` is the user). One JWT, no refresh endpoint — expired means log in again.
- **Nested-resource pattern**: `fuelLog`, `mileageRecord`, `maintenanceLog`, `spending`, `bikeIssue`, `bikeAccessory` all live under `/bikes/:bikeId/...`, ownership-checked server-side against the logged-in user.
- **`bikeIssue`**: `status: "open"|"resolved"`, changed **only** via `PATCH /:id/status` (guarded, same-status re-send 400s). Generic `PATCH /:id` silently strips any `status` sent.
- **`bikeAccessory`**: `urgency: "immediate"|"medium"|"low"` (required), `status: "pending"|"purchased"|"cancelled"` (defaults `pending`) — both freely settable via the generic `PATCH /:id`, no guard.
- **`maintenanceLog`**: never send `nextDueOdometer` — server-computed. `GET /bikes/:bikeId/reminders` returns `{ reminders: [...] }`, only actually-due/upcoming items.
- **Aggregation convention**: mileage/spending stats are totals only — averages are always computed **client-side**, never returned pre-computed by the API.
- Full per-module field lists, enums, and endpoint tables: `bikelog_server/context/specs/` (specs 01–11) and `bikelog_client(web)/context/specs/` (specs 01–12, already ported to a working, verified frontend once — treat those as the most reliable field-shape reference of all, since they were checked against live responses, not just spec prose).

## 6. Screens to build (mirrors `bikelog_client(web)`, already shipped and verified)

| #   | Screen                       | Web reference                          | Notes                                                              |
| --- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| 1   | Login                        | `app/login/page.tsx`                   | Plain `useState` fields (not RHF, per §4)                          |
| 2   | Register                     | `app/register/page.tsx`                | Same                                                               |
| 3   | Dashboard (bike list)        | `app/(main)/dashboard/page.tsx`        | Card grid + create-bike modal                                      |
| 4   | Bike hub                     | `app/(main)/bikes/[bikeId]/page.tsx`   | Info card, edit/delete, 6 nav tiles                                |
| 5   | Fuel logs                    | `.../fuel-logs/page.tsx`               | List + create/edit modal + delete                                  |
| 6   | Mileage                      | `.../mileage/page.tsx`                 | 4 sub-tabs: History / Monthly / Yearly / Lifetime                  |
| 7   | Maintenance logs + reminders | `.../maintenance-logs/page.tsx`        | List + reminders banner + create/edit modal                        |
| 8   | Spending                     | `.../spending/page.tsx`                | 3 sub-tabs: Month / Year / Lifetime                                |
| 9   | Issues                       | `.../issues/page.tsx`                  | List + status filter + status-toggle action (not the generic edit) |
| 10  | Accessories                  | `.../accessories/page.tsx`             | List + status/urgency filters                                      |
| 11  | Settings / catalog           | `app/(main)/settings/catalog/page.tsx` | Maintenance-type + engine-oil-type inline create + list            |

No new screens beyond this list — feature-parity with the finished web app is the whole scope of v1 mobile, same as how the web app itself was explicitly scoped as "v1 prototype, RN app is the real target" (see `bikelog_client(web)/context/project-overview.md`). This mobile app **is** that real target now; don't add anything the web version doesn't already have.

## 7. Small shared components worth building once, up front

- **`StatusBadge.tsx`** — `{ label, colorKey }` → colored pill `View`+`Text` (RN has no CSS pill class, so this needs to be a real component, unlike the web app's inline Tailwind string). One shared component fed different `Record<string,{bg,text}>` lookup tables per domain (issue status, accessory status, accessory urgency) — mirrors the _pattern_ of the web app's `isFullTank` badge, but must be a component here since there's no utility-class shortcut in RN.
- **`ConfirmDelete.ts`** — a one-line wrapper around `Alert.alert(...)` so every list screen calls `confirmDelete(label, onConfirm)` instead of re-typing the 3-option array each time (the reference project duplicates this inline in both `TransactionCard.tsx` and `AddTransaction`-adjacent screens — worth deduplicating here since Bike Log has 6+ deletable list types vs. the reference project's 1).
- **`EmptyState.tsx`** / **`SectionLoading.tsx`** — same reasoning: the reference project repeats `<Text style={{fontWeight:"600", fontSize:24, color:"red"}}>No X yet!!!</Text>` per screen; with 6+ list screens here, extract it once.

## 8. Things observed in `expenseTrackerReactNative` to deliberately NOT copy

- **`utils/axiosInstance.ts`'s error interceptor swallows rejections**: it does `return error;` instead of `return Promise.reject(error);` on failure (only the 401 branch does real cleanup). This means axios calls resolve "successfully" even on HTTP errors, so any `try/catch` around `mutateAsync` in a component can't reliably distinguish success from failure beyond what the interceptor's own `Toast.show()` already fired. `bikelog_client(web)/utils/axiosInstance.ts` does this correctly (normalizes to a flat `{statusCode, message, errors}` object and actually rejects) — port that version's error-handling shape instead, keep the RN project's request-interceptor (token attach) and 401-redirect logic as-is.
- **Scaffold leftovers never touched by real screens**: `components/themed-text.tsx`, `components/themed-view.tsx`, `components/parallax-scroll-view.tsx`, `components/external-link.tsx`, `components/hello-wave.tsx`, `components/haptic-tab.tsx`, `app/modal.tsx` (only consumer of the `themed-*` pair), `constants/theme.ts` (default Expo `Colors`/`Fonts`, superseded by `utils/colors.ts`), `hooks/use-color-scheme*.ts`/`use-theme-color.ts`. Don't carry these over from a fresh `create-expo-app` scaffold — delete them in an early cleanup pass, same as `bikelog_client(web)`'s spec 01 did for its inherited Next.js scaffold.
- **`@react-native-picker/picker` is a declared-but-unused dependency** in the reference project (confirmed via grep — zero imports anywhere). Don't assume it's a proven pattern just because it's already in `package.json`; it needs a first real usage and a styling decision here (see §4).
- **The `Transaction.tyes.ts` filename typo** (should be `.types.ts`) — don't propagate typos into new filenames just because a sibling project has one; this one is purely accidental, unlike `bikelog_server`'s `Queryuilder` typo (which is load-bearing/grepped-for and documented as intentional-to-leave).
- **`smart-add` (AI prompt-to-transaction) has no Bike Log equivalent** — it's a feature specific to the expense tracker's domain (free-text → structured transactions via an LLM prompt endpoint). Nothing in `bikelog_server` supports anything like it (the two `openRouter`-related files in the backend are explicitly documented as unused boilerplate). Don't port this screen or its pattern.

## 9. Open decisions to make when implementation actually starts

- Final palette for `COLORS` (a new `THEMES` entry, or reuse `coffee`/pick one of the 3 unused alternates) — purely aesthetic, not urgent to decide now.
- `Picker` vs. Paper `Menu` for 3+-option selects (§4) — resolve once, in `components/main/shared/`, before the first form that needs it (`bikeAccessory`'s form is the simplest first case: two selects, no catalog dependency).
- Whether `(tabs)` should include a persistent "Settings" tab (as sketched in §3) or Settings should hang off a header icon instead, mirroring the web app's `AppShell` gear icon rather than a full tab slot — the reference project's tab bar has 6 items already for a single-entity app; Bike Log's dashboard-first flow may not want a crowded tab bar once bike-scoped nested screens are added.

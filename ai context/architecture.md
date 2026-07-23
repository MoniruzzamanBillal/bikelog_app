# Architecture

## Stack

| Layer | Technology | Role |
|---|---|---|
| Framework | Expo (SDK 54) + `expo-router` | File-based routing. Every route file is a thin wrapper — see System Boundaries. |
| UI kit | `react-native-paper` | `Button`, `TextInput`, `Text`, `Modal`+`Portal`, `IconButton`. No NativeWind/Tailwind, no styled-components — this is the reference project's actual choice, not a default. |
| Styling | Plain `StyleSheet.create()` per file, inline style objects for one-offs | No design-token system beyond `utils/colors.ts`'s `COLORS` object. |
| Server state | TanStack Query v5, via `hooks/useApi.ts` | Same generic-hook shape as the web app's `hooks/useApi.ts`, ported to RN's storage model. |
| HTTP client | axios, `utils/axiosInstance.ts` | Single instance, `Authorization: Bearer` header from `AsyncStorage`, response envelope unwrapping. |
| Auth persistence | `@react-native-async-storage/async-storage` | No cookies on native — token + user JSON as two AsyncStorage keys. |
| Auth state | React Context (`context/user.context.tsx`) | Not Redux/Zustand — one provider, wraps the app in `app/_layout.tsx`. |
| Icons | `@expo/vector-icons` (`MaterialCommunityIcons`) | One icon family throughout, matching the reference project. |
| Toasts | `react-native-toast-message` | RN's equivalent of the web app's `sonner`. |
| Gestures | `react-native-gesture-handler` (`Swipeable`) | Swipe-to-reveal delete/edit on list rows — the RN equivalent of the web app's hover-revealed icon buttons. |
| Keyboard handling | `react-native-keyboard-controller` | `KeyboardProvider` at the root, `KeyboardAwareScrollView` on every form screen. |
| Dates | `date-fns` | Render-time formatting only, same as the web app's `toLocaleDateString()` usage. |
| Confirmation | `Alert.alert()` | RN's equivalent of the web app's `confirm()`. |

## Reused vs. adapted from `expenseTrackerReactNative`

This app is bootstrapped conceptually (not literally copy-pasted) from `../../expenseTrackerReactNative`, a finished, working RN app by the same developer — reused specifically for its folder structure and component-building habits, the same way the web app reused an old scaffold specifically for its shared component library. See `../PLAN.md` for the full file-by-file analysis this section summarizes.

- **Reused as-is:** the entire stack table above, the `app/` = thin-wrapper / `components/main/<Domain>/` = real-screen split, the `Context` + `AsyncStorage` auth model, the generic `useFetchData`/`usePost`/`usePatch`/`useDelete` hook shape, plain-`useState` forms with manual `Toast.show()` validation (no react-hook-form — a deliberate difference from the web sibling, see `code-standards.md`), `Swipeable` row actions, `Alert.alert()` confirmations, `KeyboardAwareScrollView` on every form.
- **Adapted, not copied verbatim:**
  - `utils/axiosInstance.ts`'s **error interceptor is fixed, not ported as-is** — the reference project's version does `return error;` instead of `return Promise.reject(error);` on failure (only its 401 branch does real cleanup), which means axios calls "succeed" even on HTTP errors and a component's `try/catch` around `mutateAsync` can't reliably tell success from failure beyond whatever toast the interceptor itself already fired. Port `bikelog_client(web)/utils/axiosInstance.ts`'s error-handling shape instead (normalize to a flat error object and actually reject the promise), keeping the reference project's request-interceptor token-attach and 401-redirect logic as-is.
  - `hooks/useApi.ts` drops `useUpdateData` (a PUT-based hook the reference project has but never really needs either) — `bikelog_server` has no `PUT` routes, same reasoning the web app already used to drop `apiPut`.
  - Edit-modal prefill uses a `useEffect` keyed on the entity prop (`UpdateTransactionModal.tsx`'s pattern), **not** the web app's `defaultValues`-on-remount trick — Paper's `Modal` doesn't unmount its children on close the way Radix's `Dialog` does, so `defaultValues`-only would go stale on reopen without a fresh remount to re-read it.
  - Multi-option select fields (`urgency`, `status`, catalog pickers) have **no working precedent** in the reference project — see `code-standards.md`'s note on `Picker` vs. Paper `Menu`, an open decision to resolve once, in one shared component.
- **Deliberately left behind:** `expenseTrackerReactNative`'s scaffold leftovers (`components/themed-*`, `components/parallax-scroll-view.tsx`, `components/external-link.tsx`, `components/hello-wave.tsx`, `components/haptic-tab.tsx`, `app/modal.tsx`, `constants/theme.ts`, `hooks/use-color-scheme*.ts`, `hooks/use-theme-color.ts`) — these are default `create-expo-app` output never touched by that project's real screens either (confirmed by grep — only `app/modal.tsx` itself, also unused, references `themed-*`). Don't carry over a fresh scaffold's dead weight into a project that's planning its real screens from day one; there's no "clean-up spec" needed here the way the web app needed spec 01, because nothing dead is being inherited in the first place — just don't run `npx create-expo-app`'s default template output forward past initial setup.
- **Not relevant:** `smart-add` (AI prompt-to-transaction) and its backing endpoint — domain-specific to the expense tracker, no `bikelog_server` equivalent (its `openRouter`-related files are documented backend boilerplate, unused).

## System Boundaries

- **`app/`** — routes only. Every file's entire body is an import + a one-line render of a `components/main/` component. No fetch calls, no `useState`, no business logic here — see `code-standards.md`'s Route Table for the full list.
- **`app/(tabs)/`** — top-level tab group (Dashboard, Settings — see the open question in §9 of `../PLAN.md` about whether Settings deserves a full tab slot). Wrapped in `AuthGuard` at `app/(tabs)/_layout.tsx`, mirroring the reference project's own `_layout.tsx` exactly.
- **`app/auth.tsx`, `app/register.tsx`** — outside the tab group, the only screens reachable without a session.
- **`app/bikes/[bikeId]/`** — bike-scoped stack, outside `(tabs)` so the tab bar doesn't follow the user into a drill-down flow (a genuinely new structural decision vs. the reference project, which has no nested-resource concept at all — see `../PLAN.md` §3 for the proposed tree).
- **`components/main/<Domain>/`** — one folder per backend module (`Dashboard`, `Bike`, `FuelLog`, `Mileage`, `MaintenanceLog`, `Spending`, `BikeIssue`, `BikeAccessory`, `SettingsCatalog`). Each domain's list screen, create/edit modal, and card component live here — same split as both the reference project's `components/main/<Domain>/` and the web app's `components/(main)/<Domain>/`.
- **`components/main/shared/`** — cross-domain reusable pieces: `StatusBadge`, `ConfirmDelete`, `EmptyState`, `SectionLoading` (see `../PLAN.md` §7 for why these are worth building once, up front, given this app has 6+ list screens vs. the reference project's 1).
- **`context/`** — just `user.context.tsx`, matching the reference project's single-provider auth model.
- **`hooks/`, `utils/`, `types/`, `constants/`** — cross-cutting, laid out in `../PLAN.md` §3's tree.

## Storage Model

- **Auth token + user**: two `AsyncStorage` keys (`token`, `user`), read once on mount into `UserContext`, written on login/logout via `handleSetToken`/`handleSetUser`. No cookies exist on native — this is the RN-native equivalent of the web app's `cookies-next` cookie, not a downgrade.
- **Server state**: TanStack Query cache only, same as the web app — no data duplicated into component state beyond what a form needs mid-edit.
- **Client UI state**: local `useState` only. No global client-state library, matching the web app's Invariant 6 and the reference project's own actual practice.
- **"Current bike" context**: the `:bikeId` route param (`useLocalSearchParams<{ bikeId: string }>()` in expo-router), never a global store — same reasoning as the web app's Invariant 2.

## Auth & Access Model

Same backend, same token shape as the web app (`bikelog_server` issues one long-lived JWT, no refresh endpoint — expired means log in again), but the mechanics are RN-native, mirroring `expenseTrackerReactNative`'s actual implementation:

- **`context/user.context.tsx`** (ported from the reference project almost verbatim): `UserProvider` holds `user`, `token`, `isLoading` in state, hydrates both from `AsyncStorage` in a mount-only `useEffect`, exposes `handleSetUser`/`handleSetToken` (write-through to both state and `AsyncStorage`) and `logoutFunction` (clears both). `isLoading` starts `true` and flips to `false` once the hydration read completes — every consumer must handle the loading window, there is no synchronous read possible here the way the web app's cookie check is synchronous.
- **`utils/AuthGuard.tsx`** (ported from the reference project almost verbatim): reads `user`/`isLoading` from `UserContext` and the current `pathname` from `expo-router`. While `isLoading`, renders a splash screen instead of `children`. Once loaded, a `useEffect` compares `user` presence against whether the current route is an auth screen, and `router.replace()`s to the correct side — wrapped in a small `setTimeout` in the reference project (avoids a navigation-during-render warning; keep this, it's not a hack worth "fixing").
- **`utils/axiosInstance.ts`**: request interceptor reads the token from `AsyncStorage` on every request and attaches `Authorization: Bearer <token>` if present (async, unlike the web app's synchronous cookie read — this is the one structurally unavoidable difference). Response interceptor: on `401`, clear both `AsyncStorage` keys, toast, and `router.replace("/auth")`; on any other error, **reject the promise** with a normalized error object (see "Reused vs. adapted" above for why this differs from the reference project's own version).
- **Response envelope**: identical to the web app — `{ success, message, data, token? }`, `data.meta` as a raw count on paginated list endpoints. Nothing RN-specific changes here; it's the same backend.
- **Login flow**: `POST /auth/login` → `{ token, data: user }` → `handleSetToken(token)` + `handleSetUser(user)` → `router.replace("/")`. Matches the reference project's `auth.tsx` almost exactly; only the endpoint paths and payload field names change to match `bikelog_server` instead of the expense tracker's backend.

## API Calling & Mutation Pattern

`hooks/useApi.ts` — same four-hook shape as `bikelog_client(web)/hooks/useApi.ts`, adapted from `expenseTrackerReactNative/hooks/useApi.ts` (which already has the same shape, since both were written to the same TanStack Query pattern):

- `useFetchData<TData>(key: string[], endpoint: string, options?)` — `useQuery` wrapper.
- `usePost(invalidateQueriesKeys?: string[][])` / `usePatch(...)` — `mutateAsync({ url, payload })`, URL supplied at the call site, not baked into the hook.
- `useDelete(invalidateQueriesKeys?: string[][])` — `mutateAsync({ url })`, no payload. (Named `useDelete`, matching the web app's naming, not the reference project's `useDeleteData` — purely cosmetic, no reason to keep a different name across siblings when the shape is identical.)
- No `useUpdateData`/`apiPut` — see "Reused vs. adapted" above.

Every domain's list/form component calls these directly (no `use<Domain>.ts` wrapper layer) — matching the web app's actual shipped pattern (`components/(main)/<Domain>/` calls `useFetchData`/`usePost`/etc. inline) rather than the web app's own early *docs* which described a wrapper layer that was later dropped in practice. Don't build a wrapper layer here either; it was tried once and abandoned for a reason (see `../../bikelog_client(web)/CLAUDE.md`'s note on this exact drift between its `architecture.md` and the real code).

## Invariants

1. **Never call `axios`/`fetch` directly from a component.** Always go through `hooks/useApi.ts`.
2. **Every bike-scoped screen takes `bikeId` from the route param, never from component state.**
3. **Never send server-derived fields in a mutation payload** — same forbidden-field list as the web app (`totalCost`, `nextDueOdometer`, `owner`/`currentOdometer` on edit) — see `bikelog_server/postman/dummy-data.md` for the authoritative list.
4. **Reuse `components/main/shared/*` before writing a one-off.**
5. **No react-hook-form.** Plain `useState` per field + manual validation before submit, matching `expenseTrackerReactNative`'s actual practice — don't import RHF just because the web sibling uses it.
6. **No global client-state library, no charting library.** Matches both sibling projects' stance.
7. **No tab/bike screen renders without a valid session.** Enforced by `AuthGuard` wrapping `(tabs)`.
8. **The axios error interceptor must reject on failure**, not resolve with the error object — this is the one deliberate fix vs. the reference project (see above); don't regress it while iterating.

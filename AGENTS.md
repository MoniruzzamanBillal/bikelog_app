## What this is

The mobile client for **Bike Log** — an Expo (SDK 54) + `expo-router` React Native app that talks to the same `bikelog_server` REST API as `../../bikelog_client(web)`. This is the developer's real target platform (the web client was a deliberately-sequenced prototype built first). See `ai context/project-overview.md` for the full product scope.

This directory (`bikelog_client(app)/`) is the actual npm/yarn project root (`package.json`, `app.json`, etc. live here) inside the parent `bikelog_client(mobile)/` folder. It is not under git.

## Current state — read `progress-tracker.md` first, every time

Specs 01–06 of a 13-spec build plan are complete (project cleanup, shared components, login/register, dashboard/bike-list, bike hub). **`ai context/progress-tracker.md` is the single source of truth for what's actually built** — its "Known Gaps / Open Questions" section tracks real, still-open issues (e.g. nothing has been visually verified on a device yet, no live backend has been hit this project). Read it before touching code; it's kept more current than `architecture.md`/`code-standards.md` when they drift, and both of those docs have had real inaccuracies (see below) that progress-tracker.md documents.

Read order for planning docs:

1. `ai context/progress-tracker.md` — current build status, Known Gaps, Recent Activity (**read this one first**).
2. `ai context/specs/00-build-plan.md` — the 13-spec build order and per-spec status.
3. `ai context/specs/<NN>-*.md` — the specific spec for whatever you're implementing next. Each completed spec's own Verify section has been annotated in-place with corrections found during implementation — read a spec's Verify section even if its Design/Implementation sections look authoritative, since several were wrong in ways only caught by cross-checking the real backend source.
4. `ai context/project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `ui-context.md` — background/conventions. Treat specific factual claims in these (response shapes, field names) as unverified until cross-checked against the backend source or the already-shipped web client — several were stale or wrong (see Known gotchas below).
5. `../PLAN.md` — the original file-by-file analysis the six context docs were derived from; rationale, not a doc to keep in sync separately.

## Commands

Run from this directory (`bikelog_client(app)/`):

```bash
yarn install          # install deps
yarn start             # = yarn dev = expo start
yarn android            # expo start --android
yarn ios                 # expo start --ios
yarn web                  # expo start --web
yarn lint                  # expo lint — must be clean before considering any screen done
npx tsc --noEmit             # full type-check; expo lint alone doesn't catch everything
```

No automated test suite (no `test` script). Verification is manual: run on-device/simulator against a real `bikelog_server` instance, cross-checked against `bikelog_server/postman/dummy-data.md` and the Postman collection. **No emulator/simulator/device has been available in this working environment through spec 06** — everything shipped so far is lint/type/contract-verified only, never actually rendered or exercised end-to-end. Say so explicitly if you're in the same boat; don't claim visual or runtime verification you didn't do.

`yarn reset-project` runs `scripts/reset-project.js`, a stock `create-expo-app` script — unrelated to this project's own history, don't use it.

## Architecture

- **Routing**: `app/` is file-based routing via `expo-router`. Every route file is a one-line wrapper — import a `components/main/<Domain>/` component and render it. No fetch calls, `useState`, or business logic in `app/`.
- **Auth gating is wired in _two_ places, not one**: `app/(tabs)/_layout.tsx` wraps the tab group in `AuthGuard`, and `app/bikes/_layout.tsx` separately wraps the whole `app/bikes/[bikeId]/` stack in its own `AuthGuard` — that stack sits outside `(tabs)` (so the tab bar doesn't follow the user into a drill-down flow) and is _not_ covered by the tabs layout's guard. `architecture.md`'s System Boundaries section calls this out explicitly; several spec files' own Design tables didn't, so don't assume a new route is gated just because it's under `app/bikes/`.
- **UI kit**: `react-native-paper` (`Button`, `TextInput`, `Text`, `Modal`+`Portal`, `IconButton`) + plain `StyleSheet.create()` per file. No NativeWind/Tailwind/styled-components. `TextInput`s use a borderless-underline look (`borderWidth: 0, backgroundColor: "transparent", padding: 0` inside a `View` with `borderBottomWidth: 1`) — **not** Paper's own `mode="flat"`/`outlined` variants, even though some spec sample code uses `mode="flat"`. `ui-context.md` is the authoritative source for this; several specs' sample code didn't match it.
- **Swipe rows**: use `react-native-gesture-handler/ReanimatedSwipeable` (the modern, non-deprecated Reanimated-based component), not the plain `import { Swipeable } from "react-native-gesture-handler"` export — that one is a deprecated, `Animated.Value`-based class component. In this library's coordinate system, swiping a row _leftward_ reveals the _right_-side action panel (`renderRightActions`), and swiping rightward reveals the left panel (`renderLeftActions`) — the convention here is delete=red on left-swipe (`renderRightActions`), edit=green on right-swipe (`renderLeftActions`). "Only one row open at a time" is done via a `useRef<SwipeableMethods | null>` created in the parent list and passed down, with each row's `onSwipeableWillOpen` closing whichever other row was open.
- **Server state**: TanStack Query v5 via `hooks/useApi.ts`'s four hooks — `useFetchData`, `usePost`, `usePatch`, `useDelete` (no PUT hook — `bikelog_server` has no PUT routes). `url`/`payload` are supplied at the `mutateAsync()` call site, never baked into the hook. **The resolved value from `useFetchData`/`mutateAsync` is the raw backend envelope (`{success, message, data, statusCode}`), not the payload directly — always drill into `.data`** (e.g. `const bikes = data?.data ?? [];`, `const bike = data?.data;`). This has tripped up spec sample code more than once; the already-shipped web client's equivalent screens are the fastest way to confirm the right access pattern for a new endpoint.
- **HTTP**: single axios instance (`utils/axiosInstance.ts`) — request interceptor attaches `Authorization: Bearer <token>` from `AsyncStorage` (key `"token"`, alongside `"user"` — not `"bikelog_token"`/`"bikelog_user"` despite what one spec's verify checklist assumed); response interceptor clears storage + redirects to `/auth` on 401, and rejects the promise (normalized to `{statusCode, message, errors}`) on any other error — this is a deliberate fix vs. the original inherited code, which used to swallow failures.
- **Auth**: `context/user.context.tsx` (`useUserContext()`, not a fictional `useUser()`) holds `user`/`token`/`isLoading`, hydrated from AsyncStorage on mount, exposes `handleSetToken`/`handleSetUser` (write-through) vs. `setToken`/`setUser` (state-only, don't use these for login/logout). **The login response's `data` field is always `null`** (confirmed against the backend source and the Postman collection's own test script) — there is no user object to read from it. Post-login, the user is derived by decoding the JWT client-side with `jwt-decode` (`{userId, userEmail}` — the real payload has no `name` claim, which is why `IUser.name` is optional, not required). Don't add a `GET /auth/me` round-trip to fill this in; that's an explicitly-rejected pattern here (`bikelog_server` has no refresh-token flow to build against).
- **IDs are `_id`, not `id`** on every backend entity — Mongoose's default serialization, no `toJSON` transform aliases it. Some early spec drafts used `id`; always verify against the backend source or the web client's types when in doubt.
- **Domain folders**: `components/main/<Domain>/` — one per backend module (`Auth`, `Bike`, `Dashboard` so far), holding the domain's screens/cards/modals. A component reused across two different screens of the _same_ backend module (e.g. `BikeFormModal`, used by both the dashboard's create flow and the bike hub's edit flow) belongs in that module's own folder (`Bike/`), not in whichever screen's folder happened to need it first. Cross-domain shared pieces (`StatusBadge`, `ConfirmDelete`, `EmptyState`, `SectionLoading`, `SelectPickerField`) live in `components/main/shared/`, exported from its `index.ts` barrel.
- **Forms**: plain `useState` per field + manual validation before submit — no react-hook-form, no Zod/Yup, unlike the web sibling. Numeric fields stay strings in state, regex-validated on change, parsed only at submit. Edit-modal prefill uses a `useEffect` keyed on `[entity, open]`, not a mount-once/`defaultValues` approach (Paper's `Modal` doesn't unmount its children on close).
- **`expo-router` typed routes** (`experiments.typedRoutes: true`): navigating to a route that _does_ exist should use the typed object form — `router.push({ pathname: "/bikes/[bikeId]", params: { bikeId } })` — not a template-literal string, which typed-routes rejects. Navigating to a route that _doesn't exist yet_ (e.g. bike-scoped screens specs 07–12 haven't built) has no typed form available either way; a template literal with `as never` is the pragmatic, honest way to express "this is intentionally unbuilt," not a bug to fix.
- **`.expo/types/router.d.ts` is a gitignored, generated file** that only regenerates when a real `expo start`/`expo export` runs. In this environment it went stale (still listing pre-cleanup expense-tracker routes) because no dev server has ever run this session — if `tsc` rejects an otherwise-correct typed-routes call, check whether this file is lying before assuming the code is wrong. Deleting it is safe (expo-router falls back to a permissive base `Href` type); don't hand-edit it.
- **Native interaction patterns**: `Alert.alert()` for confirmations (via the shared `confirmDelete()` helper), pull-to-refresh via `ScrollView`'s `refreshControl` prop bound to local `refreshing` state + `refetch()` (`RefreshControl` is a prop, not a wrapper component — a mistake worth watching for since sample code has gotten this wrong before), `KeyboardAwareScrollView` on every form screen, `Toast.show({..., position: "top"})` via `react-native-toast-message`.

## Invariants (don't regress these)

1. Never call `axios`/`fetch` directly from a component — always through `hooks/useApi.ts`.
2. Every bike-scoped screen takes `bikeId` from the route param (`useLocalSearchParams`), never component state.
3. Never send server-derived fields in a mutation payload (`totalCost`, `nextDueOdometer`, `owner`, `currentOdometer` on edit) — see `bikelog_server/postman/dummy-data.md`'s "Fields you will never see accepted" table for the authoritative list. Prefer encoding this at the type level (e.g. `TUpdateBikePayload = Partial<Omit<TCreateBikePayload, "currentOdometer">>`) over just remembering not to include a field.
4. Reuse `components/main/shared/*` before writing a one-off.
5. No react-hook-form — plain `useState` per field.
6. No global client-state library, no charting library.
7. No tab/bike screen renders without a valid session — enforced by `AuthGuard`, wired separately into `(tabs)/_layout.tsx` and `bikes/_layout.tsx` (see Architecture above).
8. The axios error interceptor must reject on failure, not resolve with the error object.

## Cross-project rules

- Don't edit `../../bikelog_server/` or `../../bikelog_client(web)/` from work in this app — both are separate, complete, independently-tracked projects. If this app's work reveals a backend gap or a web-app bug, note it in `ai context/progress-tracker.md`'s Known Gaps and flag it to the user instead of editing the other project.
- When a field, endpoint, or response shape is unclear or a spec's claim about it seems off, verify against the backend source (`bikelog_server/src/app/modules/<module>/`) and `bikelog_server/postman/dummy-data.md` first, then the already-shipped `bikelog_client(web)/components/(main)/<Domain>/` implementation as a second, proven-working reference — several specs' own Design sections have been wrong about exactly this (response envelopes, id field names, pagination), so don't take a spec's sample code as ground truth without checking.
- Workflow for each spec: mark it in-progress in `progress-tracker.md` (and the spec's own status line) before starting; implement; run `expo lint` + `npx tsc --noEmit`; update the spec's Verify checklist in place (checking off items, annotating any corrections made — "code-verified only" where on-device verification wasn't possible); mark the spec and `00-build-plan.md`'s row complete; add a `progress-tracker.md` Recent Activity entry and update Known Gaps.

# Code Standards

## TypeScript & Expo Router Patterns

- Every domain screen component (`components/main/<Domain>/*.tsx`) is a plain function component — no server/client split to think about, this isn't Next.js.
- Type every API payload/response explicitly in `types/<domain>.types.ts` (e.g. `TBike`, `TCreateBikePayload`). Mirror the backend's `.interface.ts` field names/casing exactly, same rule as the web app — don't invent different client-side names.
- No TS `enum` — `as const` objects + derived types, matching both the backend's and the web app's convention (e.g. `TBikeIssueStatus = "open" | "resolved"`, not `enum BikeIssueStatus`).
- Route params: `useLocalSearchParams<{ bikeId: string }>()` typed explicitly per screen, not left as the untyped default.

## File Organization & Naming

- Routes: `app/**/*.tsx`, one line each — import the real component from `components/main/`, render it, nothing else. See `../PLAN.md` §3 for the full tree and §4 for why this split exists.
- Feature code: `components/main/<Domain>/` — one folder per backend module. Inside: `<Domain>.tsx` (list/main screen), `<Domain>FormModal.tsx` (create+edit share one modal, keyed by whether an entity prop is passed), `<Domain>Card.tsx` (list row). No `use<Domain>.ts` hook-wrapper layer — see `architecture.md`'s API Calling & Mutation Pattern for why.
- Shared/reusable: `components/main/shared/*` — extend in place, never fork a one-off local copy.
- Types: top-level `types/<domain>.types.ts` per module (not colocated per-domain like the web app's `components/(main)/<Domain>/type/`) — matches the reference project's flat `types/` folder convention. One file per domain keeps it navigable even with 9+ domains.
- Auth/token: `context/user.context.tsx` is the only place that writes to the `token`/`user` AsyncStorage keys directly — everything else reads via `useUserContext()`.
- One component per file. `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils/types files (`bike-issue.types.ts`, not `BikeIssue.types.ts` — matches the web app's kebab-case type-file convention, which is otherwise unrelated to the reference project since it has no per-domain type-file split to compare against).

## Route Table

| Path | Purpose |
|---|---|
| `app/auth.tsx` | Login. Link to register. Redirect to `/` if already authed. |
| `app/register.tsx` | Register. Link to login. |
| `app/(tabs)/index.tsx` | Dashboard: bike list + create-bike modal |
| `app/(tabs)/settings.tsx` | Maintenance-type + engine-oil-type create/list (see open question in `../PLAN.md` §9 on whether this stays a tab or moves to a header icon) |
| `app/bikes/[bikeId]/index.tsx` | Bike hub: info, edit/delete, 6 nav tiles |
| `app/bikes/[bikeId]/fuel-logs.tsx` | Fuel log list + create/edit modal |
| `app/bikes/[bikeId]/mileage.tsx` | Mileage stats, tab-switched: History / Monthly / Yearly / Lifetime |
| `app/bikes/[bikeId]/maintenance-logs.tsx` | Maintenance log list + create/edit modal + reminders banner |
| `app/bikes/[bikeId]/spending.tsx` | Spending summary, tab-switched: Month / Year / Lifetime |
| `app/bikes/[bikeId]/issues.tsx` | Issue list + status filter + dedicated status-toggle action |
| `app/bikes/[bikeId]/accessories.tsx` | Accessory list + status/urgency filters |

Every row below the first two is unreachable without a valid session — enforced once, at `app/(tabs)/_layout.tsx` for tab routes and needs the same `AuthGuard` wrapping applied to the `bikes/[bikeId]/` stack too (a genuinely new piece vs. the reference project, which has no non-tab authenticated routes to gate — see `architecture.md`'s System Boundaries).

No `/bikes/new`-style routes — creation is always a modal on the relevant list screen, matching both sibling projects.

## Data Fetching & Mutations

- Reads: `useFetchData<TResponse>([domain, ...keyParts], endpoint)`. Query key always starts with the domain string, matching the web app's convention.
- Writes: `usePost`/`usePatch`/`useDelete(invalidateQueriesKeys)` — `url` (and `payload`, except for delete) supplied at the `mutateAsync()` call site, never baked into the hook. Always invalidate the exact list key(s) affected, never a blanket invalidate.
- Called directly from the domain screen/modal component — no `use<Domain>.ts` wrapper layer (see `architecture.md`).
- Query params (pagination, filters): build the endpoint string with a template literal at the call site, matching both sibling projects — neither uses a `buildUrl` utility for this in practice (the web app has one but its own real screens don't call it — see `bikelog_client(web)/context/specs/11-bike-issue.md`'s Context section for confirmation this was verified against actual code, not assumed).

## Forms

- **No react-hook-form.** Plain `useState<string|null>` per field, matching `expenseTrackerReactNative`'s actual practice in every form file (`AddTransactionPage.tsx`, `UpdateTransactionModal.tsx`, `auth.tsx`) — this is Invariant 5 in `architecture.md`, not a suggestion.
- Validate by hand immediately before submit: `if (!title?.trim()) { Toast.show({type:"error", text1:"Missing Fields", text2:"..."}); return; }`, one check per required field, same shape every time.
- Numeric fields: keep as a string in state, regex-validate on change (`/^\d+(\.\d{0,2})?$/`), `parseFloat()`/`Number()` only at submit time — matches the reference project's `handleTextChange` pattern exactly.
- Two-option fields (income/expense in the reference project; nothing in Bike Log is naturally binary except maybe a future toggle) are a pair of `TouchableOpacity` "pill" buttons. **3+-option fields** (`bikeAccessory.urgency`/`.status`, `maintenanceLog.maintenanceType`/`.oilType`) need a real select — resolve via `@react-native-picker/picker`'s `<Picker>` (a listed-but-currently-unused dependency in the reference project) or Paper's `Menu`, decided once in a shared component, not per-form. See `architecture.md`'s "Reused vs. adapted" note.
- Edit-modal prefill: `useEffect` keyed on the entity prop, calling `setX(entity.x)` per field — not a `defaultValues`-only approach (Paper's `Modal` doesn't remount its children on close the way the web app's Radix `Dialog` does).

## Styling Rules

- `StyleSheet.create()` per file — `const xStyles = StyleSheet.create({...})` at the bottom of the file, referenced from JSX via `style={xStyles.foo}` or `style={[xStyles.foo, condition && xStyles.fooActive]}` for conditional variants.
- Every color reads from `COLORS` (`utils/colors.ts`) — never a hardcoded hex in a component file, except inside `THEMES` itself. See `ui-context.md` for the palette.
- Currency: `৳` prefix literal, matching both sibling projects.
- No NativeWind/Tailwind, no styled-components — this is a deliberate choice inherited from the reference project, not a gap to fill later.

## Error Handling

- Mutations: on error, the axios interceptor already fires a `Toast.show({type:"error", ...})` with the backend's `message` — most call sites don't need their own error toast on top, but a component-level `catch` block that adds a fallback `Toast.show()` for genuinely unexpected errors (network failure, etc.) is fine, matching the reference project's belt-and-suspenders pattern in `AddTransactionPage.tsx`.
- On success: toast + close the modal + let query invalidation refresh the list. Same as the web app.
- 401s are handled globally by the axios interceptor (clear storage, redirect to `/auth`) — no per-component 401 handling.
- Form validation is opportunistic/manual (see Forms above), no schema library (no Zod, no Yup) anywhere in this app — including auth, unlike the web app's one RHF+Zod exception for login/register. The reference project's own `auth.tsx` is plain `useState` + manual checks, and there's no reason to diverge from that here just because the web sibling did something fancier.

## Linting

- `expo lint` (the reference project's `yarn lint` script) must be clean before considering a screen done. Fix, don't disable.

## Testing

- No automated test suite, matching both sibling projects. Manual verification: run on a real device or simulator via Expo Go / a dev build, exercise the flow against the real `bikelog_server` instance, cross-check against `bikelog_server/postman/dummy-data.md` for expected values — same verification norm as the web app, adapted for "run the app" instead of "open a browser."

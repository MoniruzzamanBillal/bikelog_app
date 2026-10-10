# 50: Admin error-log viewer (app)

Status: ✅ Complete — planned and implemented 2026-10-10. Verified on the Expo web export against the live API (see Result); **not** verified on a device.

App half of an existing feature. The server side is **already shipped** (`GET /api/admin/error-logs`, `GET /api/admin/error-logs/:id`, `bikelog_server` spec 24) and the **web client already has this screen** (`bikelog_client-web-` spec 26, `components/(admin)/ErrorLog/`). Nothing in `bikelog_server/` or the web client is touched by this spec.

Modelled on the sibling project `expTracker2/client` spec 36 (same Expo SDK 54 stack, same feature), adapted to Bike Log's own design system, API shape and auth — see "What differs from the reference" below, because three of those differences are the kind that break a straight copy.

---

## Goal

Give an admin a read-only error-log viewer inside the app: an **Error logs** entry in Settings, **visible only to admins**, that opens a dedicated screen listing every logged server error with paging and a method filter, and opens any row in a detail view showing the full message, who hit it, the error sources and the stack trace.

Non-admins never see the entry, and the screen itself refuses to load data for them even if reached directly.

---

## What the server gives us (verified in `bikelog_server/src`)

| Fact | Source | Consequence here |
| --- | --- | --- |
| `GET /api/admin/error-logs` and `/:id`, both `authCheck` + `adminCheck` | `errorLog.route.ts`, mounted at `/admin/error-logs` in `router/index.ts` | one list endpoint is enough |
| `adminCheck` is a pure JWT-claim check: `req.user.userRole === "admin"`; non-admin → **403** "Admin access required" | `middleware/adminCheck.ts` | the client must key off the **token's** claim to match the server exactly |
| The login JWT already carries `userRole` | `user.services.ts:82` | no server change needed |
| List uses `buildPrismaListQuery`: `page`, `limit`, `sort`, and **any other query key is an exact-match filter** (`?method=GET`, `?status=500`) | `errorLog.service.ts`, `buildPrismaListQuery.ts` | a method filter works with no server change; there is **no** range filter (no "5xx only") |
| Default sort `-createdAt` | `errorLog.service.ts` | newest first, nothing to send |
| Response is `{ success, message, data: { result, meta } }` and **`meta` is a raw row count (a number)**, not `{page, limit, total, totalPages}` | `errorLog.service.ts` (`prisma.errorLog.count`), and the web client's `Math.ceil(meta / limit)` | the page count must be computed client-side |
| Rows: `status, message, errorName?, errorSources?(Json), stack?, method, path, userId?, userEmail?, createdAt` plus `_id` | `schema.prisma`, `toApiShape` | one type |
| 30-day retention, cleaned by a daily cron | `errorLog.service.ts` `RETENTION_DAYS = 30` | empty-state copy can say "last 30 days" truthfully |
| 404 rows are synthetic and store **no stack**, but do store `errorSources` | server behaviour, confirmed by the reference project's verification | the Stack section is simply absent for them — correct, not missing data |

## What differs from the reference (`expTracker2/client` spec 36)

| Reference | This app | Why it matters |
| --- | --- | --- |
| Reads `userRole` from the **login response** and stores it on the user | Login `data` is **always `null`** here; the user is built from the decoded JWT (`LoginForm.tsx:74-77`) and the stored user is only `{ _id, email }` | The reference's Step 0 (carry `userRole` through login) does not map. We decode the claim from the token instead — see Design. |
| `meta` is an object `{ page, limit, total, totalPages }` | `meta` is a **number** | Copying its `meta?.totalPages` would always be `undefined` → the pager would never appear. |
| Response interceptor *resolves* on error ("FETCH-1"), so a 403 needs a hand-rolled `!data?.success` check | This app's interceptor **rejects** (normalised `{ statusCode, message, errors }`) and toasts | A 403 arrives as `isError` with a readable `message`. No `!data?.success` workaround needed. |
| `Ionicons`, `useTheme()`, `text.*`, `spacing.*` tokens | `MaterialCommunityIcons`, the static `COLORS` object, plain `StyleSheet`, `react-native-paper` `Text` | Different design system; reuse this app's `Panel`, `ScreenHeader`, `EmptyState`, `ErrorState`, `SectionLoading`, `SegmentedTabs`, `PrimaryButton`, `toneStyle`, `tint`. |
| No method filter (left as optional "Step 7") | The web client **has** one (All / GET / POST / PUT / PATCH / DELETE) | Included, for parity — it is one query param and one `SegmentedTabs`. |
| Row in Settings between Categories and Log out | Settings is `SettingsCatalog` with `Panel`s; Account/Log out is the last panel | New "Admin" panel directly above Account. |

---

## Design

### Admin detection — from the token, not the stored user

```ts
// utils/isAdmin.ts
import { TUserToken } from "@/types/global.types";
import { jwtDecode } from "jwt-decode";

/**
 * Mirrors the server's `middleware/adminCheck.ts`, which is a pure JWT-claim check
 * (`req.user.userRole === "admin"`). Reading the same claim from the same token means the UI
 * never offers an admin action the API then 403s.
 *
 * A bad/undecodable token is "not admin" rather than a throw — this runs during render.
 */
export const isAdminToken = (token?: string | null): boolean => {
  if (!token) return false;
  try {
    return jwtDecode<TUserToken>(token)?.userRole === "admin";
  } catch {
    return false;
  }
};
```

Callers use `useUserContext().token`. Why the token and not a field on the stored `IUser`:

- The server **already mints** `userRole` into every token, so an admin who is **already logged in** has the claim now. Reading the token makes the entry appear immediately — no logout/login, no code in `LoginForm`, no migration of stored sessions. The reference project had to force a re-login because its stored user predates the field.
- It cannot go stale relative to the server: the token is exactly what `adminCheck` reads.
- It adds no second source of truth to keep in sync (`IUser` is untouched).

Edge, accepted and handled: a user **demoted** after logging in still holds a token claiming `admin` until it expires/they re-login; the API then returns 403, which the screen shows as an error state with the server's message ("Admin access required"), never a crash.

### Route

`app/admin/_layout.tsx` + `app/admin/error-logs.tsx` → `/admin/error-logs`. Mirrors the web client's `/admin` and the app's existing `app/bikes/_layout.tsx` pattern: a stack **outside `(tabs)`** needs its **own** `AuthGuard` (the tabs layout's guard does not cover it) and its own bottom safe-area inset (edge-to-edge Android — see the comment in `bikes/_layout.tsx`).

Route files stay one-line wrappers (invariant: no fetch/`useState`/logic in `app/`).

`app.json` has `experiments.typedRoutes: true`: after adding the route, `.expo/types/router.d.ts` must be regenerated (it is gitignored and only regenerates on `expo start`/`expo export`), or `tsc` rejects the new `href`.

### Screen

```
┌─────────────────────────────────────────┐
│ ‹  Error logs                            │   ScreenHeader (back)
│    Last 30 days                          │
│  ┌ All │ GET │ POST │ PUT │ PATCH │ DEL ┐ │   SegmentedTabs (method filter)
│                                          │
│  142 errors · page 1 of 8                │   count line
│  ┌───────────────────────────────────┐   │
│  │ [500] POST /api/bikes/…/fuel-logs │   │   status pill + method + path (1 line)
│  │ Something went wrong!!            │   │   message, 2 lines max
│  │ PrismaClientKnown… · 10 Oct 2:14 PM│  │   errorName · time
│  └───────────────────────────────────┘   │
│        ‹ Prev          Next ›            │   pager (hidden when 1 page)
└─────────────────────────────────────────┘
```

- **Data**: `useFetchData<{ result: TErrorLog[]; meta: number }>(["error-logs", String(page), method], url, { enabled: admin, placeholderData: (prev) => prev })`.
  - `page` **and** `method` in the key, or TanStack serves one page's cache for every page/filter.
  - `placeholderData` keeps the current page on screen while the next loads (no skeleton flash). This is the app's first paginated read driven by page buttons.
  - URL built with the existing `?page=&limit=20&sort=-createdAt` shape; `method` only when not "All".
  - Read paths: `data?.data?.result`, `data?.data?.meta` (a number), `totalPages = Math.max(1, Math.ceil(meta / 20))`.
- **Changing the filter resets `page` to 1.** Changing the page scrolls to the top (otherwise page 2 opens mid-list).
- **States, in order**: non-admin → "Admins only" `EmptyState` (no request fired, `enabled: false`); `isError` → `ErrorState` with the server message and retry; `isLoading` → `SectionLoading`; empty → `EmptyState` "No errors logged — entries expire after 30 days"; otherwise the list. The 403 toast comes from the axios interceptor, not from this screen (**do not add a second toast** — spec 45's lesson).
- **Pull to refresh**: `RefreshControl` bound to `isRefetching` + `refetch` (the app's existing pattern: `refreshControl` prop on `ScrollView`).
- **Status tone**: reuse the web client's rule, built with the existing `toneStyle`: `>= 500` → `danger`, `401`/`403` → `warning`, everything else → `neutral`. (The reference's rule — 4xx all amber — would make the many bot-scan 404s noisy; the web's is the one users already know.)
- **Row**: `TouchableOpacity` card in the `panelStyle` look. Path is `numberOfLines={1}` with `ellipsizeMode="middle"` (the tail of a long scan URL is the useful part). Timestamp via `date-fns` `format(new Date(createdAt), "d MMM, h:mm a")` — `createdAt` is a real instant, **not** a date-only field, so `new Date` is correct here and `formatApiDate` is not. An unparseable value renders `"—"` rather than throwing: this screen exists to show failures and must not become one.
- **Detail**: a Paper `Modal` in a `Portal`, styled like the app's other modals (`COLORS.card`, `COLORS.edge` border, `maxHeight: "85%"`). Shows status pill, `METHOD path`, **Time** (full), **Error** (`errorName ?? "—"`), **User** (`userEmail ?? "Unauthenticated"`, `userId` beneath when present), full **Message**, **Error sources** (only when `Array.isArray(errorSources) && length`, one line each `path → message`, no `→` when `path` is empty), and **Stack trace** (only when present) in a **horizontal** `ScrollView` with a monospace font. It renders the row the list already fetched — it does **not** call `/:id` (the list returns complete rows incl. `stack`; a second request is a loading state and a failure mode for no new information).
- **Settings entry**: a new `Panel` "Admin" directly above "Account" in `SettingsCatalog.tsx`, rendered only when `isAdminToken(token)`. One tappable row: `bug-outline` icon, "Error logs", "Server errors from the last 30 days", chevron → `router.push("/admin/error-logs")`.

### New files

| File | Purpose |
| --- | --- |
| `utils/isAdmin.ts` | `isAdminToken` |
| `types/error-log.types.ts` | `TErrorLog`, `TErrorLogSource`, `TErrorLogListPayload`, `TErrorLogMethodFilter` |
| `app/admin/_layout.tsx` | `AuthGuard` + bottom safe-area, `<Slot />` |
| `app/admin/error-logs.tsx` | one-line wrapper |
| `components/main/ErrorLog/errorLogStatus.ts` | `getStatusTone(status)` |
| `components/main/ErrorLog/ErrorLogCard.tsx` | one row |
| `components/main/ErrorLog/ErrorLogDetailModal.tsx` | detail |
| `components/main/ErrorLog/ErrorLogsPage.tsx` | the screen |

Edits: `types/global.types.ts` (`userRole?` on `TUserToken`), `components/main/SettingsCatalog/SettingsCatalog.tsx` (Admin panel).

## Out of scope

- Any server or web change.
- A server-side range filter (`5xx only`) — would need a server change. A method filter is what the server supports.
- Path search, date-range filter, deleting/clearing logs (the server has no such route).
- Fixing the server's `stack`-in-every-response leak (a separate pre-deploy defect tracked in the server's `CLAUDE.md`). Note for the reader: that leak means error *responses* already contain stacks; this viewer shows what is *stored*.
- Dependencies: **none to install** — `jwt-decode`, `date-fns`, `@tanstack/react-query`, `react-native-paper` are already present. No native module, so no dev-client rebuild.

---

## Implementation

- [x] 1. Mark this spec In Progress in `ai context/progress-tracker.md`.
- [x] 2. `types/global.types.ts`: add `userRole?: "user" | "admin"` to `TUserToken`.
- [x] 3. `utils/isAdmin.ts`.
- [x] 4. `types/error-log.types.ts`.
- [x] 5. `components/main/ErrorLog/errorLogStatus.ts`.
- [x] 6. `components/main/ErrorLog/ErrorLogCard.tsx`.
- [x] 7. `components/main/ErrorLog/ErrorLogDetailModal.tsx`.
- [x] 8. `components/main/ErrorLog/ErrorLogsPage.tsx`.
- [x] 9. `app/admin/_layout.tsx` and `app/admin/error-logs.tsx`; regenerate typed routes.
- [x] 10. Settings "Admin" panel in `SettingsCatalog.tsx`.
- [x] 11. `npx tsc --noEmit`, `yarn lint`, `expo export` (android + web) clean.
- [x] 12. Browser verification below, with throwaway data, then delete everything created.
- [x] 13. Mark Complete here and in the tracker; add a Recent Activity entry.

## Verification plan

Run on the Expo web export, driven in headless Chrome, against the live API. The app has no other way to be exercised from here. Production data written during the test is limited to: two throwaway users (one promoted to `admin` by a direct DB write — the repo's documented convention, there is no promotion endpoint), and the error-log rows created by deliberately bad requests. **All of it is deleted afterwards** and the totals re-checked.

| # | Check |
| --- | --- |
| V1 | Admin (token claims `admin`): Settings shows the Admin panel with an Error logs row. |
| V2 | Non-admin: no Admin panel in Settings. |
| V3 | Admin taps the row → `/admin/error-logs` loads real rows (status pill, method + path, message, time). |
| V4 | The count line matches the API: `meta` (number) and computed page count. |
| V5 | Paging: Next/Prev change the page and the rows; pager hidden when one page; page change scrolls to top. |
| V6 | Method filter: choosing POST shows only POST rows, resets to page 1; "All" restores. |
| V7 | Detail modal: a 400 validation row shows `errorSources`; a row with a stack shows it in a horizontally scrollable block; a 404 row shows **no** Stack section. Closes on dismiss. |
| V8 | Status tones: a 5xx would be `danger`, 401/403 `warning`, 404/400 `neutral` (5xx only if a real one exists; otherwise code-checked). |
| V9 | Non-admin opening `/admin/error-logs` directly: "Admins only", and **no** request to `/admin/error-logs` is sent. |
| V10 | Logged out opening `/admin/error-logs`: redirected to the login screen. |
| V11 | The 403 path (a demoted admin still holding an `admin` token): as an admin, intercept the browser's `GET /admin/error-logs` and answer it with a real-shaped 403 body. Expect the error state with the server's message and a Retry — no crash, exactly one toast. |
| V12 | Pull-to-refresh: not exercisable headless. |

## Result (2026-10-10)

`tsc`, `yarn lint` clean; `expo export` succeeds for android (7.01 MB) and web (the `/admin/error-logs` route is emitted). Typed routes needed a one-off `expo start` to regenerate `.expo/types/router.d.ts` (`expo export` does not), exactly as the Risks section predicted.

Browser run against the live API with two throwaway accounts (one promoted to `admin` by direct DB write). The final build was re-run end to end after the last code change.

| # | Result |
| --- | --- |
| V1 | ✅ Admin sees the Admin panel and the Error logs row. |
| V2 | ✅ Non-admin: Settings shows only Maintenance types, Engine oil types, Account. |
| V3 | ✅ Tapping the row opens `/admin/error-logs` with real rows. |
| V4 | ✅ UI "154 errors · page 1 of 8" equals the API's `meta` (a number) and `ceil(meta/20)`. |
| V5 | ✅ Next/Prev change the page; page 2's first row equals the API's page 2 first row. |
| V6 | ✅ POST → 20 card rows all POST, count 33 = API; GET likewise; All restores 154; PUT (0 rows) shows "No PUT errors in the last 30 days". |
| V7 | ✅ Zod 400 row: error name, *Unauthenticated*, sources (`email → Required`); app 404 row: source message with **no** dangling arrow; 500 row: stack in a horizontally scrollable monospace block. Outside tap dismisses. |
| V8 | ✅ Computed pill colours: 500 `rgba(224,120,110,.15)` (danger), 401/403 `rgba(216,166,87,.15)` (warning), 400 `rgb(31,33,48)` (neutral). Production holds real 5xx rows, so red was observed, not just code-checked. |
| V9 | ✅ Non-admin at the URL: "Admins only", **no** request to `/admin/error-logs` reaches the API. |
| V10 | ✅ Logged out at the URL: redirected to login, no request. |
| V11 | ✅ After the retry fix: one 403 request, error card in < 1.5 s with "Admin access required" + Try again, user **not** logged out. |
| V12 | ⬜ Pull-to-refresh: not exercisable headless. |

**Harness errors that looked like failures and were not app bugs** (each re-checked properly before being counted): row collector also counted the filter tabs' own labels; label text is `text-transform: uppercase` so DOM text reads "ERROR SOURCES"; two rows sharing a path made a click open the wrong card; a request filter matched the static server's page URL; the stubbed 403 needed a credentialed CORS origin.

**Not verified:** a real device / Expo Go (`Modal`/`Portal`, `RefreshControl` differ natively); pull-to-refresh; the "synthetic 404 has no stack" case — no such row exists in production's table right now, so the rendering branch (`log.stack ? … : null`) is code-checked only. All test rows were deleted afterwards (2 users, 13 error-log rows incl. 10 left by my earlier test users); production totals returned to baseline.

## Found during verification (fixed, not in the original plan)

- **Card summary of a validation error was useless.** A Zod 400 is stored with `message` = a multi-line pretty-printed JSON string, so the card's 2-line clamp rendered `[` and `{…`. Fixed in `ErrorLogCard.tsx` by collapsing whitespace for the card's summary line only; the detail modal still shows the original text.

- **A 403 was retried three times.** Simulating the demoted-admin case (V11) showed React Query's default `retry: 3` turning one 403 into **four requests, four toasts and ~7 s of skeleton** before the error state appeared (requests at ≈5.4 s, 6.4 s, 8.4 s, 12.7 s on the test clock). The axios interceptor normalises every status to 500 (`statusCode` is read from a body field the server never sends), so the screen cannot tell a 403 from a network blip. Fixed with `retry: false` on this query only; "Try again" and pull-to-refresh cover the transient case. Not changed globally — other screens' retry behaviour is out of scope.

## Risks

- **Typed routes**: forgetting to regenerate `.expo/types/router.d.ts` makes `tsc` fail on the new `href`.
- **`meta` shape**: the single most likely copy-paste bug from the reference. Guarded by the type (`meta: number`) so a stray `.totalPages` is a `tsc` error.
- **First paginated read** in this app: no existing pattern, so the page/filter query-key rule above is load-bearing.

## Not verified (cannot be, here)

- Real device / Expo Go: everything runs on the web export. `Modal`/`Portal` and `RefreshControl` behave differently natively.
- A genuine 5xx row's red pill, unless production happens to contain one.
- Pull-to-refresh gesture.

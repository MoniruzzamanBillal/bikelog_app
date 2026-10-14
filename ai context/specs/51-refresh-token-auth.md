# 51: Refresh-token auth — app half

Status: ✅ **Complete — implemented 2026-10-11.** All four implementation sections are ticked below (§B, §C, §D, §E). **V14 is clean** — `npx tsc --noEmit` reports nothing and `yarn lint` adds no new warnings — and the whole app still bundles through `npx expo export --platform web` (20 routes). Two sub-specs came out of it. **`51a-stale-typed-route-types.md`** is a tooling finding — a stale generated `.expo/types/router.d.ts`, not spec 51 code, and `expo export` cannot fix it. **`51c-auth-prefix-excludes-a-protected-route.md`** is the most serious of the three: §C row 2's `/auth/*` wording excluded an `authCheck`-protected route from refresh, so a cold launch past expiry logged the rider out — V4's exact scenario, on the commonest launch path, and a regression against the pre-spec-51 app. Row 2 and the implementation are both corrected, and V15/V16 are new. **`51b-network-failure-must-not-end-the-session.md`** is a real defect in §C below, and in this spec's own test plan: a refresh that failed on the *network* logged the rider out and deleted a valid 15-day refresh token, and **V11 asserted that as the correct outcome**. §C's decision table and V11 have both been corrected; the authority is this spec's own flow step 3 — log out when the server *refuses*, not when we fail to ask. It was found by reading `bikelog_client-web-` spec `32a`, which found it by running its own V15.

**V1–V13 are owed and are not claimable from here.** Every one of them needs a local server with `JWT_ACCESS_EXPIRES_IN=60s` plus two throwaway accounts, and creating those accounts is a write to the live Neon DB — the developer's call, not something to do unasked. V8 in particular (spec 48a's regression) must be run before any of this is trusted on a device. What the code *does* carry is a deliberate strengthening of §C row 5 for exactly that case, written up at the end of §C.

Originally written 2026-10-11 alongside `bikelog_server` spec 51 and `bikelog_client-web-` spec 32, and revised twice the same day: first once the developer fixed the flow (see **The flow** below) and confirmed every user will install the new build, then again once the developer chose the token store. The cold-start pre-emptive refresh an earlier draft had is **gone** — the app reacts to the `401`, it never predicts expiry. **Both open questions are now closed** (see **Decisions**): storage is **`AsyncStorage` for both tokens**, no `expo-secure-store`, so no native dep and no EAS rebuild are involved at all.

**Depends on `bikelog_server` spec 51.** Read its §0 (hazards) and §A (wire contract) first; this spec does not restate the contract. Nothing here can be verified against production until that server change is deployed — and per its §H the server deploys **last**, once this build exists, so the whole verification matrix below runs against a local server.

---

## Goal

Hold both tokens, exchange the refresh token for a new access token when the access token expires, and only log the user out when the **refresh** token is rejected. From the rider's point of view the change should be invisible except that a session now survives 15 days of use instead of dying at 10 days flat, and a cold launch after a week still lands in the garage rather than on the login screen.

One thing makes this more delicate here than on the web:

- The app's `401` handling is already subtle — spec `48a` fixed a bug where stale `401`s logged the _next_ user out. A refresh retry interacts directly with that rule and must extend it, not replace it (§C).

Two others that earlier drafts listed here have been dissolved by the storage decision: the refresh token now lives in `AsyncStorage` alongside the access token rather than in the Keychain (accepted trade-off, §B), and because nothing imports `expo-secure-store` the `expo export --platform web` verification path and `yarn web` keep working unchanged.

---

## The flow (normative, confirmed by the developer 2026-10-11)

§C implements exactly this and nothing more:

1. A request goes out with whatever access token is stored. **The client does not inspect `exp` to decide whether to send it.**
2. The access token is expired → **the server answers `401`.**
3. On that `401` the client posts the refresh token to `POST /api/auth/refresh-token`.
   - **Refresh token valid** → new access token, stored, original request retried, the rider sees nothing.
   - **Refresh token invalid or expired** → the refresh call itself answers `401` → **log the user out and remove both the access token and the refresh token**, then `/auth`.
4. The one exception to "react, never predict", and it is not an expiry check: with **no** access token in storage there is nothing to put in the header, so the server answers "Authorization header missing or malformed" rather than the expired-token `401` this flow reacts to. The app does not need to handle that case specially — no access token means no session (rows 4 and 6 of §C's table), which is the correct outcome anyway.

Unlike `bikelog_client-web-` spec 32, nothing in this app currently predicts expiry — the interceptor already attaches whatever is stored and reacts to the `401`. So step 1 is already true here, and this spec only has to add step 3.

## Hazards specific to the app

**H-A — ~~`expo-secure-store` is unavailable on web, and web is how this app gets verified~~ — no longer applies.** Kept as a record of why the storage decision went the way it did. Specs 48a and 50 were both verified against an `expo export --platform web` run, and a bare `SecureStore` import would have broken that path (and `yarn web`), forcing a `Platform.OS === "web"` branch inside `tokenStore.ts`. With `AsyncStorage` on every platform (§B) there is no branch and no platform-specific code path to verify twice.

**H-B — ~~`expo-secure-store` is a new native module~~ — no longer applies.** Also kept for the record: a new native module would have been fine in Expo Go (`yarn start`) but would have invalidated any existing standalone/dev-client build. `AsyncStorage` (`@react-native-async-storage/async-storage`) is **already a dependency and already linked**, so this spec adds **no** native dep, needs **no** `npx expo install`, and needs **no** EAS rebuild. It is independent of the EAS build still owed for spec 36 (the widget) — that build can happen before or after this, in either order.

**H-C — existing installs hold a token under the legacy `"token"` key.** On first launch after the update there is an access token and no refresh token. Handle it (§B) or every existing user is silently logged out by the migration itself. One thing the storage decision simplifies: the legacy key and both new keys live in the **same** store, so the migration is a read + write + delete within `AsyncStorage` and can never half-succeed across two stores.

**H-D — `logoutFunction` still clears the query cache while screens are mounted** (spec 48a root cause 1, deliberately left in place). Those screens refetch with no token. With refresh added, those no-token `401`s must not trigger a refresh attempt — a refresh that _succeeds_ right after a logout would re-arm the session the user just ended. §C's decision table closes this: no access token in storage ⇒ no refresh.

**H-E — two interceptor passes over the same request.** A retried request must carry a flag, or a request whose retry also `401`s can loop. One retry, ever (§C).

---

## A. What already exists

| File                                 | Role today                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/axiosInstance.ts`             | Attaches `Bearer` from `AsyncStorage.getItem("token")`; response-error handler implements spec 48a's stale-401 rule, the `409`→amber toast, and the logout-on-expiry path |
| `context/user.context.tsx`           | `user` + `token` state; `handleSetToken` (writes storage, `queryClient.clear()`), `handleSetUser`, `logoutFunction`, cold-start hydration from `AsyncStorage`             |
| `components/main/Auth/LoginForm.tsx` | Reads `result.token`, `jwtDecode`s it for `userId`/`userEmail`, calls `handleSetToken` + `handleSetUser`                                                                  |
| `utils/AuthGuard.tsx`                | Redirects on `!user` once the context finishes loading                                                                                                                    |
| `utils/isAdmin.ts`                   | Decodes the stored token for the `userRole` claim (spec 50)                                                                                                               |
| `utils/queryClient.ts`               | Module-level `QueryClient` singleton, importable from the interceptor                                                                                                     |

---

## ✅ B. Token storage — new `utils/tokenStore.ts`

**Done.** `utils/tokenStore.ts` is new and is the only file in the app that reads or writes an auth token. `getAccessToken` performs the H-C migration (legacy `token` → `accessToken`, then delete) on its first call; `setTokens` writes the refresh token only when one is supplied, because a refresh exchange returns none (server §A), and drops the legacy key when a full pair is stored; `clearTokens` is a single `multiRemove` of all three keys. Every function is wrapped and degrades to "no token" rather than throwing inside an interceptor.

One module owning both tokens, so no other file touches `AsyncStorage` for auth again. **Storage is `AsyncStorage` on every platform** — decision 3 below; no `expo-secure-store`, no platform branch:

```ts
// AsyncStorage on every platform, native and web alike (decision 3).
// No expo-secure-store: no new native module, no EAS rebuild, no Platform.OS branch,
// and the `expo export --platform web` verification path keeps working (H-A, H-B).
const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const LEGACY_KEY = "token"; // pre-spec-51 installs — H-C

getAccessToken(): Promise<string | null>   // falls back to the legacy key once, then migrates it
getRefreshToken(): Promise<string | null>
setTokens({ accessToken, refreshToken? }): Promise<void>
clearTokens(): Promise<void>               // both keys + the legacy key
```

- `AsyncStorage` from `@react-native-async-storage/async-storage`, already in `package.json` and already used by `user.context.tsx` — no install step, so nothing for spec 49's pin discipline to worry about.
- Every call wrapped so a storage failure degrades to "no token" rather than throwing inside an interceptor.
- **Legacy migration (H-C):** on the first `getAccessToken()`, if `accessToken` is absent and `token` is present, copy it to `accessToken` and delete `token`. The user keeps their session with **no refresh token**, so when that 10-day token eventually expires they are logged out once — the same thing that happens today. No forced re-login at update time.
- `clearTokens()` must remove the legacy key too, or a logout would leave a resurrectable token behind.

**What this costs, stated plainly.** `AsyncStorage` is unencrypted — on Android an app-private SQLite file, on iOS an app-private file in the sandbox. The 15-day refresh token is therefore readable by anyone with root/jailbreak access to the device or an ADB backup of it, which is strictly weaker than the Keychain / `EncryptedSharedPreferences` that `expo-secure-store` would have given. Accepted: the access token already lives there today under the `"token"` key, so this is not a new exposure class, only a longer-lived item in it, and the threat model (a stolen unlocked rooted phone) is not one this app otherwise defends against.

**The upgrade path stays open and stays cheap.** `tokenStore.ts` is the only file that touches storage, so moving native platforms to `expo-secure-store` later is a change to that one file plus `npx expo install expo-secure-store` plus an EAS rebuild — and at that point H-A comes back and the module needs the `Platform.OS === "web"` branch. Nothing else in this spec would change. Don't pre-build the branch now.

---

## ✅ C. `utils/axiosInstance.ts` — the refresh interceptor

**Done**, all three parts: the request interceptor now reads through `tokenStore`, the single-flight helper is at module scope with the `finally` latch clear, and the response-error handler implements the six-row table. Spec 48a's comment block is extended rather than rewritten, as instructed, and `isStale401` keeps its name.

### Request interceptor

Only change: `const token = await getAccessToken()` instead of the direct `AsyncStorage` read. No proactive refresh here — the app's cold-start refresh lives in the context (§D), and doing it per request would serialise every call behind a storage read plus a possible network round trip.

### Single-flight refresh helper (same file, module scope)

```ts
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight; // concurrent 401s share one call
  refreshInFlight = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      // ! bare axios, NOT axiosInstance — going through the instance would re-enter these
      // ! interceptors and, on a 401 from the refresh call itself, recurse.
      const res = await axios.post(`${getBaseUrl()}/auth/refresh-token`, {
        refreshToken,
      });
      const next = res?.data?.token;
      if (!next) return null;
      await setTokens({ accessToken: next }); // refresh token unchanged (server §A)
      return next;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
```

`finally` must clear the latch even on success, or one refresh per app session is all that ever happens.

### Response-error decision table

This supersedes the single `isCurrentSession` branch, and keeps spec 48a's conclusion intact: **a `401` only concerns the current session if it was sent with the current access token.**

|     | Condition                                                                                                            | Action                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | status ≠ 401                                                                                                         | unchanged (incl. the `409`→amber toast)                                                                                                                                                              |
| 2   | 401 on a **public** `/auth` route — `login`, `register`, `refresh-token`, by name | unchanged — the user's own action, never stale, never refreshed. **Corrected by `51c`: this row used to say `/auth/*`, and the implementation matched it.** The server mounts `authCheck`-protected routes under the same prefix (`/auth/me`, `/auth/push-token`); excluding those from refresh logged the rider out on almost every cold launch. Match the three public routes by name, never the prefix — and note none of the three can even produce a 401 (login answers 404/403 per server H7, register 400/409, refresh-token never reaches this interceptor) |
| 3   | 401, `sentAuth === Bearer <current access token>`, a refresh token exists, request not yet retried                   | `await refreshAccessToken()`; on success retry the original request once with the new token and **return the retry's response** — no toast, no logout, caller never sees the 401; on failure → row 4 |
| 3b  | 401, as row 3, but the refresh call got **no answer at all** (`error.response` absent: offline, DNS, refused connection, or the 20s timeout) | **row 6's inert path — keep both tokens, no toast, no logout** (spec 51b). A network failure says nothing about whether the session is valid, and `clearTokens()` would destroy a refresh token that almost certainly still is |
| 4   | 401, `sentAuth === Bearer <current access token>`, no refresh token (or refresh failed)                              | today's path, unchanged: clear tokens + `"user"`, `queryClient.clear()`, `"Token expired , please login "` toast, `router.replace("/auth")`                                                          |
| 5   | 401, `sentAuth` ≠ current access token, a current access token exists, not yet retried                               | **retry once with the current token.** This is the in-flight-at-refresh-time case: the request left before the refresh landed. If the retry fails, treat as row 6                                    |
| 6   | 401, anything else (no current token at all — the post-logout refetches of H-D; or an already-retried stale request) | spec 48a's inert path: no storage write, no cache clear, no redirect, **no toast**, reject with `errorObj`                                                                                           |

Rows 5 and 6 are 48a's `isStale401` split in two: 48a made every non-current `401` inert, which is right for a logged-out session but needlessly loses a request that merely raced a refresh. Keep 48a's `isStale401` naming and its comment block, and extend the comment rather than rewriting it.

Row 3b was added by **`51b`** after the fact. The `catch { return null; }` this section originally specified collapsed "the server refused" with "we could not deliver the request", and row 4 answered both by clearing both tokens — so a signal drop in the window between the `401` and the refresh cost the rider a valid 15-day credential, unrecoverably. `refreshAccessToken` now returns a three-valued outcome (`refreshed` / `refused` / `unreachable`) and the refresh call carries its own 20s timeout, because bare `axios` does not inherit the instance's. Read `51b` before touching this table.

Retry marker: set `error.config.__isRetry = true` before re-issuing, and skip rows 3/5 when it is already set (H-E). Use `axiosInstance.request(error.config)` so the request interceptor re-reads the (now new) token rather than hand-patching the header.

One consequence worth being explicit about: in row 3 the interceptor **returns a success response** for a request that failed, which it has never done before. `utils/api.ts` unwraps `result?.data`, and the success interceptor reshapes to `{ data, meta }` — so the retry must go back through the instance (as above) to get the same shaping, otherwise every refreshed call returns an unwrapped axios response and screens break in a way `tsc` will not catch.

### Row 5 as implemented is narrower than row 5 as written, deliberately

Row 5's condition above is "`sentAuth` ≠ current access token, a current access token exists". Taken literally that includes a request whose `sentAuth` is **absent** — and those are precisely H-D's post-logout refetches, which leave with no `Authorization` header at all because `logoutFunction` already cleared storage. Retrying one of those with whatever token is current would re-issue a request from the session the rider just ended, under the next session's credentials. It would not fire a refresh, so H-D's stated worry is untouched and V8's assertions still pass — but it is the same class of mistake spec 48a was written to fix, reached by a different route.

So the implementation requires `sentAuth` to be **present** as well as different:

```ts
if (!isCurrentSession && !isAuthEndpoint && !!sentAuth && !!currentToken && canRetry)
```

A request that never carried a token cannot have raced a refresh, which is the only thing row 5 exists to rescue. Those requests fall through to row 6 and stay exactly as inert as 48a shipped them. Row 5 still covers the case it was written for: a request that left with a token that has since been replaced.

The one case this leaves retryable is a request carrying the *previous user's* token that lands after the next user has logged in — `sentAuth` is present, just superseded. That is row 5's literal intent and it is kept: the retry goes out with the current user's token, so it returns the current user's data into a cache that login already cleared (spec 48 §A), and no session is re-armed.

---

## ✅ D. `context/user.context.tsx`

**Done.** `handleSetToken` became `handleSetTokens({ accessToken, refreshToken })` outright rather than keeping a wrapper — `LoginForm.tsx` was its only call site, so a wrapper would have been dead weight. Cold-start hydration reads through `tokenStore` (so the H-C migration happens during the splash, before any request goes out) with no expiry check and no refresh. `logoutFunction` calls `clearTokens()`. `token` in the context value still means the access token, and the refresh token is not exposed.

- Cold-start `loadUserData`: read both tokens through `tokenStore` and hydrate `user` when `storedUser` and an access token exist, exactly as today. **No expiry check and no refresh here** — an earlier draft of this spec refreshed during the splash screen if the stored access token had expired; the flow above rules that out. A cold launch after a week simply mounts, the first query goes out on the stale token, the server `401`s, and §C row 3 recovers it.
  What this costs, stated honestly so it is not a surprise on a device: the first screen after a cold launch does one extra round trip (the doomed request) before its data arrives. The single-flight latch collapses the whole opening burst of queries into one refresh, and because row 3 returns the _retry's_ response the rider never sees an error — just a slightly longer spinner on the first paint. If that turns out to be visible on a real device, the fix is a pre-emptive cold-start refresh and it is a four-line change to this function; decide it from the V4 observation, not in advance.
- `handleSetToken(token)` → `handleSetTokens({ accessToken, refreshToken })`, writing both and keeping the `queryClient.clear()`-on-login call exactly where it is (spec 48 §A: clearing on login is the stronger invariant). Keep the existing name as a thin wrapper if other call sites make that cheaper.
- `logoutFunction` → `clearTokens()` (both keys + legacy) plus the existing `queryClient.clear()` and state reset. No server call — there is no logout endpoint (server §A).
- `token` in the context value keeps meaning the **access** token. The refresh token should _not_ be exposed on the context; only `tokenStore` and the interceptor need it, and `SettingsCatalog.tsx` reads `token` for other purposes.

## ✅ E. `components/main/Auth/LoginForm.tsx`

**Done.** `TLoginResponse.refreshToken` is **optional**, which is the point of H1's sequencing: the server deploys after this build, so every login until then answers without one and must behave exactly as today. `TUserToken` gained `type?: "access"`.

Read `result.refreshToken` alongside `result.token` and pass both. `jwtDecode<TUserToken>(result.token)` keeps working — the access token still carries `userId`/`userEmail`/`userRole`. Add `type?: "access"` to `TUserToken` in `types/global.types.ts` and a `TLoginResponse.refreshToken: string`. Nothing else in the form changes. A **missing** `refreshToken` must not break login — the server deploys after this build (server §H), so every login during development and testing answers without one, and that has to behave exactly as today rather than erroring.

## F. Untouched

`utils/AuthGuard.tsx` (it keys on `user`, not on token validity), `utils/isAdmin.ts` (decodes the access token, whose claims are unchanged), `utils/registerPushToken.ts`, `hooks/useApi.ts`, `utils/queryClient.ts`, every screen. `RegisterForm.tsx` — register still issues no tokens.

---

## Test plan

Two throwaway accounts (A with data, B empty), against a **local** server with `JWT_ACCESS_EXPIRES_IN=60s` so expiry is reachable. `utils/envConfig.ts` hardcodes the deployed URL — point it at the local server for the run and **revert it before committing**. Run the matrix on the web export first (that is what this app's past verification passes used), then at minimum V1/V4/V7/V9 on a device, which also settles spec 48a's owed device pass. Because of decision 3 the device pass runs in **Expo Go** — no dev-client or EAS build is needed to exercise any of this. All three keys sit in one store, so V1/V7/V10's storage assertions are a single `AsyncStorage.getAllKeys()` read.

| #   | Scenario                                                                                                                  | Expected                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Log in                                                                                                                    | both tokens stored under the new keys; `token` key absent                                                                                                                                                                                                                                                          |
| V2  | Use the app for 3 minutes across several screens                                                                          | no login screen, no "Token expired" toast; exactly one `/auth/refresh-token` call per expiry window, not one per query (the single-flight latch)                                                                                                                                                                   |
| V3  | **The flow itself, read off the network log:** sit on a fetching screen through an expiry with 3+ queries firing together | per expiry: the requests `401`, **one** `POST /auth/refresh-token` → `200`, then each request again → `200`. In that order. No toast, no navigation, nothing visible                                                                                                                                               |
| V4  | Kill the app, wait past expiry, cold launch                                                                               | lands in the garage, not on `/auth`. Network order: the first query `401`s, **then** one refresh, **then** the retry succeeds — no refresh during splash (§D). No error toast. Note how long the first paint's spinner lasts; that observation is what decides whether §D's deferred pre-emptive refresh is needed |
| V5  | Corrupt the stored **access** token, navigate                                                                             | refresh fires, succeeds, navigation works (this is now a _recoverable_ state, unlike today)                                                                                                                                                                                                                        |
| V6  | Corrupt the stored **refresh** token, then let the access token expire                                                    | one failed refresh → logout, "Token expired" toast, `/auth`, cache cleared                                                                                                                                                                                                                                         |
| V7  | Delete the refresh token only, let the access token expire                                                                | logout path (row 4) — the pre-spec-51 behaviour, which is also the legacy-install case (H-C)                                                                                                                                                                                                                       |
| V8  | **Spec 48a regression:** hold A's three post-logout `401`s 8s, log in as B meanwhile, release                             | B stays logged in, no toast, **and no refresh call fires** (H-D)                                                                                                                                                                                                                                                   |
| V9  | A logs out → B logs in, no reload                                                                                         | no trace of A's data (spec 48 §A still holds)                                                                                                                                                                                                                                                                      |
| V10 | Update an install that has the legacy `token` key (simulate: write `token`, clear the new keys)                           | session preserved, key migrated, no login prompt; first expiry → one logout                                                                                                                                                                                                                                        |
| V11a | Server unreachable while the stored access token is still **valid** | stays logged in, both tokens intact, the screen shows its own error state. **No** refresh attempt, no navigation, no session toast |
| V11b | Server answers `401`, then the **refresh call** is unreachable | **stays logged in, both tokens intact** — the regression test for spec 51b. No cache clear, no `/auth`, no "Token expired" toast |
| V11c | Server answers `401`, and the refresh call is **refused** with a `401` | logged out, both tokens cleared, `/auth`, cache cleared — unchanged from V6. V11b is only correct if this still holds |
| V11d | Refresh call hangs on a half-open connection | resolves by its own 20s timeout into V11b's outcome — session kept, and no spinner left wedged behind the latch (spec 51b §3c) |
| V12 | Duplicate catalog name                                                                                                    | amber `409` toast unchanged                                                                                                                                                                                                                                                                                        |
| V13 | Admin account                                                                                                             | Settings still shows the Admin panel after a refresh has replaced the token (spec 50's claim read from the new token)                                                                                                                                                                                              |
| V14 | ✅ `npx tsc --noEmit` + `yarn lint` | **Clean, 2026-10-11.** `tsc` exits 0; `yarn lint` (it covers `app/` and `components/`) is silent, and `npx eslint utils context` gives 0 errors with only the two warnings that predate this spec (`logoutFunction`'s unused `error` binding, `AuthGuard`'s `exhaustive-deps`). `tsc` was only meaningful after the typed routes were regenerated — see `51a`. Also: `npx expo export --platform web` bundles all 20 routes on the final code |
| V15 | **Cold launch past expiry on a real device, with push registration reaching the network** | one refresh, the push token registers, the rider lands in the garage. **No logout, no `/auth`, no toast** — in either interleaving of the push call and the first screen query. This is `51c`'s regression test, and the web export **cannot** run it: `registerPushToken()` returns early on `!Device.isDevice`, which is why V4 never caught the bug |
| V16 | A logs out → B logs in, same app session, no force-kill | B's device registers its own push token (`51c` §5c — registration is keyed on `user._id`, not a once-ever flag) |

V8 is the one that can regress a shipped fix; run it before anything else is called done.

## Decisions

1. **The flow is the one above**, as stated by the developer on 2026-10-11. It also settles what an earlier draft had as an open question: there is **no** cold-start refresh — the app reacts to the `401` like everywhere else (§D).
2. **Every user will install the new build** (server spec 51 H1), so this build is what the refresh scheme ships on; an install that predates it gets a 15-minute session once the server deploys, which is the reason the server deploys **last**.
3. **Both tokens live in `AsyncStorage`; `expo-secure-store` is not used** — developer decision, 2026-10-11, closing former open question 1. Consequences, all of them simplifications: no new native dep, no `npx expo install`, no EAS rebuild tied to this spec, no `Platform.OS` branch in `tokenStore.ts`, and the web-export verification path is unaffected (H-A and H-B both dissolve). The cost is at-rest encryption for the 15-day refresh token, accepted and written out in §B along with the one-file upgrade path if that changes.

## Still open

**Nothing.** Both former open questions are closed:

1. ~~`expo-secure-store` or AsyncStorage?~~ → **AsyncStorage**, decision 3 above.
2. ~~Is there an EAS build planned that this can ride along with?~~ → **moot, and worth spelling out since the question was unclear.** It only existed because of H-B: `expo-secure-store` is a *native* module, and adding one invalidates any already-installed standalone/dev-client build — Expo Go bundles it, so `yarn start` would have been fine, but a real installed APK would have needed rebuilding through EAS before the new storage code could run. Since spec 36 (the widget) already owes an EAS build, the question was simply whether to let this change ride along on that build rather than trigger one of its own. With `AsyncStorage` there is no native module, so nothing here needs a rebuild and the two specs are unrelated. Spec 36's EAS build is still owed, for spec 36's own reasons.

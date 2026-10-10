# 48a: A voluntary logout fires stale 401s that show an error toast — and can log the _next_ user out

Status: ✅ Complete — found and fixed 2026-10-10; verified on the web build only (see "Not verified").

Found while testing the app (Expo web export driven in headless Chrome, two throwaway accounts against the live API) before a production release. **Caused by spec 48 §A**, not by the backend: spec 48 added `queryClient.clear()` to `logoutFunction` (`git show 635cad8 -- context/user.context.tsx`), and that call is what wakes the screens that are still mounted.

---

## Goal

A 401 should only mean "your session expired" when the request that failed was actually sent with **the session that is current right now**. Any other 401 — sent with no token, or with a previous user's token — is a stale leftover and must neither wipe the current session nor show the user an error.

---

## The error

Two symptoms, one root cause.

### Symptom 1 — an error toast on the login screen after every voluntary logout

Reproduced on the first try, every time. Settings → Log out → confirm. The user lands on the login screen under a red toast reading **"Authorization header missing or malformed"** (screenshot taken at t+700ms; it is still up at t+2.5s).

Request trace around the confirm tap (times are ms into the run):

```
 8484  --- click Log out
 9585  401 GET /maintenance-types   auth=none
 9597  401 GET /engine-oil-types    auth=none
10248  401 GET /bikes               auth=none
```

### Symptom 2 — the stale 401s can log the **next** user out (the serious one)

The three requests above are fast on a good connection, so symptom 1 usually resolves before anyone can type a password. They are not fast on a mobile network, which is this app's real target. Simulated by holding those three no-token requests for 8 s with request interception:

```
 9084  HOLD stale no-token GET /bikes /maintenance-types /engine-oil-types
10900  B logged in, path /
17085  release ×3
17569  401 /maintenance-types
17579  401 /bikes
18240  401 /engine-oil-types
20905  10s later: path /auth | tokenStored=false     <-- B was logged out
```

User B had already signed in successfully. Then user A's leftover 401s landed, hit the interceptor's unconditional 401 branch, removed B's token from `AsyncStorage`, cleared B's cache and called `router.replace("/auth")`. B sees "Token expired" for a session that was seconds old.

## Root cause

Two things combine:

1. **`logoutFunction` clears the cache while the screens that own the queries are still mounted.** `context/user.context.tsx:92-103` removes the token, calls `queryClient.clear()`, then `setUser(null)`/`setToken(null)`. The Settings and Garage screens are not unmounted until `router.replace("/auth")` runs afterwards (`SettingsCatalog.tsx:371-372`). TanStack Query observers on a cleared cache re-create their queries and fetch — now with no token. Before spec 48 the cache was not cleared on logout, so nothing refetched.
2. **The 401 branch in `utils/axiosInstance.ts:55-74` is unconditional.** It does not ask _which_ token the failed request carried or whether that token is still the current one. Any 401 from any time wipes whatever session exists at the moment the response arrives.

Cause 1 is what makes stray requests; cause 2 is what turns them from noise into a session wipe. Fixing only cause 1 (ordering) would leave cause 2 exposed to any other late response — e.g. a request in flight at the instant the real token expires, finishing after a re-login.

The genuine expiry path is **not** broken and must stay as it is — verified: corrupting the stored token mid-session and navigating gives the redirect to `/auth`, the "Token expired" toast, a cleared cache, and a clean login for the next user with no trace of the previous user's data.

---

## Design

Fix cause 2, in the interceptor only. It is the narrower, safer change and it closes the whole class (not just the logout trigger).

In the response interceptor's error handler, a 401 is treated as a **session expiry** only if all of these hold:

- The request carried an `Authorization` header (`error.config.headers.Authorization`).
- There is a token currently in `AsyncStorage`.
- The header equals `Bearer <that current token>`.

If a 401 fails that test it is a **stale 401**: do not touch storage, do not clear the cache, do not redirect, **and do not show a toast** — still reject, so React Query sees the failure and the caller's `catch` runs as before.

One exclusion, to keep behaviour unchanged where a 401 is a real answer to the user's own action: requests to `/auth/*` (login/register) are never classed as stale, so their error toast is untouched. (Today the server answers wrong credentials with 403/404, so this is a safeguard, not a live path.)

```ts
async function (error) {
  const status = error?.response?.status;
  const sentAuth = error?.config?.headers?.Authorization;
  const isAuthEndpoint = /^\/auth\//.test(error?.config?.url ?? "");

  let isStale401 = false;
  if (status === 401) {
    const currentToken = await AsyncStorage.getItem("token");
    const isCurrentSession =
      !!sentAuth && !!currentToken && sentAuth === `Bearer ${currentToken}`;

    if (isCurrentSession) {
      // ...existing expiry handling, unchanged: remove user + token, queryClient.clear(),
      // "Token expired" toast, router.replace("/auth")
    } else if (!isAuthEndpoint) {
      isStale401 = true;
    }
  }

  const errorObj = { /* unchanged */ };

  if (!isStale401) {
    Toast.show({ /* unchanged, incl. the 409 → warning colour */ });
  }
  return Promise.reject(errorObj);
}
```

### Why not just reorder the logout

Navigating first and clearing after (`router.replace("/auth")` before `logoutFunction()`) would remove the _trigger_ in the common case, but it relies on the screens having unmounted by the time `clear()` runs, which navigation does not guarantee, and it leaves cause 2 in place. It can be done later as a tidy-up; it is not needed for correctness once the interceptor is right.

The three wasted requests still go out after a logout. They are harmless once their 401s are inert, and avoiding them would mean gating every query on the token, a much wider change to `hooks/useApi.ts` that this spec does not need.

## Out of scope

- No change to `logoutFunction`, `handleSetToken`, or the `queryClient.clear()` calls — spec 48's cache isolation is correct and verified (logout→login and expired-token→login both leak nothing).
- No gating of queries on the token (`enabled: !!token`).
- No backend change.
- The app's wording nits found in the same pass (see the end) are not fixed here.

---

## Implementation

- [x] 1. Mark this spec In Progress in `ai context/progress-tracker.md`.
- [x] 2. `utils/axiosInstance.ts` — restructure the error handler as in the Design. Keep every existing comment that still applies; add one explaining the stale-401 rule. Keep optional chaining on every data read (invariant 5).
- [x] 3. `npx tsc --noEmit` and `yarn lint` clean.
- [x] 4. Re-run the verification below against a fresh web export.
- [x] 5. Mark Complete here and in the tracker; add a Recent Activity entry; correct spec 48's Verify notes (it asserted the logout path was safe — it was for data, not for UX/session).

## Verification

All against a fresh `expo export --platform web`, served locally, driving the real UI against the live API with two throwaway accounts (A with catalog rows, B empty). Each row was **already run against the unfixed build** and the failing ones are the "before":

| #   | Scenario                                                            | Before                                                | Expected after                             |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| V1  | A logs out → login screen                                           | red "Authorization header missing or malformed" toast | no error toast                             |
| V2  | Hold A's 3 stale requests 8 s, B logs in meanwhile, release         | B logged out, `token` removed, path `/auth`           | B stays logged in, token kept, no toast    |
| V3  | Corrupt the stored token mid-session, navigate to a fetching screen | redirect to `/auth` + "Token expired" toast           | **identical** — genuine expiry still works |
| V4  | V3 then log in as B in the same document                            | no trace of A's data                                  | **identical**                              |
| V5  | A logs out → B logs in (no reload)                                  | no trace of A's data                                  | **identical**                              |
| V6  | Duplicate catalog name                                              | amber conflict toast                                  | **identical** (409 colour logic untouched) |

V2 is the regression test for the serious symptom and doubles as the negative control the earlier cache-isolation tests lacked.

## Result (2026-10-10)

`utils/axiosInstance.ts` only; `tsc` and `yarn lint` clean. Re-run against a fresh web export, the two "before" failures now pass and the "identical" rows are unchanged:

| # | After |
| --- | --- |
| V1 | no toast on the login screen at t+300/700/1200/2500 ms |
| V2 | the three held 401s still arrive (~8 s late) and are now inert — B keeps the token, stays on `/`, no toast |
| V3 / V4 | unchanged: redirect to `/auth`, "Token expired" toast, no trace of A's data for B |
| V5 | unchanged: no trace of A's data for B, B's catalog empty |
| V6 | unchanged: amber duplicate-name toast |

Also re-checked after the spec 49 dependency bump, on that final build.

## Not verified (cannot be, here)

- Behaviour on a real device or in Expo Go. Everything above is the web build. The interceptor is plain JS shared by all platforms, but toast rendering and `router.replace` timing differ natively. A device pass of V1 and V2 is still owed.

## Found in the same pass, deliberately not fixed

- `SwitchField` is a bare `TouchableOpacity` with no `accessibilityRole="switch"`, `accessibilityState` or label, so screen readers cannot operate the "Needs an engine oil type" toggle.
- The maintenance list header reads "1 services logged" (no singular).
- The delete-type confirmation says logs that used the type "keep their history", but the server refuses the delete outright while a live log uses it. The refusal toast that follows is clear.

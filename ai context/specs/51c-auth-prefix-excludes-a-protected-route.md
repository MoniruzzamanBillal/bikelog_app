# 51c: the `/auth/*` exclusion logs the rider out on almost every cold launch

Status: ✅ **Complete — implemented 2026-10-11.** §5a (whitelist + rename), §5b and §5c are all in. Spec 51's §C row 2 is reworded and V15/V16 added. `tsc --noEmit` clean, lint clean, `expo export --platform web` bundles 20 routes. **V15 is owed and needs a real device** — the web export cannot reach this code path at all (§6), which is the whole reason the bug shipped. Originally written 2026-10-11, found by reading spec 51's `/auth` exclusion against `bikelog_server`'s route table and against `bikelog_client-web-`'s equivalent guard.

Sub-spec of `51-refresh-token-auth.md`. The defect is one regular expression. Its consequence is that spec 51's single most important scenario — V4, a cold launch past expiry landing in the garage — fails on the app's most common launch path, and the app ends up **worse than before spec 51 shipped**.

---

## 1. The defect

`utils/axiosInstance.ts:149`, as committed in `8fe83f6`:

```ts
const isAuthEndpoint = /^\/auth\//.test(error?.config?.url ?? "");
```

The intent (spec 51 §C row 2) is "an unauthenticated action the user took themselves — never stale, never refreshable". The prefix is being used as a proxy for *public*. It is not one. `bikelog_server/src/app/modules/user/user.route.ts` mounts **five** routes under `/auth`, and two carry `authCheck`:

| Route                 | `authCheck` | Public? |
| --------------------- | ----------- | ------- |
| `/auth/register`      | no          | yes     |
| `/auth/login`         | no          | yes     |
| `/auth/refresh-token` | no          | yes     |
| `/auth/me`            | **yes**     | **no**  |
| `/auth/push-token`    | **yes**     | **no**  |

This app calls `/auth/push-token` (`utils/registerPushToken.ts:50`, via `apiPost`, so it goes through the instance), and it calls it on the hottest path in the app.

## 2. What the rider sees

`context/user.context.tsx`'s second effect fires `registerPushToken()` on every launch where a stored session exists — by design, to cover "an already-stored session on cold launch".

1. Cold launch more than 15 minutes after last use. The stored access token is expired (that is now routine, not exceptional — it is the whole point of a 15-minute token).
2. `registerPushToken()` posts to `/auth/push-token` with that expired token. The server answers `401`.
3. `isAuthEndpoint` is `true`, so `canRetry` is `false`. **Row 3 never runs. No refresh is attempted.**
4. `isCurrentSession` is `true` — the token it was sent with *is* the stored one. So **row 4** fires: both tokens cleared, `queryClient.clear()`, `"Token expired , please login "`, `router.replace("/auth")`.

A rider who used the app yesterday opens it this morning and lands on the login screen, holding a valid 15-day refresh token that was never tried.

**This is a regression against the pre-spec-51 app.** The old single token lasted 10 days, so a cold launch after a night worked. With this bug, a session dies after 15 minutes of inactivity. Spec 51 was supposed to extend sessions to 15 days; on the launch path it shortens them to 15 minutes.

**The timing variant.** If a screen's own query `401`s and refreshes *first*, the push-token `401` arrives carrying a now-superseded token, so `isCurrentSession` is `false` — but `isAuthEndpoint` also blocks the `else if (!isAuthEndpoint)` inert branch, so `isStale401` stays `false` and the rider gets a spurious red `"Access token expired"` toast on a session that is working fine. Which of the two outcomes happens depends on which request lands first, so the symptom is intermittent — the worst kind to chase from a bug report.

## 3. The exclusion could never have done its job

This is the part worth sitting with, because it shows the guard was wrong in both directions at once:

- **`/auth/login` cannot produce a `401`.** `loginFromDb` answers an unknown email with `404` and a wrong password with `403`. Server spec 51 **H7** states this is load-bearing and must not be "tidied up", *precisely because* both clients key session-expiry handling on `401`.
- **`/auth/register` cannot either** — `400` from validation, `409` on a duplicate email.
- **`/auth/refresh-token` never reaches this interceptor at all.** It is called with bare `axios` on purpose (otherwise a `401` from the refresh call would recurse through these interceptors).

So of the five routes under the prefix, the three the exclusion was written for can never trigger it, and the one request that genuinely `401`s is the one it must not have excluded. The guard only ever misfired.

## 4. `bikelog_client-web-` got this right

`bikelog_client-web-/utils/axiosInstance.ts:17-20`:

```ts
const isPublicAuthRoute = (url?: string) =>
  !!url &&
  (url?.includes("/auth/login") ||
    url?.includes("/auth/register") ||
    url?.includes("/auth/refresh-token"));
```

It **enumerates the public routes** rather than matching the prefix, and it is not affected — it also never calls `/auth/push-token`, having no Expo push tokens to register. Same shape as `51b`: the sibling client is correct and the app is not. See §7.

## 5. Design

### 5a. Whitelist, and rename

```ts
// ! The three PUBLIC /auth routes: the ones reachable without a session. A 401 from one of
// ! these is the user's own action, never a stale session, and never refreshable.
// ! Deliberately NOT a /^\/auth\// prefix match (spec 51c): the server also mounts
// ! authCheck-protected routes under this prefix — /auth/me and /auth/push-token — and those
// ! are ordinary authenticated calls that must refresh and retry like any other.
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh-token"];

const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
  (error?.config?.url ?? "").startsWith(route),
);
```

All four uses of `isAuthEndpoint` are renamed. **The rename is part of the fix, not tidying.** `isAuthEndpoint` reads as "any endpoint under `/auth`", which is the wrong mental model and is what made `/auth/push-token` look like it belonged in the exclusion. Naming it for the property that actually matters — *public* — makes the next protected route under that prefix obviously not a member. It also matches the web client's name, which helps the next person comparing the two files.

**Whitelist, not an added exception.** The set of public auth routes is small, closed, and readable off the server's route file. The set of protected routes under `/auth` will grow — `/auth/me` already exists and is unused here. A whitelist fails safe: a route added later gets refresh-and-retry automatically. A blacklist fails exactly the way this bug did — silently, on whichever route someone forgets.

### 5b. `/auth/push-token` after the fix

It becomes an ordinary authenticated call. A cold launch past expiry: the push-token `401` either triggers the refresh itself (row 3 → retry → registered), or shares the single-flight refresh another query already started, or arrives with a superseded token and takes row 5's one retry. All three end with the token registered and nobody logged out. No special-casing needed anywhere.

### 5c. Push registration must survive a session change (secondary defect)

`hasRegisteredPushToken` is a `useRef(false)` set once and never reset, so after A logs out and B logs in **in the same app session**, B's device never registers — B silently gets no weekly summaries until the app is force-killed.

Resetting the boolean in `logoutFunction` is not enough: row 4 and a refused refresh both end a session from inside the interceptor, outside React, where a ref cannot be touched. Key it on the user instead:

```ts
const registeredPushForUserId = useRef<string | null>(null);

useEffect(() => {
  if (user && token && registeredPushForUserId.current !== user._id) {
    registeredPushForUserId.current = user._id;
    registerPushToken();
  }
}, [user, token]);
```

Still once per user per app session, but now correct however the previous session ended.

## 6. Test rows added to spec 51

| #   | Scenario                                                                                    | Expected                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V15 | Cold launch past expiry **with push registration reaching the network** (a real device)     | one refresh, the push token registers, the rider lands in the garage. **No logout, no `/auth`, no toast** — in either interleaving of the push call and the first screen query |
| V16 | A logs out → B logs in, same app session, no force-kill                                     | B's device registers its own push token (§5c)                                                                                                                |

V15 is the row whose absence let this through. V4 covers a cold launch past expiry but says nothing about the push call racing it, and on the web export `Device.isDevice` is false so `registerPushToken()` returns before any request — **the app's existing verification path cannot reach this bug at all.** V15 must be run on a device.

## 7. The lesson, and it is the same one as 51b

Three checks were clean when this shipped, and a fourth could not have helped:

- `tsc --noEmit`, `yarn lint`, `expo export --platform web` — all clean, and none can see a wrong regex.
- The web export, which is how specs 48a and 50 were verified, **cannot reach this code path**: `registerPushToken()` bails on `!Device.isDevice`.
- Re-reading spec 51 would not have caught it either — §C row 2 *says* `/auth/*`, so the implementation matched the spec. The spec was wrong.

What found it was cross-checking the app's guard against two external sources of truth: the server's route table (what is actually protected) and the sibling client's version of the same guard (which enumerates instead of matching). Both were already in the repo. Recorded in `progress-tracker.md`'s Known Gaps alongside `51b`'s version of this.

## Out of scope

- `/auth/me` is not called by this app and no call site is added here. The protected-files rule in `ai context/ai-workflow-rules.md` explicitly says not to add a `GET /auth/me` round trip; after this fix it would work correctly if one were ever added.
- No change to rows 1, 3, 3b, 4, 5, 6, the single-flight latch, or `tokenStore.ts`.
- No change to `registerPushToken.ts` itself. It is best-effort and silent by design, and that is still right — it simply stops being able to end a session.

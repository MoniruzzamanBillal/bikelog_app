# 51b: a dropped network during a refresh must not log the rider out (and V11 says it should)

Status: ✅ **Complete — implemented 2026-10-11**, immediately after spec 51's implementation landed in `8fe83f6`. All of §3 is in `utils/axiosInstance.ts`; §4's V11a–V11d replace V11 in spec 51, and §C there gained row 3b. `tsc --noEmit` clean, lint clean, `expo export --platform web` bundles 20 routes. **V11a–V11d themselves are owed** — they need a running local server like the rest of spec 51's matrix, and they are the regression tests for this file.

Sub-spec of `51-refresh-token-auth.md`. Two findings, the same pair the web client hit: one wrong expectation in spec 51's own test plan, and one genuine defect in its §C that the wrong expectation was hiding.

**Credit where it is due: this was not found by anything in this app.** `bikelog_client-web-` spec `32a` found it by *running* its own V15, and the two clients implement the same normative flow, so its conclusion transfers directly. Read `../../bikelog_client-web-/context/specs/32a-network-failure-must-not-end-the-session.md` alongside this. That it took the sibling client to surface it is the point of §5 below.

---

## 1. The defect

`utils/axiosInstance.ts` as committed in `8fe83f6`:

```ts
} catch {
  // ! Any failure — 401 on an expired/invalid refresh token, or no network at all — is
  // ! "could not refresh". The caller turns that into the logout path.
  return null;
}
```

That comment states the bug plainly, which is the useful thing about it: a network failure and a refusal are deliberately collapsed. Row 4 then answers `null` by clearing both tokens, clearing the cache, toasting, and redirecting to `/auth`. So:

1. The access token expires. A request goes out, the server answers `401`. **The server is up and the session is valid.**
2. The client posts to `/auth/refresh-token` — and *that* request fails at the transport layer: the signal drops in that instant, a captive portal eats it, the connection is half-open, a proxy times out.
3. `refreshAccessToken()` returns `null`, indistinguishable from a refusal → row 4 fires → **a valid 15-day credential is deleted** and the rider has to type their password again.

`clearTokens()` makes it unrecoverable. There is no second chance once the refresh token is gone.

**Why this is worse here than on the web.** The web client is usually a browser on a stable connection; this is a motorcycle app. The rider is in a car park, a tunnel, a lift, a basement, or on dying rural data — and an expiry burst fires several requests *at once*, which is the moment a flaky connection is most likely to drop one. This is not an edge case on a phone; it is a Tuesday.

**The authority is the flow's own step 3** (spec 51, normative, confirmed by the developer): "Refresh token invalid or expired → **the refresh call itself answers `401`** → log the user out and remove both tokens." Logging out is what we do when the server *refuses*. Not when we fail to ask. §C's `catch` was the drafting error, and it was copied from the same wrong prose the web spec carried.

## 2. The test-plan error that hid it

Spec 51 §Test plan, V11:

> | V11 | Airplane mode during a refresh | refresh fails → logout; no crash, no spinner wedged |

V11 asserts the bug *as the expected result*, so following the spec faithfully could never catch this. It is replaced in §4, not "fixed" in code.

## 3. Design

### 3a. A three-valued outcome

`refreshAccessToken()` stops returning `string | null`:

```ts
type TRefreshOutcome =
  | { status: "refreshed"; accessToken: string }
  | { status: "refused" }      // the server answered — the session really is over
  | { status: "unreachable" }; // no answer at all — says nothing about the session
```

- **`refused`** — any answer from the refresh endpoint that does not yield a token: a `401`, any other 4xx/5xx, or a `200` whose body carries no `token` (a broken contract we cannot proceed on anyway). Also **no refresh token in storage at all**, which is not a transport failure — there is nothing to ask with, so the session is genuinely over (this is the H-C legacy-install case and V7).
- **`unreachable`** — the request produced no response whatsoever. **Do not touch storage, do not clear the cache, do not navigate.**

The discriminator is `error.response` being present, which is already how this file tells a server answer from a transport failure for its `statusCode` fallback.

The single-flight latch now caches the **outcome object** rather than a token, so a burst still shares one call and every member learns the same thing.

### 3b. What the interceptor does with `unreachable`

It lands on spec 48a's inert path (row 6): no storage write, no `queryClient.clear()`, no redirect, **and no toast**. The original request rejects normally, so the screen's own error state shows and the rider can retry; the next attempt refreshes for real once the network is back.

Suppressing the toast is not cosmetic. `errorObj.message` comes from the *original* `401`, so without this the rider stays logged in and is simultaneously told "Token expired , please login " — a message that contradicts the screen they are looking at and invites them to log out of a working session.

Implementation keeps row 3's existing fall-through shape rather than restructuring the table:

```ts
let refreshUnreachable = false;
// ...row 3:
const outcome = await refreshAccessToken();
if (outcome.status === "refreshed") { /* retry, as today */ }
refreshUnreachable = outcome.status === "unreachable";
// ...row 4 gains one guard:
if (isCurrentSession && !refreshUnreachable) { /* logout, unchanged */ }
else if (!isAuthEndpoint) { isStale401 = true; }  // now also the unreachable refresh
```

`/auth/*` is untouched: `canRetry` is already false there, so `refreshUnreachable` stays false and row 4 behaves exactly as before.

### 3c. The refresh call needs its own timeout — app-specific, not in web `32a`

The refresh goes out on **bare `axios`** (deliberately — the instance would re-enter these interceptors and recurse on the refresh call's own `401`). Bare `axios` does **not** inherit `instance.defaults.timeout = 60000`; global axios defaults to no timeout at all. So on a half-open connection the refresh can hang indefinitely — and because every `401`ed request in the burst is awaiting the single-flight latch, **all of them hang with it.** That is exactly the "no spinner wedged" half of the old V11, failing for a different reason than the one V11 imagined.

`{ timeout: 20000 }` on the refresh call. Generous enough for bad data, short enough that a wedged screen resolves itself into an error state the rider can act on. A timeout produces no `error.response`, so it correctly classifies as `unreachable` and costs nobody their session.

The web client did not need this: its refresh client runs in a browser where a stalled fetch is the user's own tab, and its instance-level timeout story differs.

## 4. V11 replaced

| #    | Scenario                                                                                         | Expected                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| V11a | Server unreachable while the stored access token is still **valid**                              | stays logged in, both tokens intact, the screen shows its own error state. **No** refresh attempt, no navigation, no toast about the session      |
| V11b | Server answers `401`, then the **refresh call** is unreachable (the dropped-network window, §1)   | **stays logged in, both tokens intact** — the regression test for this spec. No cache clear, no `/auth`, no "Token expired" toast                |
| V11c | Server answers `401`, and the refresh call is **refused** with a `401`                           | logged out, both tokens cleared, `/auth`, cache cleared — unchanged from spec 51 V6                                                              |
| V11d | Refresh call hangs (half-open connection, §3c)                                                    | resolves by the 20s timeout into V11b's outcome — session kept, no spinner left wedged for the instance's 60s                                     |

V11b and V11c are a pair: the fix is only correct if **both** hold. Keeping a session on an unreachable refresh is worthless if it also stops ending one the server has genuinely refused.

## 5. The lesson worth keeping

Spec 51's app half was committed with `tsc --noEmit` clean, `yarn lint` clean and a successful `expo export` — and this defect was in it, specified, commented, and asserted-as-correct by its own test plan. **None of the three checks could have found it, and neither could re-reading the spec.** What found it was reading the sibling client's implementation of the same normative flow.

Two things follow, both recorded in `progress-tracker.md`'s Known Gaps:

- When a spec is one half of a cross-repo change, **read the other half's sub-specs before calling it done** — they are where the other implementation's runtime findings live, and the flow being normative means those findings transfer.
- "Statically verified" is a much weaker claim than it looks for anything touching auth state transitions. Spec 51's V1–V13 remain owed, and V11a–V11d join them.

## Out of scope

- No retry/backoff on an unreachable refresh. The next request the rider triggers tries again; a background retry loop is a bigger change and this app has no offline story to hang it on.
- No offline banner or network-status UI. Every screen already has its own error state.
- No change to the `refused` path, the `__isRetry` one-retry bound, the `finally` latch clear, or §C rows 1, 2, 5 and 6.

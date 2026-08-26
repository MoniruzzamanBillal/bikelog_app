# 29: Bug Fix — Auth Token/Context Desync on 401

Status: 🔄 In progress

## Goal

Fix a verified bug found during a source-level bug-hunt pass (not yet reported by the user on-device, found by static analysis): the axios 401 interceptor clears AsyncStorage but leaves `UserContext`'s in-memory `user`/`token` state stale, letting the app briefly re-admit a "logged in" user with a dead token.

## Investigated, not a bug — image picker badge position

The same bug-hunt pass initially flagged `ImagePickerField.tsx`/`MultiImagePickerField.tsx`/`MultiFilePickerField.tsx`'s delete/edit badge `top` offsets (`-75`/`-70`) as a regression, reasoning from a `git blame` diff (`eac64f4`, spec 21) against the tiles' 64px height. **The user confirmed on a real device that the current badge position is correct** — this was a false positive from static analysis alone (the diff and the 64px tile height are real, but the actual on-screen result is fine, likely due to layout/overflow behavior the static read didn't account for). No change needed; noted here so this isn't relitigated by a future pass over the same `git blame` evidence.

## Context

`utils/axiosInstance.ts`'s response interceptor, on a `401`, does:

```ts
await AsyncStorage.removeItem("user");
await AsyncStorage.removeItem("token");
...
router.replace("/auth");
```

but never touches `UserContext`'s in-memory `user`/`token` state — only `context/user.context.tsx`'s own `handleSetUser`/`handleSetToken`/`logoutFunction` update that state, and the interceptor (a plain axios module, outside React) has no way to call them. `utils/AuthGuard.tsx` only redirects to `/auth` when `!user` — so with the stale in-memory `user` object still truthy, if the interceptor's one-shot `router.replace("/auth")` call is ever superseded by another navigation (e.g. a queued push-notification deep link from `app/_layout.tsx`), `AuthGuard` will judge the user "logged in" and let them back into protected screens with a token that AsyncStorage no longer has — every subsequent API call re-401s, repeatedly re-clearing already-empty storage, with no clean recovery short of a full app restart (which re-hydrates from now-empty storage in `user.context.tsx`'s own load effect).

`context/user.context.tsx` already has exactly the right logout logic in `logoutFunction` (clears storage + resets `user`/`token` state) — the fix is to give the axios layer a way to invoke it, since it lives outside the React tree.

## Design

Bridge the 401 interceptor to `UserContext` via a tiny module-level event target, so the interceptor can trigger the existing `logoutFunction` without axios needing to be inside React:

New file `utils/authEvents.ts`:

```ts
type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (fn: UnauthorizedHandler | null) => {
  handler = fn;
};

export const triggerUnauthorized = () => {
  handler?.();
};
```

`context/user.context.tsx` — register `logoutFunction` as the handler (kept current every render, no dependency-array staleness concern since it only calls stable `useState` setters):

```diff
+import { setUnauthorizedHandler } from "@/utils/authEvents";
 ...
   const logoutFunction = async () => {
     try {
       await AsyncStorage.removeItem("user");
       await AsyncStorage.removeItem("token");
       setUser(null);
       setToken(null);
     } catch (error) {
       console.log("something went wrong while logging out !!!");
     }
   };

+  setUnauthorizedHandler(logoutFunction);
+
   return (
```

`utils/axiosInstance.ts` — replace the direct storage-clear with triggering the bridged logout (single source of truth, no duplicated clear logic):

```diff
+import { triggerUnauthorized } from "./authEvents";
 ...
     if (error?.response?.status === 401) {
-      await AsyncStorage.removeItem("user");
-      await AsyncStorage.removeItem("token");
+      triggerUnauthorized();

       Toast.show({
         type: "error",
         text1: "Token expired , please login ",
         position: "top",
       });

       router.replace("/auth");
     }
```

(`AsyncStorage`'s import in `axiosInstance.ts` stays — still used by the request interceptor to read the token.)

## Implementation

- [ ] New `utils/authEvents.ts` — `setUnauthorizedHandler`/`triggerUnauthorized` module.
- [ ] `context/user.context.tsx` — register `logoutFunction` via `setUnauthorizedHandler` on every render.
- [ ] `utils/axiosInstance.ts` — 401 branch calls `triggerUnauthorized()` instead of clearing `AsyncStorage` directly.

## Dependencies

None. No new package, no backend change, no type change — confined to existing files plus one new tiny utility module.

## Verify

- [ ] `expo lint` / `npx tsc --noEmit` clean.
- [ ] Code-review confirms `axiosInstance.ts` no longer calls `AsyncStorage.removeItem` directly in the 401 branch, and `user.context.tsx` registers the handler.
- [ ] **On-device confirmation pending** (standing limitation of this project, per every other spec's own note — no simulator/device in this environment): after a real 401 (or a manually-expired token), `useUserContext().user` becomes `null` immediately rather than only after an app restart.

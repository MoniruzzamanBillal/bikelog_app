# 51a: `tsc --noEmit` fails on a stale `.expo/types/router.d.ts`, not on spec 51's code

Status: ✅ Complete — found and fixed 2026-10-11 while implementing spec 51. The defect is in a **generated, gitignored** file, so the fix leaves no diff; this file is the record, because the next session to run `npx tsc --noEmit` on a fresh checkout will hit it again.

Sub-spec of `51-refresh-token-auth.md`. It records the one error that surfaced during that spec's implementation, and why the obvious reading of it (a bug in `SettingsCatalog.tsx`) is wrong.

---

## The error

Spec 51's V14 asks for a clean `npx tsc --noEmit`. The very first run, taken as a baseline **before any spec 51 file was written**, reported one error:

```
components/main/SettingsCatalog/SettingsCatalog.tsx(708,42): error TS2345:
Argument of type '"/admin/error-logs"' is not assignable to parameter of type
'RelativePathString | ExternalPathString | "/auth" | ... | "/_sitemap" | ... 63 more ...'
```

It persisted unchanged through all four of spec 51's implementation steps, which is what identified it as pre-existing rather than caused.

## Root cause — a generated file older than the route it must describe

`app.json` sets `experiments.typedRoutes: true`, so `expo-router` generates the union of valid route strings into `.expo/types/router.d.ts` and `router.push()` is typed against it. That file was last written **2026-10-01**. `app/admin/error-logs.tsx` was added by **spec 50 on 2026-10-11**. So the union genuinely did not contain `/admin/error-logs`, and TypeScript was correctly reporting that the file it had been given does not describe the app on disk.

The call site is fine. Nothing in `app/` or `components/` is wrong. The input to the type checker was stale.

Two things made this easy to misread, and both are worth knowing:

- **`.expo/` is gitignored**, so the stale file is invisible to `git status` and cannot be fixed by a commit. It is per-checkout local state, which also means a fresh clone starts with **no** `router.d.ts` at all and every typed `router.push()` fails until something regenerates it.
- **`npx expo export --platform web` does not regenerate it.** A full web export was run first, on the assumption that a build would refresh everything it depends on; it bundled all 20 routes successfully — including `/admin/error-logs` — and left `router.d.ts` untouched at its 2026-10-01 mtime. The export resolves routes from the filesystem and never consults the generated types, so it is both the reason this is not a real build failure and the reason it cannot be the fix.

## The fix

Only the **dev server** writes the file. Boot it, let it generate, stop it:

```bash
cd bikelog_app
CI=1 timeout 75 npx expo start --port 8099   # exits 124 on the timeout; that is expected
npx tsc --noEmit                             # clean
```

`CI=1` keeps it non-interactive, and the port is off the default so it cannot collide with a dev server the developer already has running. Types are written during startup, well inside the timeout — verified by `grep -c "admin/error-logs" .expo/types/router.d.ts` going `0` → `3` and the file's mtime advancing to the run.

Nothing else was changed. `SettingsCatalog.tsx` was not touched.

## What this means for "clean tsc" as a verification step

`npx tsc --noEmit` in this app is only as current as its last dev-server boot. A session that adds a route and verifies with `tsc` alone will see a **false** error on its own new route; a session that removes one will see a **false pass** on a `router.push()` to a route that no longer exists. Neither is a code defect, and `yarn lint` and `expo export` can see neither.

So: **boot the dev server once before trusting `tsc --noEmit`, in any session that has added or removed a file under `app/`.** That is cheap, and it is the only thing that makes the check mean what it appears to mean. Recorded in `progress-tracker.md`'s Known Gaps as well, since it will outlive spec 51.

## Out of scope

- Checking `.expo/types/router.d.ts` into git. It is generated per-checkout and would conflict on every branch that touches `app/`; `.gitignore` is right.
- Adding a `predev`/`pretsc` script to regenerate it. It needs a running dev server, not a compiler pass, so there is no cheap hook — and `yarn start` already does it as a side effect of normal work.

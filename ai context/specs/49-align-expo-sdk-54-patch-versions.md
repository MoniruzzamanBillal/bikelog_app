# 49: Align the Expo SDK 54 packages to their expected patch versions (and remove the duplicate native module)

Status: ✅ Complete — 2026-10-10. Dependency/lockfile change only; `expo-doctor`'s duplicate-module check passes. An actual `eas build` has not been run.

Tooling/dependency change only. No source file changes.

---

## Goal

Make `npx expo-doctor` stop reporting failures, specifically the **duplicate native module**, before a production EAS build.

---

## The error

`npx expo-doctor` → 2 of its checks fail.

### 1. Duplicate native module (the one that matters)

```
Found duplicates for expo-file-system:
  ├─ expo-file-system@19.0.23 (at: node_modules/expo-file-system)
  └─ expo-file-system@19.0.21 (at: node_modules/expo/node_modules/expo-file-system)
```

Expo's own warning: _native builds may only contain one version of any given native module, and having multiple versions … may lead to unexpected build errors._ This is a release-build concern, not a dev-server one — it is the kind of thing that works under `expo start` and surfaces in `eas build`.

Cause: `expo` is on `54.0.32` and pins its own nested `expo-file-system@19.0.21`, while `package.json` asks for `~19.0.23` at the top level. They cannot dedupe against each other. Newer `expo@54.0.x` carries a matching one.

### 2. Patch-level mismatches against SDK 54

```
expo                          expected ~54.0.37   found 54.0.32
expo-constants                expected ~18.0.14   found 18.0.13
expo-file-system              expected ~19.0.24   found 19.0.23
expo-font                     expected ~14.0.12   found 14.0.11
expo-linking                  expected ~8.0.12    found 8.0.11
expo-router                   expected ~6.0.24    found 6.0.22
react-native-gesture-handler  expected ~2.28.0    found 2.30.0
```

Six of the seven are patch bumps inside the same SDK and the same minor. Fixing them also fixes #1, because aligning `expo` is what lets its nested `expo-file-system` collapse onto the top-level one.

## Decision: `react-native-gesture-handler` is left alone

Expo wants `~2.28.0`; `package.json` has `^2.30.0`. That is a **downgrade** of a native module, and the project's `CLAUDE.md` records a deliberate dependence on `react-native-gesture-handler/ReanimatedSwipeable` for every swipe row. `2.30.0` was chosen at some point and nothing in the repo says why, so a downgrade just to silence a minor-version warning is the wrong trade here. EAS compiles whatever version is installed, so the mismatch only matters for Expo Go, which this app does not rely on for the widget/notification features (spec 36 already needs a dev client).

It stays installed as is, and is recorded below as a known, accepted `expo-doctor` warning. If the owner wants it silenced, the supported way is `"expo": { "install": { "exclude": ["react-native-gesture-handler"] } }` in `package.json` — **not done here**, that is a decision to make, not a fix.

---

## Design

Use Expo's own installer, which picks the SDK-matched range and edits `package.json` + `yarn.lock` together, rather than hand-editing versions:

```bash
npx expo install expo@~54.0.37 expo-constants expo-file-system expo-font expo-linking expo-router
```

`expo install` detects `yarn.lock` and uses yarn. Passing the six names explicitly (not `--fix`) keeps `react-native-gesture-handler` out of it.

If yarn leaves the nested `expo/node_modules/expo-file-system` in place after the bump (it should not, since the versions will match), the follow-up is `yarn dedupe`/a lockfile prune — decide on the evidence, do not pre-empt it.

## Out of scope

- `react-native-gesture-handler` (see Decision).
- Anything from `yarn audit`. The app reports ~400 advisories, but the criticals/highs sampled are in the Expo/Metro **build toolchain** (`tar`, `shell-quote`, `minimatch`, `brace-expansion`, `js-yaml`, …), which does not ship in the app binary. Reviewing them properly is a separate task and is not folded in here.
- Any SDK major upgrade.

---

## Implementation

- [x] 1. Record `package.json` and `yarn.lock` state before (`git diff --stat` must be clean for those two files first).
- [x] 2. Run the `expo install` command above.
- [x] 3. Inspect `git diff package.json` — exactly the six packages changed, nothing else. Inspect `yarn.lock` churn; if it touches unrelated top-level packages, stop and reassess.
- [x] 4. `npx expo-doctor` → the duplicate check passes; the remaining failure is only `react-native-gesture-handler`.
- [x] 5. `npx tsc --noEmit` and `yarn lint` clean.
- [x] 6. `npx expo export --platform android` and `--platform web` both succeed (they did before; this proves the bump did not break bundling).
- [x] 7. Re-run the browser smoke pass from the pre-deployment test (all 15 routes, console + API errors) and the spec 48a verification table, since `expo-router` is in the bump set.
- [x] 8. Mark Complete, add a tracker entry.

## What actually happened (deviations from the plan)

1. **`expo install` edited `app.json`.** It appended a bare `"expo-font"` config plugin ("Added config plugin: expo-font"). The spec promised no config change and the app ran fine without it, so it was **reverted** (`git checkout -- app.json`). If a future prebuild wants it, add it deliberately.
2. **The duplicate did not fully clear on the first pass.** Bumping top-level `expo-constants` to 18.0.14 exposed a stale lockfile split: `expo-asset`, `expo-linking` and `expo-notifications` held an older `expo-constants@~18.0.13` entry resolving to 18.0.13. The spec anticipated this ("decide on the evidence"). Fixed with `npx yarn-deduplicate yarn.lock --packages <the expo-* packages>` followed by `yarn install --frozen-lockfile`; that merged the two `expo-constants` lock entries into one. `expo-doctor` then passed the duplicate check.
3. `yarn.lock` churn after the install was confined to the Expo ecosystem plus a few of its build-tool sub-dependencies (`picomatch`, `minimatch`, `brace-expansion`, `balanced-match`). No app runtime package (`react-native`, `axios`, `@tanstack/react-query`, …) moved.
4. The `expo-router@6.0.24` peer warning for `@expo/metro-runtime@^6.1.2` is not a real gap: `6.1.2` is installed (hoisted).

## Result

- `package.json`: exactly `expo ~54.0.37`, `expo-constants ~18.0.14`, `expo-file-system ~19.0.24`, `expo-font ~14.0.12`, `expo-linking ~8.0.12`, `expo-router ~6.0.24`.
- `npx expo-doctor`: duplicate-dependency check ✔. Remaining failure is only `react-native-gesture-handler` (found 2.30.0, expected ~2.28.0) — the accepted deviation above.
- `tsc` and `yarn lint` clean; `expo export` succeeds for **android** (7.03 MB Hermes bundle) and **web** (19 static routes).
- Browser regression on the final web build: all 15 routes load with no console or API errors, plus the per-user-catalog flows and the spec 48a table.

## Risks

- `expo-router` `6.0.22 → 6.0.24` is the one bump that touches runtime behaviour every screen depends on; step 7 exists for it.
- A patch release can still change behaviour. There is no automated test suite here, so step 7 is the whole safety net.

## Not verified (cannot be, here)

- An actual `eas build`. The duplicate-module failure is a native-build concern, and `expo-doctor` clean plus a successful JS export is evidence, not proof. The owner's next EAS build is the real check.

# 48: Per-user catalogs — cache isolation, `requiresOilType`, empty states (app)

Status: ⛔ Not Started — plan only, awaiting implementation.

App half of a three-repo change. Server counterpart: `bikelog_server/context/specs/46-per-user-catalog-ownership.md` (**ships first**). Web counterpart: `bikelog_client-web-/context/specs/30-per-user-catalogs.md`.

**This spec is not a release blocker for the server.** The server's wire-contract change is purely additive — this app sends no owner identifier on any of the eight catalog calls, and `types/catalog.types.ts` is plain TypeScript that ignores extra response fields. The server can ship before, after, or without this spec. What this spec fixes is a **cross-tenant cache leak** that the server change turns from harmless into real.

---

## Goal

The backend is making `MaintenanceType` and `EngineOilType` per-user (server spec 46). Three consequences land on this app:

1. **A real leak.** This app never clears its react-query cache on logout, so user A → logout → user B login **in the same JS context** renders A's catalog to B. Today that is invisible, because the catalog is global and A's rows *are* B's rows. Once catalogs are private it is a genuine cross-tenant disclosure, and B's maintenance-log form will offer A's type ids — which the server will now correctly 404.
2. **The oil-type dropdown breaks for new users.** `MaintenanceLogFormModal.tsx:70` gates it on `selectedMaintType?.name === "Engine Oil"`. That only ever worked because the global catalog was seeded with that row. New users now start with an **empty** catalog (server spec 46 decision 2), so they can never surface the field. Replaced by the server's new `requiresOilType` flag.
3. **New users hit a dead end.** With an empty catalog the maintenance-log type picker has no options, so a new user cannot create a maintenance log at all and nothing explains why.

## Confirmed decisions (with the user, 2026-10-04)

| Question | Decision |
| --- | --- |
| New users' catalogs | **Empty.** No seeding — server spec 42 removed the seed scripts at the user's instruction. |
| The `"Engine Oil"` magic string | Replaced by a `requiresOilType` boolean on the maintenance type, set by its owner. |
| Scope | All three repos, deliberately. |

---

## §A Cache isolation — the substantive change

`QueryClient` is a module-level singleton:

```ts
// app/_layout.tsx:22
const queryClient = new QueryClient();
```

and logout only clears storage and state:

```ts
// context/user.context.tsx:80-89
const logoutFunction = async () => {
  try {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
    setUser(null);
    setToken(null);
  } catch (error) { … }
};
```

There is no `queryClient.clear()` or `removeQueries()` anywhere in this repo. With react-query's defaults (`staleTime: 0`, `gcTime: 5 min`, and no override anywhere in the repo) the cached rows render immediately on mount and *then* refetch — so the previous user's catalog is visibly on screen for the stale-while-revalidate window, not just held in memory.

`UserProvider` is nested **inside** `QueryClientProvider` (`_layout.tsx:61-64`), so a hook would work there — but `utils/axiosInstance.ts`'s interceptor runs at module scope and cannot use hooks. So make the singleton importable.

**Changes:**

1. **New `utils/queryClient.ts`** — `export const queryClient = new QueryClient();`
2. **`app/_layout.tsx:22`** — delete the local construction, import the singleton, keep `<QueryClientProvider client={queryClient}>` unchanged.
3. **`context/user.context.tsx`, `logoutFunction` (L80-89)** — add `queryClient.clear()` alongside the two `AsyncStorage.removeItem` calls.
4. **`context/user.context.tsx`, `handleSetToken` (L70-77)** — also `clear()` when a non-null token is set. **Clearing on login is the stronger invariant**: logout can be skipped (app force-killed, token expiry, a crash), login cannot.
5. **`utils/axiosInstance.ts`, the 401 branch (L56-67)** — add `queryClient.clear()`. That path currently removes the storage keys and `router.replace("/auth")` but leaves the whole cache populated, and also never calls `setUser(null)` — a second route to the same leak.

Affects every query key, not just the catalogs (`["bikes"]`, `["maintenanceLogs", …]` and the rest are leaking the same way); the catalogs are simply where it becomes a correctness bug rather than a cosmetic one.

## §B `requiresOilType`

**`types/catalog.types.ts`** — add `requiresOilType: boolean` to `TMaintenanceType`.

**`components/main/MaintenanceLog/MaintenanceLogFormModal.tsx:70`** — replace the name match:

```ts
// before
const isEngineOil = selectedMaintType?.name === "Engine Oil";
// after
const isEngineOil = !!selectedMaintType?.requiresOilType;
```

The variable could be renamed `requiresOilType` for clarity; keep the rename contained to this file if so. The dropdown it gates (`:204-215`) is otherwise unchanged.

**`components/main/SettingsCatalog/SettingsCatalog.tsx`** — add the toggle to the maintenance-type **add** form (`:401-438`) and **inline edit** block (`:462-502`), wired into the existing local state (`:121-137`) and sent in the `POST` (`:146`) and `PATCH` (`:208`) bodies.

**Reuse `components/main/shared/SwitchField.tsx`** — already exported from `components/main/shared/index.ts` and already used by `FuelLogFormModal`. No new primitive. Label it something like "Needs an engine oil type" with a one-line hint; the engine-oil panel needs no equivalent (the flag lives only on maintenance types).

## §C Empty states (forced by the empty-catalog decision)

**`MaintenanceLogFormModal.tsx`** — when `mtOptions.length === 0` (built at `:78-88`), show an empty state instead of an empty `SelectPickerField`, pointing at Settings → the maintenance-type panel. This is the first wall a brand-new user hits: without it the form looks broken.

The Settings panels themselves already render an empty table body, but check the copy reads sensibly for a genuinely new user rather than implying something failed to load.

## §D Copy

- **`SettingsCatalog.tsx:388`** — `"Shared catalog · used by maintenance logs and reminders"` is now wrong. → `"Your catalog · used by your maintenance logs and reminders"`.
- **`SettingsCatalog.tsx:546`** — `"Suggested interval pre-fills the Engine Oil service form"` still names the magic string. → `"Suggested interval pre-fills the oil-change service form"`.
- Check the delete-confirm copy (`:227-253`, `:255-278`) — "will be removed from the catalog. Maintenance logs that already used it keep their history." still reads correctly and needs no change.

---

## Implementation checklist

- [ ] 1. `utils/queryClient.ts` — extract the singleton
- [ ] 2. `app/_layout.tsx` — import it instead of constructing
- [ ] 3. `context/user.context.tsx` — `clear()` in `logoutFunction` **and** `handleSetToken`
- [ ] 4. `utils/axiosInstance.ts` — `clear()` in the 401 branch
- [ ] 5. `types/catalog.types.ts` — `requiresOilType: boolean`
- [ ] 6. `SettingsCatalog.tsx` — `SwitchField` in the add form and the edit block; include in both payloads
- [ ] 7. `MaintenanceLogFormModal.tsx` — gate on the flag; empty state for a zero-option picker
- [ ] 8. Copy fixes (§D)
- [ ] 9. `expo lint` clean; `tsc` / typed-route check clean
- [ ] 10. Device or Expo-web verification (§Test plan)
- [ ] 11. Mark **Complete** in `progress-tracker.md`

---

## Test plan

Requires the server's spec 46 deployed (or a local server on a Neon branch with it applied), and **two** registered users.

**The leak test — the headline, and it cannot be automated here.** Exact click path:

1. Log in as user A. Open Settings. Confirm A's maintenance types and engine oil types.
2. Open a bike → Maintenance Logs → the create form. Note the type options.
3. Log out via the account panel (`SettingsCatalog.tsx:675-692`).
4. Log in as user B **without restarting the app** — same JS context, no Metro reload.
5. Open Settings. **Expect B's catalog only**, with none of A's rows, not even momentarily.
6. Open B's maintenance-log form. Expect B's options only.

Then the two weaker paths: (a) A logged in → force-kill → reopen → log in as B; (b) A logged in → let the token expire or force a 401 → confirm the redirect to `/auth` and that logging in as B shows no A data.

**`requiresOilType`:**

- As a new user C: catalog is empty with sensible copy; the maintenance-log form shows the §C empty state, not a blank picker.
- C creates a type with the toggle **on** → selecting it in the log form reveals the oil-type dropdown.
- C creates a type with the toggle **off** → no oil dropdown.
- Existing user A: a pre-existing type whose name was the seeded oil row comes back with `requiresOilType: true` from the server's backfill, so A's behaviour is unchanged. **If it does not** — see server spec 46 H7; production may hold `"Engine Oil Change"`, in which case A's dropdown was already dead before this change. Record what is actually observed.
- Inline-edit an existing type to flip the toggle both ways; confirm the `PATCH` round-trips and the log form follows.

**Regression, existing user A:** catalog list renders; inline rename round-trips; delete a type a live log uses → the **amber 409 warning toast** with the server's sentence verbatim (`utils/axiosInstance.ts:83-87` + `components/main/shared/toastConfig.tsx`); delete an unused type → succeeds; re-add a just-deleted name → revives with the same `_id` and the history stays labelled. A cross-user id now returns 404, which the global interceptor already renders as a normal error toast — no new handling needed.

Maintenance-log cards (`MaintenanceLogCard.tsx:37`) and `RemindersBanner.tsx:74` must show real type names, never the `"Maintenance"` fallback.

**Static:** `expo lint` clean. `grep -rn '=== "Engine Oil"'` and `grep -rn "Shared catalog"` → no hits.

---

## Explicitly NOT changing

- **All eight endpoint URLs** — the server keeps `/maintenance-types` and `/engine-oil-types` top-level (server spec 46 §F).
- **Query keys** `["maintenance-types"]` / `["engine-oil-types"]` — clearing on logout and login is the isolation mechanism; keying by user id would be a larger change for the same guarantee.
- **`hooks/useApi.ts`** and the react-query defaults (no `staleTime`/`gcTime` override is introduced).
- **The global 409 → amber `warning` toast branch** (`axiosInstance.ts:83-87`) — the 409 messages are byte-identical after the server change, and a cross-user id is a 404 which already renders correctly.
- **The `?? "Maintenance"` display fallbacks** — unreachable for one's own data, since the server's `catalogInclude` always populates the name.
- **`OdometerPanel.tsx`** — touches no catalog.
- **The known double-toast bug** on the create/update catch blocks (`SettingsCatalog.tsx:246-249` documents it) — pre-existing, out of scope.
- **`errorObj.statusCode` always being 500** — this app correctly reads `error.response.status` instead; it is the *web* client that needs that fix (web spec 30).

## Open items

- Keying query caches by user id would make the isolation structural rather than dependent on remembering to `clear()`. Deliberately not done here — `clear()` on both logout and login covers the realistic paths, and a key change touches every domain hook. Worth revisiting if a third auth path appears.
- The double-toast bug and the `warning`-toast-type gap are both recorded in this repo's Known Gaps already; neither is widened by this spec.

# 74: Bike stat strip — one aggregated call instead of four

Status: 📝 **Planned (app code not written).** Spec written 2026-11-19 from the developer's request: *"currently it is showing all the data which i wanted .. but one i notice is, for showing the data you are calling separate api and then show them .. as it is single component, so you should call a single api and it should contain all the necessary data."* Backend half is `bikelog_server` spec **68** (new `GET /bikes/:bikeId/stat-strip`). Web twin is `bikelog_client-web-` spec **45**.

**App half of the stat-strip consolidation.** `components/main/Bike/BikeStatStrip.tsx` is one component that currently makes **four** HTTP requests to render one row of stats. This spec swaps those four for a **single** call to the new aggregated endpoint, and deletes the client-side math (`getAvgMileage`, `costPerKm`) that the server now does.

**What this adds, in one line:** one component → one API call, same pixels.

**Scope:** `BikeStatStrip.tsx` (rewrite), `BikeDetailPage.tsx` (drop two now-unused props), `types/bike.types.ts` (new type), and a one-line invalidation add in each mutation that changes a strip input. No visual change.

---

## §0 Hazards — read before writing code

**H-A — the new query key is invalidated by nothing, so the strip will go stale in place.** Today the four keys (`["mileage","history",bikeId]`, the two `["spending",bikeId,…]`, `["engineOilStatus",bikeId]`) are kept fresh mostly by React Query's default `staleTime: 0` refetch-on-mount, plus loose prefix invalidations fired by the log form modals. The replacement key `["bike-stats", bikeId]` matches **none** of the existing `invalidateQueries` prefixes. If you only swap the fetch and stop there, adding a fuel/oil/service log (which happens in a modal on the same screen, no unmount) won't refresh the strip until you navigate away and back. **Fix is §E:** add `["bike-stats"]` to the invalidation arrays of every mutation that moves a strip input.

**H-B — don't lose the "0 is a real value" distinction on the oil stats.** The strip hides the two oil stats only when there is *no oil change on record*. Server spec 68 encodes that as `oil.kmSinceChange === null` / `oil.percentUsed === null` (a bike *with* a fresh change at the current odometer legitimately returns `0`, which must still show). So gate the oil stats on `!= null`, **not** on truthiness — `0 km` and `0% used` must render.

**H-C — keep passing `targetMonth`.** The month label is `${format(now, "MMM")} spend`, computed client-side from `now`. Pass `targetMonth = format(now, "yyyy-MM")` to the endpoint so the returned `monthSpending` is for the same month the label names (server spec 68 Decision 4). Dropping it lets the server pick its own month and risks a one-day label/value mismatch at a month boundary.

**H-D — the skeleton count.** `BikeStatStripSkeleton`/`MiniStatsSkeleton` is called with `count={4}` today. Spec 69 built that skeleton; keep the same count (the rendered strip still shows 4–6 tiles depending on oil history). Don't regress the loading state.

---

## §A Decisions

- **D1 — Lean scalars from the server; the component becomes pure display.** The endpoint returns `avgMileageKmPerLiter`, `monthSpending`, `lifetimeSpending`, `costPerKm`, and `oil.{kmSinceChange,percentUsed}` already computed. Delete `getAvgMileage` (lines 12–30) and the `lifetimeDistanceKm`/`costPerKm` block (lines 86–93) — all server-side now. (Developer chose lean scalars over a composite payload.)
- **D2 — New query key `["bike-stats", bikeId]`.** Distinct namespace, not sharing a prefix with `["spending"]`/`["mileage"]`/`["engineOilStatus"]` (those still belong to the drill-down screens, which are untouched and keep their own caches). Freshness is handled explicitly in §E, not by prefix coincidence.
- **D3 — `currentOdometer`/`initialOdometer` props are removed.** They existed only to compute `costPerKm`, which is now a server scalar. Drop them from `TBikeStatStripProps` and from the `<BikeStatStrip … />` call site. (The odometer value the panel *displays* comes from the parent's own `bike` object, not from these props — see §E.)
- **D4 — The four drill-down screens are not touched.** Mileage, Spending, Engine-oil screens keep their own `useFetchData` calls and keys. This spec only changes the summary strip's data source.

---

## §B The screen

No visual change. Same `miniStats` grid, same six possible tiles in the same order:

```
Avg mileage     Nov spend       Cost / km
On this Engine   Engine oil      Total spent
oil (if any)    life (if any)
```

Tiles unchanged; only where their values come from changes.

## §C Data layer

**New type** — `types/bike.types.ts` (mirrors server spec 68 `TBikeStatStrip`):

```ts
export type TBikeStatStrip = {
  avgMileageKmPerLiter: number | null;
  monthSpending: number;
  lifetimeSpending: number;
  costPerKm: number | null;
  oil: {
    kmSinceChange: number | null; // null ⇔ no oil change on record
    percentUsed: number | null;
  };
};
```

**The one call** (replaces all four):

| Query | Key | URL |
| --- | --- | --- |
| Stat strip | `["bike-stats", bikeId]` | `/bikes/${bikeId}/stat-strip?targetMonth=${targetMonth}` |

```ts
const now = new Date();
const targetMonth = format(now, "yyyy-MM");

const { data, isLoading } = useFetchData<TBikeStatStrip>(
  ["bike-stats", bikeId],
  `/bikes/${bikeId}/stat-strip?targetMonth=${targetMonth}`,
  { enabled: !!bikeId },
);

const s = data?.data;
```

**Render mapping** (all reads off `s`, no computation):

```ts
// avg mileage
s?.avgMileageKmPerLiter == null ? "—" : `${s.avgMileageKmPerLiter.toFixed(1)} km/l`
// `${format(now, "MMM")} spend`
s?.monthSpending == null ? "—" : formatTaka(s.monthSpending)
// cost / km
s?.costPerKm == null ? "—" : `${formatTaka(s.costPerKm)}/km`
// "On this Engine oil"  — render only when s?.oil.kmSinceChange != null
`${s.oil.kmSinceChange.toLocaleString()} km`
// "Engine oil life"     — render only when s?.oil.percentUsed != null
`${Math.round(s.oil.percentUsed)}% used`
// total spent
s?.lifetimeSpending == null ? "—" : formatTaka(s.lifetimeSpending)
```

Loading: `if (isLoading) return <MiniStatsSkeleton count={4} />;` (single flag now; §0 H-D).

## §D No form modal

This spec adds no form. (Section kept for template parity.)

## §E The small edits elsewhere

1. **`BikeStatStrip.tsx`** — full rewrite per §C: one `useFetchData`, delete `getAvgMileage`, delete the `lifetimeDistanceKm`/`costPerKm` math, remove `currentOdometer`/`initialOdometer` from `TBikeStatStripProps`. Remove now-unused imports (`TMileageHistoryResponse`, `TSpendingSummary`, `TEngineOilStatus`); add `TBikeStatStrip`.
2. **`BikeDetailPage.tsx`** (~lines 180–184) — change the call site to `<BikeStatStrip bikeId={bikeId} />` (drop the two odometer props). The odometer *panel* above it (`bike?.currentOdometer`) is unaffected — it reads the parent's `bike`, not the strip.
3. **Invalidation (H-A)** — add `["bike-stats"]` to the `invalidateQueriesKeys` array of each mutation that changes a strip input:
   - `components/main/FuelLog/FuelLogFormModal.tsx` — both `usePost` and `usePatch` arrays (affects avg mileage + month/lifetime spend).
   - `components/main/EngineOilLog/EngineOilLogFormModal.tsx` and `EngineOilLogCard.tsx` (delete) — oil scalars + spend.
   - `components/main/ServiceLog/ServiceLogFormModal.tsx` and `ServiceLogCard.tsx` (delete) — spend.
   - `components/main/MaintenanceLog/*FormModal.tsx` — maintenance create/delete (spend).
   - `components/main/BikeAccessory/*` — the `pending → purchased` mutation (spend).
   - `components/main/SettingsCatalog/OdometerPanel.tsx` — odometer update moves `kmSinceChange`/`percentUsed`.
   Use the bare `["bike-stats"]` prefix (matching the house's loose invalidation style) so it catches the key regardless of `bikeId`.

## §Web client — changes too (cascade step 3 triggered)

Unlike most app features, the web client **does** render this strip and from the same four endpoints, so it gets a twin change — `bikelog_client-web-` spec **45**. Handled in that repo; nothing to do here beyond noting the server endpoint (spec 68) is shared.

## §J Shipping this to the phone

1. Server spec 68 deployed (or reachable on the Neon branch you point `utils/envConfig.ts` at for local testing). The old four endpoints stay live, so there's no hard ordering — but the strip shows `—`/empty until the endpoint exists.
2. `yarn lint` + typecheck (expo-router typed routes) clean.
3. Exercise on a device/simulator (see Test plan).
4. No EAS build is cut as part of this spec; the developer cuts one with the rest of the pending stack.

## Test plan

No test suite exists. Static floor: `tsc`/expo typecheck clean, `expo lint` clean, bundle still builds.

| # | Check | Expect |
| --- | --- | --- |
| V1 | Open a bike detail screen; watch the network | **One** request `/bikes/:id/stat-strip?...`, not four |
| V2 | Compare every tile to the pre-change build for the same bike | Identical values (avg mileage, month spend, cost/km, oil km, oil life, total spent) |
| V3 | Bike with **no** oil change on record | The two oil tiles are hidden; the other four show |
| V4 | Bike with a fresh oil change at the current odometer | Oil tiles show `0 km` / `0% used` (not hidden — H-B) |
| V5 | Add a fuel log via the modal, stay on the screen | Avg mileage + month/total spend update in place (no navigate-away) — H-A |
| V6 | Add/delete an engine-oil log | Oil tiles update in place |
| V7 | Update odometer in Settings | Oil `km since change` tile updates |
| V8 | Bike with `currentOdometer == initialOdometer` | Cost/km shows `—` |

## Open questions — none

Resolved at spec time: response shape is lean scalars (developer chose); `targetMonth` passed from client; oil-null gate preserved.

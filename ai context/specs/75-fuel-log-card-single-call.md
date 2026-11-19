# 75: Fuel-log card — all card data from the fuel-logs call (drop the mileage merge)

Status: 📝 **Planned (app code not written).** Spec written 2026-11-19 from the developer's request: *"the mileage showing in the fuel log card is not coming from another api … the first api shows the fuel log data, the second fetches mileage history then maps it to the fuel log … now I want all the data I show in the fuel log card to come from the single api `/bikes/:id/fuel-logs?...`."* Backend half = `bikelog_server` spec **69** (adds `mileageKmPerLiter` + `lockedPeriod` to each fuel-log row). Web twin = `bikelog_client-web-` spec **46**.

**App half of the fuel-log-card consolidation.** `components/main/FuelLog/FuelLog.tsx` fetches fuel-log rows *and* `/bikes/:id/mileage`, then merges two card facts onto each row client-side. This spec reads both facts off the row instead and removes the merge — **same card, same values, no visual change.**

**One line:** card km/l + locked note stop being a client-side join; the row carries them.

**Hard constraint (developer): must not break current behavior.** Same km/l on the same rows, same lock-note wording, same pager, forecast unaffected.

---

## §0 Hazards — read before writing code

**H-A — do not change the km/l value or which rows show it.** Today `findMileageForLog` (lines 33-40) shows km/l only for a full-tank log that closed a period, matched by `record.endOdometer === log.odometerReading`. Server spec 69 uses that **same** key and the **same** stored value, exposing it as `row.mileageKmPerLiter` (null for partial/non-closing/open rows). So the tag appears on exactly the same rows with the same number. Don't re-derive it client-side; don't widen it to partial rows.

**H-B — keep the lock-note wording byte-identical.** `buildLockMap` (lines 42-54) renders `` `Locked — part of a closed mileage period (${d MMM} → ${d MMM})` `` from the record's `periodStartDate`/`periodEndDate`. Server spec 69 returns those two dates as `row.lockedPeriod = { startDate, endDate } | null` — **not** a baked string. Compose the note client-side with the **same** `formatApiDate(…, "d MMM")` and the **same** text. A non-null `lockedPeriod` ⇔ locked.

**H-C — do not rip `/mileage` off the screen blindly.** `mileageRecords` in `FuelLog.tsx` feeds only `findMileageForLog` + `buildLockMap` — both removed here. But the **same** query key `["mileage","history",bikeId]` is *also* fetched by `useTankForecast` (hooks/useTankForecast.ts:146-150), which `TankForecastCard` drives on this same screen (`FuelLog.tsx:123`), React-Query-deduped. So: delete `FuelLog.tsx`'s own `/mileage` `useFetchData` and the two merge helpers; **leave `TankForecastCard` alone** — it fetches its own copy. The forecast is unchanged; `/mileage` still loads once for it, but nothing about the *card* depends on it anymore. (Verify no other code in `FuelLog.tsx` reads `mileageRecords`.)

**H-D — the list must refetch after a fuel log add / edit / delete** so the new row-level mileage/lock are correct. `FuelLogFormModal` already invalidates `["fuelLogs"]`; confirm `FuelLogCard`'s delete does too (it currently invalidates `["mileage","history",bikeId]` — **keep** that, the forecast + Mileage screens still read it, **and add/confirm `["fuelLogs"]`**). Deleting a mid-period log changes other rows' lock/mileage, so the whole page must refetch, not just drop one row.

**H-E — pager correctness improves, don't regress it.** km/l is now a per-row field, no longer dependent on having the full mileage history in memory, so page boundaries can't drop a tag. Keep the existing `page`/`LIMIT`/`meta` pager exactly as is.

---

## §A Decisions

- **D1 — Card data comes off the row.** `TFuelLog` gains `mileageKmPerLiter?: number | null` and `lockedPeriod?: { startDate: string; endDate: string } | null` (alongside the existing `kmOnThisFill`/`costPerKm`). Fed by `bikelog_server` spec 69 (additive).
- **D2 — `FuelLogCard.tsx` is unchanged.** It keeps its `mileageKmPerLiter?: number` and `lockedNote?: string` props. Only the parent changes what it passes.
- **D3 — `/mileage` stays on the screen, but only for the forecast.** `FuelLog.tsx` drops its direct call; `TankForecastCard`/`useTankForecast` keep theirs (H-C).
- **D4 — Same matching + wording as today.** No new math, no new copy — the server mirrors the client's existing rule, so values are identical by construction.

## §B The screen

No visual change. Same `FuelLogCard` list, same km/l tag, same locked-note line, same pager, same `TankForecastCard` on top.

## §C Data layer

**Type additions** — `types/fuel-log.types.ts`, on `TFuelLog`:

```ts
mileageKmPerLiter?: number | null; // closing full-tank row only; else null
lockedPeriod?: { startDate: string; endDate: string } | null; // null ⇔ not locked
```

**The removed call & helpers** (`FuelLog.tsx`): the `["mileage","history",bikeId]` `useFetchData` (74-78), `findMileageForLog` (33-40), `buildLockMap` (42-54), `mileageRecords`/`lockMap` (79-80), and the now-unused `TMileageHistoryResponse`/`TMileageRecord` imports (11).

**The note helper** (local to `FuelLog.tsx`, same wording as the old `buildLockMap`):

```ts
const lockedNote = (lp?: TFuelLog["lockedPeriod"]) =>
  lp
    ? `Locked — part of a closed mileage period (${formatApiDate(lp.startDate, "d MMM")} → ${formatApiDate(lp.endDate, "d MMM")})`
    : undefined;
```

## §D No form modal

No form change. (Section kept for parity.)

## §E The small edits elsewhere

1. **`components/main/FuelLog/FuelLog.tsx`** — remove the `/mileage` call + both helpers (§C); change the card call site (154-162) to:
   ```tsx
   <FuelLogCard
     key={log._id}
     fuelLog={log}
     bikeId={bikeId}
     mileageKmPerLiter={log.mileageKmPerLiter ?? undefined}
     lockedNote={lockedNote(log.lockedPeriod)}
   />
   ```
2. **`types/fuel-log.types.ts`** — add the two fields (§C).
3. **`components/main/FuelLog/FuelLogCard.tsx`** — **no change** (D2).
4. **Invalidation (H-D)** — confirm `FuelLogCard.tsx` delete and `FuelLogFormModal.tsx` create/edit both invalidate `["fuelLogs"]`; keep their `["mileage"]` invalidation.

## §Web client — twin change (spec 46)

The web fuel-log list may do the same merge; handled in `bikelog_client-web-` spec 46 (its own repo). Additive server field — not forced, done for parity if the merge is present.

## §J Shipping this to the phone

1. Server spec 69 deployed (or on the Neon branch `utils/envConfig.ts` points at). Old `/mileage` stays live, so no hard ordering — but until 69 ships, `row.mileageKmPerLiter`/`lockedPeriod` are absent and the card would show no km/l tag or lock note (regression), so **deploy 69 before cutting the app build** that drops the merge.
2. `expo lint` + typecheck clean.
3. Device/sim pass (Test plan).
4. No EAS build cut as part of this spec.

## Test plan

No test suite. Static floor: typecheck + `expo lint` clean, bundle builds.

| # | Check | Expect |
| --- | --- | --- |
| V1 | Open Fuel logs; compare every card to the pre-change build for the same bike | Identical km/l tags on identical rows; identical locked notes (same dates, same wording) |
| V2 | Network tab | The card no longer needs `/mileage`; `/mileage` still fires **once** (for `TankForecastCard`), `/fuel-logs` once per page |
| V3 | A partial fill-up, and the newest (open) full-tank fill | No km/l tag |
| V4 | A fill-up inside a closed period | Locked note shows the right `d MMM → d MMM` |
| V5 | Delete a mid-period fuel log | List refetches; affected rows' km/l + lock update (H-D) |
| V6 | Page forward/back | km/l tags stay correct at page boundaries (H-E); pager range unchanged |
| V7 | Tank forecast card | Unchanged — still renders from its own `/mileage` |

## Open questions — none

Resolved at spec time: server mirrors the client's existing match + wording (parity guaranteed); `/mileage` stays for the forecast; lock returned as dates, formatted client-side.

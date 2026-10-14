# 54a: Clear a stale seed when the suggestion disappears

Status: ✅ **Complete** (2026-10-14). Written during spec 54's implementation, before writing its code.
Scope: the two seeding effects spec 54 §B specifies, in `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx`. No new file, no type change, no server change.
Supersedes spec 54 §B's two code blocks on one point only; every hazard, decision and checklist item in spec 54 stands unchanged.

---

## The defect

Spec 54 §B's two effects both open with an early return when the selected catalog row carries no default:

```ts
const suggested =
  selectedOilType?.suggestedIntervalKm ?? selectedMaintType?.defaultIntervalKm;

if (suggested == null) return; // H-E: leave the field alone
```

That guard is correct for the case H-E describes — a field the rider typed into, or an empty one — and wrong for the third case, which §B does not distinguish: **a field currently holding a value this feature itself seeded.** Returning early there leaves a number on screen that belongs to a catalog row the rider is no longer selecting.

Reproduction, exactly spec 54's own **V12**:

1. New log. Pick `Engine Oil` (`requiresOilType: true`, no `defaultIntervalKm`).
2. Pick oil type `10W40 (3000 km)` → interval seeds to `3000`, `seededInterval.current = "3000"`, hint shown.
3. Switch the maintenance type to `Chain lube`, which carries **no** `defaultIntervalKm`.
   - The `isEngineOil` effect (`:75-79`) nulls `oilType`, so `selectedOilType` is `undefined` (H-D).
   - `selectedMaintType?.defaultIntervalKm` is `undefined`.
   - `suggested == null` → **early return.**

**Result:** the form submits `intervalKmUsed: 3000` for a chain lube, taken from an engine-oil grade the rider deselected — and the server writes `nextDueOdometer` from it (`maintenanceLog.service.ts:108-111`), so the wrong number becomes the basis of a real reminder. The `From your catalog default` hint (§C) is still rendered, and it is now a false statement: no catalog default on the selected type says `3000`.

V12 asserts the opposite outcome in so many words — _"the interval does not end up stuck on the oil suggestion (H-D)"_ — so §B's code contradicts spec 54's own test plan. The same defect exists in the `nextDueDate` effect via `if (days == null || !serviceDate) return;`: a 180-day seed survives a switch to a type with no `defaultIntervalDays`.

**Why it slipped past review:** H-E is phrased as _"must leave the field exactly as it was (**empty, or typed**)"_, which enumerates two of the three states the field can be in. A seeded value is the third, and `return` is the right answer for the first two only. This is a gap in §B's code, not in its hazards — H-A, H-E and D1 together already imply the correct behaviour.

## The fix

Fold "no suggestion" into the normal seed path as the empty string rather than short-circuiting before the `isSeed` check. The seed is then free to write `""` the same way it writes `"3000"`, and the H-A guard that protects typed input is the one and only gate.

Ordering matters: **the `isSeed` check must come before the clear**, or a cleared field would wipe a hand-typed number.

```ts
const isSeed =
  intervalKmUsed === "" || intervalKmUsed === seededInterval.current;
if (!isSeed) return; // H-A — unchanged, and still the only protection typed input needs

// ! 54a: "" is a legitimate seed value. Returning early on a missing suggestion (as §B
// ! did) leaves the PREVIOUS selection's seed on screen — V12's stuck oil suggestion.
const next = suggested == null ? "" : String(Math.round(suggested)); // H-G
if (next === intervalKmUsed) return; // also what stops the effect looping on its own write

seededInterval.current = next === "" ? null : next;
setIntervalKmUsed(next);
```

Two deliberate details:

- **`seededInterval.current` goes back to `null`, not `""`, when clearing.** Either works for the `isSeed` test (`""` matches the first clause), but `null` is the value both reset branches use, so there is one representation of "nothing seeded" rather than two.
- **The `next === intervalKmUsed` guard is what prevents an infinite effect loop**, and it keeps working for the clearing path: on a freshly reset create form the computed `next` is `""`, which already equals the field, so the effect no-ops instead of re-rendering.

The date effect takes the same shape, with one asymmetry: it clears **only** when `defaultIntervalDays` is absent, never when `serviceDate` is unparseable. A transient bad `serviceDate` is a reason to leave the date alone, not to discard a seed that was correct a moment ago.

```ts
const days = selectedMaintType?.defaultIntervalDays;

const isSeed =
  nextDueDate === "" || nextDueDate === seededNextDueDate.current;
if (!isSeed) return;

let next = "";
if (days != null) {
  if (!serviceDate) return; // can't recompute — H-F says re-seed, not guess
  const base = new Date(`${serviceDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return;
  next = format(addDays(base, days), "yyyy-MM-dd");
}
if (next === nextDueDate) return;

seededNextDueDate.current = next === "" ? null : next;
setNextDueDate(next);
```

- [x] Interval effect: `isSeed` before the clear, `""` as a seed value, ref back to `null`
- [x] Date effect: same shape, clearing on a missing `defaultIntervalDays` only
- [x] Both `next === <current>` guards kept — they are the loop breakers, not an optimisation
- [x] No change to H-A's protection of typed input, to H-B's create-only gate, or to §C's hint

## Test plan

Spec 54's V1–V12 all still apply unchanged; V12 now passes rather than failing. Three cases are added, and V12 is split so the distinction this sub-spec turns on is explicit.

| #    | Scenario                                                                                                      | Expected                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| V12a | Pick an oil-requiring type, pick oil `10W40 (3000 km)`, then switch to a type **with** `defaultIntervalKm: 5000` | Interval re-seeds to `5000`, hint still shown (this already worked under §B)                 |
| V12b | Same, but switch to a type with **no** `defaultIntervalKm`                                                    | Interval returns to **empty**, hint gone. §B left `3000` — this is the sub-spec's assertion   |
| V13  | **Type** `2500`, then switch to a type with no default                                                        | Stays `2500`, no hint. H-A still wins over the clear — the regression this fix must not cause |
| V14  | Pick a type with `defaultIntervalDays: 180`, then switch to one with no days default                          | `nextDueDate` returns to empty; a hand-edited date in its place survives (H-A)                |

V12a–V14 need a device or `expo start --web`, and a catalog holding one type with a km default, one without, and one with a days default — the same §D step 1 catalog spec 54 already requires.

## Implementation note

Written and applied in the same pass as spec 54 itself, so no build ever carried §B's literal code. The fix is four lines moved and one ternary in each effect; it adds no state, no dependency and no render path.

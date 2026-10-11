# 54: Seed the service interval from the catalog

Status: ⛔ **Not Started.** Written 2026-10-11 while planning spec 53, which it unblocks. **Revised the same day: all three open questions are settled (see Settled questions at the end), and §D adds the one-time catch-up that has to happen alongside the code.**
Scope: `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx`. One file. No type change, no server change, no new dependency.
Independently shippable and independently useful — it is specced separately so it can land first, on its own, without waiting for `bikelog_server` spec 52.

**The finding:** `MaintenanceType.defaultIntervalKm` and `defaultIntervalDays` are **write-only fields today.** Settings lets you enter them (`SettingsCatalog.tsx:154-157` on create, `:207-210` on edit) and displays them back in the catalog table (`:533-536`). Nothing in the app ever _reads_ them to do anything. `EngineOilType.suggestedIntervalKm` is barely better off: it appears in the oil dropdown's label (`MaintenanceLogFormModal.tsx:87`, `"10W40 (3000 km)"`) as text for the rider to read and retype by hand.

Meanwhile `intervalKmUsed` starts empty on every new log (`:55`, re-cleared at `:119`) and is optional on submit (`:155`). And `nextDueOdometer` — the thing every distance-based reminder in the app is built on — exists **only** when `intervalKmUsed` was supplied (`bikelog_server/src/app/modules/maintenanceLog/maintenanceLog.service.ts:108-111`).

So: a rider who doesn't retype the interval they already stored in Settings gets **no distance reminder for that service, ever.** This is the prerequisite for spec 53 and for `bikelog_server` spec 52 — both are invisible on a log with no interval.

---

## §0 Hazards

**H-A — Never clobber a typed value.** The rider may pick a maintenance type _after_ typing an interval, or change their mind about the type. A seed that overwrites a hand-entered number is worse than no seed: it silently changes the next-due odometer of the log being written. The seed may only replace a value the seed itself put there.

**H-B — Never seed in edit mode.** The create branch is `:116-125`, the edit branch `:95-114`. Editing a log must keep showing what was recorded, even if the catalog's default has changed since. Same rule as spec 52 H-E.

**H-C — Oil type is more specific than maintenance type, and arrives second.** Selecting "Engine Oil" seeds from `defaultIntervalKm`; then selecting "10W40 (3000 km)" should move the field to 3000. But if the rider typed 2500 in between, 2500 wins (H-A). Precedence is _specificity_, not recency — and it never beats a typed value.

**H-D — `isEngineOil` already clears `oilType` on type change** (`:75-79`). Any seeding effect must compose with that effect, not race it. Seeding `intervalKmUsed` from the oil type must tolerate `oilType` being nulled out on the same render.

**H-E — The catalog defaults are optional and almost certainly unset on existing rows.** `defaultIntervalKm?: number` — nothing ever required it, and the Settings inputs are optional. A type with no default seeds nothing and must leave the field exactly as it was (empty, or typed). No `undefined`, no `"NaN"`, no `"0"`.

**H-F — `defaultIntervalDays` seeds a _date_, which has a moving base.** `nextDueDate` = `serviceDate` + days, and `serviceDate` defaults to today (`:122`) but is editable (`:270`-ish). If the rider backdates the service after the date was seeded, a stale `nextDueDate` is wrong by exactly the amount they backdated. Either re-seed while `nextDueDate` is still a seed, or don't seed it at all — see D3.

**H-G — `DECIMAL_REGEX` validates this field** (`:138`). A seeded value must be a string that passes it, so write integers (`"3000"`), never `"3000.000"` or a localised `"3,000"`.

---

## §A Decisions

- **D0 — The oil type's suggestion outranks the maintenance type's default, and in practice they will rarely both be set.** Settled 2026-10-11. The oil is what physically determines the interval — semi-synthetic really does want 3,000 km where fully synthetic wants 5,000 — so it is the more specific answer and it wins. Neither ever beats a typed value (H-A), which is what keeps the choice low-stakes. The conflict also only exists when a type that **requires** an oil type *also* carries a `defaultIntervalKm`; §D step 1 is where that is checked, and if it never happens on the rider's own catalog the precedence rule can never fire.
- **D1 — A ref tracks what the seed wrote.** `seededInterval.current` holds the last value this feature put in the field. The field is safe to re-seed only while `intervalKmUsed === seededInterval.current`. Cleared to `null` on open/close and in edit mode. This is the same "seeded vs typed" distinction spec 52 §G introduced for the fuel form, reused rather than reinvented.
- **D2 — Seed on type change and on oil-type change, in one effect.** Both inputs feed the same field; two effects would fight over it.
- **D3 — `defaultIntervalDays` → `nextDueDate` is IN scope, with the same ref discipline.** Confirmed 2026-10-11 rather than deferred: time-based services — annual service, coolant, brake fluid — carry **no** odometer interval, so `nextDueOdometer` can never exist for them and neither spec 53 nor `bikelog_server` spec 52 will ever show them anything. This is the only mechanism that gives them a reminder at all. It stays the first thing to drop if V8–V10 read as the app editing a field behind the rider's back, and dropping it touches nothing else. It is also the other half of the same write-only pair this spec exists to close, and the reminder code already treats `nextDueDate` independently of the odometer. H-F is handled by re-seeding whenever `serviceDate` changes _while the date is still a seed_.
- **D4 — Visual marker: the field's helper text, not a colour.** The interval input gets a one-line hint — `From your catalog default` — shown only while the value is a seed. Spec 52 §G established that a prefilled value the rider didn't notice is its own hazard; here the hint is the cheapest honest answer and it disappears the moment they type.
- **D5 — Odometer prefill is explicitly OUT of scope.** `setOdometerReading("")` at `:117` has the same shape of gap as the fuel form's did (spec 52 §D), and `MaintenanceLog.tsx:28` already holds the bike. It is a separate, obvious unit — do not fold it in here.

---

## §B The seed

Add beside the existing state (`:52-61`):

```ts
const seededInterval = useRef<string | null>(null);
const seededNextDueDate = useRef<string | null>(null);
```

Add after the `isEngineOil` effect (`:75-79`), so it runs with `oilType` already settled:

```ts
const selectedOilType = useMemo(
  () => oilTypes.find((ot) => ot?._id === oilType),
  [oilTypes, oilType],
);

// ! Seeds the interval from the catalog. H-A: only ever replaces a value this effect
// ! itself wrote (tracked in seededInterval), so a hand-typed number always survives a
// ! type change. H-C: the oil type's suggestion is more specific than the maintenance
// ! type's default, so it wins — but neither beats typed input.
useEffect(() => {
  if (!open || log) return; // H-B: create only

  const suggested =
    selectedOilType?.suggestedIntervalKm ??
    selectedMaintType?.defaultIntervalKm;

  if (suggested == null) return; // H-E: leave the field alone

  const isSeed =
    intervalKmUsed === "" || intervalKmUsed === seededInterval.current;
  if (!isSeed) return; // H-A

  const next = String(Math.round(suggested)); // H-G
  if (next === intervalKmUsed) return;

  seededInterval.current = next;
  setIntervalKmUsed(next);
}, [open, log, selectedMaintType, selectedOilType, intervalKmUsed]);
```

And the date half (D3):

```ts
// ! H-F: serviceDate is the base and the rider can change it after the fact, so re-seed
// ! whenever it moves — but only while the date is still a seed.
useEffect(() => {
  if (!open || log) return;

  const days = selectedMaintType?.defaultIntervalDays;
  if (days == null || !serviceDate) return;

  const isSeed =
    nextDueDate === "" || nextDueDate === seededNextDueDate.current;
  if (!isSeed) return;

  const base = new Date(`${serviceDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return;

  const next = format(addDays(base, days), "yyyy-MM-dd");
  if (next === nextDueDate) return;

  seededNextDueDate.current = next;
  setNextDueDate(next);
}, [open, log, selectedMaintType, serviceDate, nextDueDate]);
```

Reset both refs in the existing open/log effect — `null` in the edit branch (`:95`) and in the create branch (`:116`), so a reopened modal starts clean.

`addDays` comes from `date-fns`, already a dependency; `format` is already imported in this file (`:122` uses it).

- [ ] Two refs added
- [ ] `selectedOilType` memo added
- [ ] Interval seeding effect added, with the H-A/H-C comment intact
- [ ] `nextDueDate` seeding effect added, with the H-F comment intact
- [ ] Both refs reset in both branches of the `[log, open]` effect

## §C The hint

On the interval input (`:268`), while the value is a seed:

```tsx
{
  intervalKmUsed !== "" && intervalKmUsed === seededInterval.current && (
    <Text style={styles.seedHint}>From your catalog default</Text>
  );
}
```

Same treatment for `nextDueDate` if D3 lands. Match whatever helper-text style spec 52 §G introduced on the fuel form rather than inventing a second one — check `FuelLogFormModal.tsx` first and reuse it.

- [ ] Hint rendered under the interval input
- [ ] Style reused from spec 52's seeded-field hint, not duplicated

---

## §D The one-time catch-up — required for this spec to show anything

Seeding only helps *future* logs. Two things have to happen by hand, once, and they are the difference between this spec being useful immediately and being useful in six months.

**Step 1 — put the defaults in the catalog, or the seed has nothing to read.**
Settings → maintenance types already collects and renders both columns (`SettingsCatalog.tsx:154-157` on create, `:207-210` on edit, `:533-536` in the table, dash when unset). Set a **km** default on every type serviced on distance (oil, chain, brakes, filters) and a **days** default on every type serviced on time (annual service, brake fluid, coolant). A type with neither seeds nothing — correctly, per H-E — so a blank catalog makes the whole spec a no-op.

While doing this, note whether any type with `requiresOilType: true` also gets a km default. If none does, D0's precedence rule can never fire and the question is moot.

**Step 2 — fix the newest log per type by hand. No backfill feature is needed.**
Settled 2026-10-11, replacing an earlier framing of this as a follow-up feature. Two facts make it a five-minute job:

- **The edit form already does it.** `intervalKmUsed` is on the edit path, and `maintenanceLog.service.ts:249` **recomputes `nextDueOdometer`** on update — so typing the interval into an old log rebuilds the reminder basis, it does not merely store a number. Nothing needs building.
- **Only the newest log per type matters.** `getRemindersFromDB` builds a `latestPerType` map and ignores every older log (`maintenanceLog.service.ts:297-303`). An oil change from March is irrelevant the moment a newer one exists. So this is 5–8 edits in total, not a history migration.

How to find them: the maintenance card renders a `Cost / Interval / Next due` grid (`MaintenanceLogCard.tsx:192-209`), and a log with no interval shows **`—` in both Interval and Next due** (`:127-132`). Scan that one cell down the list.

**Verify on the card's `Next due` cell, NOT on the reminders banner.** Both form mutations already invalidate `["reminders", bikeId]` (`MaintenanceLogFormModal.tsx:63-64`), so the banner does refresh — but today's server only surfaces a distance reminder within **50 km** of due (`maintenanceLog.service.ts:333`), so a correct interval will usually still show nothing there. That is the 50 km gate, which `bikelog_server` spec 52 exists to change; it is not a failed edit. `Next due` flipping from `—` to a km figure is the real confirmation.

**Order of work:** step 1 → step 2 → this spec's code. The catalog has to hold the numbers before either the hand edits or the seed can use them.

- [ ] Step 1 done — km and/or days defaults set on every type the rider actually services
- [ ] Noted whether any oil-requiring type carries a km default (settles D0 for this catalog)
- [ ] Step 2 done — newest log per type carries an interval, each verified via its `Next due` cell

---

## Test plan

`tsc` is trustworthy here without a dev-server boot — nothing under `app/` changes (spec 51a).

| #   | Scenario                                                                               | Expected                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | `npx tsc --noEmit`, `yarn lint`, `npx expo export --platform web`                      | All clean                                                                                                                                             |
| V2  | New log, pick a type with `defaultIntervalKm: 5000`                                    | Interval shows `5000`, hint visible                                                                                                                   |
| V3  | V2, then pick oil type `10W40 (3000 km)`                                               | Interval moves to `3000`, hint still visible (H-C)                                                                                                    |
| V4  | New log, **type** `2500`, then pick a type with a 5000 default                         | Stays `2500`, **no hint** (H-A — the headline assertion of this spec)                                                                                 |
| V5  | V2, then type `4000`, then change maintenance type                                     | Stays `4000` (H-A)                                                                                                                                    |
| V6  | Pick a type with **no** defaults                                                       | Field stays empty, no hint, no `NaN` (H-E)                                                                                                            |
| V7  | **Edit** an existing log whose interval is 3000, where the catalog default is now 5000 | Shows `3000`, no hint (H-B)                                                                                                                           |
| V8  | New log, type with `defaultIntervalDays: 180`, service date today                      | `nextDueDate` = today + 180                                                                                                                           |
| V9  | V8, then backdate the service date by 30 days                                          | `nextDueDate` moves back 30 days too (H-F)                                                                                                            |
| V10 | V8, then hand-edit `nextDueDate`, then change the service date                         | Hand-entered date survives                                                                                                                            |
| V11 | Submit V2 unchanged, then open the bike's reminders                                    | A `nextDueOdometer` now exists on the log — the whole point. Verify via the maintenance card's interval row (`MaintenanceLogCard.tsx:200`) or Postman |
| V12 | Switch maintenance type to one requiring oil, then to one that doesn't                 | Oil type clears (`:75-79`) and the interval does not end up stuck on the oil suggestion (H-D)                                                         |

V1 is claimable from here; V2–V12 need a device or `expo start --web`.

## Settled questions (2026-10-11)

All three of this spec's original open questions are closed. Kept here with their reasoning so the choices are auditable rather than silent.

1. **Oil type vs maintenance-type default → the oil type wins.** Now **D0**. It is the more specific answer and the one physically tied to the interval, and it can never override something the rider typed. §D step 1 also establishes whether the two can collide at all on this rider's catalog.
2. **Backfilling old logs → no feature needed; it is §D step 2.** The earlier framing ("out of scope, worth a follow-up") understated what already exists: the edit form recomputes `nextDueOdometer` on save, and only the newest log per maintenance type affects reminders at all. A one-tap shortcut on the card would save a handful of taps, once, and is not worth building.
3. **`defaultIntervalDays` → keep it.** Now folded into **D3**. Time-based services have no odometer interval, so this is the only path by which they ever produce a reminder. Still the one piece to drop if V8–V10 feel surprising on a device.

## Still open

Nothing blocking. One thing to watch rather than decide: if the rider turns out to service a type at a distance that differs from both catalog numbers often enough to retype it every time, the seed is noise rather than help — and the honest response would be to let the *log* update the catalog default on save, not to seed harder. Judge after a few real services, not before.

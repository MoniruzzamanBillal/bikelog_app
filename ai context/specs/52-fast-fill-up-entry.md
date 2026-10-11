# 52: Fast fill-up entry

Status: ✅ Complete — implemented 2026-10-11 (see Implementation notes at the end). Written 2026-10-11 from `../../new Features/01-fast-fill-up-entry.md`, which is the product plan; this is the implementation spec.

**Scope: `bikelog_app` only.** No server change, no new dependency, no EAS build, no web-client impact. One modal, one list screen, one small shared helper.

**Read §0 first.** The product plan was written before the form was read closely and it overstates the work: **two of its four improvements already exist in the code.** What is actually missing is narrower and sharper than "prefill the form".

---

## Goal

Make logging a fill-up at a petrol pump take two edits instead of five, by using data the app already holds, and by letting you enter the number you actually know (the taka you paid) instead of the one you have to derive from it.

---

## 0. Hazards — read before writing any code

**H-A — half of this is already built, and wired to the wrong screen.** `FuelLogFormModal` already takes a `seedFromLastLog?: { fuelStation?: string; pricePerLiter: number }` prop and its create branch already seeds both fields from it (`FuelLogFormModal.tsx:71-72`). The date already defaults to today (`:73`). A derived **Total cost** row already renders (`:79-84`, `:233-238`).

But `seedFromLastLog` has exactly **one** caller: `QuickAddFuelLogScreen.tsx:72` — the deep-link screen built for the home-screen widget, **and that widget was deleted in spec 36 on 2026-10-10.** The two screens you actually reach by hand pass nothing:

- `FuelLog.tsx:206` — the Fuel logs list's "Add Fill-up" button. **This is the real day-to-day entry point and it seeds nothing.**
- `FuelLogCard.tsx:174` — the edit path, which correctly should not seed (H-E).

So the headline finding is not "build prefilling". It is **"prefilling exists and the normal path never gets it, because its only consumer's entry point was removed."** Do not rebuild what is there; wire it up and extend it.

**H-B — the newest log is not `result[0]` once the list is paginated.** `FuelLog.tsx:74-76` fetches `?page=${page}&limit=${LIMIT}&sort=-date`. On page 1 the first row is the newest log; on page 2 it is not. Seeding from whatever happens to be rendered would quietly take the price from a months-old fill-up. Use a dedicated newest-log query instead of the paginated list — `QuickAddFuelLogScreen.tsx:28-32` already defines exactly that (`["fuelLogs", bikeId, "latest"]`, `?limit=1&sort=-date`), and react-query will share the cache entry between the two screens for free.

**H-C — the odometer prefill must be the _floor_ of the valid range, not a guess.** `bikelog_server` spec 48 now **rejects with 400** a fuel log whose `odometerReading` is below the latest existing log's reading. So prefilling is not merely a convenience: seeded with the bike's `currentOdometer` the field starts at the lowest value the server will accept, which is both the least typing and the furthest from a 400.

Use `TBike.currentOdometer` (`bike.types.ts:10`), **not** the last fuel log's reading. Maintenance logs and the Settings odometer panel (spec 47) also bump `currentOdometer`, so it can legitimately be _higher_ than the newest fuel log — and it is the higher of the two that the reading must clear.

**H-D — a backdated log inverts the prefill's usefulness.** Spec 26 allows backdated fuel logs. For one of those, today's `currentOdometer` is the wrong starting point and the rider has to clear it rather than nudge it. Acceptable — backdating is rare and the field stays fully editable — but do not add validation that _forces_ the reading to be ≥ `currentOdometer` on the client. The server owns that rule and already applies it correctly against the right comparison row.

**H-E — the edit path must never seed.** `FuelLogCard.tsx:174` passes `initialFuelLog`, and the effect's `if (initialFuelLog)` branch wins, so seeding cannot leak into an edit today. Keep it that way: any new seed prop must be read only inside the `else` branch (`FuelLogFormModal.tsx:67-75`).

**H-F — a prefilled value you did not notice is a wrong value you did not notice.** Four of six fields arriving pre-filled changes the form from "enter the data" to "check the data", and the failure mode is a stale petrol price silently entering your cost history. The seeded fields must be visually distinguishable from ones you typed (§G).

**H-G — the total you type may not be the total that gets stored.** This is the subtle one, and it shapes §F. `totalCost` is **server-derived** from `litersAdded × pricePerLiter`; it is not in `TCreateFuelLogPayload` and cannot be sent. Meanwhile `DECIMAL_REGEX` (`:13`) caps every numeric field at 2 decimal places. So entering ৳500 at ৳124.70/L derives 4.0096... litres, which must round to **4.01**, and the server will then store a total of **৳500.05** — not the ৳500 you typed and not what you paid. Any design where your typed total is displayed back to you unchanged is lying. §F resolves this by recomputing and showing the real total.

---

## A. What already exists

| Thing                                                                 | Where                                   | State                                             |
| --------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `seedFromLastLog` prop + create-branch seeding of price/L and station | `FuelLogFormModal.tsx:20, 71-72`        | **Built.** One caller only — the deep-link screen |
| Date defaults to today                                                | `FuelLogFormModal.tsx:73`               | **Built**                                         |
| Derived read-only "Total cost" row                                    | `FuelLogFormModal.tsx:79-84, 233-238`   | **Built**, display only                           |
| Newest-log query (`?limit=1&sort=-date`)                              | `QuickAddFuelLogScreen.tsx:28-32`       | **Built**, local to that screen                   |
| `bike` with `currentOdometer`, already fetched on the list screen     | `FuelLog.tsx:66-71`, `bike.types.ts:10` | **Built** — no new request needed                 |
| Odometer prefill                                                      | —                                       | **Missing.** `setOdometer("")` at `:68`           |
| Total ৳ as an _input_                                                 | —                                       | **Missing.** Derived one way only                 |
| Full-tank carry-forward                                               | —                                       | **Missing.** Always `false` at `:70`              |
| Seeded-vs-typed visual distinction                                    | —                                       | **Missing**                                       |

---

## B. Share the seed, don't copy it — new `hooks/useFuelLogSeed.ts`

`QuickAddFuelLogScreen` holds the newest-log query and the `useMemo` that shapes it. `FuelLog.tsx` needs the same thing, and a second copy would drift. Extract one hook:

```ts
useFuelLogSeed(bikeId: string): {
  seed: { fuelStation?: string; pricePerLiter: number; isFullTank: boolean } | undefined;
  odometerSeed: number | undefined;   // bike.currentOdometer
  isLoading: boolean;
}
```

- Owns the `["fuelLogs", bikeId, "latest"]` query (H-B) and the bike query. Both are already in the react-query cache on the list screen, so this adds no network traffic there.
- `QuickAddFuelLogScreen` is refactored onto it and keeps its existing "don't open the modal until the seed resolves" behaviour (`:65-67`) — that comment documents a real constraint: the modal seeds on the `open` transition, so opening before the seed lands produces an empty form.
- `FuelLog.tsx` does **not** need to delay anything: its modal opens on a button press, long after both queries settled. If the seed is somehow absent, the fields are simply empty — exactly today's behaviour.

## C. Wire the list screen — `FuelLog.tsx`

Pass the seed to the modal at `:206`. That single change delivers the price/L and station prefill that already works, to the path that actually gets used.

## D. Odometer prefill — `FuelLogFormModal.tsx`

New prop `seedOdometer?: number`. In the `else` branch (`:68`), `setOdometer(seedOdometer?.toString() ?? "")`.

Per H-C this is `bike.currentOdometer`, the floor of the server's accepted range. Per H-D it stays freely editable with no client-side lower bound.

## E. Full-tank carry-forward

Extend the seed with `isFullTank` from the newest log and apply it at `:70`.

Justification: it is habitual — most riders fill the same way every time — and it is the field most likely to be left at a wrong default precisely because a toggle is easy to skip past. **But it is also the highest-consequence field in the form:** `isFullTank` is what closes a mileage period and triggers the km/l calculation, so a wrong value does not just misrecord one row, it corrupts an efficiency figure. That makes H-F's visual treatment non-optional for this field specifically.

If the visual cue in §G cannot be made clearly readable on the switch, **drop this section and keep the default of `false`.** The other improvements stand alone; this one is only worth having if it is obvious.

## F. Total ৳ as an input

Today total is computed from litres × price and displayed. Make it enterable, with **price/L as the anchor that is never derived**:

| You edit    | What happens                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| **Total**   | `litres = total ÷ price`, rounded to 2dp, then **total is re-displayed from the rounded litres** (H-G) |
| **Litres**  | `total = litres × price`                                                                               |
| **Price/L** | litres is kept (it is the measured quantity), total recomputed                                         |

So the pump flow becomes: price/L is already seeded → type `500` in Total → the form shows `4.01 L` and `৳500.05`, which is what will actually be stored. The small discrepancy is **shown, not hidden** — you can nudge litres to 4.00 if you prefer the round number.

**Deliberately excluded: deriving price/L from litres + total.** It sounds symmetrical but it is a trap. A price derived from two 2dp-rounded inputs lands on values like `124.6883`, which then gets stored _and_ becomes the next fill-up's seed, so one rounding artefact propagates into every later entry. Price/L is a published rate you can read off the pump; keep it an input.

Validation (`:87-118`) still requires `odometer`, `liters` and `pricePerLiter`, and the payload (`:120-128`) is unchanged — total is never sent. If total is the field the rider filled, litres must be populated by derivation **before** validation runs, or the "Liters are required" toast fires on a form that looks complete.

## G. Seeded vs. typed (H-F)

The seeded fields need to read as suggestions. Options, cheapest first:

1. A one-line hint under the seeded group — e.g. _"Price, station and tank setting from your last fill-up"_ — shown only while untouched.
2. Per-field muted styling until the field is edited, cleared on first change.

Option 1 is the minimum and probably sufficient; it is one `Text` and no changes to `FormField`. Decide at implementation time, but **ship one of them** — per H-F this is the safety mechanism for the whole feature, not polish. §E depends on it.

## H. Untouched

`TCreateFuelLogPayload` / `TUpdateFuelLogPayload` and every server route (no contract change). `FuelLogCard.tsx`'s edit path (H-E). `DECIMAL_REGEX` and all existing validation. The mileage-closure toast (`:152-158`). `setLastUsedBike` (`:146`). The `409` mileage-locked branch (`:162-167`).

---

## Test plan

No server needed for most of this — it is form behaviour. The web export is a valid harness here, unlike for spec 51c's device-gated code.

| #   | Scenario                                                                    | Expected                                                                                                                  |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| V1  | Bike with prior fill-ups → Fuel logs → **Add Fill-up**                      | Odometer = bike's `currentOdometer`; price/L and station from the **newest** log; date = today; seeded-field hint visible |
| V2  | As V1 but scrolled to **page 2** of the list first                          | Seed still comes from the newest log, not page 2's first row (H-B)                                                        |
| V3  | Brand-new bike, no fuel logs                                                | Odometer seeded from `currentOdometer`; price/L and station empty; no crash, no hint for absent values                    |
| V4  | Type `500` into Total, price/L seeded at `124.70`                           | Litres shows `4.01`; Total re-displays `৳500.05`, not `৳500` (H-G)                                                        |
| V5  | Type litres `8.5`, price `125`                                              | Total shows `৳1062.50` — today's behaviour, unregressed                                                                   |
| V6  | Enter Total only, leave litres untouched, Save                              | Saves successfully — litres was derived before validation (§F), no "Liters are required" toast                            |
| V7  | Change price/L after entering litres                                        | Litres unchanged, total recomputed                                                                                        |
| V8  | Save a fill-up with the seeded odometer unchanged                           | `201`. Confirms the seed is ≥ the server's floor (H-C)                                                                    |
| V9  | Backdated log: clear the odometer, enter a lower reading with an older date | Client does not block it; the server's own rule decides (H-D)                                                             |
| V10 | **Edit** an existing fuel log from its card                                 | Every field shows that log's own values. **No seeding, no odometer prefill** (H-E)                                        |
| V11 | Quick-add deep link (`client://bikes/<id>/fuel-logs/new`)                   | Still works, still seeds, still waits for the seed before opening (§B refactor did not regress it)                        |
| V12 | Full-tank seeded `true` from the last log                                   | Toggle is on **and visibly marked as carried over** (§E/§G). If it cannot be made obvious, §E is dropped                  |
| V13 | `npx tsc --noEmit` + `yarn lint`                                            | Clean. Boot the dev server first if anything under `app/` changed — see `51a`                                             |

V4 and V6 are the ones that can only be got right deliberately; V10 and V11 are the regressions.

---

## Decisions

1. **Build on what exists rather than rewriting the form.** Two of the product plan's four items are already implemented and merely unwired (H-A), so the work is a prop, a shared hook, and two genuinely new behaviours.
2. **Price/L is the anchor; total and litres derive from each other through it.** Deriving price from litres + total would propagate rounding artefacts into every subsequent seed (§F).
3. **Seed from a dedicated newest-log query**, not the paginated list (H-B), reusing the query key `QuickAddFuelLogScreen` already uses so the cache is shared.
4. **Odometer seeds from `bike.currentOdometer`**, not the newest fuel log, because maintenance logs and the Settings panel also advance it and the server validates against the higher value (H-C).
5. **No client-side odometer lower bound.** The server owns that rule and compares against the right row; duplicating it would break backdated entries (H-D).
6. **§G ships with the feature, not after it.** It is the mitigation for H-F, and §E is conditional on it.

## Still open

1. **Which visual treatment for seeded fields** — the single hint line (§G option 1) or per-field styling (option 2). Suggest starting with the hint and only going further if a wrong seeded value actually slips through in use.
2. **Whether to carry the full-tank toggle forward at all** (§E). It is the most useful carry-forward and the most costly to get wrong. Gated on §G being legible; defer to the implementer's judgement once the cue exists on screen.
3. **Whether a stale seeded price deserves a warning** — e.g. last fill-up older than ~60 days. Deliberately left out of this spec as speculative; revisit only if it bites.

---

## Implementation notes (2026-10-11)

Implemented as specified. Four files: new `hooks/useFuelLogSeed.ts`; `FuelLogFormModal.tsx`, `FuelLog.tsx`, `QuickAddFuelLogScreen.tsx` changed. No server change, no new dependency, no change under `app/`, no change to `TCreateFuelLogPayload` or any route.

### The two "Still open" questions, as decided

1. **§G visual treatment — option 1 (the hint line), plus one addition §E forced.** A tinted hint block sits directly under the modal title and renders up to two lines, each only while the fields it describes are still untouched:
   - _"Odometer starts at this bike's current reading — change it if you're backdating."_ (worded separately because the odometer seed comes from the bike, not the last log — H-C)
   - _"Price, station and tank setting carried over from your last fill-up — check before saving."_ — built from only the values that were actually seeded, so a brand-new bike with no logs sees just the odometer line (V3).

   The hint block sits above the form, but the Full Tank switch is at the *bottom* of it, so the hint alone would not have marked the field §E says must be obvious. The switch's own `description` therefore flips to _"Carried over from your last fill-up · triggers mileage calculation"_ while the seeded value is untouched. No change to `SwitchField` was needed — it already takes `description`.

2. **§E shipped.** `isFullTank` is carried forward, gated on the switch marker above being legible. Both markers clear on first edit of their own field, tracked by a `seeded` state object (`odometer`/`price`/`station`/`fullTank`) set when the seed is applied and cleared per field by `clearSeeded()`.

Question 3 (a staleness warning on an old seeded price) was left out as the spec says.

### One deviation from §F's literal wording, and why

§F's table says that on editing **Total**, "total is re-displayed from the rounded litres". Doing that on every keystroke makes the field unusable — typing `5` of `500` would immediately rewrite the input to `4.99`. So the re-display happens **on blur** (`handleTotalBlur`), and during typing the truth is still visible: a caption under the field reads _"Stores ৳500.05 — liters round to 2 decimals"_ whenever the typed total differs from the derived one. The end state V4 asks for is unchanged — after the field is left, it shows `৳500.05`, not `৳500`.

Also worth recording: the old read-only "Total cost" row was **replaced** by this editable field rather than kept alongside it, since the field shows the same derived figure once blurred and two totals on one form would be ambiguous.

### Other notes

- `useFuelLogSeed` returns `bike` as well as the seed, so `FuelLog.tsx` and `QuickAddFuelLogScreen.tsx` both dropped their own `["bikes", bikeId]` query rather than running a duplicate one beside the hook's. Query keys are unchanged (`["bikes", bikeId]`, `["fuelLogs", bikeId, "latest"]`), so the cache is shared exactly as §B intended and the list screen issues no extra request.
- `QuickAddFuelLogScreen` keeps its "don't open until the seed resolves" gate, now driven by the hook's `isLoading`.
- The edit path is untouched beyond seeding the new Total field from the log's own `litersAdded × pricePerLiter`, and `setSeeded(NO_SEEDED_FIELDS)` makes it structurally impossible for a marker or a seed to leak into an edit (H-E).

### Verification — what was and was not done

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean (V13) |
| `yarn lint` + `npx eslint hooks/useFuelLogSeed.ts` | Clean, 0 errors. `expo lint` only covers `app/` and `components/`, so the new hook was linted explicitly |
| `npx expo export --platform web` | Bundles, all 13 routes emitted — including `/bikes/[bikeId]/fuel-logs` and `.../fuel-logs/new`, the two screens that render the modal |
| V4/V5/V6/V7 arithmetic | Verified numerically against the derivation code (৳500 ÷ ৳124.70 → `4.01 L` → stores ৳500.05; 8.5 L × ৳125 → ৳1062.50; derived liters always passes `DECIMAL_REGEX`) |
| **V1–V3, V8–V12 on a device** | **Not done.** No device or simulator in this environment and no live backend was hit. The seeded-field behaviour, the 201 on a seeded odometer (V8), the backdating path (V9), the edit regression (V10) and the deep-link regression (V11) are all still owed |

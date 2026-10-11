# 55: Tank forecast — the half-tank date and range

Status: ⛔ **Not Started.** Written 2026-10-11 from `../../../new Features/04-half-tank-forecast.md`.
Scope: **`bikelog_app` only.** One new hook, one new component, one one-character change to an existing query. No server change, no schema change, no new endpoint, no new dependency, no EAS build.
Independent of `bikelog_server` spec 52 and app specs 53/54 — it can ship before, after or instead of them. It does duplicate spec 52's _rate_ calculation client-side; §0 H-F is where that is argued.

**What the rider gets**, on the fuel log screen: `Half tank around 15 Oct · ~155 km to go`, plus the standing figure — at 40 km/L on a 12 L tank, **`You can ride ~240 km on half a tank`**.

---

## §0 Hazards — read before writing code

**H-A — Half tank is not observable. The gauge always wins.**
Nothing in this app can read the fuel gauge. Every number here is derived from odometer distance and a km/L figure, so the card is a _forecast_, not a reading. If it and the needle disagree, the needle is right. This governs the copy (§E) and is why the card never says "you have 6.2 L".

**H-B — Top-ups after the anchor must be added back, or the card is confidently wrong.**
The anchor is the last full-tank fill. Distance alone says "12 L full on 9 Oct, 300 km ridden, so 4.5 L left" — but if 5 L went in on the 13th the tank holds 9.5 L and the rider is nowhere near half. Worked example, 12 L tank at 40 km/L:

|                                   | Distance-only         | With top-ups           |
| --------------------------------- | --------------------- | ---------------------- |
| Full 12 L on 9 Oct, ridden 300 km | 4.5 L → **past half** | —                      |
| …and 5 L added on 13 Oct          | 4.5 L → **past half** | 9.5 L → 140 km to half |

The second row is the truth. Getting this wrong does not make the card slightly off, it inverts it.

**H-C — Same-day fills break a naive `date >` comparison.**
Fuel-log dates are **day-granular**: clients submit `"yyyy-MM-dd"` and `z.coerce.date()` stores exactly `00:00:00.000Z` (documented at length in `buildPrismaListQuery.ts`). So a top-up on the _same calendar day_ as the full tank has an identical `date` and a `date > anchorDate` filter silently drops its litres. Tie-break on `odometerReading` (`> anchor.endOdometer`), which is monotonic by server spec 48's sequence check.

**H-D — Never read the fill-up list from the screen's paginated query.**
`FuelLog.tsx:71-77` keys on `page`, so on page 2 `data.result` is a set of months-old logs. Reading top-ups from it would make the forecast change when the rider pages through history. This is exactly spec 52 H-B, one screen over.

**H-E — The top-up window may not reach back to the anchor, and short is the dangerous way to be wrong.**
If the fetched window of recent logs does not extend to the anchor's date, some top-ups are invisible, litres-in-tank is understated and the card says "past half" when the tank is three-quarters full. Detect it — the oldest fetched log is newer than the anchor — and fall back to the range-only state rather than showing a number built on a window that didn't cover the period.

**H-F — `currentOdometer` lags reality, and here it lags in the UNSAFE direction.**
It only advances when a fuel log, maintenance log, or the Settings odometer panel writes to it. So "ridden since the full tank" is understated, litres-used is understated, and the card reports **more fuel than the bike has** — the rider reaches half (and empty) earlier than told. Note the contrast with `bikelog_server` spec 52, where the same staleness produced a _late service_; the mitigation there was to floor the day count, and the same applies here. Floor `kmToHalf`, floor the day count, keep the "around" hedge, and make it easy to reach the odometer panel.

**H-G — This duplicates spec 52's km-per-day rate client-side. That is allowed; duplicating a projection is not.**
Spec 53 H-E bans the app from computing a date the server also computes, because two sources of truth for the _same_ number disagree on the same screen. Here the server computes no tank forecast at all, so only the shared _input_ — km per calendar day — exists in two places. Acceptable, on two conditions: the client implementation obeys the same three rules as `bikelog_server` spec 52 §B (divide by the **covered span**, never a nominal window; snap the span to a whole number of weeks so a 5-or-6-day riding week cannot skew it; floor, never ceil), and the duplication is recorded in Known Gaps so it is kept **aligned**. **Settled 2026-10-11: the rate stays client-side and is never taken from the backend** — so the duplication is permanent by decision, not pending convergence, and keeping the two in step is this app's job. In practice that means the constants below mirror spec 52's (28-day window, 14-day minimum span, whole-week snapping, floor) and V15 drift is fixed **here**, not by adding a server field. See Settled questions.

**H-H — Do not try to filter full-tank logs server-side.**
`?isFullTank=true` looks like the obvious way to find the anchor and would **fail with a 500**: `buildPrismaListQuery` drops leftover query params straight into the Prisma `where` with no coercion (`buildPrismaListQuery.ts:26-29`), so the string `"true"` meets a `Boolean` column and Prisma throws a validation error, which `globalErrorHandler` has no Prisma branch for. §B's anchor needs no filter at all.

**H-I — A mileage record exists only when its period covered distance, so the anchor can be one fill stale.**
`fuelLog.service.ts:163` writes the record only `if (fuelLog.isFullTank && distanceKm > 0)`. Two full-tank fills at the same odometer leave the newer one with no record, so `exactRecords[0]` points at the older fill. That overstates distance-since-full, which **understates** remaining fuel — the safe direction. Accept it; do not add a query to correct it.

**H-J — `fuelTankCapacityLiters` is nominal, not usable.**
A 12 L tank has a litre or two that the pump can't reach, and a gauge needle at "half" is not half the fuel — gauges are nonlinear. The card computes half the _fuel_, which is the defensible quantity, and §E says so once in the copy. Do not try to model usable capacity or gauge curves.

**H-K — Guard every degenerate case; several are reachable by normal use.**
`ridden < 0` (an edited or backdated log, an odometer correction), `kmPerLiter <= 0`, `litersInTank > capacity` (a top-up right after a full tank, or real mileage better than the figure used), `litersInTank <= capacity / 2` (already past half — a legitimate state, not an error), and no mileage data at all on a new bike. Every one must land on a defined card state (§C), never on `NaN`, `Infinity` or `Invalid Date`.

---

## §A Decisions

- **D1 — The anchor comes from `exactRecords[0]`, not from a fuel-log query.** A mileage record is closed _by_ a full-tank fill, so `endOdometer` and `periodEndDate` **are** that fill's odometer and date. `FuelLog.tsx:78-82` already fetches it, and the screen already relies on this correspondence — `buildLockMap` matches full-tank logs by `endOdometer` for the same reason. Records arrive `periodEndDate desc` (`mileageRecord.service.ts`), so `[0]` is the newest. Caveat H-I.
- **D2 — km/day comes from the same `exactRecords`.** They carry `distanceKm`, `periodStartDate` and `periodEndDate` — distance over time, which is the whole input. Zero extra requests.
- **D3 — Widen `useFuelLogSeed`'s existing query from `limit=1` to `limit=12` instead of adding a query.** Same cache key (`["fuelLogs", bikeId, "latest"]`), same `?sort=-date`, one request serving the seed _and_ the top-up sum. `useFuelLogSeed` keeps returning `result[0]` for the seed and additionally returns the array, so `QuickAddFuelLogScreen` — the hook's other consumer — is untouched. 12 covers a full-tank interval comfortably at any realistic fill pattern; when it doesn't, H-E catches it.
- **D4 — Mileage figure: the newest exact record, else the rolling approximate, and the card names which it used.** `exactRecords[0].mileageKmPerLiter` is specific but a single sample; `approximate.mileageKmPerLiter` is steadier and exists even for a rider who never marks a full tank. A 40 → 45 swing moves the half-range 240 → 270 km, so an unlabelled figure is an unauditable one.
- **D5 — The threshold is fixed at `capacity / 2`, and half tank is the only threshold this feature will have.** Quarter-tank and reserve were considered and **dropped on 2026-10-11** (Settled question 3) — not deferred. A per-bike threshold remains a possible later setting; a second _built-in_ threshold is not planned.
- **D6 — All derivation lives in `hooks/useTankForecast.ts`, which re-uses the three existing query keys.** React-query dedupes identical keys, so the hook triggers no network of its own and the component stays presentational. Same shape as `useFuelLogSeed`.
- **D7 — The card renders above the `N fill-ups` row**, and deliberately does not look like the bike hub's reminder banners — it is a forecast, not an alert.

---

## §B The arithmetic

```
half-tank range   = (capacity / 2) * kmPerLiter                      // 240 km at 12 L, 40 km/L
ridden since full = currentOdometer - anchor.endOdometer             // H-F: understated
litres used       = ridden since full / kmPerLiter
top-ups           = Σ litersAdded of logs after the anchor           // H-B, H-C
litres in tank    = min(capacity, capacity - litres used + top-ups)  // H-K
km to half        = floor((litres in tank - capacity / 2) * kmPerLiter)
days to half      = floor(km to half / kmPerDay)                     // H-F, H-G
```

Worked through the request's own example — 12 L, 40 km/L, full tank on 9 Oct, 86 km since, no top-ups, ~43 km/day:

```
half-tank range = 6 * 40                        = 240 km
litres used     = 86 / 40                       = 2.15 L
litres in tank  = 12 - 2.15 + 0                 = 9.85 L
km to half      = floor((9.85 - 6) * 40)        = 154 km
days to half    = floor(154 / 43)               = 3  →  "around 14 Oct"
```

- [ ] Arithmetic implemented in the order above (clamping before subtraction, flooring last)

## §C `hooks/useTankForecast.ts`

```ts
const DAY_MS = 86_400_000;
const RATE_WINDOW_DAYS = 28; // H-G: same window as bikelog_server spec 52 (its D1, settled 28)
const MIN_RATE_SPAN_DAYS = 14;
const MIN_RATE_DISTANCE_KM = 100;

export type TTankForecast =
  | { state: "unavailable" }
  | {
      state: "range-only";
      halfRangeKm: number;
      kmPerLiter: number;
      basis: TRateBasis;
    }
  | {
      state: "live";
      halfRangeKm: number;
      kmPerLiter: number;
      basis: TRateBasis;
      anchorDate: string;
      riddenSinceAnchorKm: number;
      kmToHalf: number; // 0 when already past half
      pastHalf: boolean;
      daysToHalf: number | null; // null when km/day is unavailable
      halfDate: Date | null;
    };

type TRateBasis = "exact" | "approximate";
```

**km per calendar day**, from the mileage records:

```ts
// ! H-G: mirrors bikelog_server spec 52 §B's three rules, and must be kept mirroring them by
// ! hand — the server is deliberately NOT asked for this number (Settled question 1), so if
// ! spec 52's window or minimums move, they move here too. The divisor is the span the chosen
// ! records actually COVER — never RATE_WINDOW_DAYS, which includes the days since the last
// ! full tank that no record speaks for. Dropping the oldest records one at a time and keeping
// ! whichever subset lands nearest a whole number of weeks is the client-side equivalent of
// ! that spec's anchor loop: it stops a 5-or-6-day riding week from skewing the average.
function computeKmPerDay(records: TMileageRecord[]): number | null {
  const cutoff = Date.now() - RATE_WINDOW_DAYS * DAY_MS;

  // records arrive periodEndDate desc; work newest-first
  const inWindow = records.filter(
    (r) => new Date(r?.periodEndDate).getTime() >= cutoff,
  );
  if (inWindow.length === 0) return null;

  const newestEnd = new Date(inWindow[0].periodEndDate).getTime();

  let best: { kmPerDay: number; offWeek: number } | null = null;

  for (let take = inWindow.length; take >= 1; take--) {
    const subset = inWindow.slice(0, take);
    const oldestStart = new Date(
      subset[subset.length - 1].periodStartDate,
    ).getTime();
    const spanDays = (newestEnd - oldestStart) / DAY_MS;
    if (spanDays < MIN_RATE_SPAN_DAYS) continue;

    const distanceKm = subset.reduce((sum, r) => sum + (r?.distanceKm ?? 0), 0);
    if (distanceKm < MIN_RATE_DISTANCE_KM) continue;

    const remainder = spanDays % 7;
    const offWeek = Math.min(remainder, 7 - remainder);
    if (!best || offWeek < best.offWeek) {
      best = { kmPerDay: distanceKm / spanDays, offWeek };
    }
  }

  return best?.kmPerDay ?? null;
}
```

**The top-up sum**, with the H-C tie-break:

```ts
// ! H-C: fuel-log dates are day-granular, so a top-up made on the same calendar day as the
// ! full tank ties on `date` and a bare `>` would discard its liters. Odometer is monotonic
// ! (server spec 48), so it is the tie-break.
const anchorTime = new Date(anchor.periodEndDate).getTime();
const topUps = recentLogs.filter((l) => {
  const t = new Date(l?.date).getTime();
  if (t > anchorTime) return true;
  return t === anchorTime && l?.odometerReading > anchor.endOdometer;
});
const topUpLiters = topUps.reduce((sum, l) => sum + (l?.litersAdded ?? 0), 0);

// ! H-E: if the fetched window does not reach the anchor, some top-ups are missing and the
// ! card would claim less fuel than the tank holds. Degrade, don't guess.
const oldestFetched = recentLogs[recentLogs.length - 1];
const windowReachesAnchor =
  !oldestFetched || new Date(oldestFetched.date).getTime() <= anchorTime;
```

State selection:

- no `bike.fuelTankCapacityLiters`, or no usable `kmPerLiter` → `unavailable`
- no `exactRecords[0]`, or `ridden < 0`, or `!windowReachesAnchor` → `range-only`
- otherwise → `live`, with `pastHalf = litersInTank <= capacity / 2` and `kmToHalf` clamped at 0

- [ ] `useTankForecast.ts` created, re-using the keys `["bikes", bikeId]`, `["mileage","history",bikeId]`, `["fuelLogs",bikeId,"latest"]`
- [ ] `computeKmPerDay` carries the H-G comment verbatim — it is the only record of why the subset loop exists
- [ ] Top-up tie-break carries the H-C comment
- [ ] Every branch of H-K lands on a declared state

## §D `useFuelLogSeed` — one query widened

`hooks/useFuelLogSeed.ts:35-40`: `?limit=1&sort=-date` → `?limit=12&sort=-date`, same key. Return the array alongside the existing seed:

```ts
const recentLogs = lastLogData?.data?.result ?? [];
const lastLog = recentLogs[0];
...
return { seed, odometerSeed: bike?.currentOdometer, bike, recentLogs, isLoading };
```

Extend the hook's header comment to say _why_ 12: the tank forecast needs every fill-up back to the last full tank, and `FuelLog.tsx`'s own list query is paginated and therefore unusable for it (H-D).

- [ ] `limit=12`, key unchanged
- [ ] `recentLogs` returned; `seed` logic untouched
- [ ] `QuickAddFuelLogScreen` verified unaffected (it consumes `seed` / `odometerSeed` only)
- [ ] Header comment extended

## §E `components/main/FuelLog/TankForecastCard.tsx`

```
┌──────────────────────────────────────────────┐
│  Tank forecast                               │
│                                              │
│  Half tank around  14 Oct                    │
│  ~154 km to go                               │
│                                              │
│  86 km since your 9 Oct full tank            │
│  You can ride ~240 km on half a tank         │
│  Based on 40.2 km/L (exact)                  │
└──────────────────────────────────────────────┘
```

The bottom three lines are what make the top two auditable — if the date looks wrong, that is where the rider sees why. The range and its basis are **two lines, not one**: `You can ride ~240 km on half a tank (40.2 km/L, exact)` is ~54 characters, which does not fit a 12px line in this card at 360dp, and the half that would ellipsise is the basis.

| State                         | Shown                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `live`, `daysToHalf` ≥ 7      | `Half tank around 24 Oct`                                                                              |
| `live`, `daysToHalf` 2–6      | `Half tank in about 4 days`                                                                            |
| `live`, `daysToHalf` 1        | `Half tank around tomorrow`                                                                            |
| `live`, `daysToHalf` 0        | `Half tank any time now`                                                                               |
| `live`, `daysToHalf === null` | `~154 km to half` — distance only, no date                                                             |
| `live`, `pastHalf`            | `Past half tank` + `You can ride ~240 km on half a tank`                                               |
| `range-only`                  | `You can ride ~240 km on half a tank` + `Based on 40.2 km/L (exact)` + one line: mark your next fill-up as a full tank to get the date |
| `unavailable`                 | Card not rendered at all                                                                               |

Copy rules, all load-bearing:

- **Keep "around" / "about".** H-F and H-G both bias this estimate optimistic and §B floors to compensate; a bare date is a promise the data cannot keep.
- **Never a named weekend.** The Dhaka weekend is Friday–Saturday and may be the non-riding days, so a date landing there is not a day the tank drains. Same rule as spec 53 H-G.
- **Say "half the fuel", not "half the gauge"**, once, in the card's own footnote or an info line (H-J).
- **Never state litres.** `9.85 L` reads like a measurement; `~154 km to go` reads like what it is.
- **State the range as rideable distance, in one fixed sentence: `You can ride ~240 km on half a tank`** (settled 2026-10-11). Not `Full → half is 240 km`, which is spec-sheet phrasing the rider has to decode. The sentence is identical in all three states that show it (`live`, `pastHalf`, `range-only`) so the number is recognisably the same number wherever it appears, and it keeps the `~` because it moves with the mileage figure.

- [ ] Card built with all seven states
- [ ] Uses `Panel` from `components/main/shared`, styled distinctly from `RemindersBanner` (D7)
- [ ] `date-fns` `format(due, "d MMM")`, matching spec 53 §C

## §F Placement

`FuelLog.tsx`, immediately above the `styles.topRow` block at `:123`:

```tsx
<TankForecastCard bikeId={bikeId} />

<View style={styles.topRow}>
```

- [ ] Rendered above the fill-up count row
- [ ] Nothing else in `FuelLog.tsx` changed — the paginated list query, `buildLockMap` and the modal wiring are untouched

---

## Test plan

`tsc` is trustworthy without a dev-server boot — nothing under `app/` changes (spec 51a).

| #   | Scenario                                                                                                            | Expected                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| V1  | `npx tsc --noEmit`, `yarn lint`, `npx expo export --platform web`                                                   | All clean                                                                                                               |
| V2  | 12 L bike, 40 km/L, full tank 9 Oct at 10,000 km, odometer 10,086, no top-ups                                       | `~154 km to go`, range line `You can ride ~240 km on half a tank`, date ≈ today + floor(154 / kmPerDay)                 |
| V3  | V2 plus a 5 L top-up dated 13 Oct                                                                                   | Litres in tank 14.85 → clamped to 12 → `240 km to go` (H-B, H-K)                                                        |
| V4  | V2 with 300 km ridden and a 5 L top-up                                                                              | `~140 km to go`, **not** `Past half` — the headline assertion of H-B                                                    |
| V5  | A top-up dated the **same day** as the full tank, higher odometer                                                   | Its litres are counted (H-C)                                                                                            |
| V6  | Paginate the fill-up list to page 2                                                                                 | Card does not change (H-D)                                                                                              |
| V7  | A rider with 13+ fill-ups since the last full tank                                                                  | `range-only`, not a wrong number (H-E)                                                                                  |
| V8  | Bike with no full-tank log ever                                                                                     | `range-only` + the "mark your next fill-up" line                                                                        |
| V9  | Brand-new bike, no fuel logs                                                                                        | Card not rendered (`unavailable`)                                                                                       |
| V10 | Odometer below the anchor (edited log / correction)                                                                 | `range-only`, no negative distance, no `NaN` (H-K)                                                                      |
| V11 | 500 km ridden since full, no top-ups                                                                                | `Past half tank` (H-K)                                                                                                  |
| V12 | Mileage records older than 28 days only                                                                             | `kmToHalf` shown, no date (`daysToHalf === null`)                                                                       |
| V13 | Exactly one mileage record, 10-day period                                                                           | No date — `MIN_RATE_SPAN_DAYS` refuses it                                                                               |
| V14 | A rider who never marks full tank, so no exact records                                                              | Figures come from `approximate`, card says `(estimated)` (D4)                                                           |
| V15 | Compare the card's implied km/day against `bikelog_server` spec 52's `kmPerDay` on the same bike, if 52 has shipped | Within ~10%. A wider gap is drift between two permanently separate implementations (H-G), and the fix is **in this app** — re-check the constants against spec 52 §B and the subset loop against its anchor loop. Never resolved by adding a server field (Settled question 1) |
| V16 | 360dp width, card + `12 fill-ups` row + list                                                                        | No truncation, list still the dominant element                                                                          |

V1 is claimable from here. V2–V15 are most cheaply exercised by temporarily stubbing the hook's inputs; V16 needs a device or `expo start --web`.

## Settled questions (developer, 2026-10-11)

1. **The rate stays client-side — do not add it to the backend.** The proposal was for the server to return `kmPerDay` on `/bikes/:bikeId/mileage` so `computeKmPerDay` could be deleted here. **Rejected:** this feature is app-only and stays app-only, so the fix for any disagreement with `bikelog_server` spec 52 is made **in the frontend**.
   - The concrete consequence, and the one thing to do before writing code: **`RATE_WINDOW_DAYS` is 28, not 56.** Spec 52 settled its window at 4 weeks the same day, and a 56-day window here would have put the two rates on different windows _and_ different tables (`MileageRecord` vs `FuelLog`), so V15 would fail for reasons that are not drift. `MIN_RATE_SPAN_DAYS = 14` then puts this loop in the same 14–28 day band spec 52 §B documents.
   - The duplication is therefore **permanent by decision**, not a pending convergence. Known Gaps records it as a keep-in-step obligation: if spec 52's window, minimum span, snapping rule or flooring changes, §C changes with it, by hand.
2. **`range-only` shows the figure, phrased as rideable distance.** `You can ride ~240 km on half a tank` — the number is useful standing knowledge on its own (it is trip-planning information even with no anchor), and the phrasing is what stops the card reading as broken: it is a statement, not a blank forecast. The same sentence is used in all three states that show it, and the `mark your next fill-up as a full tank` nudge stays beneath it so the missing half is legible as an instruction rather than a fault. See §E's copy rules.
3. **Reserve / quarter tank — dropped, not deferred.** Not wanted. D5 is now final: half tank is the only built-in threshold.

## Still open

1. **Should the card let the rider correct the odometer, and if so how?** The card's largest error source is that `currentOdometer` is usually behind reality (H-F) — it only moves when a fuel log, a maintenance log or the Settings odometer panel writes to it — and it is behind in the **unsafe** direction, so the card claims more fuel than the bike has. That error vanishes the moment the rider updates the reading, which makes a one-tap correction the cheapest accuracy improvement available to this feature. Three options:
   - **(a) Nothing.** The figure drifts between fill-ups and self-corrects at the next log. Simplest; keeps the card purely presentational (D6).
   - **(b) Tap the audit line (`86 km since your 9 Oct full tank`) to update the odometer for _this_ bike,** in a small modal reusing `PATCH /bikes/:id/odometer`. One tap, right bike, no new screen.
   - **(c) Link to the Settings screen.** Cheapest to write, worst to use: `OdometerPanel` is rendered inside `SettingsCatalog.tsx:387`, near the bottom of a long screen with no route of its own, and it carries **its own bike selector** defaulting to the last-used bike (`OdometerPanel.tsx:33-41`) — so arriving from this bike's fuel screen it may well be pointed at a different bike.
   - Deciding (b) adds a mutation to a spec that currently has none, which is the only argument for (a).

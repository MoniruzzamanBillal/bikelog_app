# 53: Service due-date projection — app half

Status: ⛔ **Not Started.** Written 2026-10-11 from `../../../new Features/02-service-due-dates.md`.
Pairs with `bikelog_server` spec 52, which does the substantive half. Prerequisite for anyone _seeing_ this: `54-seed-service-interval-from-catalog.md`.
Scope: `components/main/MaintenanceLog/RemindersBanner.tsx` and `types/maintenance-log.types.ts`. Two files. No new screen, no new query, no new dependency, no native change, no EAS build.

**What the rider sees:** the reminder row's second line gains a projected date, so `420 km left` becomes `420 km left` / `around 24 Oct`.

---

## §0 Hazards — read before writing code

**H-A — The fields will be absent on most installs for a while, and may be absent forever.**
`utils/envConfig.ts` hardcodes the deployed backend (`https://bikelog-server.vercel.app`), so any build of this app can run against a server that predates server spec 52. Declare both fields **optional and nullable** (`?: number | null`) and guard with `!= null`, never `!== undefined` — the backend returns explicit `null` for unset reminder fields, which is already documented on `TMaintenanceLog` at `types/maintenance-log.types.ts:12-13`. Same discipline as spec 51's `refreshToken` and spec 45a's reminder shape. A missing projection renders the distance alone; it must never render `around Invalid Date` or a stray separator.

**H-B — `numberOfLines={1}` truncates the half you wanted.**
`styles.line` is 12px with `numberOfLines={1}` (`:107`). On a 360dp phone the row's text column is ~190dp after the 18px icon, the two 12px gaps, the panel's 14px horizontal padding and the status pill — roughly 31 characters at that size. `2,400 km left · around 6 Dec` is 28; `18,400 km left · around 24 Dec` is 30. So a single combined line fits _barely_, and when it doesn't **the date is what gets ellipsised**, because it is at the end. §D therefore uses a second `<Text>` rather than appending to the existing string. This is the one real design decision in the spec.

**H-C — Overdue rows must not get a projection.**
Mirrors server spec 52 D4. Even if a future server sends one, the client suppresses it: an overdue service is already past and a date for it reads as though it were still in the future.

**H-D — One edit, two screens. Verify both.**
`RemindersBanner` is rendered at `components/main/Bike/BikeDetailPage.tsx:244` (bike hub, between the stats panel and `EfficiencyAlertBanner`, above the tile grid) and at `components/main/MaintenanceLog/MaintenanceLog.tsx:92` (maintenance screen, between the `N services logged` header row and the log list). The hub one is the point of the feature — it is the screen opened first, so the date arrives unasked. Row height changes in both.

**H-E — Do not compute the projection client-side as a fallback.**
Tempting, since `BikeDetailPage` already holds `/bikes/:bikeId/mileage` in cache. Don't: it creates two sources of truth for the same date, the client's mileage records are **full-tank-only** (`fuelLog.service.ts:163`) and so cover a different subset of riding than the server's fuel-log span, and the two would disagree on the same screen. If the server didn't send a projection, there is no projection.

**H-F — Wording carries real error bars; the hedge is not decoration.**
Server spec 52 H2 and H5 both bias the estimate late, and it floors the day count to compensate. `around 24 Oct` is honest; `24 Oct` is a promise the data cannot keep. Keep "around".

**H-G — Avoid weekend-relative phrasing.**
The plan file suggests copy like _"around this weekend"_. For this rider that is actively misleading: the Dhaka weekend is **Friday–Saturday**, those are plausibly the non-riding days, and the odometer does not advance on them — so a date landing on a Friday is not a day the bike will be ridden to the due reading. Use a date, or a day count. Never a named weekend.

**H-H — The date is always within ~10 days on the projection, ~14 on the calendar clock.**
Server spec 52 settled its horizon at **10 projected days** (its D2), so a projected line reads `around 19 Oct`, never `around 6 Dec`. The `nextDueDate` clock is untouched by that spec and still fires at 14 days, so under D6 a _calendar_ line can legitimately sit up to 14 days out — that asymmetry is deliberate and is documented in spec 52 D2. Either way, any mock, screenshot or copy review using a two-month-out date is describing something the API cannot produce. (The plan file's examples — `2,400 km left · around 24 Oct` — remain impossible even after spec 52; its measurement window, now **4 weeks**, is not the alert horizon.)

---

## §A Decisions

- **D1 — Two lines, not one.** H-B decides it. The row grows ~15px; with one to three reminders that is unnoticeable, and it protects the actionable half from truncation.
- **D2 — A new `getProjectionLine()` beside `getDistanceLine()`, not a rewrite of it.** `getDistanceLine`'s header comment says it mirrors the web client's own `getDistanceLine`; leaving it untouched keeps that claim true and keeps the diff reviewable.
- **D3 — Relative copy under a week, absolute from a week out.** "in about 4 days" is what you act on at close range; "around 24 Oct" is what you act on at two weeks. The switchover is 7 days.
- **D4 — `kmPerDay` is received but not displayed in this spec.** It is in the payload (server D6) and is what a future "based on your last 4 weeks" hint would use. Showing it now would put a third number in a row that already has two.
- **D5 — No change to the pill.** It stays `Upcoming` / `Overdue`. A date in a status pill reads as a deadline, which is exactly the false precision H-F warns about.
- **D6 — When a type has both clocks, the third line prints whichever comes first** (settled 2026-10-11; this answers server spec 52's open question 3, which deliberately left the fix to the client). A service can be due at an odometer reading _and_ on a date — oil at 20,000 km or in 6 months, whichever first. Today `getDistanceLine` prints the km line and never looks at `daysRemaining` once `nextDueOdometer` exists, so a service 5 calendar days from due reads `400 km left` and the nearer deadline is invisible. The fix compares `projectedDueDate` against `nextDueDate` and prints the earlier.
  - **`getDistanceLine` is still not touched** — the comparison lives entirely in `getProjectionLine` (§C), so D2 holds and its "mirrors the web client" header comment stays true. The web client keeps today's behaviour and is one line behind by choice; nothing there breaks (server spec 52 H9).
  - **The two branches are worded differently on purpose.** A projected date is an estimate and keeps the "around" hedge (H-F); `nextDueDate` is a stored fact and gets none — `due 18 Oct`, not `around 18 Oct`. Hedging a real date is the same dishonesty as H-F pointed the other way.
  - **Date-only reminders still get no third line.** Line 2 already reads `18 days left` for them, so the calendar branch would merely repeat it. This line exists to surface the clock the distance line _hides_, so it runs only when `nextDueOdometer` is present.

---

## §B Types

`types/maintenance-log.types.ts`, on `TReminder` (`:54-66`):

```ts
  // ! Server spec 52. Optional AND nullable: `utils/envConfig.ts` points at a deployed
  // ! backend that may predate spec 52, and the backend sends explicit nulls for unset
  // ! reminder fields. Guard with `!= null`. Present only for `upcoming` + distance-based.
  projectedDaysRemaining?: number | null;
  projectedDueDate?: string | null;
  kmPerDay?: number | null;
```

`projectedDueDate` is a **string** here — it is an ISO date over the wire, not a `Date`, same as `nextDueDate` two lines above it.

- [ ] Three fields added with the comment
- [ ] `projectedDueDate` typed as `string | null`, not `Date`

## §C New `getProjectionLine`

`RemindersBanner.tsx`, directly below `getDistanceLine` (so the pair reads together). Two functions: a date parser that cannot throw, and the line itself.

```ts
/**
 * ! H-A: a server predating spec 52 omits these fields, and a malformed string must never
 * ! reach `format` and render "Invalid Date". One guard, shared by both branches below.
 */
function toDate(value?: string | null): Date | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The due date of whichever clock comes first, or null when there is nothing honest to say.
 * ! Server spec 52 sends the projection only for `upcoming` distance-based reminders, and
 * ! only when the bike has enough fuel history. Absent is the normal case, not an error — H-A.
 * ! D6: a type can be due by odometer AND by date; the earlier one is printed. The calendar
 * ! date is a stored fact and is NOT hedged — the projected one is an estimate and is.
 */
function getProjectionLine(r: TReminder): string | null {
  if (r?.status === "overdue") return null; // H-C

  // ! D6: date-only reminders already say "18 days left" on line 2 — repeating it here adds
  // ! nothing. This line exists to surface the clock the distance line hides.
  if (r?.nextDueOdometer == null) return null;

  const projected = toDate(r?.projectedDueDate);
  const calendar = toDate(r?.nextDueDate);

  // ! D6: `<=` so an exact tie resolves to the calendar date — a fact beats an estimate.
  if (calendar && (!projected || calendar.getTime() <= projected.getTime())) {
    const days = r?.daysRemaining;
    if (days != null) {
      if (days <= 0) return "due today"; // defensive: the server calls this overdue
      if (days === 1) return "due tomorrow";
      if (days < 7) return `due in ${days} days`; // D3, unhedged per D6
    }
    return `due ${format(calendar, "d MMM")}`;
  }

  if (!projected || r?.projectedDaysRemaining == null) return null; // H-A: `!= null`

  const days = r?.projectedDaysRemaining;

  // ! H-F: the hedge is load-bearing. The server floors the day count because
  // ! currentOdometer lags reality, so this is an early estimate, not a date.
  if (days <= 0) return "due any day now";
  if (days === 1) return "around tomorrow";
  if (days < 7) return `in about ${days} days`; // D3
  return `around ${format(projected, "d MMM")}`;
}
```

Needs `import { format } from "date-fns";` — already a dependency, used the same way in `BikeDetailPage.tsx:25`.

- [ ] `toDate` added, and used for **both** dates — no bare `new Date(...)` reaching `format`
- [ ] `getProjectionLine` added, with the D6 and H-F comments kept
- [ ] `date-fns` `format` imported
- [ ] The `nextDueOdometer == null` early return present — without it, date-only rows grow a duplicate third line (V9 catches this)
- [ ] Calendar branch unhedged, projection branch hedged — not harmonised into one wording

## §D Render it

Replace the single text node at `:103-110`:

```tsx
<View style={styles.textCol}>
  <Text style={styles.name} numberOfLines={1}>
    {getTypeName(reminder?.maintenanceType)}
  </Text>
  <Text style={styles.line} numberOfLines={1}>
    {getDistanceLine(reminder, currentOdometer)}
  </Text>
  {/* ! H-B: its own line, not appended — a combined line ellipsises the date away on a
      ! narrow phone, losing the only part the rider acts on. */}
  {!!getProjectionLine(reminder) && (
    <Text style={styles.projection} numberOfLines={1}>
      {getProjectionLine(reminder)}
    </Text>
  )}
</View>
```

Call it once into a local `const projection = getProjectionLine(reminder);` inside the `map` callback rather than twice — the above is written out for clarity, not as the shape to paste.

New style beside `line` (`:143-147`):

```ts
  projection: {
    fontSize: 11.5,
    color: tint(COLORS.textLight, 0.85),
    fontVariant: ["tabular-nums"],
  },
```

`tint` is already imported (`:7`). `textCol` is `flex: 1` inside a `alignItems: "center"` row, so the panel simply grows taller — no other style needs touching.

Resulting row:

```
┌─────────────────────────────────────────────┐
│ 🕐  Engine Oil                    [Upcoming]│
│     420 km left                             │
│     around 24 Oct                           │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 🕐  Air filter                    [Upcoming]│
│     900 km left                             │
│     due 18 Oct                              │   ← D6: the calendar clock is the earlier one
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ⚠  Chain lube                     [Overdue]│
│     340 km past due                         │   ← H-C: no third line
└─────────────────────────────────────────────┘
```

Note the middle row: `900 km left` is far past the 10-day projected horizon, so it is on screen only because its **date** clock fired — and before D6 its third line would have been absent while line 2 said nothing about the deadline that put it there.

- [ ] Conditional third line added, computed once
- [ ] `styles.projection` added
- [ ] Nothing else in the component touched — no change to sorting, keys, the pill, or `getDistanceLine`

## §E Copy table

| Case | Shown |
| --- | --- |
| status `overdue` | _(line omitted — H-C)_ |
| no `nextDueOdometer` (date-only reminder) | _(omitted — D6; line 2 already speaks in days)_ |
| distance clock, but no projection and no `nextDueDate` | _(omitted — H-A; the normal state against a pre-52 server)_ |
| **projection is the earlier clock**, `projectedDaysRemaining` 0 | `due any day now` |
| … 1 | `around tomorrow` |
| … 2–6 | `in about 4 days` |
| … 7–10 | `around 24 Oct` |
| **`nextDueDate` is the earlier clock**, `daysRemaining` 1 | `due tomorrow` |
| … 2–6 | `due in 4 days` |
| … 7–14 | `due 24 Oct` |

Never: a named weekend (H-G), an unhedged _projection_ (H-F), an "around" on a stored `nextDueDate` (D6 — that hedge is a lie in the other direction), a time of day, or a date more than ~14 days out (H-H).

---

## Test plan

`tsc` is trustworthy for this spec without booting the dev server — spec 51a's stale `.expo/types/router.d.ts` trap only bites when files under `app/` are added or removed, and this spec touches neither.

| #   | Scenario                                                              | Expected                                                                                                                                  |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | `npx tsc --noEmit`                                                    | Clean                                                                                                                                     |
| V2  | `yarn lint`                                                           | No new warnings                                                                                                                           |
| V3  | `npx expo export --platform web`                                      | Bundles (20 routes as of spec 51)                                                                                                         |
| V4  | Against a server **without** spec 52                                  | Banner identical to today — two lines, no third. This is the default state until the server deploys                                       |
| V5  | Against a server with spec 52, upcoming distance reminder ~9 days out | Third line reads `in about 9 days`… **no** — 9 ≥ 7, so `around <date>`. Confirm the 7-day boundary both ways (6 → relative, 7 → absolute) |
| V6  | `projectedDaysRemaining: 0`                                           | `due any day now`                                                                                                                         |
| V7  | `projectedDaysRemaining: 1`                                           | `around tomorrow`                                                                                                                         |
| V8  | Overdue reminder with projected fields present                        | No third line (H-C)                                                                                                                       |
| V9  | Date-based reminder (`nextDueDate` only)                              | Unchanged — `18 days left`, no third line                                                                                                 |
| V10 | `projectedDueDate: "not-a-date"`                                      | No third line, no crash (H-A guard)                                                                                                       |
| V11 | Bike hub (`BikeDetailPage:244`) at 360dp width                        | Three lines, no truncation, tile grid below not pushed off-screen                                                                         |
| V12 | Maintenance screen (`MaintenanceLog:92`)                              | Same rows, same text, log list below unaffected (H-D)                                                                                     |
| V13 | Three reminders at once, one overdue                                  | Overdue sorts first (unchanged `:82-84`), mixed two-line and three-line rows align acceptably                                             |

| V14 | **D6**: both clocks — `nextDueDate` in 5 days, projection in 9 | `due in 5 days` — the calendar clock wins, unhedged |
| V15 | **D6**: both clocks — `nextDueDate` in 12 days, projection in 8 | `around <date>` — the projection wins, hedged |
| V16 | **D6**: both clocks — `nextDueDate` in 11 days, **no** projection sent (900 km out, past the 10-day horizon) | `due <date>` — the row is on screen because of its date clock and now says so. This is the case D6 exists for |
| V17 | **D6**: both clocks landing on the same day | `due <date>` — the tie resolves to the calendar date (`<=`) |

V5–V10 and V14–V17 need either a server with spec 52 or a temporary hardcoded reminder object; V11–V13 need a device or `expo start --web` at phone width. V1–V3 are claimable from here.

## Settled questions (developer, 2026-10-11)

All three were answered before implementation. Two resolve to "ship as specced, with a named fallback if the device disagrees" — the fallback is written down here so it is not re-derived at V11.

1. **Tone of the projection line — ship dim, as §D specs it (`tint(COLORS.textLight, 0.85)`).** The row's `tone` (`:89`) already paints the icon, the panel border and the pill; a fourth amber element turns a three-reminder hub into warning stripes and the colour stops carrying information.
   - **If it reads as ignorable on device (V11), fix it with hierarchy, not colour:** give the date line the 12px `styles.line` size and drop the km line to 11.5px dim — i.e. swap the two. That promotes the actionable half without adding a fourth amber element. **Do not** reach for `tint(tone, 0.85)`.
2. **Hub reminder count — ship uncapped.** Every reminder renders on both screens, exactly as today.
   - **If V11 looks cramped, add a `maxRows` prop (the hub passes `2`) plus a `+N more` row tapping through to the maintenance screen — not nearest-only.** One row cannot represent two overdue services, and the existing overdue-first sort (`:82-84`) is no substitute for saying there are others. A cap is a prop change on a component with two call sites (H-D), which is exactly why it is a fallback rather than a guess made up front.
3. **The dashboard/garage extension — keep it out, and do not write its spec yet.** It stays separate work, and it is a _server_ change first: reminders are per-bike (`GET /api/bikes/:bikeId/reminders`), so a garage listing N bikes would need N requests to draw one line. It needs a multi-bike summary endpoint or a `nearestReminder` on the bikes-list response, not a tweak to this component.
   - **Gate: wait until specs 52 and 53 are live and the projected dates have proven accurate on real riding.** Server spec 52 H2 and H5 both bias the estimate late; if the dates come out laggy or jumpy, that is not a number to fan out across the garage screen as well.

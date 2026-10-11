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

**H-H — Server spec 52's horizon means the date is always within ~14 days.**
Reminders only appear once the projection is ≤14 days, so this line will read `around 19 Oct`, never `around 6 Dec`. Any mock, screenshot or copy review using a two-month-out date is describing something the API cannot produce. (The plan file's examples — `2,400 km left · around 24 Oct` — remain impossible even after spec 52; its 8 weeks is the _measurement window_, not the alert horizon.)

---

## §A Decisions

- **D1 — Two lines, not one.** H-B decides it. The row grows ~15px; with one to three reminders that is unnoticeable, and it protects the actionable half from truncation.
- **D2 — A new `getProjectionLine()` beside `getDistanceLine()`, not a rewrite of it.** `getDistanceLine`'s header comment says it mirrors the web client's own `getDistanceLine`; leaving it untouched keeps that claim true and keeps the diff reviewable.
- **D3 — Relative copy under a week, absolute from a week out.** "in about 4 days" is what you act on at close range; "around 24 Oct" is what you act on at two weeks. The switchover is 7 days.
- **D4 — `kmPerDay` is received but not displayed in this spec.** It is in the payload (server D6) and is what a future "based on your last 8 weeks" hint would use. Showing it now would put a third number in a row that already has two.
- **D5 — No change to the pill.** It stays `Upcoming` / `Overdue`. A date in a status pill reads as a deadline, which is exactly the false precision H-F warns about.

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

`RemindersBanner.tsx`, directly below `getDistanceLine` (so the pair reads together):

```ts
/**
 * The projected due date, or null when there is nothing honest to say.
 * ! Server spec 52 only sends this for `upcoming` distance-based reminders, and only when
 * ! the bike has enough fuel history. Absent is the normal case, not an error — see H-A.
 */
function getProjectionLine(r: TReminder): string | null {
  if (r?.status === "overdue") return null; // H-C
  if (r?.projectedDaysRemaining == null) return null; // H-A: `!= null`, not undefined
  if (r?.projectedDueDate == null) return null;

  const days = r?.projectedDaysRemaining;

  // ! H-F: the hedge is load-bearing. The server floors the day count because
  // ! currentOdometer lags reality, so this is an early estimate, not a date.
  if (days <= 0) return "due any day now";
  if (days === 1) return "around tomorrow";
  if (days < 7) return `in about ${days} days`; // D3

  const due = new Date(r?.projectedDueDate);
  if (Number.isNaN(due.getTime())) return null; // H-A: never render Invalid Date
  return `around ${format(due, "d MMM")}`;
}
```

Needs `import { format } from "date-fns";` — already a dependency, used the same way in `BikeDetailPage.tsx:25`.

- [ ] `getProjectionLine` added
- [ ] `date-fns` `format` imported
- [ ] `NaN` date guard present — a malformed string from a future/older server must not reach `format`

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
│ ⚠  Chain lube                     [Overdue]│
│     340 km past due                         │   ← H-C: no third line
└─────────────────────────────────────────────┘
```

- [ ] Conditional third line added, computed once
- [ ] `styles.projection` added
- [ ] Nothing else in the component touched — no change to sorting, keys, the pill, or `getDistanceLine`

## §E Copy table

| `projectedDaysRemaining` | Shown                     |
| ------------------------ | ------------------------- |
| `null` / absent          | _(line omitted entirely)_ |
| 0                        | `due any day now`         |
| 1                        | `around tomorrow`         |
| 2–6                      | `in about 4 days`         |
| 7–14                     | `around 24 Oct`           |
| any, status `overdue`    | _(line omitted — H-C)_    |

Never: a named weekend (H-G), a bare date with no hedge (H-F), a time of day, or a date more than ~14 days out (H-H).

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

V5–V10 need either a server with spec 52 or a temporary hardcoded reminder object; V11–V13 need a device or `expo start --web` at phone width. V1–V3 are claimable from here.

## Open questions

1. **Tone of the projection line.** Dim grey (as specced) treats it as supporting detail; `tint(tone, 0.85)` — amber for upcoming — treats it as the actionable part. The pill already carries the tone, which is the argument for dim. Decide on a device.
2. **Should the hub show only the _nearest_ reminder?** With three reminders the hub now spends three 3-line panels above the tile grid. If that crowds the screen, the hub variant could cap at one or two rows while the maintenance screen shows all. Out of scope here; note it if V11 looks cramped.
3. **The dashboard/garage extension** from the plan file — surfacing the nearest due item without opening a bike — stays a separate spec. Different screen, own layout questions.

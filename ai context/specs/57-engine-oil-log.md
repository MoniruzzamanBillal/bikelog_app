# 57: Engine oil log — the app half

Status: ✅ **Implemented 2026-10-18** — written, revised and built the same day, once the developer answered all five open questions. **§A–§H are complete; §K was deliberately not implemented here (it is `bikelog_server` work).** Verified to the static floor only: `yarn lint` clean, `npx tsc --noEmit` clean after the H-I dev-server boot, `npx expo export --platform web` bundling `/bikes/[bikeId]/engine-oil`. **H-A is still unsatisfied — the deployed API answers 404 on `/engine-oil-logs/status`, so V1–V25 have not run.** One copy decision was made beyond the plan's letter: the `unknown` status pill reads **"No due date"**, not "No data", because §B row 1 means `unknown` only ever reaches the pill on a change that exists with no interval.

Originally: App half of `bikelog_server` spec 54 and the mirror of `bikelog_client-web-` spec 33 ("the web frontend is working fine, now I want this feature in the app"). Requested directly by the developer (2026-10-18) after testing the web screen.

**Their answers, folded in below and recorded in full at the end of this file: (1) yes — add the fourth hub mini-stat; (2) no — no time-based oil interval; (3) show the interval on every row, and make the card text a bit smaller; (4) fix the AI assistant; (5) skip.** D7 flipped, D11 and §B's row layout changed, and **D14, D15 and §K are new because of them.**

**Hard prerequisite, and it is not satisfied today: `bikelog_server` spec 54 is implemented and its production data migration has already run, but the server is NOT deployed.** See H-A — this is the single most important paragraph in this file, because the gap is already visible on the developer's phone and this spec cannot be exercised at all until it closes.

**What this adds, in one line:** an Engine oil screen that answers the question the trip-B meter answers today — _how far have I run on this oil, and when is the next change due_ — plus the removal of engine oil from the Maintenance screen, because the data it used to live in has already moved.

Scope: one new route file, one new component folder (4 files), one new type file, one new hook, and **five** small edits to existing files (hub tiles, the Settings odometer panel's invalidation list, the spending source union, the maintenance form, the maintenance card). Plus §F's removals, which touch four more, and §K — which is **server** work and becomes a `bikelog_server` spec of its own. **No new dependency** — `date-fns`, `react-native-paper`, react-query, `MaterialCommunityIcons` and the whole `components/main/shared/*` library already cover it. No EAS build is needed for the code itself; shipping it to the phone is a separate matter (see §J).

---

## §0 Hazards — read before writing code

**H-A — The server's data has already moved, but the server is not deployed. There is a live regression on the phone right now, and it is not caused by this spec.**
`bikelog_server` spec 54's rollout ran `--apply` **and** `--finalize` against production on 2026-10-18: 8 oil changes (৳5,125.00) were copied into `engine_oil_logs` and the 8 source rows in `maintenance_logs` were soft-deleted. But `bikelog_server`'s `dev/monir` is **4 commits ahead of `origin/master`** (`598150e`, `d99b730`, `5bd6a7e`, `6c39de9`) and `deploy.yml` only deploys on push to `master`. `utils/envConfig.ts` points this app at `https://bikelog-server.vercel.app`. So as things stand, the deployed API:

- has **no `/bikes/:bikeId/engine-oil-logs` routes at all** — every request in §C 404s;
- no longer returns the 8 oil changes from `/maintenance-logs`, because they are soft-deleted — **they have disappeared from the app's Maintenance screen**;
- no longer emits an engine-oil **reminder**, because §E's re-sourcing is in the undeployed code — so `RemindersBanner` has silently lost it on both the hub and the Maintenance screen;
- no longer counts that ৳5,125 in **Spending**, because `computeSpendingForRange`'s fourth query is also undeployed.

Verify before starting, don't take this file's word for it:

```bash
git -C bikelog_server log origin/master..HEAD --oneline      # expect 0 before building this
curl -s -o /dev/null -w '%{http_code}\n' https://bikelog-server.vercel.app/api/bikes/x/engine-oil-logs/status   # 401, not 404
```

A `401` means the route exists and `authCheck` rejected the anonymous call — that is the green light. A `404` means the route is not deployed. **Do not implement against a server returning 404; and do not build an EAS binary against one either**, or the tile added in §E leads to a dead screen on a build that cannot be hot-fixed.

**H-B — Do not compute the projected date in the app. The server computes it.**
Spec 53 H-E's rule: two sources of truth for one figure disagree on the same screen, and the disagreement is invisible until the rider reports it. `GET /engine-oil-logs/status` returns `projectedDaysRemaining`, `projectedDueDate` and `kmPerDay` ready to render. Render them. **Note the contrast with spec 55**, where client-side arithmetic _is_ allowed — there the server computes no tank forecast at all, so only the input (`kmPerDay`) is duplicated, never a projection. Here the server computes the whole projection, so the app computes nothing. Do not reach for `useTankForecast`'s `computeKmPerDay` on this screen.

**H-C — `projectedDueDate` is the one date on this screen that is a real instant, not a date-only field. `formatApiDate` is wrong for it.**
`utils/formatApiDate.ts` exists because the backend's _date-only_ fields serialise as UTC-midnight instants, and `parseApiDate` strips the time portion to dodge the timezone shift. `changeDate` is one of those — use `formatApiDate(changeDate, "d MMM")`. But `projectedDueDate` is built as `new Date(Date.now() + days * DAY_MS)` (`engineOilLog.service.ts:429`), i.e. a genuine instant with a real time-of-day. Pushing it through `parseApiDate` reads its **UTC** calendar day, which is one day behind Dhaka local between 00:00 and 06:00 local. Use the `toDate()` + `format()` pair `RemindersBanner.tsx:49-53` already uses for exactly this field, and keep its `Number.isNaN` guard.

**H-D — The oil-type query key in this app is `["engine-oil-types"]`, kebab-case. The web's is `["engineOilTypes"]`. Copying the web's key splits the cache.**
`SettingsCatalog.tsx:112-119` owns `["engine-oil-types"]` and invalidates exactly that key after a create/edit/delete; `MaintenanceLogFormModal.tsx:43-47` and `MaintenanceLog.tsx:45-48` read it. A new form using a camelCase key would fetch the catalog a second time **and never see a type the rider just added in Settings**. Reuse `["engine-oil-types"]` verbatim. (The same applies in reverse to the new keys this spec introduces: pick them once, in §C, and use them in all four places.)

**H-E — `kmRemaining` from `/status` is signed. Do NOT reuse `getDistanceLine`.**
`RemindersBanner.tsx:24-43` reconstructs the overshoot from `currentOdometer - nextDueOdometer` because the **reminders** endpoint clamps `kmRemaining` to `0` (`Math.max(0, …)`). The **status** endpoint deliberately does not clamp (`engineOilLog.utils.ts`'s `evaluateOilDue` returns the signed value, server §D). Copying that banner's logic here double-counts the overshoot. On this screen: `kmRemaining < 0` → `${Math.abs(kmRemaining).toLocaleString()} km past due`, and nothing more.

**H-F — Four response states, and three of them have no date. None may render `NaN`, `Invalid Date` or an empty box.**
`status: "unknown"` with `lastChange: null` (no oil log yet); `lastChange` present but **no interval** (one of the 8 imported rows whose source maintenance log had none — server H7); a present log with **no usable riding rate** (fewer than 2 fuel logs in 28 days, or under 100 km — the projection fields are simply absent); and **overdue** (the server omits the projection on purpose). §B fixes the copy for all four. The server **omits** these fields rather than nulling them, but declare them `?: number | null` and guard with `!= null` anyway — the house rule from `types/maintenance-log.types.ts:14-15`, because `utils/envConfig.ts` points at a deployed backend whose version this app cannot know.

**H-G — Do not render `RemindersBanner` on the Engine oil screen.**
Once the server is deployed, server spec 54 §E emits an engine-oil reminder in the _existing_ reminder shape, sourced from the new table. It already renders unchanged on the hub (`BikeDetailPage.tsx:244`) and on Maintenance (`MaintenanceLog.tsx:92`). Putting the banner on the oil screen too would show the rider the same overdue oil twice, six lines apart, in two different visual languages. The status card **is** this screen's alert surface. Reminders stay the hub's job.

**H-H — The status card carries a tone; `TankForecastCard` deliberately does not. That divergence is intentional — don't harmonise them.**
Spec 55 D7 gave the tank card no tone colour, no icon badge and no status pill, because it is a forecast and not an alert. The oil status card **does** get a pill, because the server returns a real four-valued `status` and `overdue` is a genuine alert. The two cards will sit on sibling screens looking different on purpose. Record it here so a later "consistency" pass does not strip the pill.

**H-I — Adding `app/bikes/[bikeId]/engine-oil.tsx` makes `tsc --noEmit` stale until the dev server is booted.**
Spec 51a: `.expo/types/router.d.ts` is generated and gitignored, and **only the dev server regenerates it** — `npx expo export` does not. A new file under `app/` therefore makes the typed-route union wrong, and `npx tsc --noEmit` will either fail on a legitimate path or pass on a typo. Boot it once (`CI=1 timeout 75 npx expo start --port 8099`) before trusting that check. The hub's own drill-down pushes stay string-based with `as never` (`BikeDetailPage.tsx:253-257`) for exactly this reason — follow that, don't "fix" it to a typed push.

**H-J — The quick-fill copies what repeats, never what changed.**
Spec 52's rule. Carry the oil type, interval, quantity, filter flag, service centre and cost; **never** the odometer reading and never the date. Those two are the whole reason the rider opened the form, and a prefilled odometer is a wrong odometer that looks right — it would also sail past the server's sequence check as a same-reading duplicate (`assertOilOdometerInSequence` allows equal readings).

**H-K — Seed the interval, then leave it alone. Three rules, and the second and third are the ones that get missed.**
The developer settled this on the server side: the interval set on the oil type in Settings pre-fills the field and the rider may edit it. So:

1. **Create, type picked or changed** → set the interval to that type's `suggestedIntervalKm`. There is always one — `engineOilType.validation.ts` makes it required and positive, and `SettingsCatalog.tsx:335` enforces it in this app too.
2. **The rider typed something** → never overwrite it on a later re-render. Track the seed's own last value in a ref and only replace a value still equal to it. This is spec 52 §G's and spec 54 D1's seeded-vs-typed distinction; **spec 54a is a defect report about the mirror-image failure**, a stale seed left standing after the suggestion that produced it disappeared. Both halves apply here, so fold "no suggestion" into the seed path as `""` rather than returning early — 54a's fix, not 54's original code.
3. **Edit mode → seed from the log's own stored `intervalKmUsed`, never from the catalog.** The stored value is what this log's due point was computed from (server H6). Re-seeding an old log from today's catalog would silently move its due point on save, when the rider only opened the modal to fix a typo in the cost. If they _do_ change the oil type while editing, rule 1 applies and the new suggestion is offered, visibly, in the box. `MaintenanceLogFormModal.tsx:105` and `:128` already encode "create only" (`if (!open || log) return;`) — keep that guard.

**H-L — Read the status from its own query, never from the paginated list.**
The list query keys on `page`, so on page 2 `result[0]` is a months-old change. Deriving "your last change" from it makes the card move as the rider pages through history — spec 55 H-D, one screen over, and spec 52 H-B before it. `/status` is a separate endpoint and gets a separate query key. Same reason the quick-fill's source is its own `?limit=1` query and not the list.

**H-M — Server-derived fields never go in a mutation payload.**
`nextDueOdometer`, `kmSinceChange`, `percentUsed`, `kmOnThisOil` and `costPerKm` are read-only. `nextDueOdometer` is absent from **both** server schemas (`engineOilLog.validation.ts`) and sending it is silently dropped, which is worse than an error. The form submits exactly: `oilType`, `odometerReading`, `intervalKmUsed`, `quantityLiters`, `oilFilterChanged`, `cost`, `changeDate`, `serviceCenter`, `notes`.

**H-N — The oil-type dropdown can legitimately be empty, and `oilType` is REQUIRED here (unlike on the maintenance form).**
Catalogs are per-user and nothing is seeded (server specs 42/46, app spec 48). A new user's oil-type list is empty and the create form is then unusable — same wall spec 48 §C hit. `MaintenanceLogFormModal.tsx:297-300` answers it with a one-line hint; do the same, but note the two differ: there the oil select was labelled `Oil Type (optional)`, here `createEngineOilLogSchema` **requires** it (`.min(1, "Engine oil type is required")`), so an empty catalog is a hard block and the hint must point at Settings → Engine oil types rather than letting the rider submit.

**H-O — The AI assistant can no longer see any oil change, and its first suggested prompt asks about one. The developer has asked for this to be fixed — §K, and it is server work.**
`components/main/AiAssistant/AiAssistant.tsx:17` offers _"When is my next oil change due?"_ as a starter chip. The server's bike context reads `prisma.maintenanceLog` only (`ai.service.ts:40`, `:167`) — it has no knowledge of `engine_oil_logs`. After the import, that question gets a confidently wrong answer ("no oil change on record"), and `ai.service.ts:38-42`'s log count — which gates the cached-insight refresh — dropped by 8 for this bike. **Neither server spec 54 nor web spec 33 noticed this.** Settled 2026-10-18: _"fix this"_. It is still **not app work** — do not work around it in this repo, and nothing in §A–§H is blocked on it. §K specifies the fix in full, to be lifted into `bikelog_server/context/specs/55-ai-context-engine-oil.md` and shipped with the same push that unblocks H-A.

**H-P — `SettingsCatalog.tsx:267`'s delete copy becomes wrong the moment the server deploys.**
It promises _"Maintenance logs that already used it keep their history."_ Server §G widened the `409` in-use guard to count `engine_oil_logs` as well, so deleting an oil type that any oil change references now **fails** rather than soft-deleting. The dialog must stop promising a delete it will not get. One string.

---

## §A Decisions

- **D1 — Route `app/bikes/[bikeId]/engine-oil.tsx`, a two-line re-export; components in `components/main/EngineOilLog/`.** Matches every other bike-scoped screen (`maintenance-logs.tsx` is the template). The segment matches the web's URL and the server module; the folder name matches the module, not the segment. **No `new.tsx` sub-route** — the fuel logs folder only has one because of the deep-link screen left over from the widget deleted in spec 36, and nothing links into oil from outside.
- **D2 — Status card on top, log list below, one screen.** Not a separate forecast screen: the forecast is the reason to open this, and the list is the evidence behind it. Exactly `FuelLog.tsx`'s shape with `TankForecastCard` at the top (`FuelLog.tsx:127`).
- **D3 — Cards, paginated, 10 per page — `FuelLog.tsx`'s pattern, not `MaintenanceLog.tsx`'s.** Maintenance is a fixed `page=1&limit=20` with no pager; fuel is a real pager. Oil follows fuel, because §G's `costPerKm` depends on the server fetching the off-page neighbour and the whole point of that work is that the page boundary stays invisible. Reuse `FuelLog.tsx`'s pager block verbatim (`:150-197`).
- **D4 — One form modal for create and edit**, `MaintenanceLogFormModal`'s structure: `Portal` + `Modal` + `KeyboardAwareScrollView`, plain `useState` fields, `DECIMAL_REGEX` guards, `Toast.show` on each failure, `FormActions` at the bottom. **This app has no react-hook-form and no zod** — the web's `schema/engine-oil-log.schema.ts` has no counterpart here and must not be invented. Validation is the inline guard chain of `MaintenanceLogFormModal.tsx:207-223`.
- **D5 — The receipt photo is on the card, not in the form.** `FuelLogCard.tsx:163-170`'s `ImagePickerField` with `label="Receipt"`, `size={64}`, driven by `usePut`/`useDelete` against `/bikes/:id/engine-oil-logs/:logId/image`. Keeps create a single request, as it is for fuel and maintenance.
- **D6 — A hub tile, `oil` icon, straight after `Fuel Logs`.** `MaterialCommunityIcons` already has `oil` and `SettingsCatalog.tsx:569` uses it for the oil-types panel, so the icon vocabulary is already set. It belongs beside fuel, not after Documents — those are the two the rider opens weekly. The grid becomes 10 tiles at `width: "31.7%"`, i.e. three full rows plus one tile alone on a fourth; `flexWrap` already handles it and the tiles are left-aligned, so nothing breaks. Accepted.
- **D7 — The hub's mini-stat strip gains a fourth stat, "On this oil" (settled: yes).** Web D9 added it beside Avg mileage on a 1440px row; the developer wants it here too. This app's strip is three `flex: 1` columns in a ~328dp-wide panel at 360dp (`BikeDetailPage.tsx:220-241`), so a fourth leaves each ~78dp — which `Avg mileage` at 12px already nearly fills. **It therefore comes with a layout change, not just a stat:** `flexWrap: "wrap"` on `miniStats` plus `minWidth: 74` on `miniStat`, so the strip degrades to **2×2** at narrow widths instead of ellipsising four labels. The web's oil-name sub-label is **dropped** — there is no room for it, and the oil screen one tap away says which oil it is. §E item 5, now mandatory rather than conditional. V24 is what settles whether the 2×2 reads well; if it does not, the fallback is to drop `Lifetime` — the least time-sensitive of the four — rather than this one.
- **D8 — Engine oil leaves the Maintenance screen completely.** The developer settled this for the web ("no, remove it") and the reason is stronger here: `--finalize` has already run, so there are no live oil maintenance logs left to display, while the picker is still live and can create **new** split-brain data every time it is used. §F. Four files, UI-only — `requiresOilType` and `oilTypeId` stay in the database, in the API and in `types/` (the import selector reads one; reversibility needs the other).
- **D9 — Removing the oil select also removes half of spec 54's interval seeding, and that is correct.** Spec 54 H-C made the oil type's `suggestedIntervalKm` outrank the maintenance type's `defaultIntervalKm` on the maintenance form. With no oil select there, `selectedOilType` is gone and `MaintenanceLogFormModal.tsx:107-109` collapses to `selectedMaintType?.defaultIntervalKm` alone, with `selectedOilType` dropped from the effect's dependency array. The oil-type suggestion does not vanish — it moves to the new form, where it is the **only** source. Spec 54's V-rows covering the oil-outranks-default case become rows of **this** spec instead (V5 below). Call this out in the commit, or it reads as a regression of 54.
- **D10 — Two oil-only extras, both ported: per-change cost-per-km (§G) and a "Same as last change" quick-fill (§H).** The developer accepted both for the web; the app already has the quick-fill machinery (`useFuelLogSeed`, spec 52) so the second is cheap. Either can be dropped at implementation time without disturbing the rest.
- **D11 — The interval shows on every row, on a line of its own, and a missing `kmOnThisOil` is an omitted line rather than a `—` (settled: "show").** The web prints `—` in its ৳/km cell because it has a table column to keep aligned (its H-W12); a card has no column, so there is nothing to align and a dash is pure noise. The developer asked for the interval on past changes too, which makes the row **two short lines instead of one long one**: `Interval 2,400 km` unconditionally, then `2,350 km on this oil · ৳0.50/km` only when the period is closed. Two lines of ≤32 characters beat one of 42 — at 360dp the card's left column is roughly 224dp, and a single combined line would be the one thing on this screen at real risk of truncating. The newest change simply stops after the interval line; the status card directly above is already saying how far the current oil has run. The interval line is itself omitted only when the row genuinely has no interval — one of server §H's imported rows.
- **D12 — No notification work, and no dashboard/garage surface.** Server D11 keeps the weekly cron fuel-only. The oil status stays on the hub (via the existing reminder) and on its own screen.
- **D14 — The card text drops one notch, and one notch only (settled: "a bit small, not very small").** Both cards on this screen run slightly tighter than the templates they are copied from, with an explicit floor so a later pass does not keep shrinking them:

  | Text | Template | Here |
  | --- | --- | --- |
  | row · date | `FuelLogCard` 12 | **11.5** |
  | row · tag text | 10.5 | **10** |
  | row · cost | 18 | **16** |
  | row · cost detail | 13 | **12** |
  | row · odometer line | 12 | **11.5** |
  | row · interval + ৳/km lines | — (new) | **10.5** |
  | card · heading kicker | `TankForecastCard` 10 | **10** — unchanged, already the floor |
  | card · headline | 13.5 | **13** |
  | card · sub-line | 11 | **10.5** |
  | card · audit lines | 10 | **10** — unchanged, 55a's measured floor |
  | card · nudge | 10.5 | **10** |

  **Nothing goes below 10px**, and `cost` at 16 stays the largest thing on the row so the card keeps a focal point. Spec 55a took the tank card down to a 9.5px footnote and that was the floor it found on a real device — this screen has no footnote and should not acquire one. "Not very small" means this table is the whole change: no second pass down at review time without a device look (V21).
- **D15 — Oil falls due on distance only. Time-based intervals are dropped, not deferred (settled: no).** `EngineOilType` keeps `suggestedIntervalKm` and gains nothing, the log gains no `nextDueDate`, §B's card has one clock rather than two and §D's form has no second interval field. This was the one question genuinely cheaper to answer before building than after; the answer is what this plan already assumed, so nothing moves. If it is ever revisited it is a server migration first (`EngineOilType.suggestedIntervalDays` + `EngineOilLog.nextDueDate`), then a dual-clock rule on the card of exactly the shape `RemindersBanner.tsx:62-93` already implements for maintenance — earlier clock wins, calendar date unhedged, projection hedged.
- **D13 — Spending needs one type edit and nothing else.** The `Engine Oil` category flows through `SpendingSummaryView`'s breakdown automatically — it sorts whatever categories arrive (`SpendingSummaryView.tsx:22`) and there is no fixed category→colour map to extend. `TSpendingRecordSource` gains `"oil"` **and** `"accessory"`, both of which this app's copy is missing (`types/spending.types.ts:21`); nothing in the app switches on it, so this is type hygiene, not behaviour (server H11).

---

## §B The screen

```
← Hornet 2.0          Engine oil
                      Hornet 2.0

┌────────────────────────────────────────────┐
│ ENGINE OIL                     [On track] │
│ Next change ~ 6 Nov                        │
│ in 19 days · ~850 km to go                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                   │
│ 1,550 / 2,400 km on this oil · 65%         │
│ since 12 Aug · Motul 7100 · 43.2 km/day    │
└────────────────────────────────────────────┘

  7 changes                            [+ Add]

┌────────────────────────────────────────────┐
│ 12 Aug 2026  [Motul 7100] [Filter]   ⋮    │
│ ৳1,250   1.0 L                     ┌────┐ │
│ 18,400 km · City Bike Care         │ img│ │
│ Interval 2,400 km                  └────┘ │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ 04 Jun 2026  [Motul 7100]            ⋮    │
│ ৳1,180   1.0 L                     ┌────┐ │
│ 16,050 km · City Bike Care         │  + │ │
│ Interval 2,400 km                  └────┘ │
│ 2,350 km on this oil · ৳0.50/km           │
└────────────────────────────────────────────┘
```

`ScreenHeader title="Engine oil" subtitle={bike?.nickname} backLabel={bike?.nickname ?? "Back"}`, a `ScrollView` with `RefreshControl`, `styles.page` copied from `FuelLog.tsx:206-212`. The count row is `{totalCount} changes` + the `Add` button, with the quick-fill button beside it (§H).

### The status card — `OilStatusCard.tsx`

A `Panel`, styled on `TankForecastCard.tsx` and carrying spec 55a's compaction lessons (which were learned on a device: headline ≤18 characters, audit lines ≤42 characters at 10px, four to six text rows total), at **D14's type scale**. The one deliberate difference is the status pill (H-H), via `toneStyle` from `StatusBadge`: `ok` → `success`, `upcoming` → `warning`, `overdue` → `danger`.

| State                               | Card                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lastChange: null`                  | **No card at all** — return `null`, exactly as `TankForecastCard.tsx:109` does for `unavailable`. The list's own `EmptyState` below carries the icon, the explanation and the Add button; two empty boxes stacked is worse than one. (Divergence from web §B's `StateCard`, which has no equivalent idiom here.) |
| `lastChange`, no `intervalKm`       | headline `1,550 km on this oil`, no bar, audit line `since 12 Aug · Motul 7100`, then a muted nudge: `Set an interval on this change to get a due date.` Tapping the nudge is **not** wired — the rider edits the row (one of the 8 imported changes).                                                           |
| `lastChange`, interval, **no rate** | headline `~850 km to go` — promoted, exactly `TankForecastCard`'s `headline()` fallback for a missing `halfDate`. **No date, no sub-line, no km/day.** The bar still renders (`percentUsed` exists without a rate).                                                                                              |
| `overdue`                           | headline `420 km past due` in `COLORS.danger`, `danger` pill, no projected date (the server omits it), bar rendered full. H-E: `Math.abs(kmRemaining)`, never reconstructed from the odometer.                                                                                                                   |
| full (`ok`/`upcoming`)              | as drawn above.                                                                                                                                                                                                                                                                                                  |

Copy vocabulary — reuse the app's existing words, do not invent a third dialect. `RemindersBanner.tsx:85-92` and `TankForecastCard.tsx:60-79` are the two precedents and they agree:

```
headline   : `Next change ~ ${format(projected, "d MMM")}`
sub-line   : projectedDaysRemaining <= 0 → `any day now · ~850 km to go`
                                    === 1 → `tomorrow · ~850 km to go`
                                    else  → `in ${n} days · ~850 km to go`
audit 1    : `1,550 / 2,400 km on this oil · 65%`
audit 2    : `since 12 Aug · Motul 7100 · 43.2 km/day`
```

Three fixed rules carried forward: the `~` is **load-bearing**, not decoration (server H5 floors the day count because `currentOdometer` lags reality, so the date sits late — spec 55 H-F's exact argument); **never a named weekday** (spec 55 H-G — the Dhaka weekend is Fri–Sat and may be the non-riding days); and the audit lines **stay**, because H-F guarantees this card will eventually read wrong and the audit lines are what let the rider see why rather than stop trusting it (spec 55 D7).

The progress bar is two nested `View`s — a track at `COLORS.edge` and a fill at the tone colour, `width: \`${Math.min(100, percentUsed)}%\``— not`react-native-paper`'s `ProgressBar`, which brings its own theming and cannot take the `danger`/`warning`tone cleanly. Clamp at 100 so an overdue oil does not overflow the track. Omit the bar entirely when`percentUsed` is absent.

### The row card — `EngineOilLogCard.tsx`

`FuelLogCard.tsx` with four changes. Left column, four lines:

1. `metaRow` — `formatApiDate(changeDate, "dd MMM yyyy")`, then an `accent`-toned tag with the oil type's name (via `getOilName`, §C), then a `neutral`-toned `Filter` tag **only when `oilFilterChanged`** (absent, not "No" — a tag for a thing that did not happen is noise; this is where the web's `Filter: No` column cell does not translate).
2. `costRow` — `formatTaka(cost)` big, then `1.0 L` muted when `quantityLiters != null`.
3. `odoLine` — `18,400 km` + ` · ${serviceCenter}` when set. Verbatim from `FuelLogCard.tsx:130-133`.
4. `intervalLine` (new, muted, `tabular-nums`, 10.5px) — `Interval ${intervalKmUsed.toLocaleString()} km`, on **every** row that has an interval (D11). Omitted only on one of server §H's imported rows, which genuinely has none.
5. `periodLine` (new, muted, `tabular-nums`, 10.5px) — `${kmOnThisOil.toLocaleString()} km on this oil · ৳${costPerKm.toFixed(2)}/km`, present only when **both** are non-null, i.e. the period is closed by a newer change. Omitted on the newest row — no dash (D11). Guard the two `!= null` separately: `kmOnThisOil` can be non-null while `costPerKm` is null, when two changes share an odometer (§G).

All five lines run at D14's reduced scale, not `FuelLogCard`'s. Right column: `ActionMenu` (Edit / Delete) over `ImagePickerField` (D5). **No lock rule** — unlike fuel logs, nothing downstream closes a period over an oil change (that is `MileageRecord`'s job and it is untouched), so there is no `lockedNote` and both actions are always enabled. `confirmDelete("engine oil log", …)`.

---

## §C Data layer

`types/engine-oil-log.types.ts`:

```ts
import { TCloudinaryImage } from "./image.types";

export type TEngineOilLog = {
  _id: string;
  bike: string;
  // ! populated `{ _id, name }` when the relation was included, a bare id string when it
  // ! wasn't, `null` when the row never had a type (one of server §H's imported rows).
  // ! Three shapes, same contract TMaintenanceLog.oilType already carries — read it
  // ! through getOilName(), never `log.oilType.name`.
  oilType: { _id: string; name: string } | string | null;
  odometerReading: number;
  intervalKmUsed?: number | null;
  nextDueOdometer?: number | null;
  quantityLiters?: number | null;
  oilFilterChanged: boolean;
  cost: number;
  changeDate: string;
  // ! server-computed per LIST row (D12/§G). Explicit `null` on the newest change and on
  // ! `GET /:id`, which does not run the lookup — guard with `!= null`.
  kmOnThisOil?: number | null;
  costPerKm?: number | null;
  serviceCenter?: string | null;
  notes?: string | null;
  receiptImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TEngineOilStatus = {
  status: "ok" | "upcoming" | "overdue" | "unknown";
  currentOdometer: number;
  lastChange: {
    _id: string;
    changeDate: string;
    odometerReading: number;
    oilType: { _id: string; name: string } | null; // always populated-or-null here
    intervalKm?: number | null;
    nextDueOdometer?: number | null;
    oilFilterChanged: boolean;
  } | null;
  kmSinceChange?: number | null;
  // ! SIGNED — negative means past due. H-E: never reconstruct the overshoot.
  kmRemaining?: number | null;
  percentUsed?: number | null;
  projectedDaysRemaining?: number | null;
  projectedDueDate?: string | null; // a real instant — H-C, not formatApiDate
  kmPerDay?: number | null;
  rateBasis?: { spanDays: number; distanceKm: number } | null;
};

export type TCreateEngineOilLogPayload = {
  oilType: string; // required — H-N
  odometerReading: number;
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged?: boolean;
  cost: number;
  changeDate?: string;
  serviceCenter?: string;
  notes?: string;
};

export type TUpdateEngineOilLogPayload = Partial<TCreateEngineOilLogPayload>;

export type TEngineOilLogsApiResponse = {
  result: TEngineOilLog[];
  meta: number;
};
```

`getOilName(log, oilTypes)` lives in the card file and is a direct port of `MaintenanceLogCard.tsx:40-48` — populated object first, then a lookup in the catalog list by bare id, then `undefined`. The catalog fallback stays for the same reason spec 45a kept it: a deployment predating the populate still sends a bare id.

Queries — **four keys, and H-D governs the fourth**:

| Query               | Key                                          | URL                                                          |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| list                | `["engineOilLogs", bikeId, page.toString()]` | `/bikes/:id/engine-oil-logs?page=&limit=10&sort=-changeDate` |
| status              | `["engineOilStatus", bikeId]`                | `/bikes/:id/engine-oil-logs/status`                          |
| latest (quick-fill) | `["engineOilLogs", bikeId, "latest"]`        | `/bikes/:id/engine-oil-logs?limit=1&sort=-changeDate`        |
| oil types           | `["engine-oil-types"]`                       | `/engine-oil-types` — **the existing key, kebab-case**       |

`page.toString()` because `useFetchData`'s key is typed `string[]` (`hooks/useApi.ts:19`) — `FuelLog.tsx:72` already does this.

`["engineOilLogs", bikeId]` is a **prefix** of both the paginated and the `"latest"` key, so one invalidation refreshes the list and the quick-fill source together and the button can never offer the change before last. Invalidation set for every create / edit / delete / image mutation:

```ts
[
  ["engineOilLogs", bikeId],
  ["engineOilStatus", bikeId],
  ["bikes", bikeId],
  ["spending", bikeId],
  ["reminders", bikeId],
];
```

`["bikes", bikeId]` because creating an oil log runs `bumpOdometerIfHigher` server-side (server §C step 7) and the hub's odometer would otherwise lag. `["reminders", bikeId]` because server §E now sources the engine-oil reminder from this table. `["spending", bikeId]` is a prefix of the hub's `["spending", bikeId, "month", targetMonth]` (`BikeDetailPage.tsx:111`).

`hooks/useEngineOilSeed.ts` — `useFuelLogSeed.ts`'s shape, and the header comment should say the same thing its does about why the seed is not read off the list:

```ts
export type TEngineOilSeed = {
  oilType?: string; // the bare id, ready for SelectPickerField's value
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged: boolean;
  serviceCenter?: string;
  cost: number;
};
```

It returns `{ seed, odometerSeed, bike, isLoading }`, with `odometerSeed = bike?.currentOdometer` for the same reason spec 52 chose it: `currentOdometer` is the **floor** of the server's accepted range (it only ever rises), so it is the least typing and the furthest from a 400. Note the asymmetry with H-J — the odometer is seeded on the **Add** path (spec 52's rule, the rider corrects it at the pump) but **not** carried by the quick-fill as a copied field; both end up prefilling it from `currentOdometer`, never from the previous change's reading.

---

## §D The form modal — `EngineOilLogFormModal.tsx`

`MaintenanceLogFormModal`'s skeleton. Props: `{ open, onClose, bikeId, log?, seed?, seedOdometer? }`. Fields in order:

| Field              | Control                      | Notes                                                                                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine oil         | `SelectPickerField`          | options from `["engine-oil-types"]`, `{ label: \`${name} (${suggestedIntervalKm} km)\`, value: \_id }`— the same label shape`MaintenanceLogFormModal.tsx:156-162` already builds, so the rider sees the interval before picking. **Required** (H-N); empty catalog → the one-line hint, no select        |
| Odometer (km)      | `FormField` `decimal-pad`    | required, prefilled from `seedOdometer` on create                                                                                                                                                                                                                                                        |
| Cost (৳)           | `FormField` `decimal-pad`    | required                                                                                                                                                                                                                                                                                                 |
| Change Date        | `DatePickerField`            | defaults today, `maximumDate={new Date()}` (the house rule, `MaintenanceLogFormModal.tsx:338`)                                                                                                                                                                                                           |
| Interval km        | `FormField` `decimal-pad`    | **required** — seeded per H-K, with spec 54's `From your catalog default` hint beneath while the value is still the seed's own. Blanking it blocks submit with `Service interval is required`, rather than falling back to the catalog silently: the rider can always see the number that will be stored |
| Oil quantity (L)   | `FormField` `decimal-pad`    | optional                                                                                                                                                                                                                                                                                                 |
| Oil filter changed | `SwitchField`                | optional, defaults false. `components/main/shared/SwitchField.tsx`, already in the shared index                                                                                                                                                                                                          |
| Service Center     | `FormField`                  | optional, max 100                                                                                                                                                                                                                                                                                        |
| Notes              | `FormField` multiline 3 rows | optional, max 500                                                                                                                                                                                                                                                                                        |

Row pairing follows the maintenance modal: odometer + cost on one `styles.row`, date + interval on the next (with the interval wrapped in its own `rowField` `View` so the seed hint can sit beneath it without moving the row's geometry — spec 54's layout, `MaintenanceLogFormModal.tsx:343-356`).

Validation guards, in submit order, each a `Toast.show` and an early return (`MaintenanceLogFormModal.tsx:207-223`'s chain), with bounds mirroring the server's so the two refuse the same things:

```
!oilType                                  → "Engine oil type is required"
!DECIMAL_REGEX.test(odometerReading)      → "Enter a valid odometer reading"
odometerReading > 999999                  → "Odometer reading can't exceed 999,999 km"
!DECIMAL_REGEX.test(interval) || <= 0     → "Enter a valid service interval"
interval > 100000                         → "Service interval can't exceed 100,000 km"
quantity set && (!DECIMAL || <=0 || >20)  → "Enter a valid oil quantity (max 20 L)"
!DECIMAL_REGEX.test(cost)                 → "Enter a valid cost"
```

`DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/` — copy the constant, do not import it across folders (each modal declares its own today).

Seeding, with the three H-K rules as three distinct code paths and a `seededInterval` ref exactly as spec 54 built it:

- **Edit** (`log` set) → `seededInterval.current = null`, then populate every field from the log, interval from `log.intervalKmUsed?.toString() ?? ""`, oil type unwrapped from its three shapes (`MaintenanceLogFormModal.tsx:177-182`'s ternary chain handles all three).
- **Create with a `seed`** (quick-fill, §H) → populate the six copied fields from the seed, odometer from `seedOdometer`, date today. The seeded interval **is** the seed's own value, so set `seededInterval.current` to it — switching the oil type afterwards then legitimately re-seeds, which is rule 1.
- **Create plain** → everything empty except date = today and odometer = `seedOdometer`; the interval effect fills in the rest the moment a type is picked.
- **The interval effect** runs on create only, replaces the field only while it still equals `seededInterval.current` (rule 2), and folds a missing suggestion into the path as `""` rather than returning early (54a). Return early when `next === intervalKmUsed`, or the effect loops on its own write — spec 54's harness exists because that was the plausible failure mode.

Submit builds `TCreateEngineOilLogPayload` with `parseFloat` on the four numerics and `|| undefined` on the optional strings, `changeDate: changeDate || format(new Date(), "yyyy-MM-dd")`, `oilFilterChanged` always sent (it is a boolean with a server default, and omitting it on update would be indistinguishable from false). **Nothing from H-M's list.** `Toast.show` success `Engine oil log added` / `Engine oil log updated`; on failure, `error?.message` — and note `utils/axiosInstance.ts`'s response interceptor already toasts API errors, so follow the maintenance modal (which toasts its own) rather than `OdometerPanel.tsx:78-81` (which deliberately does not), and check on a device that the new screen does not double-toast. If it does, drop the local toast — that is the precedent spec 45 set.

---

## §E The small edits elsewhere

1. **`components/main/Bike/BikeDetailPage.tsx:38-52`** — one `TILES` entry after `Fuel Logs`: `{ label: "Engine Oil", icon: "oil", segment: "engine-oil" }` (D6).
2. **`components/main/SettingsCatalog/OdometerPanel.tsx:27`** — `usePatch([["bikes"], ["reminders"]])` becomes `usePatch([["bikes"], ["reminders"], ["engineOilStatus"]])`. **One line, and the single most important line in this spec for the thing the developer actually asked for** — _"based on the updated odometer reading in the engine oil log I should see updated data."_ Without it the oil card keeps yesterday's "km on this oil" until the app is restarted. Prefix key, no `bikeId`, matching the two already there and the comment above them.
3. **`types/spending.types.ts:21`** — `TSpendingRecordSource` becomes `"fuel" | "maintenance" | "accessory" | "oil"` (D13). Type hygiene; nothing in the app reads `source`.
4. **`components/main/SettingsCatalog/SettingsCatalog.tsx:267`** — the oil-type delete message loses its promise about maintenance logs and gains the truth: the type is kept on changes that already used it, and the delete is **refused** while any still reference it (H-P). Wording, not logic — the `409` is already surfaced by the axios interceptor's toast.
5. **`components/main/Bike/BikeDetailPage.tsx:220-241`** — a fourth mini-stat, `On this oil` / `1,550 km`, from `useFetchData<TEngineOilStatus>(["engineOilStatus", bikeId], …)` — the **same key** the oil screen uses, so react-query serves it from cache and the hub makes no extra request once either screen has loaded. Hidden entirely when `lastChange` is `null` (a bike with no oil change shows the strip exactly as today, not a tile reading `0 km`). Requires `flexWrap: "wrap"` on `miniStats` and `minWidth: 74` on `miniStat` so it degrades to 2×2 at 360dp rather than ellipsising four labels (D7). **Settled: the developer said yes — this is in scope, not optional.** No sub-label; the web's oil-name line has no room here.

`RemindersBanner.tsx` is **untouched** — server §E keeps emitting the engine-oil reminder in the existing shape and it renders with no change (H-G says where it may and may not appear). `useTankForecast.ts` is untouched. `QuickAddFuelLogScreen.tsx` is untouched.

---

## §F Engine oil leaves the Maintenance screen (D8)

Four files, all UI-only. H-A governs the ordering: these removals are safe **because `--finalize` has already run**, so no live maintenance log carries an oil type. If the server deploy somehow slips past this build, §F is still safe — it is §A–§E that 404. The reverse of the web's H-W13, and for the opposite reason: there, the removals were the risky half; here the import is already done and the picker is the risk.

| File                          | Remove                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MaintenanceLogFormModal.tsx` | the `["engine-oil-types"]` query (`:43-47`), `oilTypes` (`:50`), the `oilType` state (`:54`), `isEngineOil` (`:87`) and the effect that clears the field (`:89-93`), `selectedOilType` (`:95-98`), `oilOptions` (`:156-162`), the oil branch of the edit seed (`:177-182`), `oilType` from the payload (`:235`), and the whole `{isEngineOil && …}` select block (`:294-309`). Then **D9**: `:107-109`'s suggestion collapses to `selectedMaintType?.defaultIntervalKm` and `selectedOilType` leaves the dep array at `:123`. `TEngineOilType` leaves the import at `:17` |
| `MaintenanceLogCard.tsx`      | the `oilTypes` prop (`:25`), `getOilTypeName` (`:40-48`), `oilTypeName` (`:119`), `oilTone` (`:121`) and the tag it renders (`:152-158`). The `TEngineOilType` import at `:9`. With the tag gone, `styles.titleLine` holds one child — check the type name still truncates rather than stretching                                                                                                                                                                                                                                                                         |
| `MaintenanceLog.tsx`          | the `["engine-oil-types"]` query (`:45-48`), `oilTypes` (`:52`), the prop pass (`:121`), the `TEngineOilType` import (`:10`)                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `SettingsCatalog.tsx`         | the **Needs an engine oil type** switch in both the create (`:446-450`) and edit (`:492-494`) forms, plus `newMaintRequiresOil` (`:127`), `editMaintRequiresOil` (`:138`), their resets (`:166`, `:192`) and the two payload fields (`:160`, `:214`). A `PATCH` without `requiresOilType` leaves an existing type's flag alone, so no stored data changes                                                                                                                                                                                                                 |

**What deliberately stays.** `TMaintenanceType.requiresOilType` and `TMaintenanceLog.oilType` stay in `types/` — server §H's import selector reads the flag, and the soft-deleted source rows keep their oil type so the import stays reversible with one `UPDATE`. Mark both with a history-only comment; deleting them would make those rows unreadable if anyone ever un-deletes them. The maintenance **API** is unchanged and still accepts `oilType`; this is four UI deletions and a smaller form, not a contract change.

---

## §G Cost per km on a closed change (D10)

```
km on that oil = the NEXT change's odometer − this change's odometer
cost per km    = this change's cost ÷ km on that oil
```

Both arrive **from the server**, per list row, as `kmOnThisOil` and `costPerKm` (`engineOilLog.service.ts:133-154`). Do not derive them here. The reason is the page boundary: a row's closing neighbour sits on the _previous_ page at every boundary, so a figure derived from the page in hand appears and vanishes as the rider pages — which reads as a bug. The server runs one extra `findFirst` for the page's newest row precisely so this does not have to be solved client-side. Render as `৳0.50/km`, two decimals, `tabular-nums`, on the row's fourth line (§B), and on the newest row print the interval instead (D11). `costPerKm` is `null` and never `Infinity` when two changes share an odometer — the server already handles that, but guard with `!= null` anyway.

---

## §H "Same as last change" quick-fill (D10)

A second, secondary-variant `PrimaryButton` beside **Add** in the count row, opening the same modal with everything repeatable prefilled:

- **Copied:** oil type, interval, quantity, oil-filter flag, service centre, cost.
- **Never copied:** odometer reading and change date — H-J. The odometer prefills from `bike.currentOdometer` as it does on the plain Add path; the date defaults to today.
- **Source:** `useEngineOilSeed`'s own `["engineOilLogs", bikeId, "latest"]` query (`?limit=1&sort=-changeDate`), never the paginated list — H-L, and the reason the button behaves identically on page 1 and page 7.
- **Hidden** when there is no previous change. A button that opens an empty form under that label is worse than no button.

At 360dp two buttons plus the count do not fit comfortably: use `compact` on both and shorten the label to `Same as last` (the count row is `justifyContent: "space-between"`, so the count will give way first). The modal itself is unchanged — same component, same guards, same submit path, only different initial state.

---

## §J Shipping this to the phone

Three gates, in order, and none of them is `yarn lint`:

1. **`bikelog_server` must be pushed and deployed** — H-A. `git -C bikelog_server push` → `deploy.yml` → re-run the `curl` check and expect `401`.
2. **This app must then be verified against that deployed server**, not against stubs. The web client's spec 33 did a stubbed pass _and_ a real-API pass and only the second one found anything; this spec has no stub harness and should not grow one.
3. **An EAS build.** An Expo app is not deployed by pushing — `eas.json`'s `production` profile with `autoIncrement: true` / `appVersionSource: "remote"` is how this reaches the phone. The 12-commit app backlog is unbuilt as of 2026-10-18, so this spec's commits will ship alongside specs 51–56 whenever that build happens; the oil tile leading to a dead screen if gate 1 is skipped is therefore **not hot-fixable**.

---

## §K Fix the AI assistant (settled: "fix this") — server work, not app work

**This section is a `bikelog_server` spec in waiting.** It lives here because this is where the gap was found (H-O), but nothing in it is implemented in `bikelog_app`. When it is built, lift it into **`bikelog_server/context/specs/55-ai-context-engine-oil.md`** — 55 is the next free number there — give it a tracker row in that repo, and ship it with the same push that unblocks H-A. Cascade step 2, authorised by the standing app-first rule.

**The problem.** `src/app/modules/ai/ai.service.ts` builds the model's entire view of a bike from `fuelLog` and `maintenanceLog`. Since server spec 54's `--finalize`, the 8 oil changes are soft-deleted out of `maintenance_logs`, so the assistant now believes this bike has never had an oil change — and `AiAssistant.tsx:17` offers _"When is my next oil change due?"_ as its **first** suggested chip. The failure mode is the bad one: not an error, a confident wrong answer.

**Scope: one file, three edits.** No schema change, no migration, no new response field, and **no client change in either client** — the chat reply's shape is untouched, so cascade step 3 is not triggered and `bikelog_client-web-` needs nothing.

- **K1 — the spending-insight cache gate, `:38-42`.** Add a third `prisma.engineOilLog.count({ where: { bikeId, isDeleted: false } })` to the existing `Promise.all` and into `currentLogCount`. Without it the cached insight never refreshes when the only thing that changed was an oil log — and since `getSpendingSummaryFromDB` now includes the `Engine Oil` category (server §F), the insight it caches would describe spending it was never told had changed.
- **K2 — the chat context, `:157-180`.** A fourth `findMany` in the `Promise.all`:

  ```ts
  prisma.engineOilLog.findMany({
    where: { bikeId, isDeleted: false },
    orderBy: [{ changeDate: "desc" }, { createdAt: "desc" }], // H13's tie-break
    take: CHAT_LOG_LIMIT,
    include: { oilType: { select: { name: true } } },
  }),
  ```

  projected the way the other two are (`:183-206`), down to the fields a model can actually use:

  ```ts
  const recentEngineOilLogs = rawRecentEngineOilLogs.map((log) => ({
    changeDate: log.changeDate,
    odometerReading: log.odometerReading,
    oilType: log.oilType?.name ?? null,
    intervalKmUsed: log.intervalKmUsed,
    nextDueOdometer: log.nextDueOdometer,
    quantityLiters: log.quantityLiters,
    oilFilterChanged: log.oilFilterChanged,
    cost: Number(log.cost), // HK1
    serviceCenter: log.serviceCenter,
    notes: log.notes,
  }));
  ```

- **K3 — the system message, `:220-232`.** A fourth data block, between the maintenance logs and lifetime spending, in the existing phrasing:

  ```
  `Recent engine oil changes (up to ${CHAT_LOG_LIMIT} most recent): ${JSON.stringify(recentEngineOilLogs)}\n\n`
  ```

  The prompt already states `Current odometer: ${bike.currentOdometer} km`, so `nextDueOdometer` is all the model needs to answer the chip's question.

**Hazards:**

- **HK1 — `Number(log.cost)`, always.** `JSON.stringify` on a raw Prisma `Decimal` emits a **string** (`"cost":"1250.00"`), silently changing what the model sees and what it does arithmetic on. The comment at `:183-186` exists because this was got wrong before; the new projection must not reintroduce it.
- **HK2 — Give the model the raw numbers, not a computed due date.** It is tempting to call `getEngineOilStatusFromDB` and inject `projectedDueDate`. Don't: that is a second source of truth for a figure the oil screen also renders (spec 53 H-E), and the maintenance block directly above hands over `nextDueOdometer`/`nextDueDate` raw and lets the model reason. Stay consistent with it.
- **HK3 — Prompt size.** `CHAT_LOG_LIMIT` is 8 and shared by all three lists, so this adds up to 8 more rows of ~10 fields. Fine at today's budget, but it is now the **third** list on that constant — if the prompt ever needs trimming, trim it here rather than lowering the constant for everything.
- **HK4 — The mileage insight is fuel-only and stays that way.** `getMileageInsightFromDB` (`:95-137`) gates on `aiMileageInsightFuelLogCount` alone, which is correct — an oil change does not move km/l. K1 must not be copy-pasted into it.
- **HK5 — The cached insight is already stale, and will self-heal twice.** `--finalize` dropped `maintenanceLogCount` by 8, so `aiSpendingInsightLogCount` no longer matches and the next call regenerates — from oil-blind data, caching a wrong insight. K1 moves the count again, so the first call after this deploys regenerates once more, correctly. No manual cache clear is needed: expect two regenerations and don't read the intermediate one as a bug.

**Verification** (Postman, against the deployed server, on a bike with oil changes):

| # | Check | Expect |
| --- | --- | --- |
| K-V1 | `POST /bikes/:id/chat` — _"When is my next oil change due?"_ | an answer naming the real last change, its odometer and `nextDueOdometer`; **not** "no oil change on record" |
| K-V2 | _"How much have I spent on engine oil?"_ | a figure matching the `Engine Oil` category in `GET /spending-details` |
| K-V3 | `GET /bikes/:id/spending-insight` twice | first call `cached: false`, second `cached: true`; the insight mentions oil |
| K-V4 | Add an oil change, re-request the insight | `cached: false` again — K1's count moved |
| K-V5 | The raw prompt, logged once in dev | `cost` is a **number**, not a quoted string (HK1) |
| K-V6 | A bike with no oil change at all | the oil block is present and empty, no `undefined`, and the assistant says it has no oil history rather than inventing one |

---

## Test plan

No test suite exists. Static floor: `yarn lint` clean, `npx tsc --noEmit` clean **after booting the dev server once** (H-I), `npx expo export --platform web` bundling the new route. Everything below needs the deployed server (§J gate 1) and a device or simulator at 360dp.

| #   | Check                                                                                         | Expect                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Open Engine oil on the developer's bike after the server deploy                               | the imported changes listed, newest first, with their oil type names and their receipt photos                                                                                                                                                        |
| V2  | Status card against the list, by hand                                                         | `km on this oil` = `currentOdometer − newest change's odometer`; the percentage and the bar agree with the interval                                                                                                                                  |
| V3  | **Settings → update the odometer +300 km → open Engine oil**                                  | card updated with no app restart: km on this oil +300, km to go −300, date earlier. **This is the developer's stated requirement — verify it by hand, not by reading the code** (H-A's §E item 2)                                                    |
| V4  | Add a change, pick an oil type                                                                | the interval pre-fills from the catalog with the `From your catalog default` hint; submit stores it; `nextDueOdometer` lands on reading + interval                                                                                                   |
| V5  | Switch the oil type mid-form to one with a different suggestion                               | the interval re-seeds (H-K rule 1). Then hand-type a value and switch type again → **the typed value survives** (rule 2). Then pick a type and switch to one with no suggestion → the field **clears** rather than keeping the stale number (54a)    |
| V5b | Type an interval different from the suggestion, save, reopen the log to edit                  | the box shows **the saved value, not the catalog's** (rule 3)                                                                                                                                                                                        |
| V5c | Change an oil type's interval in Settings, reopen an old change, save it unchanged            | its due point does not move (server H6/V2c)                                                                                                                                                                                                          |
| V5d | Clear the interval and submit                                                                 | blocked with `Service interval is required`, no silent catalog fallback                                                                                                                                                                              |
| V6  | Type `408.85` into odometer, interval, quantity and cost                                      | all four accepted by `DECIMAL_REGEX`; `408.855` rejected                                                                                                                                                                                             |
| V7  | A bike with no oil change                                                                     | **no status card at all**, the list's `EmptyState` with the Add button, no `NaN`, no empty panel                                                                                                                                                     |
| V8  | A bike with too little fuel history                                                           | `~N km to go` as the headline, **no date, no sub-line, no km/day** — nothing invented (H-F)                                                                                                                                                          |
| V9  | An overdue oil                                                                                | `X km past due`, danger pill, no projected date, and X matches `currentOdometer − nextDueOdometer` by hand (H-E)                                                                                                                                     |
| V10 | One of the imported changes whose source had no interval, made the newest                     | `1,550 km on this oil` + the nudge, no bar, no date, no 500 (H-F row 2)                                                                                                                                                                              |
| V11 | Submit an odometer below an earlier change's                                                  | the server's 400 naming the previous reading, surfaced as a toast and **not** double-toasted                                                                                                                                                         |
| V12 | Upload then delete a receipt on a row                                                         | thumb appears / clears, list refetches, no stale image                                                                                                                                                                                               |
| V13 | Delete a change → check Spending and the hub                                                  | totals drop by that cost, the reminder recalculates, `currentOdometer` unchanged (nothing rolls it back — expected)                                                                                                                                  |
| V14 | The fourth line on two consecutive changes                                                    | `kmOnThisOil` = next odometer − this one; `costPerKm` = cost ÷ that, to 2dp. The **newest** row shows `Interval N km` instead (D11)                                                                                                                  |
| V15 | Page 2's first row                                                                            | a real `৳/km`, not a missing line — the page boundary is invisible (§G)                                                                                                                                                                              |
| V16 | Page to 2 and back                                                                            | the **status card does not move** (H-L) — the regression spec 55 V6 exists for, one screen over                                                                                                                                                      |
| V17 | `Same as last` → the modal                                                                    | oil type, interval, quantity, filter, service centre, cost prefilled; **odometer = `currentOdometer`, date = today** (H-J)                                                                                                                           |
| V18 | `Same as last` on a bike with no change                                                       | the button is not rendered                                                                                                                                                                                                                           |
| V19 | Maintenance screen after §F                                                                   | no oil-type picker in the form; no oil tag on any card; Settings → Maintenance types has no "Needs an engine oil type" switch; an existing maintenance log still opens and saves cleanly, and its interval still seeds from `defaultIntervalKm` (D9) |
| V20 | Hub                                                                                           | the Engine Oil tile sits after Fuel Logs and opens the screen; the engine-oil reminder still renders in `RemindersBanner`, once (H-G)                                                                                                                |
| V21 | 360dp: status card, four-line row cards, the modal, the date picker, the two-button count row | no horizontal scroll, no ellipsised headline, every tap target reachable. §B's character budgets are arithmetic, not measurement — this is the check that settles them                                                                               |
| V22 | Settings → delete an oil type an oil change uses                                              | refused with the server's `409`, and the confirm dialog did not promise otherwise (H-P)                                                                                                                                                              |
| V23 | Cold launch with an expired access token, land on Engine oil                                  | the refresh succeeds and the screen loads — the new queries go through `axiosInstance` and inherit specs 51/51b/51c unchanged (no new auth surface in this spec)                                                                                     |
| V24 | **Bike hub at 360dp with the fourth mini-stat** | four stats wrap to a clean **2×2**, no label ellipsised, no row of four squeezed columns (D7). `On this oil` is absent on a bike with no oil change, and moves immediately after a Settings odometer update |
| V25 | A row from the import that has **no** interval | neither the interval line nor the ৳/km line renders, and **no dash appears in their place** (D11). Every other row shows `Interval N km` |
| V26 | **After §K ships** — ask the assistant _"When is my next oil change due?"_ | an answer grounded in the real oil log, not "no oil change on record" (H-O). `bikelog_server` work; listed here only because this app is where the wrong answer appears |

---

## Settled questions (developer, 2026-10-18)

All five were answered the same day the spec was written, before any code. **Nothing in this spec is open.**

1. **Add "On this oil" as a fourth hub mini-stat?** — **"yes".** D7, §E item 5. It brings a layout change with it, because four `flex: 1` columns do not fit a ~328dp panel at 360dp: the strip gets `flexWrap` + a `minWidth` and degrades to **2×2**. V24 is the check; the pre-authorised fallback if 2×2 reads badly is to drop `Lifetime`, not this.
2. **Should an oil change also fall due on _time_, not just distance?** — **no, nothing needed.** D15. Distance only: no `suggestedIntervalDays`, no `nextDueDate` on the log, one clock on the card. Read as a close of the question rather than a deferral — this plan already assumed distance-only, so the answer changes nothing in it, and the server migration it would have required is now explicitly not happening. _(If "done need anything" was meant as "done — need anything from me?" rather than "don't need anything", say so and D15 is the one decision to reopen; it is the only one of the five that would add a database column.)_
3. **Interval on a past change — show it, or noise?** — **"show. make the card text a bit small, not very small".** Two changes, D11 and D14. The interval now renders on **every** row, which is why it gets a line of its own rather than joining the ৳/km line — one combined 42-character line is the only thing on this screen that would truncate at 360dp, two ≤32-character lines do not. And both cards drop **one notch** of type scale, floored at 10px, per D14's table: `cost` 18→16, headline 13.5→13, the audit lines left alone at 55a's measured floor. "Not very small" is taken literally — that table is the whole change, and no second pass down happens without a device look (V21).
4. **The AI assistant has gone blind to oil changes — fix it?** — **"fix this".** §K, in full: three edits to `ai.service.ts`, no schema change, no migration, no client change in either client. It is **server** work and becomes `bikelog_server` spec 55 — do not implement it in this repo. Ship it with the same push that unblocks H-A, so the assistant is never deployed knowing about `engine_oil_logs` that the API does not yet expose.
5. **`../new Features/03-offline-fuel-logging.md`, the one unconsumed brief** — **"skip".** Noted and left alone.

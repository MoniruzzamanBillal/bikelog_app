# 73: Service log — the app half

Status: ✅ **Complete (app code, 2026-11-19) — static floor verified; device + real-data passes owed, the latter blocked on a production migration (see 73b).** Spec written 2026-11-18 from the root `service-log-module-plan.md` brief and its backend companion `bikelog_server/context/specs/67-service-log-module.md`. **Backend half (spec 67) is now pushed and deployed, verified live 2026-11-19** (see H-A). Both open questions are **resolved 2026-11-19** (see §Open questions): nothing is frozen — build the full plan (§F and D10 included) against the live server. App-first cascade, step 1 (the backend is step 2 and already has its own spec; the web client is deliberately step-3-untriggered, see §Web).

App half of `bikelog_server` spec 67 ("Service log module — warranty + regular servicing"). The server spec is explicitly **backend only** ("App + web halves are out of scope — not touched"), so this file is the app half it defers. There is **no web half** — the plan file settles that the web client does not log services, by design.

**What this adds, in one line:** a **Service** screen that tracks workshop visits against the bike's 2-year warranty — _how many of the 5 mandatory services are done, when the next one is due, and am I about to void the warranty by missing it_ — plus per-visit line items (paid additives), technician recommendations the rider can tick off, and a Spending/"Service" category that appears automatically.

**Why it matters more than a normal log:** the bike is under a **2-year warranty requiring 5 scheduled services (~every 3 months); missing one voids the warranty.** The warranty progress card is the whole point — it is the one screen in the app that answers a question with money attached. Regular (post-warranty, or non-official-centre) services are just logged with no deadline.

Scope: one new route file, one new component folder (**5** files — one more than oil, for the warranty status card _and_ the two sub-editors), one new type file, one new seed hook, and **two** small edits to existing files (hub tile, the spending source union). Reminders and Spending need **no app change** — the server shapes them to render for free, exactly as it did for engine oil (spec 57 §E). **No new dependency** — `date-fns`, `react-native-paper`, react-query, `MaterialCommunityIcons` and `components/main/shared/*` already cover everything, including the sub-editors.

**This is the engine-oil module's twin.** Read `ai context/specs/57-engine-oil-log.md` alongside this file — it is the proven template for the route shim, the status-card-on-top / paginated-list-below layout, the form-modal skeleton, the query-key/invalidation discipline, the quick-fill, the receipt-on-card pattern, and the D14 type scale. Everything here that says "mirror oil" means that file. What is genuinely new to Service and has no oil precedent is called out explicitly: the **warranty progress card** (§B), the **line-item and recommendation sub-editors** (§D), the **recommendation tick-to-complete on the card** (§G), the **two-date / complete-an-upcoming flow** (§A D3), and the **schedule-the-next-service orchestration** (§F).

---

## Implementation log (2026-11-19)

Built step by step, mirroring the engine-oil module (spec 57). Each step ✅ = written and
passing the static floor (`npx tsc --noEmit` clean, `yarn lint` clean, `npx expo export` bundles
the new `/bikes/[bikeId]/service` route at 35.5 kB).

- ✅ **1. `types/service-log.types.ts`** — §C shapes, with the deployed-contract refinements
  (omitted-not-null, `nextWarranty.number: number | null`).
- ✅ **2. `app/bikes/[bikeId]/service.tsx`** — two-line route shim (D1).
- ✅ **3. `hooks/useServiceLogSeed.ts`** — D10 quick-fill seed (centre + centre type + kind only; H-J).
- ✅ **4. `components/main/ServiceLog/ServiceStatusCard.tsx`** — the warranty card, all states (§B, H-B/H-H).
- ✅ **5. `components/main/ServiceLog/ServiceSubEditors.tsx`** — `ItemsEditor` + `RecommendationsEditor` (§D, the 5th file).
- ✅ **6. `components/main/ServiceLog/ServiceLogFormModal.tsx`** — create/edit/complete, the two sub-editors, §F schedule-next orchestration.
- ✅ **7. `components/main/ServiceLog/ServiceLogCard.tsx`** — upcoming + completed row shapes, §G recommendation tick-to-complete.
- ✅ **8. `components/main/ServiceLog/ServiceLog.tsx`** — the screen (status card + paginated list + quick-fill).
- ✅ **9. §E edits** — hub tile `shield-check-outline` (`BikeDetailPage.tsx`), `TSpendingRecordSource += "service"` (`spending.types.ts`), `EMPTY_MESSAGE` refresh (`Spending.tsx`).

**Both open questions were resolved before building (see §Open questions): §F and D10 are in scope and both shipped.**

**Blocker hit during real-data insertion, fixed in 73b:** the deployed server's `service_logs`
table did not exist (`P2021`) — the code shipped but its migration was never applied. Written up
and resolved in `73b-service-logs-migration-fix.md`; the fix is the manual `yarn db:migrate`
(production DDL, operator-run).

---

## §0 Hazards — read before writing code

**H-A — The server module is not deployed, so every request 404s until it is. Do not build against a 404, and do not cut an EAS build against one.**
`bikelog_server` spec 67 is "in progress (backend only)" and, like spec 54 before it, its routes reach the phone only after a push to `master` triggers `deploy.yml`. `utils/envConfig.ts` points this app at `https://bikelog-server.vercel.app`. Until the server deploy lands, `/bikes/:bikeId/service-logs` and `/status` 404, the "Service" spending category is absent, and no service reminder is emitted. Verify before starting — don't take this file's word:

```bash
git -C bikelog_server log origin/master..HEAD --oneline   # the service work must be 0 here
curl -s -o /dev/null -w '%{http_code}\n' https://bikelog-server.vercel.app/api/bikes/x/service-logs/status
```

A `401` means the route exists and `authCheck` rejected the anonymous call — green light. A `404` means not deployed — **do not implement against it, and above all do not build an EAS binary against it**, or the §E hub tile leads to a dead screen on a build that cannot be hot-fixed. This is spec 57 H-A verbatim, one module over.

**✅ Resolved 2026-11-19 — the gate is green.** Spec 67 is pushed (`git -C bikelog_server log origin/master..HEAD` is empty) and `deploy.yml` has deployed it: `GET /api/bikes/x/service-logs/status` **and** the list route both return **`401`** live, not `404`. Build against the deployed server. The rule above stands only as the reason to re-check (and never cut an EAS binary) if a future server change ever regresses the routes.

**H-B — Do not compute warranty progress or the next-due date in the app. `/status` computes all of it.**
Spec 53 H-E / spec 57 H-B's rule: two sources of truth for one figure disagree on the same screen and the rider is the one who finds out. `GET /service-logs/status` returns `warrantyCompleted`, `warrantyLogged`, `nextWarranty`, `nextService` and `warrantyVoidRisk` ready to render. Render them. Do **not** re-derive "3 of 5" by filtering the paginated list — it is paged (H-L of oil, same trap), and `warrantyNumber` is **server-assigned** (§A D6), so a client count can disagree with the badge the server minted.

**H-C — Both service dates are date-only fields. Use `formatApiDate`/`parseApiDate`, NOT the `toDate()` instant path.**
This is the **opposite** of oil's H-C. There, `projectedDueDate` was a real computed instant and `formatApiDate` was wrong for it. Here `dueDate` and `serviceDate` are stored `DateTime?` columns the rider picked as calendar days — they serialise as UTC-midnight instants, and `utils/formatApiDate.ts`/`parseApiDate` exist precisely to strip the time portion and dodge the Dhaka timezone shift. Use `formatApiDate(dueDate, "d MMM")` and `formatApiDate(serviceDate, "dd MMM yyyy")`. The `/status` `nextWarranty.dueDate` / `nextService.dueDate` are these same stored date-only values, so they go through `formatApiDate` too. Reaching for `RemindersBanner.tsx`'s `toDate()` instant pair here would read the UTC calendar day and sit a day early between local midnight and 06:00.

**H-D — `status` is derived from `serviceDate` presence; never send `status` in a payload, and never trust a `status` string to decide "is this done".**
Server §67 derives `status`: a row with a `serviceDate` is `completed`, one with only a `dueDate` is `upcoming`. The app decides "completed" purely from **whether a `serviceDate` is set**, both when reading (card rendering) and when writing (the complete flow sets `serviceDate`; it never sets `status`). `status` and `warrantyNumber` are server-derived — they go in H-M's never-send list.

**H-E — Toggling one recommendation means re-submitting the WHOLE `recommendations` array, with every existing `id` preserved.**
There is no per-recommendation endpoint. Ticking a recommendation on the card (§G) is a `PATCH /:id` that sends the entire `recommendations` array back with that one entry's `done` flipped. Two things break if done carelessly: (1) dropping the other entries deletes them; (2) dropping an entry's `id` makes the server mint a new one (§67: "IDs via `generateObjectId()`, incl. each sub-entry missing one"), which **changes the reminder `_id`** the banner keyed on and churns identity. Read → map (flip the one `done`) → send the full array **with ids intact**. Same discipline for line items when editing a service.

**H-F — Line-item and recommendation costs are plain JSON numbers, not `Decimal`. Guard and round in the app; the server rounds too.**
`items[].cost` and the recommendations' optional `targetOdometer` live in the row's JSON (§67 §Data model note). The app must bound them (`DECIMAL_REGEX`, `cost ≤ a sane max`, non-negative) and `parseFloat` them on submit, and must `Number(...)` / `!= null`-guard every cost on read before summing or printing — the server already rounds to 2dp, but the app prints `formatTaka(...)` over the sum and a stray string or `null` would render `৳NaN`.

**H-G — Do not render `RemindersBanner` on the Service screen.** The warranty status card is this screen's alert surface. Server §67 emits warranty-service and recommendation reminders in the existing reminder shape, sourced from the new table, and they already render on the hub (`BikeDetailPage.tsx`) and on Maintenance. Putting the banner here too would show the same overdue warranty service twice, in two visual languages. Spec 57 H-G, exactly.

**H-H — Four response states on the warranty card, and a bike can have regular services but no warranty ones. None may render `NaN`, `Invalid Date` or an empty box.**
(1) No services at all → no card (the list's `EmptyState` carries the Add button). (2) Warranty services logged, none overdue → "X of 5 · next ~ 15 Feb". (3) An upcoming warranty service already past its due date → **void-risk** banner tone (`warrantyVoidRisk: true`). (4) All 5 warranty services done → a "Warranty complete" resting state, next **regular** service (if any `nextService`) shown without the X-of-5 pressure. The server **omits** fields it cannot compute rather than nulling them; declare them `?: … | null` and guard with `!= null` regardless (the house rule — `utils/envConfig.ts` points at a deployed backend whose version this app cannot know). §B fixes the copy for all four.

**H-I — Adding `app/bikes/[bikeId]/service.tsx` makes `tsc --noEmit` stale until the dev server is booted once.**
Spec 51a / spec 57 H-I: `.expo/types/router.d.ts` is generated, gitignored, and regenerated **only by the dev server**, not by `npx expo export`. A new file under `app/` makes the typed-route union wrong until then. Boot once (`CI=1 timeout 75 npx expo start --port 8099`) before trusting `tsc`. The hub's drill-down push stays string-based with `as never` (`BikeDetailPage.tsx`) for this reason — follow it, don't "fix" it to a typed push.

**H-J — The quick-fill copies what repeats, never what changed.** Spec 52 / spec 57 H-J. Carry the service centre, centre type, and (for a scheduled follow-up) the service kind; **never** the odometer reading, never either date, never the previous visit's line items or recommendations — those are the whole reason the rider opened the form. A prefilled odometer is a wrong odometer that looks right. (The quick-fill here is lower value than oil's — most services differ — so it is **D10: build it last, but build it** — open Q1 settled nothing is dropped.)

**H-K — Read the warranty status from `/status`, never from the paginated list.** The list keys on `page`; `result[0]` on page 2 is a months-old visit. Deriving "X of 5" or "next due" from the list makes the card move as the rider pages. `/status` is a separate endpoint with its own query key. Spec 57 H-L.

**H-L — Server-derived fields never go in a mutation payload.** `status`, `warrantyNumber` (auto-assigned when `serviceKind === "warranty"` and omitted), and each sub-entry's server-minted `id` on _new_ entries are read-only outputs. The form submits exactly: `serviceKind`, `warrantyNumber?` (only if the rider overrode it — see §A D6), `dueDate?`, `serviceDate?`, `odometerReading?`, `serviceCenter?`, `centerType?`, `items`, `recommendations`, `notes`. At least one of `dueDate`/`serviceDate` is required (§67 validation) — enforce it client-side with a toast so the two refuse the same thing.

**H-M — A service is created `upcoming` (scheduled) OR `completed` (visited), and the form must make that one choice unambiguous.** The two-date model (§A D3) is the subtlest thing in this spec. A `serviceDate` present ⇒ completed ⇒ its `items` sum into Spending and fire the expense push. An upcoming service with only a `dueDate` contributes nothing to Spending (§67 excludes it). If the rider enters a `serviceDate`, they are saying "this happened" — so the odometer becomes relevant (bump) and the cost counts. The form's "Mark as completed" switch (§D) is what toggles the `serviceDate` field group in/out; leave it off and the service is a scheduled placeholder.

**H-N — `bumpOdometerIfHigher` runs server-side on a completed service with an odometer, so invalidate `["bikes", bikeId]`.** Completing a service with a reading higher than `currentOdometer` raises the bike's odometer (§67 service layer). The hub's odometer and every km-derived figure lag until `["bikes", bikeId]` is invalidated. It is in §C's invalidation set for the same reason oil's was.

---

## §A Decisions

- **D1 — Route `app/bikes/[bikeId]/service.tsx`, a two-line re-export; components in `components/main/ServiceLog/`.** Matches every other bike-scoped screen; `engine-oil.tsx` → `components/main/EngineOilLog/` is the exact template. Segment `service` matches the server module path (`/bikes/:bikeId/service-logs`) and the web's would-be URL. No `new.tsx` sub-route — nothing deep-links into Service.
- **D2 — Warranty status card on top, service list below, one screen.** `FuelLog.tsx` / `EngineOilLog.tsx`'s shape: a status card at the top, a paginated card list below, one `ScrollView` with `RefreshControl`. The warranty card is the reason to open this screen; the list is the evidence behind it.
- **D3 — Two dates, and the model is "scheduled → completed", not "edit a status field".** Every service is one of two things:
  - **Upcoming** — the rider scheduled it (the centre said "come back ~15 Feb"). Only `dueDate` + optionally `serviceCenter`/kind. Shows on the card as a scheduled row with a due date; contributes nothing to Spending; drives the warranty-next-due and the reminder.
  - **Completed** — the rider visited. `serviceDate` (actual) + `odometerReading` + `items` + `recommendations` + receipt. Its item costs sum into Spending.
    A service is **completed by editing the upcoming row** and switching on "Mark as completed" (the centre's due date and the actual visit date legitimately differ — due 15 Feb, went 17 Feb, §67 §Decisions 5). A service can also be created already-completed in one shot (walked in, no prior schedule). `status` is derived server-side from `serviceDate` presence (H-D) — the app never names it.
- **D4 — One form modal for create, edit, and complete**, on `MaintenanceLogFormModal`/`EngineOilLogFormModal`'s skeleton: `Portal` + `Modal` + `KeyboardAwareScrollView`, plain `useState` fields, `DECIMAL_REGEX` guards, `Toast.show` per failure, `FormActions` at the bottom. **No react-hook-form, no zod** — this app has neither; validation is the inline guard chain (spec 57 §D). The two sub-editors (§D) live inside this one modal.
- **D5 — Warranty is the primary axis; regular is the quiet default.** `serviceKind` is a `SelectPickerField` (`warranty` / `regular`), defaulting **`regular`** (§67 schema default) — because post-warranty life is the long tail and the first five are the exception, counted once and done. When `warranty` is chosen, the warranty-number is normally auto-assigned by the server (next in sequence); the form shows the assigned number read-only after save and only exposes an override field behind a disclosure (D6).
- **D6 — Warranty number: auto by default, override only when needed.** §67 auto-assigns `count(live warranty rows) + 1` when `serviceKind === "warranty"` and `warrantyNumber` is omitted. The form **omits it by default** and lets the server number it. An optional "Warranty # (1–5)" field appears only when the rider expands an "Advanced" row — for the one case the auto-sequence is wrong (a warranty service logged out of order, or backfilled). Sending it puts it in H-L's list of _conditionally_ sent fields: send only if the rider set it.
- **D7 — The receipt photo is on the card, not in the form.** `FuelLogCard`/`EngineOilLogCard`'s `ImagePickerField` (`label="Receipt"`, `size={64}`), driven by `usePut`/`useDelete` against `/bikes/:id/service-logs/:logId/image`. Keeps create a single request. Only meaningful on a completed service (an upcoming one has no receipt yet) — render the picker only when `serviceDate` is set.
- **D8 — Line items and recommendations are sub-editors inside the modal, not separate screens.** The genuinely new UI. Each is a small vertical list of rows with an add button and a per-row remove, built from the existing shared kit (`FormField`, `DatePickerField`, `SwitchField`) — no new dependency, no new shared component unless §D's two local components (`ItemsEditor`, `RecommendationsEditor`) earn being lifted later. Zero items = a free service (§67 Decision 2); zero recommendations is the common case.
- **D9 — Cards, paginated, 10 per page — `FuelLog.tsx`/`EngineOilLog.tsx`'s pager, not `MaintenanceLog.tsx`'s fixed page.** Reuse the fuel pager block verbatim. A bike accumulates services slowly, but the warranty five plus years of regulars will page.
- **D10 — "Same as last visit" quick-fill — in scope (open Q1 resolved 2026-11-19), low-value.** Unlike oil (where the oil type/interval repeat), services mostly differ, so this earns little — but nothing is frozen, so build it: copy `serviceCenter` + `centerType` only (H-J). Its low value means it is the last piece to wire, not a piece to skip.
- **D11 — No notification work, no dashboard/garage surface.** The warranty state lives on the hub via the existing reminder (server §67) and on this screen. No weekly-cron change (that stays fuel-only).
- **D12 — Card type scale follows spec 57 D14's reduced ladder**, floored at 10px — the service card carries more lines than most (date, kind/warranty tag, centre, item summary, recommendation checklist), so the same "a bit smaller, not very small" scale keeps it from running tall. `cost`/total stays the row's focal point at 16px. No line goes below 10px.
- **D13 — Spending needs one type edit and nothing else.** The "Service" category flows through `SpendingSummaryView`'s breakdown automatically (it sorts whatever categories arrive; no fixed category→colour map to extend). `TSpendingRecordSource` in `types/spending.types.ts` gains `"service"`; nothing in the app switches on `source`, so this is type hygiene (server §67 adds `"service"` to its own union). Also refresh the hardcoded `EMPTY_MESSAGE` in `components/main/Spending/Spending.tsx` if it enumerates sources (cosmetic — check, don't assume).
- **D14 — No fourth hub mini-stat for service.** Oil's D7 added "On this oil" because it is a continuous number that changes every ride. Warranty progress is discrete ("3 of 5") and changes a few times a year; it belongs on the reminder banner and the Service tile, not squeezed into the mini-stat strip (which is already 2×2 after oil's D7). Leave `BikeDetailPage.tsx`'s strip alone.

---

## §B The screen

```
← Hornet 2.0          Service
                      Hornet 2.0

┌────────────────────────────────────────────┐
│ WARRANTY SERVICE               [3 of 5]    │
│ Next service #4 ~ 15 Feb                   │
│ in 21 days · official centre               │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                        │
│ 2 services left to keep the warranty       │
└────────────────────────────────────────────┘

  8 services                           [+ Add]

┌────────────────────────────────────────────┐
│ Scheduled ~ 15 Feb   [Warranty #4]   ⋮    │
│ Honda official centre                      │
│ ⏳ upcoming · in 21 days                    │
│ [ Mark completed ]                         │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ 17 Dec 2025  [Warranty #3] [official] ⋮   │
│ ৳300                               ┌────┐ │
│ 14,200 km · Honda official centre  │ img│ │
│ • Carbon cleaner       ৳300        └────┘ │
│ ☑ Change air filter next service           │
│ ☐ Rotate tyres ~ 10 Mar                     │
└────────────────────────────────────────────┘
```

`ScreenHeader title="Service" subtitle={bike?.nickname} backLabel={bike?.nickname ?? "Back"}`, a `ScrollView` with `RefreshControl`, `styles.page` copied from `FuelLog.tsx`. Count row: `{totalCount} services` + the `Add` button (+ the optional "Same as last" button, D10).

### The warranty status card — `ServiceStatusCard.tsx` (new, no oil precedent for its content)

A `Panel` styled on `OilStatusCard.tsx`/`TankForecastCard.tsx`, carrying a **status pill** via `toneStyle` from `StatusBadge` (like oil's, unlike the tank card — the warranty state is a genuine alert). Fed only by `useFetchData<TServiceStatus>(["serviceStatus", bikeId], …)` (H-K). Five states:

| State                                                                                                    | Card                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| no services at all (`nextWarranty` and `nextService` both null, `warrantyLogged === 0`)                  | **No card** — `return null`. The list's `EmptyState` carries the icon, the explanation and the Add button (oil D-table row 1).                                                                                                                                                                               |
| warranty in progress, none overdue                                                                       | pill `{warrantyCompleted} of 5` (`success` tone); headline `Next service #{nextWarranty.number} ~ {formatApiDate(dueDate,"d MMM")}`; sub-line `in {n} days · official centre`; progress bar `warrantyCompleted / 5`; footer `{5 - warrantyCompleted} services left to keep the warranty`.                    |
| **void risk** (`warrantyVoidRisk === true` — an upcoming warranty service is already past its `dueDate`) | pill `Overdue` (`danger` tone); headline `Warranty service #{n} is overdue`; sub-line `{Math.abs(daysPast)} days past the due date`; footer in `COLORS.danger`: `Book it now — missing a service voids the warranty`. **This is the card's whole reason to exist** — the one money-bearing alert in the app. |
| all 5 warranty services done                                                                             | pill `Warranty complete` (`success`/neutral); if `nextService` present, headline `Next service ~ {date}`, sub-line `in {n} days`, **no X-of-5 pressure, no void footer, no bar**; if `nextService` null, a one-line resting state `All 5 warranty services done`.                                            |
| warranty untouched but regular services exist                                                            | treat as "warranty in progress" with `warrantyCompleted: 0` **only if** `nextWarranty` exists; otherwise fall to the resting regular-only state (headline from `nextService`, no warranty framing).                                                                                                          |

Copy rules carried from oil: the `~` before a projected date is **load-bearing** (the due date is the centre's estimate, not a promise — spec 55 H-F); **never a named weekday** (Dhaka weekend is Fri–Sat — spec 55 H-G). The progress bar is two nested `View`s (track `COLORS.edge`, fill the tone colour, `width: ${(warrantyCompleted/5)*100}%`, clamped) — not `react-native-paper`'s `ProgressBar`. Omit the bar in the "complete" and "regular-only" states.

**No client arithmetic on warranty counts or due dates** (H-B) — every number above comes straight from `/status`. The only app-side formatting is `formatApiDate` on the dates (H-C) and the `5 - warrantyCompleted` subtraction, which is display sugar over two server values.

### The row card — `ServiceLogCard.tsx` (new; `FuelLogCard`/`EngineOilLogCard` skeleton + two sub-renders)

Two visually distinct row shapes driven by `serviceDate` presence (H-D), at D12's type scale:

**Upcoming row** (`serviceDate == null`):

1. `metaRow` — `Scheduled ~ {formatApiDate(dueDate,"d MMM")}`, an `accent` tag `Warranty #{warrantyNumber}` or `Regular`, then `⋮` `ActionMenu` (Edit / Delete).
2. `serviceCenter` line when set.
3. a muted status line `⏳ upcoming · in {n} days` (or `overdue · {n} days past` in `COLORS.danger`) — derive the days label from `dueDate` with `parseApiDate` + `differenceInCalendarDays`; it is a date-only diff, not a server projection, so computing it here is allowed (contrast H-B, which is about _warranty_ figures).
4. a secondary-variant **`Mark completed`** `PrimaryButton` that opens the modal in complete-mode for this row.

**Completed row** (`serviceDate` set):

1. `metaRow` — `formatApiDate(serviceDate,"dd MMM yyyy")`, `accent` tag `Warranty #{n}` / `Regular`, `neutral` tag `official`/`local` when `centerType` set, `⋮`.
2. `costRow` — `formatTaka(itemsTotal)` big (`itemsTotal = Σ Number(item.cost)`, `০` when no items → print `Free service` muted instead of `৳0`).
3. `odoLine` — `{odometerReading.toLocaleString()} km` + ` · {serviceCenter}` when set (verbatim from `FuelLogCard`).
4. **items sub-list** (new) — one line per item: `• {name}` left, `{formatTaka(cost)}` right, muted, `tabular-nums`. Omitted entirely when no items.
5. **recommendation checklist** (new, §G) — one tappable row per recommendation: a `☑`/`☐` glyph (or a `Checkbox` from `react-native-paper`) + the text, struck-through/`textLight` when `done`, with ` ~ {formatApiDate(targetDate,"d MMM")}` appended when a `targetDate` is set. Tapping toggles `done` (§G). Omitted when no recommendations.

Right column on the completed row: `ActionMenu` (Edit / Delete) over `ImagePickerField` (D7). **No lock rule** — nothing downstream closes a period over a service, so both actions are always enabled. `confirmDelete("service log", …)`.

---

## §C Data layer

`types/service-log.types.ts` (mirror `engine-oil-log.types.ts`'s shape and comment discipline):

```ts
import { TCloudinaryImage } from "./image.types";

export type TServiceItem = {
  id?: string; // server-minted; present on reads, omitted on brand-new rows
  name: string;
  cost?: number | null; // JSON number — Number()/!= null guard on read (H-F)
};

export type TServiceRecommendation = {
  id?: string;
  text: string;
  targetDate?: string | null; // date-only — formatApiDate (H-C)
  targetOdometer?: number | null;
  done: boolean;
};

export type TServiceLog = {
  _id: string;
  bike: string;
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number | null; // 1..5, only on warranty rows
  status: "upcoming" | "completed"; // READ-ONLY, server-derived (H-D)
  dueDate?: string | null; // date-only
  serviceDate?: string | null; // date-only; presence ⇒ completed
  odometerReading?: number | null;
  serviceCenter?: string | null;
  centerType?: "official" | "local" | null;
  items?: TServiceItem[] | null;
  recommendations?: TServiceRecommendation[] | null;
  notes?: string | null;
  serviceImage?: TCloudinaryImage; // receipt
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TServiceStatus = {
  warrantyTotal: 5;
  warrantyCompleted: number; // completed warranty rows
  warrantyLogged: number; // all warranty rows (incl. upcoming)
  warrantyVoidRisk: boolean; // an upcoming warranty service is overdue
  // NB (deployed contract, confirmed 2026-11-19): the server OMITS nextWarranty/nextService
  // when absent — it never sends null. The `| null` below is defensive; guard with `!= null`.
  nextWarranty?: {
    number: number | null; // server types it nullable — a warranty row can exist pre-numbering
    dueDate: string; // date-only
    status: "upcoming" | "overdue";
  } | null;
  nextService?: {
    dueDate: string;
    status: "upcoming" | "overdue";
  } | null;
};

export type TCreateServiceLogPayload = {
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number; // only if the rider overrode it (D6)
  dueDate?: string;
  serviceDate?: string; // sets completed (H-M)
  odometerReading?: number;
  serviceCenter?: string;
  centerType?: "official" | "local";
  items?: { name: string; cost?: number }[];
  recommendations?: TServiceRecommendation[]; // ids preserved on edit (H-E)
  notes?: string;
};

export type TUpdateServiceLogPayload = Partial<TCreateServiceLogPayload>;

export type TServiceLogsApiResponse = { result: TServiceLog[]; meta: number };
```

Queries — **three keys**:

| Query                         | Key                                        | URL                                                        |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| list                          | `["serviceLogs", bikeId, page.toString()]` | `/bikes/:id/service-logs?page=&limit=10&sort=-serviceDate` |
| status                        | `["serviceStatus", bikeId]`                | `/bikes/:id/service-logs/status`                           |
| latest (quick-fill, optional) | `["serviceLogs", bikeId, "latest"]`        | `/bikes/:id/service-logs?limit=1&sort=-serviceDate`        |

`page.toString()` because `useFetchData`'s key is typed `string[]` (`hooks/useApi.ts`) — `FuelLog.tsx` already does this. `["serviceLogs", bikeId]` is a **prefix** of both list and `"latest"`, so one invalidation refreshes both.

Invalidation set for every create / edit / complete / delete / image / recommendation-toggle mutation:

```ts
[
  ["serviceLogs", bikeId],
  ["serviceStatus", bikeId],
  ["bikes", bikeId], // bumpOdometerIfHigher on a completed service (H-N)
  ["spending", bikeId], // prefix of ["spending", bikeId, "month", …]
  ["reminders", bikeId], // server §67 sources the warranty/recommendation reminder
];
```

`hooks/useServiceLogSeed.ts` (only if D10's quick-fill is kept) — `useEngineOilSeed.ts`'s shape, returning `{ seed, odometerSeed, bike, isLoading }` with `seed` carrying `serviceCenter`/`centerType`/`serviceKind` only, `odometerSeed = bike?.currentOdometer` (the floor of the server's accepted range). Sourced from `["serviceLogs", bikeId, "latest"]`, never the paginated list (spec 57 H-L). Drop this file if D10 is dropped.

---

## §D The form modal — `ServiceLogFormModal.tsx`

`MaintenanceLogFormModal`/`EngineOilLogFormModal`'s skeleton. Props: `{ open, onClose, bikeId, log?, seed?, seedOdometer?, startCompleted? }` — `startCompleted` is how the card's **Mark completed** button opens an upcoming row straight into complete-mode. Fields in order:

| Field                 | Control                                                   | Notes                                                                                                                                                         |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service kind          | `SelectPickerField`                                       | `warranty` / `regular`, default `regular` (D5)                                                                                                                |
| Warranty # (1–5)      | `FormField` `number-pad`, behind an "Advanced" disclosure | **only when kind = warranty**; optional override (D6). Empty ⇒ server auto-numbers                                                                            |
| Due date              | `DatePickerField`                                         | the centre's estimate. Optional, **but** at least one of due/service date is required (H-L) — `maximumDate` is **not** set here (a due date is in the future) |
| **Mark as completed** | `SwitchField`                                             | the pivot (H-M). Off ⇒ scheduled placeholder; on ⇒ reveals the service-date group below                                                                       |
| Service date          | `DatePickerField`                                         | **only when completed**; actual visit date, `maximumDate={new Date()}` (the house rule)                                                                       |
| Odometer (km)         | `FormField` `decimal-pad`                                 | **only when completed**; prefilled from `seedOdometer`                                                                                                        |
| Service centre        | `FormField`                                               | optional, max 100                                                                                                                                             |
| Centre type           | `SelectPickerField`                                       | `official` / `local`, optional                                                                                                                                |
| **Line items**        | `ItemsEditor` (local, §D sub-editor)                      | **only when completed**; add/remove rows of `{ name, cost }`                                                                                                  |
| **Recommendations**   | `RecommendationsEditor` (local, §D sub-editor)            | add/remove rows of `{ text, targetDate?, done }`; available whether or not completed                                                                          |
| Notes                 | `FormField` multiline 3 rows                              | optional, max 500                                                                                                                                             |

**`ItemsEditor`** (new, no precedent) — a `View` listing each item as a `styles.row`: a `FormField` for `name` (flex 2) + a `FormField` `decimal-pad` for `cost` (flex 1) + a small `IconButton` `close` to remove the row. Below the list, a secondary `PrimaryButton` `+ Add item`. Empty list is valid (free service). Each row is a `{ id?, name, cost }` in local state; on edit, existing rows keep their `id` (H-E). A running `styles.subtotal` line `Total ৳{Σ cost}` sits under the list for the rider's sanity.

**`RecommendationsEditor`** (new) — each recommendation a two-line `styles.row`: line 1 a `FormField` for `text` (flex) + remove `IconButton`; line 2 an optional `DatePickerField` "target date" (its own `rowField`, no `maximumDate` — recommendations point forward). `done` defaults `false` and is **not** editable here (it is toggled from the card, §G — the form is for authoring, the card is for ticking off). `+ Add recommendation` button below. Existing rows keep their `id`.

Validation guards, submit order, each a `Toast.show` + early return (mirror `MaintenanceLogFormModal`'s chain), bounds matching the server so the two refuse the same things:

```
!dueDate && !serviceDate                     → "Enter a due date or a service date"
completed && !DECIMAL_REGEX.test(odometer)   → "Enter a valid odometer reading"
completed && odometer > 999999               → "Odometer reading can't exceed 999,999 km"
kind==="warranty" && warrantyNo set &&
   (warrantyNo < 1 || warrantyNo > 5)        → "Warranty number must be 1–5"
any item: !name.trim()                       → "Every item needs a name"
any item: cost set && (!DECIMAL || < 0 || > 1_000_000)
                                             → "Enter a valid item cost"
any recommendation: !text.trim()             → "Every recommendation needs text"
```

`DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/` — declare the constant locally (each modal does; don't import across folders).

Submit builds `TCreateServiceLogPayload`/`TUpdateServiceLogPayload`:

- `serviceKind` always; `warrantyNumber` **only if** kind is warranty and the rider typed one (D6/H-L).
- `dueDate` as `format(dueDate, "yyyy-MM-dd")` when set; `serviceDate` similarly **only when completed** (leaving it off keeps the row upcoming — H-D/H-M).
- `odometerReading` via `parseFloat` **only when completed**.
- `items` as `[{ name, cost: cost ? parseFloat(cost) : undefined }]` filtered to rows with a name; **include `id`** on edit (H-E).
- `recommendations` as the full array with `id`, `text`, `targetDate` (`yyyy-MM-dd`), `done` — **the complete array, always** (H-E), so an edit can't silently drop one.
- `|| undefined` on optional strings. **Nothing from H-L's read-only list** (`status`, server-minted ids on new rows).

`Toast.show` success `Service scheduled` (upcoming) / `Service saved` (completed) / `Service updated` (edit). On failure, `error?.message`; `utils/axiosInstance.ts`'s interceptor already toasts API errors, so follow the maintenance modal (toasts its own) and check on a device that the screen does not double-toast — drop the local toast if it does (spec 45's precedent).

**The complete-an-upcoming path** is just edit-mode with `startCompleted` forcing the switch on: the row already carries `dueDate`/`kind`/`centre`; the rider adds `serviceDate`, `odometer`, items, recommendations, saves. The server flips `status` to `completed`, bumps the odometer, sums the items into Spending, and fires the expense push **once** via its `justCompleted` flag (§67) — the app does nothing to trigger that beyond sending `serviceDate`.

---

## §E The small edits elsewhere

1. **`components/main/Bike/BikeDetailPage.tsx` `TILES`** — one entry: `{ label: "Service", icon: "shield-check-outline", segment: "service" }`. `MaterialCommunityIcons` has `shield-check-outline` (the warranty framing). Place it after Maintenance / near the service-adjacent tiles; the grid `flexWrap`s and left-aligns, so an added tile reflows cleanly (spec 57 D6's grid note). The hub push stays string-based with `as never` (H-I).
2. **`types/spending.types.ts`** — `TSpendingRecordSource` gains `"service"` (D13). Type hygiene; nothing switches on `source`. Check whether `"accessory"`/`"oil"` landed via spec 57's edit; add only `"service"` here.

`RemindersBanner.tsx` is **untouched** — server §67 emits the warranty-service and pending-recommendation reminders in the existing shape and they render with no change (H-G governs where they may and may not appear). `components/main/Spending/*` needs no logic change — the "Service" category and its per-item records arrive from the server and render through `SpendingSummaryView` automatically; only check `EMPTY_MESSAGE` copy (D13).

---

## §F Schedule the next service on completion (in scope — D3's tail)

**Open Q1 resolved 2026-11-19: this ships in spec 73, not a `73a` follow-up.** The plan file (root `service-log-module-plan.md`) describes completing a service while entering the centre's **next** due date, and the form "orchestrates a second `usePost` creating the next `upcoming` row". It is still a convenience (not required for the module to be correct — the rider can always just Add a scheduled service afterward), so **sequence it after §A–§E** for a clean build — but build it in this spec:

- In complete-mode, an optional **"Next service due"** `DatePickerField` at the bottom of the modal.
- On a successful complete-save, if that date is set, fire a **second** `usePost` creating an `upcoming` row: `{ dueDate: nextDate, serviceKind: warrantyNumber && warrantyNumber < 5 ? "warranty" : "regular", serviceCenter, centerType }` (carry centre, not items/recommendations — H-J).
- The warranty kind is inferred: if this completed service was warranty #N with N<5, the next is warranty (#N+1, auto-numbered by the server); if N===5 or this was regular, the next is regular.
- Both writes invalidate the §C set once after the second resolves. If the second `usePost` fails, the first already succeeded — toast "Service saved, but couldn't schedule the next one" and leave the rider to Add it manually; do **not** roll back the completion.

Keep this behind a clear seam (so it stays easy to reason about and to disable if a device test turns up a problem), but it ships **in this spec** — open Q1 settled it is in scope, not a `73a` follow-up. Mark it in the commit.

---

## §G Recommendation tick-to-complete from the card (H-E)

Tapping a recommendation row on a completed service's card toggles its `done`:

1. Read the service's current `recommendations` array from the card's `log`.
2. Map it, flipping `done` on the entry whose `id` matches the tapped row — **preserve every other entry and every `id`** (H-E).
3. `usePatch` `/bikes/:id/service-logs/:logId` with `{ recommendations: <the full mapped array> }` — nothing else in the payload (a partial update leaves the other columns alone server-side).
4. Invalidate the §C set — `["reminders", bikeId]` matters here, because a pending recommendation with a `targetDate` is a live reminder and ticking it off must drop the banner line.

Optional nicety: optimistic toggle via react-query's `onMutate` so the checkbox flips instantly and rolls back on error — only if the rest is solid; the plain invalidate-on-success path is correct and simpler. A rapid double-tap must not send two conflicting arrays — disable the row while its mutation is in flight.

---

## §Web client — no change (cascade step 3 untriggered)

The server spec (§67 §Web) and the root plan both settle it: the new routes are app-only, the spending change is additive (the web Spending screen renders whatever categories/records the server returns, so "Service" appears automatically), and the expenseTracker union is unchanged. The web client does not log services, by design — note it in `bikelog_client-web-`'s `progress-tracker.md` Known Gaps, don't build it here.

---

## §J Shipping this to the phone

Three gates, in order, none of them `yarn lint`:

1. **`bikelog_server` spec 67 must be pushed and deployed** — H-A. ✅ Code **deployed & verified live 2026-11-19** (`/service-logs/status` and the list route both answer `401`). ⚠️ **But the migration was found NOT applied** — `service_logs` did not exist, every write 500'd with `P2021` (see 73b). It must be applied with `yarn db:migrate` before any real data flows. The migration is **manual** (`yarn db:migrate` with the unpooled URL — server §67 applies the hand-written `add_service_logs` migration by hand; `deploy.yml` does not run migrations). Do not build before `/service-logs/status` answers `401`, not `404`.
2. **Verify this app against that deployed server**, not stubs — this app has no stub harness and should not grow one (spec 57 §J gate 2).
3. **An EAS build.** Pushing does not deploy an Expo app — `eas.json`'s `production` profile (`autoIncrement: true`, `appVersionSource: "remote"`) is how it reaches the phone. This spec's commits ship alongside the existing unbuilt backlog; the Service tile leading to a dead screen if gate 1 is skipped is **not hot-fixable**.

---

## Test plan

No test suite exists. Static floor: `yarn lint` clean, `npx tsc --noEmit` clean **after booting the dev server once** (H-I), `npx expo export --platform web` bundling the new `/bikes/[bikeId]/service` route. Everything below needs the deployed server (§J gate 1) and a device/simulator at 360dp.

| #   | Check                                                                                                                                           | Expect                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Open Service on the developer's bike after the server deploy                                                                                    | existing services listed newest-first; completed and upcoming rows render in their two distinct shapes (§B)                                                                                                                 |
| V2  | Warranty status card against the list by hand                                                                                                   | `X of 5` matches the count of completed warranty rows; `next #N ~ date` matches the earliest upcoming warranty row's `dueDate`; **no client re-derivation disagreeing with the pill** (H-B/H-K)                             |
| V3  | Schedule a service: Add → kind warranty, due date only, Mark-completed **off**, save                                                            | an **upcoming** row with no cost, excluded from Spending; the warranty card's "next #N" updates; a reminder appears on the hub banner                                                                                       |
| V4  | Complete it: open the row → **Mark completed** → service date (a _different_ day from the due date) + odometer + one item "Carbon cleaner ৳300" | row flips to completed shape; `status` is server-derived from `serviceDate` (never sent); Spending gains ৳300 under "Service"; the warranty count +1; odometer bumped if higher (H-N)                                       |
| V5  | Create an already-completed service in one shot (walk-in, no prior schedule)                                                                    | one request, completed row, item sum in Spending, expense push fired once (not twice)                                                                                                                                       |
| V6  | Warranty auto-numbering                                                                                                                         | create a second warranty service with no number → server assigns the next in sequence; the "Advanced" override field, when set to a specific 1–5, is honoured (D6)                                                          |
| V7  | **Void risk** — let an upcoming warranty service's due date pass                                                                                | the card shows the `danger` pill, the "missing a service voids the warranty" footer, and `warrantyVoidRisk` drives it — not a client date compare on the list (H-B)                                                         |
| V8  | All 5 warranty services completed                                                                                                               | card shows the "warranty complete" resting state with no X-of-5 pressure and no void footer; `nextService` (regular) shown if present (H-H)                                                                                 |
| V9  | Line-item sub-editor                                                                                                                            | add three items, remove the middle one, the running total updates; save; reopen to edit — all items return **with their ids**, edit one cost, save — the other two are unchanged (H-E)                                      |
| V10 | Recommendation sub-editor + card toggle                                                                                                         | add "Change air filter ~ 15 Feb"; save; on the card tap it → it strikes through, the hub reminder for it drops, and reopening the form shows `done: true` preserved; the _other_ recommendations are untouched (H-E/§G)     |
| V11 | Free service                                                                                                                                    | complete a service with **zero** items                                                                                                                                                                                      | card shows `Free service`, not `৳0`; Spending unchanged; no expense push (item total 0)                                                                       |
| V12 | Dates                                                                                                                                           | due date and service date differ (due 15 Feb, went 17 Feb)                                                                                                                                                                  | both render on their correct day with no timezone slip between local midnight and 06:00 (H-C — `formatApiDate`, not the instant path)                         |
| V13 | Receipt                                                                                                                                         | upload then delete a receipt on a completed row                                                                                                                                                                             | thumb appears/clears, list refetches, no stale image; the picker is **absent** on an upcoming row (D7)                                                        |
| V14 | Delete a completed service → Spending + hub                                                                                                     | totals drop by its item sum, the warranty count recalculates, the reminder recalculates, `currentOdometer` unchanged (nothing rolls it back)                                                                                |
| V15 | Ownership scoping                                                                                                                               | another user's `bikeId` in the URL → the server's 404, surfaced cleanly, no crash                                                                                                                                           |
| V16 | Pager                                                                                                                                           | page to 2 and back                                                                                                                                                                                                          | the **warranty card does not move** (H-K); the page boundary is invisible                                                                                     |
| V17 | Validation parity                                                                                                                               | save with neither date → blocked; warranty # 6 → blocked; item with a blank name → blocked; `408.855` in a cost → blocked (`DECIMAL_REGEX`) — the same things the server refuses (§D)                                       |
| V18 | 360dp                                                                                                                                           | status card, both row shapes with their sub-lists, the modal with both sub-editors expanded, the two date pickers                                                                                                           | no horizontal scroll, no ellipsised headline, every tap target reachable; the completed card with items + a 3-item checklist does not run absurdly tall (D12) |
| V19 | Hub                                                                                                                                             | the Service tile sits in the grid and opens the screen; the warranty/recommendation reminders render in `RemindersBanner`, once (H-G)                                                                                       |
| V20 | Cold launch with an expired access token, land on Service                                                                                       | the refresh succeeds and the screen loads — the new queries go through `axiosInstance` and inherit specs 51/51b/51c unchanged (no new auth surface)                                                                         |
| V21 | **(if §F built)** complete a service with "Next service due" set                                                                                | a second upcoming row is created with the right kind (warranty #N+1 if N<5, else regular), carrying the centre but **not** the items/recommendations (H-J); a failure of the second write does not roll back the completion |

---

## Open questions — both resolved 2026-11-19

The root plan flagged two loose ends. Both are now settled:

1. **Nothing is frozen — build the full plan, §F and D10 included. (Resolved.)** The developer's direction: _"don't freeze anything, implement based on the plan file."_ So the two pieces this file previously held back for a check — **§F** (schedule-the-next-service orchestration) and **D10** (the "same as last visit" quick-fill) — are **in scope for this spec**, not deferred to a `73a` follow-up and not droppable. Sequence them after §A–§E for a clean build; ship them in the same spec. The developer may still add further requirements later ("I'll tell you when I remember") — fold those in as they arrive; that is additive and not a reason to defer what is already decided.
2. **Backend deployed; the live `/status` contract confirmed. (Resolved.)** `bikelog_server` spec 67 is pushed (0 commits ahead of `origin/master`) and deployed — `GET /api/bikes/x/service-logs/status` and the list route both answer **`401`** live (route exists, `authCheck` on an anonymous call), so H-A and §J-gate-1 are green: build against the real server. The deployed status contract (server `TServiceStatusSummary`) matches §C with two refinements now folded into the §C type: (a) `nextWarranty`/`nextService` are **omitted when absent, never `null`** — the `?: … | null` is defensive, `!= null`-guard both; (b) `nextWarranty.number` is `number | null` server-side (a warranty row can exist before its number is assigned). The old JSON-vs-relational question is a **server** decision, settled as JSON (§67) and invisible to the app, which only ever sees the remapped API shape.

One app-side question stays open — it needs a device, not the backend: whether **`react-native-paper`'s `Checkbox`** reads well for the recommendation checklist against this app's Nocturne tokens, or whether a plain `☑`/`☐` `Text` glyph (zero new surface) is cleaner. Decide on a device (V10/V18); default to the glyph until then.

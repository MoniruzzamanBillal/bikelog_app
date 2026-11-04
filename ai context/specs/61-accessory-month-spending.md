# 61: Accessories — month-based spending on the Purchased tab

Status: ✅ **Implemented 2026-11-04.** Verified to the static floor only: `npx tsc --noEmit` clean, `yarn lint`
clean. **Not run on a device**, and it depends on **`bikelog_server` spec 59** being deployed — until then the
Purchased tab shows its empty/error state (the new endpoint 404s on an older server).

Requested directly by the developer (2026-11-04):

> "in the purchase tab of the accessories page, i want to see the month based spending, current month's
> spending … in the accessories, in the purchase tab, i dont see the total spending for all item, also i cant
> see the total spending of the current month. i dont know in which month i have purchased which thing."

And, on how to build it:

> "you should make new api for this then use this in the app"

So the aggregation is a **new backend endpoint**, not client-side summing — see `bikelog_server` spec 59.
(This is also the correct call technically: the accessory list is paginated 10/page, so a client sum would only
cover one page.)

---

## Problem

The accessories **Purchased** tab (`components/main/BikeAccessory/BikeAccessory.tsx`) lists purchased items but
shows no money at all — only a count kicker (`{STATUS} {totalCount}`, driven by `meta`). The rider can't see a
grand total, this month's total, or which month each item was bought in.

## What shipped

A new **summary + month-grouped** view on the Purchased tab only. Pending/Cancelled are unchanged (still the
flat paginated list).

- **Summary strip** — two `StatTile`s side by side: **This month** (`currentMonthTotal`) and **All time**
  (`allTimeTotal`), formatted with `formatTaka`.
- **Month groups** — for each month the server returns (already newest-first and including empty months), a
  heading `NOVEMBER 2026` + right-aligned subtotal, then that month's `BikeAccessoryCard`s. An empty month
  renders `No purchases this month`. The developer explicitly chose to **show empty months** rather than skip
  them (D1).

## Files

- **New: `components/main/BikeAccessory/PurchasedAccessoriesList.tsx`** — fetches
  `GET /bikes/:bikeId/accessories/spending-summary` via `useFetchData` under key
  `["accessories-spending", bikeId]`, and renders the summary strip + month groups. Owns its own
  loading / error / empty states. Month label is `format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy")`.
- **`BikeAccessory.tsx`** — `isPurchased = statusFilter === "purchased"`:
  - the paginated list query is disabled when purchased (`enabled: !!bikeId && !isPurchased`);
  - the results region renders `<PurchasedAccessoriesList>` when purchased, else the existing
    loading/error/empty/list/pager;
  - the **urgency chip row is hidden** on the Purchased tab (D2);
  - pull-to-refresh invalidates `["accessories-spending", bikeId]` when purchased, else `refetch()`s the list.
- **`BikeAccessoryCard.tsx`** — mark-purchased / delete / image mutations now also invalidate
  `["accessories-spending", bikeId]`; and the purchased-date line uses `formatApiDate(...)` instead of
  `format(new Date(...))` (D3).
- **`BikeAccessoryFormModal.tsx`** — create / update mutations also invalidate `["accessories-spending", bikeId]`
  so editing a purchased item's price refreshes the summary.
- **`types/bike-accessory.types.ts`** — added `TAccessoryMonthGroup` and `TAccessorySpendingSummary`.

## Decisions / hazards

- **D1 — empty months are shown.** The server (spec 59) returns every month from the earliest purchase to the
  current one, empty ones with `total: 0` and `accessories: []`; the client renders them with a
  `No purchases this month` line. The current month appears even when it has no purchases, so
  `This month ৳0` is always backed by a visible section.
- **D2 — urgency chips hidden on Purchased.** Urgency is wishlist priority; it's meaningless once an item is
  bought, and the summary totals are deliberately across **all** purchases. Leaving the shared chip row visible
  would let a filter silently make the totals partial. Pending/Cancelled keep the chips.
- **D3 — `formatApiDate`, not `new Date()`.** `purchaseDate` is a backend date-only field serialized at UTC
  midnight; `new Date(str)` shifts it back a day in timezones behind UTC. `parseApiDate`/`formatApiDate`
  (`utils/formatApiDate.ts`) exist precisely for this — the card was using the raw form.
- **H1 — depends on server spec 59 being deployed.** `utils/envConfig.ts` hardcodes the deployed backend; until
  spec 59 ships there the endpoint 404s and the tab shows its error state. Both specs must deploy together (server
  first, since the app is the consumer).
- **H2 — no new pagination.** The Purchased tab now relies entirely on the summary endpoint and drops its own
  pager. The endpoint returns all purchased items grouped; for this app's scale (a handful of accessories per
  bike) that's fine. If a bike ever accumulates a very large number of purchases, revisit (server-side the query
  is unbounded today).

## Verification (device pass — owed)

- V1 Purchased tab shows **This month** and **All time** totals; **All time** matches the Spending screen's
  "Accessories" category at Lifetime.
- V2 Items are grouped under month headings, newest-first, with correct per-month subtotals.
- V3 A month with no purchases (including the current month when empty) shows `No purchases this month`, and
  **This month** reads `৳0`.
- V4 Marking a wishlist item purchased moves it into the right month and both totals update without a manual
  refresh.
- V5 Editing a purchased item's price updates its month subtotal and both totals.
- V6 Pending and Cancelled tabs are unchanged (flat paginated list, urgency chips present, no summary).
- V7 Pull-to-refresh on the Purchased tab re-fetches the summary.
- V8 Against a server without spec 59, the tab shows its error/empty state and the rest of the app is unaffected.

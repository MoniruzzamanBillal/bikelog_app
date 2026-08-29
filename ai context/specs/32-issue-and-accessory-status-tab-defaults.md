# 32: Remove "All" Filter Pill from Issues/Accessory-Status, Default to a Real Status

Status: ✅ Complete

## Goal

Two small, direct UI requests for `bikelog_app`, per the user's own words:

1. **Bike Issues page** (`components/main/BikeIssue/BikeIssue.tsx`): currently 3 filter pills — All / Open / Resolved, defaulting to All. Change to **2 pills — Open / Resolved only**, defaulting to **Open**.
2. **Bike Accessories page** (`components/main/BikeAccessory/BikeAccessory.tsx`): currently has two filter rows, **Urgency** (All/Immediate/Medium/Low) and **Status** (All/Pending/Purchased/Cancelled). **Urgency row is untouched** — leave its "All" option and everything else exactly as-is. **Status row** changes to **3 pills — Pending / Purchased / Cancelled only**, defaulting to **Pending**.

No backend change — both screens already support `?status=<value>` as a plain exact-match filter (confirmed in `bikelog_server`'s `bikeIssue.service.ts`/`bikeAccessory.service.ts`); this is purely about which values the client ever sends and pre-selects, not a new capability.

## Context

- `TBikeIssueStatus` (`types/bike-issue.types.ts`) is already `"open" | "resolved"` — no `"all"` member exists at the type level today; the current UI's "All" option is expressed as a separate `null` sentinel (`useState<TBikeIssueStatus | null>(null)`), not a third status value. Removing "All" means the state can become non-nullable (`useState<TBikeIssueStatus>("open")`), which simplifies the surrounding code (no more `?? "all"` query-key fallback, no more conditional `filterParam` string-building).
- `TAccessoryStatus` (`types/bike-accessory.types.ts`) is `"pending" | "purchased" | "cancelled"` — same shape, same simplification applies to the Status filter's state only. `TAccessoryUrgency` (`"immediate" | "medium" | "low"`) and its filter row are completely out of scope here.
- Both pages already default-load with no status filter applied (`null` → server returns everything sorted by its own default). Switching the default to a real status value changes what's shown on first load — `BikeIssue`'s initial fetch will only return `status=open` issues, and `BikeAccessory`'s initial fetch will only return `status=pending` accessories. This is the explicit, intended behavior change the user asked for, not a side effect to guard against.
- `bikeAccessoryServices.getBikeAccessoriesFromDB` has a documented, real quirk (spec 13, `bikelog_server`): when `?status=` is a single value (not the full set), it runs one `find()` scoped to just that status — meaning passing `status=open`/`status=pending` etc. is already the well-trodden, correctly-supported path (not the "all statuses, grouped" fallback), no different from how the existing "Open"/"Resolved"/"Purchased"/"Pending"/etc. pills already behave today when clicked.

## Design

### `components/main/BikeIssue/BikeIssue.tsx`

- `useState<TBikeIssueStatus | null>(null)` → `useState<TBikeIssueStatus>("open")`.
- `handleFilterChange`'s param type: `TBikeIssueStatus | null` → `TBikeIssueStatus`.
- `filterParam` (currently `statusFilter ? \`&status=${statusFilter}\` : ""`) → always append `&status=${statusFilter}` (status is now always defined).
- Query key's `statusFilter ?? "all"` → just `statusFilter`.
- The rendered pill list — currently maps over `[null, "open", "resolved"]` with a ternary label (`f === null ? "All" : ...`) — becomes a plain map over `(["open", "resolved"] as const)`, label is a direct lookup (`{ open: "Open", resolved: "Resolved" }[f]` or an equivalent small object/ternary), `key={f}` instead of `key={f ?? "all"}`.

### `components/main/BikeAccessory/BikeAccessory.tsx`

- `URGENCIES` array and `urgencyFilter`/`handleUrgencyChange` — **no changes at all**.
- `STATUSES` array: drop the `{ key: null, label: "All" }` entry, keep the other three (`pending`/`purchased`/`cancelled`) — type narrows from `{ key: TAccessoryStatus | null; label: string }[]` to `{ key: TAccessoryStatus; label: string }[]`.
- `statusFilter` state: `useState<TAccessoryStatus | null>(null)` → `useState<TAccessoryStatus>("pending")`.
- `handleStatusChange`'s param type: `TAccessoryStatus | null` → `TAccessoryStatus`.
- `filterParams.set("status", ...)` — currently conditional (`if (statusFilter) ...`), becomes unconditional (status is always defined). `urgencyFilter`'s own conditional set is untouched.
- Query key's `statusFilter ?? "all"` → just `statusFilter` (`urgencyFilter ?? "all"` untouched).

Both pages' `filterBtn`/`filterBtnActive` pill styling, layout, pagination, and every other piece of the screen are untouched — this is purely: shrink two arrays/option-lists by one entry each, and change two `useState` initial values plus their surrounding type from nullable to non-nullable.

## Implementation

1. ✅ `components/main/BikeIssue/BikeIssue.tsx` — non-nullable `statusFilter` defaulting to `"open"`, 2-pill row (Open/Resolved), simplified query-key/filter-param logic.
2. ✅ `components/main/BikeAccessory/BikeAccessory.tsx` — non-nullable `statusFilter` defaulting to `"pending"`, 3-pill Status row (Pending/Purchased/Cancelled), simplified query-key/filter-param logic for status only; `urgencyFilter` and its row untouched.

## Dependencies

None — no new packages, no backend change.

## Verify

- [x] `npx tsc --noEmit` clean.
- [x] `expo lint` clean.
- [x] Code review: Issues page's pill row renders exactly 2 pills (Open, Resolved), Open is the initial state (`useState<TBikeIssueStatus>("open")`), no "All" pill/branch left anywhere; Accessories page's Status row renders exactly 3 pills (Pending, Purchased, Cancelled) with Pending the initial state, Urgency row's array/state/handler byte-for-byte unchanged (confirmed via diff — still 4 options including All).
- [x] Confirmed the initial fetch URL for each page now includes the real default status unconditionally: `BikeIssue.tsx`'s query template literal always appends `&status=${statusFilter}` (no more conditional `filterParam`); `BikeAccessory.tsx`'s `filterParams.set("status", statusFilter)` is now unconditional (only `urgency` stays conditional, matching its own untouched "All" option).
- [ ] Not exercised on a real device/simulator or Expo web — same standing limitation as every prior spec in this app; verified via type-check, lint, and direct code review against the existing, already-proven pill-filter pattern (identical shape already used by Urgency, and by both screens' pre-existing Open/Resolved/Purchased/etc. pills).

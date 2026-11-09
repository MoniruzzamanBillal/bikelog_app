# Spec 69 — Bike detail stat panel: a shaped loading skeleton

**Status: Complete — implemented 2026-11-09 (code only; not run on a device).**

## Why

"In home page, when i select a bike, i'm redirected to a page, where at top i show stat …
now in the stat component, update the loading skeleton component." The bike detail hub's
loading state rendered a generic `SectionLoading count={4}` (four unrelated panel bars),
which looks nothing like the real stat panel. And once the bike loaded, `BikeStatStrip`
popped in a row of "—" while its own reused stat queries resolved.

## What

New **`components/main/Bike/BikeStatStripSkeleton.tsx`** with two exports:

- **`MiniStatsSkeleton({ count })`** — the pulsing mini-stat grid, shaped exactly like
  `BikeStatStrip`'s real grid (same 3-column, 31.5%-wide tiles, label bar + value bar).
- **`BikeStatStripSkeleton`** — the whole stat panel skeleton: a `Panel` (the `odoPanel`
  shape) with a skeleton odometer header (kicker + value + action button) over a `RuleFade`
  and `MiniStatsSkeleton count={6}`.

Both built from the existing shared `SkeletonBar` (one shared pulse timeline, since all mount
together).

- **`BikeDetailPage`** loading branch now renders `<BikeStatStripSkeleton />` + a skeleton
  tile grid (6 pulsing `SkeletonBar`s at the real tile size) instead of
  `SectionLoading count={4}`, so the loading view keeps the page's real shape.
- **`BikeStatStrip`** returns `<MiniStatsSkeleton count={4} />` while its three
  always-visible stat queries (`historyLoading || monthLoading || lifetimeLoading`) are still
  loading — no more "—" flash on a cold load.

## Decisions / hazards

- **D1 — the strip's skeleton is gated on the three core stats only**, not the optional oil
  queries. The oil tiles are conditional (hidden when there's no oil change), so blocking the
  whole strip on them could leave it pulsing against a slow/`404`-ing oil endpoint.
- **D2 — `count={4}` in the strip vs `6` in the panel.** The strip's own skeleton shows the
  four always-present stats (Avg mileage, month spend, Cost/km, Total spent); the oil tiles
  can't be predicted before data, so they're not pre-rendered as skeletons. The full-panel
  skeleton (used only while the *bike* loads, before the strip mounts) shows 6 to fill the
  grid.
- **H1 — reused query keys mean the strip skeleton is usually skipped.** The strip's keys are
  shared with other screens, so on a warm navigation react-query serves them from cache,
  `isLoading` is already false, and the real values render immediately — the skeleton only
  shows on a genuinely cold load. Correct behaviour.

## Cascade

App-only. No server, no web.

## Verify (not run on a device)

- V1 — cold-open a bike: the stat panel loads as a shaped skeleton (odo header + mini-grid +
  tile grid), not four generic bars.
- V2 — once the bike loads but the stat queries haven't, the strip shows a 4-tile pulsing
  skeleton, then the real values, with no "—" flash.
- V3 — warm navigation (cached): the real values show immediately, no skeleton.
- V4 — the skeleton grid lines up with the real `BikeStatStrip` grid (same column widths).

# 61 — Engine oil card: render km even when there is no ৳/km

**Status**: ✅ Code complete — implemented 2026-10-25. `npx tsc --noEmit` clean (no error in the
touched file). **Not exercised on a device** this session.
**Scope**: `bikelog_app/`, one file — `components/main/EngineOilLog/EngineOilLogCard.tsx`
(the derived-fields line, ≈L154). Client half of `bikelog_server` spec 59.
**Companion**: `bikelog_server/context/specs/59-engine-oil-km-backward.md` (the values).

---

## Request

Follows the same report as server spec 59: the "km on this oil" on each change card was computed
one card too early and the newest change showed nothing. The server fix (spec 59) flips the
measurement to **backward** — each card shows the run of the oil it drained, the oldest change
counting from odometer 0 — and prices it with the **previous** oil's cost.

---

## Goal

The card renders the backward distance on every change that has one (including the oldest, from
0), and appends the `· ৳x/km` only when the server sent a `costPerKm`.

---

## Design

### The one change

The server now returns, for the **oldest** change, `kmOnThisOil` set but `costPerKm: null` (D4 of
spec 59 — no earlier oil cost to divide). The card's line previously rendered only when **both**
fields were non-null, so the oldest change would show no distance at all. Split the guard:

```tsx
{log?.kmOnThisOil != null && (
  <Text style={styles.subLine} numberOfLines={1}>
    {log?.kmOnThisOil?.toLocaleString()} km on this oil
    {log?.costPerKm != null ? ` · ৳${log?.costPerKm?.toFixed(2)}/km` : ""}
  </Text>
)}
```

### Decisions / Hazards

| # | Note | Why |
| --- | --- | --- |
| D1 | Distance gates on `kmOnThisOil`; ৳/km is an optional suffix on `costPerKm` | The oldest change is "290 km on this oil" with no ৳/km; every other change keeps the full line |
| H1 | The label text "km on this oil" is unchanged | Under the backward model it now means the oil that was *drained* at this change. The developer uses "this oil" that way; not re-worded. Flag if a device pass finds it confusing |
| H2 | This is the per-row card field, **not** `OilStatusCard` / BikeDetail "On this oil" | Those use `kmSinceChange` from `/status` (live distance since the last change) and are untouched |

---

## Verification

- `npx tsc --noEmit` clean on the touched file.
- **Owed (device)**: open the Engine oil screen for a bike with ≥2 changes — oldest card shows
  "<reading> km on this oil" with no ৳/km; every other card shows backward distance · previous
  oil's ৳/km. Only shows against a server carrying spec 59 (deployed, or local Neon).

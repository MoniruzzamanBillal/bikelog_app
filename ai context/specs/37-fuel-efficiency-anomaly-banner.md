# 37: Fuel-Efficiency Anomaly Banner

## Status

✅ Complete

## Goal

Client for `bikelog_server` spec 39: surface the new `efficiencyAlert` field from `GET /bikes/:bikeId/mileage` as a visible warning on the bike hub screen, so a real efficiency drop is seen before it's gone looking for.

## Context

- `RemindersBanner.tsx` (`components/main/MaintenanceLog/`) is the exact pattern to mirror: a `useFetchData` hook, renders `null` while loading/empty, a tinted rounded box with an icon + bold headline + summary text. Rendered once, in `BikeDetailPage.tsx` at line 124, directly under the bike stats strip.
- `COLORS.danger` (`#f87171`) already exists in `utils/colors.ts`, alongside the `COLORS.warning` (`#fbbf24`) `RemindersBanner` uses — usable to visually distinguish an efficiency warning (more urgent/mechanical) from a maintenance reminder (routine/scheduled).
- `GET /bikes/:bikeId/mileage` is already fetched under React Query key `["mileage", "history", bikeId]` by both `FuelLog.tsx` and `MileageHistoryTab.tsx` — the new banner should use the **same key**, so it's a dedup'd read with zero extra network calls, not a fresh fetch.
- `types/mileage.types.ts`'s `TMileageHistoryResponse` needs `efficiencyAlert: TEfficiencyAlert | null` added (matching the server's spec 39 shape) before this can be typed correctly.

## Design

**Type addition**, `types/mileage.types.ts`:
```ts
export type TEfficiencyAlert = {
  isAnomaly: boolean;
  latestKmPerLiter: number;
  rollingAverageKmPerLiter: number;
  percentChange: number;
  periodsUsed: number;
};

export type TMileageHistoryResponse = {
  exactRecords: TMileageRecord[];
  approximate: TApproximateMileage | null;
  efficiencyAlert: TEfficiencyAlert | null; // new
};
```

**New component**, `components/main/Mileage/EfficiencyAlertBanner.tsx`, structurally mirroring `RemindersBanner.tsx`:
```tsx
interface EfficiencyAlertBannerProps {
  bikeId: string;
  style?: object;
}

export function EfficiencyAlertBanner({ bikeId, style }: EfficiencyAlertBannerProps) {
  const { data, isLoading } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId], // same key FuelLog.tsx / MileageHistoryTab.tsx already use
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );

  const alert = data?.data?.efficiencyAlert;
  if (isLoading || !alert || !alert.isAnomaly) return null;

  const dropPct = Math.abs(alert.percentChange * 100).toFixed(0);

  return (
    <View style={[styles.alertBanner, style]}>
      <MaterialCommunityIcons name="trending-down" size={16} color={COLORS.danger} />
      <Text style={styles.text}>
        <Text style={styles.bold}>Efficiency drop detected</Text>
        {" — "}
        {alert.latestKmPerLiter.toFixed(1)} km/L, {dropPct}% below your {alert.periodsUsed}-period average ({alert.rollingAverageKmPerLiter.toFixed(1)} km/L)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    backgroundColor: "rgba(248,113,113,0.07)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  text: { flex: 1, fontSize: 12, lineHeight: 16, color: "#fca5a5" },
  bold: { fontWeight: "700" },
});
```
(styling mirrors `RemindersBanner`'s exact structure, swapping the amber/warning tint for a red/danger one).

**Placement**: `BikeDetailPage.tsx`, directly under the existing `RemindersBanner`:
```tsx
<RemindersBanner bikeId={bikeId} maintenanceTypes={maintenanceTypes} style={styles.reminder} />
<EfficiencyAlertBanner bikeId={bikeId} style={styles.reminder} />
```
Reuses the existing `styles.reminder` spacing — no new layout style needed beyond the banner's own internal ones.

**Why here, not inside the Mileage tab**: `BikeDetailPage.tsx` is the bike-hub screen seen every session before any specific tile is opened — exactly why `RemindersBanner` itself lives there rather than inside `MaintenanceLog.tsx`. A safety-relevant efficiency warning buried one tap inside a tab most people only open when *already* investigating mileage would defeat the "catch it before the ride" purpose.

## Dependencies

Depends on `bikelog_server` spec 39 shipping first (`efficiencyAlert` field on `GET /bikes/:bikeId/mileage`) — should be verified live against real data before this client work starts, same sequencing this project already uses (e.g. spec 35 depended on spec 38).

## Implementation

- [x] `types/mileage.types.ts` — added `TEfficiencyAlert`, extended `TMileageHistoryResponse` with `efficiencyAlert: TEfficiencyAlert | null` — matches the backend's real shape byte-for-byte (cross-checked against `bikelog_server/context/progress-tracker.md`'s spec 39 entry, not just this spec's own Design sketch).
- [x] `components/main/Mileage/EfficiencyAlertBanner.tsx` — new component, built exactly as designed.
- [x] `BikeDetailPage.tsx` — imports and renders `EfficiencyAlertBanner` directly under `RemindersBanner`, reusing `styles.reminder`.
- [x] Confirmed `COLORS.danger` is `#f87171` in `utils/colors.ts` at implementation time — unchanged from planning.
- [x] `expo lint` / `npx tsc --noEmit` clean.
- [x] `ai context/progress-tracker.md` — spec's row + Recent Activity entry added.

## Verify

- [x] With `efficiencyAlert: null` or `isAnomaly: false` — code-traced: the component's own early `if (isLoading || !alert || !alert.isAnomaly) return null;` guard means no layout shift/empty box in either case, by construction.
- [x] With `efficiencyAlert.isAnomaly: true` — code-traced against the exact Design sample (unchanged from spec): red/danger tint (`rgba(248,113,113,...)` background/border, `COLORS.danger` icon, `#fca5a5` text), `toFixed(1)`/`toFixed(0)` rounding on the km/L values and percent drop.
- [x] Confirmed via source read (not a live network inspector, none available in this environment): `EfficiencyAlertBanner` uses the identical query key (`["mileage", "history", bikeId]`) and URL (`/bikes/${bikeId}/mileage`) as `FuelLog.tsx`/`MileageHistoryTab.tsx`'s own `useFetchData` calls — React Query dedupes same-key concurrent fetches by design, so this is a shared cache read, not a new request, by construction rather than by observation.
- [x] `expo lint`/`tsc --noEmit` clean (0 issues both times, checked together with spec 36's changes since both touch `BikeDetailPage.tsx`). **Not verified on-device** — same standing gap as every UI spec in this project (no device/emulator available in this environment): actual text wrapping at phone width, icon/tint rendering, and the banner's visual position relative to `RemindersBanner` when both are present are all unconfirmed. Also unconfirmed: has never been exercised against a bike with real seeded data that actually trips `isAnomaly: true` from this app's own UI — the backend's own spec 39 verification (see `bikelog_server/context/progress-tracker.md`) is the only live confirmation this shape/logic exists, not a round-trip from this client.

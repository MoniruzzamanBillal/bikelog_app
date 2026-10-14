import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TFuelLogsApiResponse } from "@/types/fuel-log.types";
import { useMemo } from "react";

export type TFuelLogSeed = {
  fuelStation?: string;
  pricePerLiter: number;
  isFullTank?: boolean;
};

/**
 * Everything `FuelLogFormModal` needs to pre-fill a *new* fill-up (spec 52).
 *
 * ! The newest log comes from its own `?limit=1&sort=-date` query, never from
 * ! the Fuel logs list's paginated query — on page 2 the first rendered row is
 * ! a months-old log, and seeding the price from it would quietly corrupt the
 * ! cost history. The query key matches the one `QuickAddFuelLogScreen` has
 * ! always used, so both screens share a single cache entry.
 *
 * ! The odometer seed is the bike's `currentOdometer`, *not* the newest fuel
 * ! log's reading: maintenance logs and the Settings odometer panel (spec 47)
 * ! also advance it, and the server validates a new reading against the higher
 * ! of the two. So `currentOdometer` is the floor of the accepted range — the
 * ! least typing and the furthest from a 400.
 *
 * ! The window is `limit=12`, not `limit=1`, for `useTankForecast` (spec 55 D3):
 * ! the tank forecast has to sum every fill-up back to the last full tank, and
 * ! `FuelLog.tsx`'s own list query is paginated and therefore unusable for it
 * ! (spec 55 H-D). 12 covers a full-tank interval at any realistic fill pattern;
 * ! when it doesn't, that hook's H-E check degrades the card instead of guessing.
 * ! Same cache key, same request count, so the seed is unaffected — it still
 * ! reads `result[0]`.
 */
export function useFuelLogSeed(bikeId: string) {
  const { data: bikeData, isLoading: isBikeLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: lastLogData, isLoading: isLastLogLoading } =
    useFetchData<TFuelLogsApiResponse>(
      ["fuelLogs", bikeId, "latest"],
      `/bikes/${bikeId}/fuel-logs?limit=12&sort=-date`,
      { enabled: !!bikeId },
    );
  const recentLogs = lastLogData?.data?.result ?? [];
  const lastLog = recentLogs[0];

  const seed = useMemo<TFuelLogSeed | undefined>(() => {
    if (!lastLog) return undefined;
    return {
      fuelStation: lastLog?.fuelStation,
      pricePerLiter: lastLog?.pricePerLiter,
      isFullTank: lastLog?.isFullTank ?? false,
    };
  }, [lastLog]);

  return {
    seed,
    odometerSeed: bike?.currentOdometer,
    bike,
    recentLogs,
    isLoading: isBikeLoading || isLastLogLoading,
  };
}

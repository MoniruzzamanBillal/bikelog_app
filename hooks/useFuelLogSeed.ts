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
      `/bikes/${bikeId}/fuel-logs?limit=1&sort=-date`,
      { enabled: !!bikeId },
    );
  const lastLog = lastLogData?.data?.result?.[0];

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
    isLoading: isBikeLoading || isLastLogLoading,
  };
}

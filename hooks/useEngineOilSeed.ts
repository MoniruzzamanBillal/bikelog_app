import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TEngineOilLogsApiResponse } from "@/types/engine-oil-log.types";
import { useMemo } from "react";

export type TEngineOilSeed = {
  oilType?: string; // the bare id, ready for SelectPickerField's value
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged: boolean;
  serviceCenter?: string;
  cost: number;
};

/**
 * Everything `EngineOilLogFormModal` needs to pre-fill a *new* oil change (spec 57 §H).
 *
 * ! H-L: the newest change comes from its own `?limit=1&sort=-changeDate` query, never
 * ! from the Engine oil list's paginated query — on page 2 the first rendered row is a
 * ! months-old change, so "Same as last" would copy the wrong oil type and cost. The key
 * ! `["engineOilLogs", bikeId, "latest"]` shares the `["engineOilLogs", bikeId]` prefix
 * ! with the list, so one invalidation refreshes both and the button can never offer the
 * ! change before last.
 *
 * ! H-J: the seed carries what REPEATS, never what changed. The odometer reading and the
 * ! change date are deliberately absent from TEngineOilSeed — those two are the whole
 * ! reason the rider opened the form, and a prefilled odometer is a wrong odometer that
 * ! looks right. It would also sail past the server's sequence check, which allows equal
 * ! readings.
 *
 * ! The odometer seed is the bike's `currentOdometer`, *not* the newest change's reading,
 * ! for the reason spec 52 chose it: `currentOdometer` only ever rises, so it is the floor
 * ! of the server's accepted range — the least typing and the furthest from a 400.
 */
export function useEngineOilSeed(bikeId: string) {
  const { data: bikeData, isLoading: isBikeLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: lastLogData, isLoading: isLastLogLoading } =
    useFetchData<TEngineOilLogsApiResponse>(
      ["engineOilLogs", bikeId, "latest"],
      `/bikes/${bikeId}/engine-oil-logs?limit=1&sort=-changeDate`,
      { enabled: !!bikeId },
    );
  const lastLog = lastLogData?.data?.result?.[0];

  const seed = useMemo<TEngineOilSeed | undefined>(() => {
    if (!lastLog) return undefined;

    // ! the three oil-type shapes again (types/engine-oil-log.types.ts) — the seed needs
    // ! the bare id, which is what SelectPickerField's `value` takes.
    const oilTypeId =
      typeof lastLog?.oilType === "object" && lastLog?.oilType
        ? lastLog?.oilType?._id
        : typeof lastLog?.oilType === "string"
          ? lastLog?.oilType
          : undefined;

    return {
      oilType: oilTypeId,
      intervalKmUsed: lastLog?.intervalKmUsed ?? undefined,
      quantityLiters: lastLog?.quantityLiters ?? undefined,
      oilFilterChanged: lastLog?.oilFilterChanged ?? false,
      serviceCenter: lastLog?.serviceCenter ?? undefined,
      cost: lastLog?.cost,
    };
  }, [lastLog]);

  return {
    seed,
    odometerSeed: bike?.currentOdometer,
    bike,
    isLoading: isBikeLoading || isLastLogLoading,
  };
}

import { useFetchData } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { TServiceLogsApiResponse } from "@/types/service-log.types";
import { useMemo } from "react";

export type TServiceSeed = {
  serviceKind: "warranty" | "regular";
  serviceCenter?: string;
  centerType?: "official" | "local";
};

/**
 * The "Same as last visit" quick-fill (spec 73 D10). Low value — most services differ — but
 * in scope (open Q1 resolved 2026-11-19), so it is built.
 *
 * ! H-J: the seed carries only what REPEATS — the centre, its type, and the service kind.
 * ! NEVER the odometer, either date, or the previous visit's line items / recommendations:
 * ! those are the whole reason the rider opened the form, and a prefilled odometer is a wrong
 * ! odometer that looks right.
 *
 * ! H-K / spec 57 H-L: the newest service comes from its own `?limit=1&sort=-serviceDate`
 * ! query, never the paginated list — `result[0]` on page 2 is a months-old visit. The key
 * ! shares the `["serviceLogs", bikeId]` prefix with the list, so one invalidation refreshes
 * ! both.
 *
 * ! The odometer seed is the bike's `currentOdometer` (the floor of the server's accepted
 * ! range), not the newest service's reading — least typing, furthest from a 400.
 */
export function useServiceLogSeed(bikeId: string) {
  const { data: bikeData, isLoading: isBikeLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: lastLogData, isLoading: isLastLogLoading } =
    useFetchData<TServiceLogsApiResponse>(
      ["serviceLogs", bikeId, "latest"],
      `/bikes/${bikeId}/service-logs?limit=1&sort=-serviceDate`,
      { enabled: !!bikeId },
    );
  const lastLog = lastLogData?.data?.result?.[0];

  const seed = useMemo<TServiceSeed | undefined>(() => {
    if (!lastLog) return undefined;
    return {
      serviceKind: lastLog?.serviceKind ?? "regular",
      serviceCenter: lastLog?.serviceCenter ?? undefined,
      centerType: lastLog?.centerType ?? undefined,
    };
  }, [lastLog]);

  return {
    seed,
    odometerSeed: bike?.currentOdometer,
    bike,
    isLoading: isBikeLoading || isLastLogLoading,
  };
}

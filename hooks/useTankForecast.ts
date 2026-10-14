import { useFetchData } from "@/hooks/useApi";
import { useFuelLogSeed } from "@/hooks/useFuelLogSeed";
import { TFuelLog } from "@/types/fuel-log.types";
import { TMileageHistoryResponse, TMileageRecord } from "@/types/mileage.types";

const DAY_MS = 86_400_000;
const RATE_WINDOW_DAYS = 28; // H-G: same window as bikelog_server spec 52 (its D1, settled 28)
const MIN_RATE_SPAN_DAYS = 14;
const MIN_RATE_DISTANCE_KM = 100;

type TRateBasis = "exact" | "approximate";

export type TTankForecast =
  | { state: "unavailable" }
  | {
      state: "range-only";
      halfRangeKm: number;
      kmPerLiter: number;
      basis: TRateBasis;
    }
  | {
      state: "live";
      halfRangeKm: number;
      kmPerLiter: number;
      basis: TRateBasis;
      anchorDate: string;
      riddenSinceAnchorKm: number;
      kmToHalf: number; // 0 when already past half
      pastHalf: boolean;
      daysToHalf: number | null; // null when km/day is unavailable
      halfDate: Date | null;
    };

/**
 * ! H-A: half a tank is not observable — nothing here reads the gauge. Every number is
 * ! derived from odometer distance and a km/L figure, so this is a forecast. If it and the
 * ! needle disagree, the needle is right.
 */
function toTime(value?: string | null): number | null {
  if (value == null) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * ! H-G: mirrors bikelog_server spec 52 §B's three rules, and must be kept mirroring them by
 * ! hand — the server is deliberately NOT asked for this number (Settled question 1), so if
 * ! spec 52's window or minimums move, they move here too. The divisor is the span the chosen
 * ! records actually COVER — never RATE_WINDOW_DAYS, which includes the days since the last
 * ! full tank that no record speaks for. Dropping the oldest records one at a time and keeping
 * ! whichever subset lands nearest a whole number of weeks is the client-side equivalent of
 * ! that spec's anchor loop: it stops a 5-or-6-day riding week from skewing the average.
 */
function computeKmPerDay(records: TMileageRecord[]): number | null {
  const cutoff = Date.now() - RATE_WINDOW_DAYS * DAY_MS;

  // records arrive periodEndDate desc; work newest-first
  const inWindow = records.filter((r) => {
    const end = toTime(r?.periodEndDate);
    return end != null && end >= cutoff;
  });
  if (inWindow.length === 0) return null;

  const newestEnd = toTime(inWindow[0]?.periodEndDate);
  if (newestEnd == null) return null;

  let best: { kmPerDay: number; offWeek: number } | null = null;

  // ! Largest subset first with a strict `<` below, so a tie on `offWeek` resolves to the
  // ! LONGER span — more data, less noise. Same tie-breaking as the server's anchor loop.
  for (let take = inWindow.length; take >= 1; take--) {
    const subset = inWindow.slice(0, take);
    const oldestStart = toTime(subset[subset.length - 1]?.periodStartDate);
    if (oldestStart == null) continue;

    const spanDays = (newestEnd - oldestStart) / DAY_MS;
    if (spanDays < MIN_RATE_SPAN_DAYS) continue;

    const distanceKm = subset.reduce((sum, r) => sum + (r?.distanceKm ?? 0), 0);
    if (distanceKm < MIN_RATE_DISTANCE_KM) continue;

    const remainder = spanDays % 7;
    const offWeek = Math.min(remainder, 7 - remainder);
    if (!best || offWeek < best.offWeek) {
      best = { kmPerDay: distanceKm / spanDays, offWeek };
    }
  }

  return best?.kmPerDay ?? null;
}

/**
 * When the tank reaches half, and the standing full-to-half range (spec 55).
 *
 * ! D6: every input is read off a query key another component already owns — `["bikes", id]`
 * ! and `["fuelLogs", id, "latest"]` via `useFuelLogSeed`, and `["mileage","history", id]`,
 * ! which `FuelLog.tsx` itself fetches. React-query dedupes identical keys, so this hook
 * ! issues no request of its own and the card it feeds is strictly read-only: no input, no
 * ! mutation, no fourth odometer write path (Settled question 4).
 */
export function useTankForecast(bikeId: string): TTankForecast {
  const { bike, recentLogs } = useFuelLogSeed(bikeId);

  const { data: mileageHistoryData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );

  const exactRecords = mileageHistoryData?.data?.exactRecords ?? [];
  const approximate = mileageHistoryData?.data?.approximate ?? null;

  // ! Not memoised on purpose: `exactRecords` and `recentLogs` are fresh array identities on
  // ! every render (`?? []`), so a `useMemo` keyed on them would never hit — and the work is
  // ! a dozen logs and a handful of records, which is cheaper than the dependency bookkeeping.
  return deriveForecast(
    bike?.fuelTankCapacityLiters,
    bike?.currentOdometer,
    exactRecords,
    approximate?.mileageKmPerLiter,
    recentLogs,
  );
}

function deriveForecast(
  capacity: number | undefined,
  currentOdometer: number | undefined,
  exactRecords: TMileageRecord[],
  approximateKmPerLiter: number | undefined,
  recentLogs: TFuelLog[],
): TTankForecast {
  const anchor = exactRecords[0];

  // ! D4: the newest exact record is specific but a single sample; the rolling approximate is
  // ! steadier and exists even for a rider who never marks a full tank. A 40 → 45 swing moves
  // ! the half-range 240 → 270 km, so the card names which figure it used — an unlabelled
  // ! number here is an unauditable one.
  const exactKmPerLiter = anchor?.mileageKmPerLiter;
  const usableExact = exactKmPerLiter != null && exactKmPerLiter > 0;
  const kmPerLiter = usableExact ? exactKmPerLiter : approximateKmPerLiter;
  const basis: TRateBasis = usableExact ? "exact" : "approximate";

  // H-K: a new bike with no fuel history has neither figure, and a bike is required to carry
  // a tank capacity — but guard both rather than dividing by a missing one.
  if (capacity == null || capacity <= 0) return { state: "unavailable" };
  if (kmPerLiter == null || kmPerLiter <= 0) return { state: "unavailable" };

  const halfCapacity = capacity / 2;
  const halfRangeKm = Math.round(halfCapacity * kmPerLiter);
  const rangeOnly: TTankForecast = {
    state: "range-only",
    halfRangeKm,
    kmPerLiter,
    basis,
  };

  // ! D1: a mileage record is CLOSED by a full-tank fill, so `endOdometer`/`periodEndDate`
  // ! are that fill's own odometer and date — no fuel-log query needed, and no `?isFullTank`
  // ! filter, which would 500 (H-H). Caveat H-I: two full tanks at the same odometer leave
  // ! the newer one with no record, so the anchor can be one fill stale — which overstates
  // ! distance ridden and so understates remaining fuel, the safe direction.
  const anchorTime = toTime(anchor?.periodEndDate);
  if (!anchor || anchorTime == null || currentOdometer == null) return rangeOnly;

  // H-K: an edited or backdated log, or an odometer correction, can put the reading below
  // the anchor. A negative distance is not a forecast.
  const riddenSinceAnchorKm = currentOdometer - anchor.endOdometer;
  if (riddenSinceAnchorKm < 0) return rangeOnly;

  // ! H-C: fuel-log dates are day-granular, so a top-up made on the same calendar day as the
  // ! full tank ties on `date` and a bare `>` would discard its liters. Odometer is monotonic
  // ! (server spec 48), so it is the tie-break.
  const topUps = recentLogs.filter((l) => {
    const t = toTime(l?.date);
    if (t == null) return false;
    if (t > anchorTime) return true;
    return t === anchorTime && l?.odometerReading > anchor.endOdometer;
  });
  const topUpLiters = topUps.reduce((sum, l) => sum + (l?.litersAdded ?? 0), 0);

  // ! H-E: if the fetched window does not reach the anchor, some top-ups are missing and the
  // ! card would claim less fuel than the tank holds — it would say "past half" on a
  // ! three-quarters-full tank. Degrade, don't guess.
  const oldestFetched = recentLogs[recentLogs.length - 1];
  const oldestFetchedTime = toTime(oldestFetched?.date);
  const windowReachesAnchor =
    !oldestFetched ||
    (oldestFetchedTime != null && oldestFetchedTime <= anchorTime);
  if (!windowReachesAnchor) return rangeOnly;

  // ! H-B: top-ups made after the anchor must be added back, or distance alone inverts the
  // ! card — 300 km ridden plus a 5 L top-up reads as "past half" on a nearly full tank.
  // ! H-K: clamp to the tank before subtracting half, since a top-up right after a full tank
  // ! (or real mileage better than the figure used) can compute more liters than it holds.
  const litersUsed = riddenSinceAnchorKm / kmPerLiter;
  const litersInTank = Math.min(capacity, capacity - litersUsed + topUpLiters);

  const pastHalf = litersInTank <= halfCapacity;
  // ! H-F: floor. `currentOdometer` only advances on a fuel log, a maintenance log or the
  // ! Settings panel, so distance ridden is understated and this figure is optimistic — the
  // ! rider reaches half earlier than told. Flooring is the whole mitigation, by decision.
  const kmToHalf = pastHalf
    ? 0
    : Math.max(0, Math.floor((litersInTank - halfCapacity) * kmPerLiter));

  const kmPerDay = computeKmPerDay(exactRecords);
  const daysToHalf =
    kmPerDay != null && kmPerDay > 0 && !pastHalf
      ? Math.max(0, Math.floor(kmToHalf / kmPerDay))
      : null;

  return {
    state: "live",
    halfRangeKm,
    kmPerLiter,
    basis,
    anchorDate: anchor.periodEndDate,
    riddenSinceAnchorKm,
    kmToHalf,
    pastHalf,
    daysToHalf,
    halfDate: daysToHalf != null ? new Date(Date.now() + daysToHalf * DAY_MS) : null,
  };
}

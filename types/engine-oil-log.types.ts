import { TCloudinaryImage } from "./image.types";

export type TEngineOilLog = {
  _id: string;
  bike: string;
  // ! populated `{ _id, name }` when the relation was included, a bare id string when it
  // ! wasn't, `null` when the row never had a type (one of server §H's imported rows).
  // ! Three shapes, same contract TMaintenanceLog.oilType already carries — read it
  // ! through getOilName(), never `log.oilType.name`.
  oilType: { _id: string; name: string } | string | null;
  odometerReading: number;
  intervalKmUsed?: number | null;
  nextDueOdometer?: number | null;
  quantityLiters?: number | null;
  oilFilterChanged: boolean;
  cost: number;
  changeDate: string;
  // ! server-computed per LIST row (§G). Explicit `null` on the newest change and on
  // ! `GET /:id`, which does not run the lookup — guard with `!= null`.
  kmOnThisOil?: number | null;
  costPerKm?: number | null;
  serviceCenter?: string | null;
  notes?: string | null;
  receiptImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TEngineOilStatus = {
  status: "ok" | "upcoming" | "overdue" | "unknown";
  currentOdometer: number;
  lastChange: {
    _id: string;
    changeDate: string;
    odometerReading: number;
    oilType: { _id: string; name: string } | null; // always populated-or-null here
    intervalKm?: number | null;
    nextDueOdometer?: number | null;
    oilFilterChanged: boolean;
  } | null;
  kmSinceChange?: number | null;
  // ! SIGNED — negative means past due. H-E: never reconstruct the overshoot from the
  // ! odometer the way RemindersBanner has to; that endpoint clamps, this one doesn't.
  kmRemaining?: number | null;
  percentUsed?: number | null;
  projectedDaysRemaining?: number | null;
  // ! a real instant, not a date-only field — H-C. `formatApiDate` is WRONG for it.
  // ! Spec 59: present in the OVERDUE state too, where it is in the past — the date the oil
  // ! is estimated to have passed its due point. `projectedDaysRemaining` stays absent when
  // ! overdue; `overdueDays` below carries that figure as a positive number instead.
  projectedDueDate?: string | null;
  overdueDays?: number | null;
  kmPerDay?: number | null;
  // ! `source` (spec 59) says which window `kmPerDay` was measured over: "recent" is the
  // ! strict 28-day rate, "history" the bike's whole fuel history, "lifetime" its odometer
  // ! since purchase. The last two are fallbacks the server uses for the DATE only — they
  // ! never move `status` — so a card rendering a date off one of them should say so.
  rateBasis?: {
    spanDays: number;
    distanceKm: number;
    source?: "recent" | "history" | "lifetime" | null;
  } | null;
  // ! Spec 59 — the PROVISIONAL forecast for a change that carries no interval of its own
  // ! (anything logged before app spec 54 started seeding `intervalKmUsed`, plus the
  // ! imported rows). Derived from the oil type's CURRENT `suggestedIntervalKm`, so it moves
  // ! if the catalog is edited, which is why the server keeps it out of the fields above.
  // ! Present only when `lastChange.intervalKm` is absent. Anything rendered from it MUST be
  // ! labelled an estimate.
  estimate?: {
    basis: "oilTypeSuggestion";
    status: "ok" | "upcoming" | "overdue";
    intervalKm: number;
    nextDueOdometer: number;
    kmRemaining: number;
    percentUsed: number;
    projectedDaysRemaining?: number | null;
    projectedDueDate?: string | null;
    overdueDays?: number | null;
  } | null;
};

// ! H-M: server-derived fields are absent on purpose. `nextDueOdometer`, `kmOnThisOil`
// ! and `costPerKm` are missing from BOTH server schemas and would be silently dropped.
export type TCreateEngineOilLogPayload = {
  oilType: string; // required — H-N, unlike the maintenance form's optional oil select
  odometerReading: number;
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged?: boolean;
  cost: number;
  changeDate?: string;
  serviceCenter?: string;
  notes?: string;
};

export type TUpdateEngineOilLogPayload = Partial<TCreateEngineOilLogPayload>;

export type TEngineOilLogsApiResponse = {
  result: TEngineOilLog[];
  meta: number;
};

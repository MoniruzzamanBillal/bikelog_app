import { TCloudinaryImage } from "./image.types";

export type TMaintenanceLog = {
  _id: string;
  bike: string;
  maintenanceType: { _id: string; name: string } | string;
  odometerReading: number;
  // ! HISTORY ONLY since spec 57 §F. Engine oil has its own module and its own screen,
  // ! and the maintenance form no longer sends or renders this. It stays because the
  // ! soft-deleted source rows server §H imported keep their oil type, which is what
  // ! makes that import reversible with one UPDATE — deleting this would make those rows
  // ! unreadable if anyone ever un-deletes them. The maintenance API still accepts it.
  oilType?:
    | { _id: string; name: string; suggestedIntervalKm: number }
    | string
    | null;
  // ! nullable, not just optional — the backend returns an explicit `null` for these
  // ! when unset. Guard with `!= null`, never `!== undefined`.
  intervalKmUsed?: number | null;
  nextDueOdometer?: number | null;
  nextDueDate?: string | null;
  cost: number;
  serviceDate: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
  serviceImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateMaintenanceLogPayload = {
  maintenanceType: string;
  odometerReading: number;
  oilType?: string;
  intervalKmUsed?: number;
  nextDueDate?: string;
  cost: number;
  serviceDate?: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
};

export type TUpdateMaintenanceLogPayload = {
  maintenanceType?: string;
  odometerReading?: number;
  oilType?: string;
  intervalKmUsed?: number;
  nextDueDate?: string;
  cost?: number;
  serviceDate?: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
};

export type TReminder = {
  // ! Populated `{ _id, name }` since backend spec 41 §C — the bare-id form is kept in the
  // ! union because `utils/envConfig.ts` points at a deployed backend that may still predate
  // ! that change. Consumers must handle both (see spec 45a).
  maintenanceType: { _id: string; name: string } | string;
  lastServiceDate: string;
  lastOdometerReading: number;
  nextDueOdometer?: number | null;
  nextDueDate?: string | null;
  status: "overdue" | "upcoming";
  kmRemaining?: number | null;
  daysRemaining?: number | null;
  // ! Server spec 52. Optional AND nullable: `utils/envConfig.ts` points at a deployed
  // ! backend that may predate spec 52, and the backend sends explicit nulls for unset
  // ! reminder fields. Guard with `!= null`. Present only for `upcoming` + distance-based.
  projectedDaysRemaining?: number | null;
  projectedDueDate?: string | null;
  kmPerDay?: number | null;
};

export type TMaintenanceLogsApiResponse = {
  result: TMaintenanceLog[];
  meta: number;
};

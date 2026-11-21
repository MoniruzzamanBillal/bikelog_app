import { TCloudinaryImage } from "./image.types";

// ! A paid additive/accessory inside a service (spec 73 §C). `id` is server-minted (bson
// ! hex): present on reads, omitted on brand-new rows. `cost` is a plain JSON number, not a
// ! Decimal — Number()/!= null-guard it on read before summing or printing (H-F).
export type TServiceItem = {
  id?: string;
  name: string;
  cost?: number | null;
};

// ! A technician recommendation for the future. A pending one (`done === false`) with a
// ! `targetDate` surfaces as a reminder. `id` is server-minted so a single recommendation can
// ! be toggled by re-submitting the whole array with its id intact (H-E).
export type TServiceRecommendation = {
  id?: string;
  text: string;
  targetDate?: string | null; // date-only — formatApiDate (H-C)
  targetOdometer?: number | null;
  done: boolean;
};

export type TServiceLog = {
  _id: string;
  bike: string;
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number | null; // 1..5, only on warranty rows
  status: "upcoming" | "completed"; // READ-ONLY, server-derived from serviceDate (H-D)
  dueDate?: string | null; // date-only
  serviceDate?: string | null; // date-only; presence ⇒ completed
  odometerReading?: number | null;
  serviceCenter?: string | null;
  centerType?: "official" | "local" | null;
  items?: TServiceItem[] | null;
  recommendations?: TServiceRecommendation[] | null;
  notes?: string | null;
  serviceImage?: TCloudinaryImage; // receipt { url, publicId }
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

// ! NB (deployed contract, confirmed 2026-11-19): the server OMITS nextWarranty/nextService
// ! when absent — it never sends null. The `| null` below is defensive; guard with `!= null`.
export type TServiceStatus = {
  warrantyTotal: 5;
  warrantyCompleted: number; // completed warranty rows
  warrantyLogged: number; // all warranty rows (incl. upcoming)
  warrantyVoidRisk: boolean; // an upcoming warranty service is overdue
  nextWarranty?: {
    number: number | null; // server types it nullable — a warranty row can exist pre-numbering
    dueDate: string; // date-only
    status: "upcoming" | "overdue";
  } | null;
  nextService?: {
    dueDate: string;
    status: "upcoming" | "overdue";
  } | null;
};

// ! H-L: server-derived fields never go in a mutation payload. `status` and the auto-assigned
// ! `warrantyNumber` are read-only outputs; a sub-entry's server-minted `id` on a NEW entry is
// ! too. `warrantyNumber` is sent only when the rider overrode it (D6).
export type TCreateServiceLogPayload = {
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number; // only if the rider overrode it (D6)
  dueDate?: string;
  serviceDate?: string; // sets completed (H-M)
  odometerReading?: number;
  serviceCenter?: string;
  centerType?: "official" | "local";
  items?: { id?: string; name: string; cost?: number }[];
  recommendations?: TServiceRecommendation[]; // ids preserved on edit (H-E)
  notes?: string;
};

export type TUpdateServiceLogPayload = Partial<TCreateServiceLogPayload>;

export type TServiceLogsApiResponse = {
  result: TServiceLog[];
  meta: number;
};

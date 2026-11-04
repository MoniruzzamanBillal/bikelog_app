import { TCloudinaryImage } from "./image.types";

export type TAccessoryUrgency = "immediate" | "medium" | "low";
export type TAccessoryStatus = "pending" | "purchased" | "cancelled";

export type TBikeAccessory = {
  _id: string;
  bike: string;
  name: string;
  urgency: TAccessoryUrgency;
  status: TAccessoryStatus;
  // ! nullable, not just optional — see the note in `maintenance-log.types.ts`.
  price?: number | null;
  // ! server-computed only — stamped the instant status transitions into "purchased", never client-sent
  purchaseDate?: string | null;
  productImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeAccessoryPayload = {
  name: string;
  urgency: TAccessoryUrgency;
  status?: TAccessoryStatus;
  price?: number;
};

export type TUpdateBikeAccessoryPayload = {
  name?: string;
  urgency?: TAccessoryUrgency;
  status?: TAccessoryStatus;
  price?: number;
};

export type TBikeAccessoriesApiResponse = {
  result: TBikeAccessory[];
  meta: number;
};

// ! GET /bikes/:bikeId/accessories/spending-summary (server spec 59). `months` is newest-first
// ! and contiguous from the earliest purchase to the current month — empty months are included
// ! (total 0, accessories []). `month` / `currentMonth` are "YYYY-MM".
export type TAccessoryMonthGroup = {
  month: string;
  total: number;
  accessories: TBikeAccessory[];
};

export type TAccessorySpendingSummary = {
  allTimeTotal: number;
  currentMonth: string;
  currentMonthTotal: number;
  months: TAccessoryMonthGroup[];
};

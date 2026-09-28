import { TCloudinaryImage } from "./image.types";

export type TMaintenanceLog = {
  _id: string;
  bike: string;
  maintenanceType: { _id: string; name: string } | string;
  odometerReading: number;
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
  maintenanceType: string;
  lastServiceDate: string;
  lastOdometerReading: number;
  nextDueOdometer?: number | null;
  nextDueDate?: string | null;
  status: "overdue" | "upcoming";
  kmRemaining?: number | null;
  daysRemaining?: number | null;
};

export type TMaintenanceLogsApiResponse = {
  result: TMaintenanceLog[];
  meta: number;
};

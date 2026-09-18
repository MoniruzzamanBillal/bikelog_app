export type TMaintenanceType = {
  _id: string;
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  createdAt: string;
  updatedAt: string;
};

export type TCreateMaintenanceTypePayload = {
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
};

export type TUpdateMaintenanceTypePayload = {
  name?: string;
  defaultIntervalKm?: number | null;
  defaultIntervalDays?: number | null;
};

export type TEngineOilType = {
  _id: string;
  name: string;
  suggestedIntervalKm: number;
  createdAt: string;
  updatedAt: string;
};

export type TCreateEngineOilTypePayload = {
  name: string;
  suggestedIntervalKm: number;
};

export type TUpdateEngineOilTypePayload = {
  name?: string;
  suggestedIntervalKm?: number;
};

export type TMaintenanceType = {
  _id: string;
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  // ! Set by the type's owner; replaces the old match on the seeded type's name that gated
  // ! the oil-type dropdown on the maintenance-log form (spec 48 §B, backend spec 46).
  requiresOilType: boolean;
  // ! Soft delete, backend spec 41. The list endpoint filters deleted rows out server-side,
  // ! so in practice this is always false on anything this app receives — declared because
  // ! it is on the payload (and on a delete response), not because the client filters on it.
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateMaintenanceTypePayload = {
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  requiresOilType?: boolean;
};

export type TUpdateMaintenanceTypePayload = {
  name?: string;
  defaultIntervalKm?: number | null;
  defaultIntervalDays?: number | null;
  requiresOilType?: boolean;
};

export type TEngineOilType = {
  _id: string;
  name: string;
  suggestedIntervalKm: number;
  // ! See TMaintenanceType.isDeleted above.
  isDeleted: boolean;
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

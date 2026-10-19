import { TCloudinaryImage } from "./image.types";

export type TFuelLog = {
  _id: string;
  bike: string;
  odometerReading: number;
  litersAdded: number;
  isFullTank: boolean;
  pricePerLiter: number;
  totalCost: number;
  // ! Spec 60 — server-computed per LIST row (`bikelog_server` spec 57), mirroring the
  // ! engine-oil card's pair. `kmOnThisFill` is the NEXT fill-up's odometer reading minus
  // ! this one's, i.e. how far this tank actually carried the bike, and `costPerKm` is this
  // ! fill-up's money over that distance. Explicit `null` on the newest fill-up, whose
  // ! period is still open, and on `GET /:id`, which does not run the lookup — guard with
  // ! `!= null`. NOT mileage: km/l still comes from the closed full-tank periods.
  kmOnThisFill?: number | null;
  costPerKm?: number | null;
  fuelStation?: string;
  date: string;
  notes?: string;
  receiptImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateFuelLogPayload = {
  odometerReading: number;
  litersAdded: number;
  isFullTank: boolean;
  pricePerLiter: number;
  fuelStation?: string;
  date?: string;
  notes?: string;
};

export type TUpdateFuelLogPayload = {
  odometerReading?: number;
  litersAdded?: number;
  isFullTank?: boolean;
  pricePerLiter?: number;
  fuelStation?: string;
  date?: string;
  notes?: string;
};

export type TMileageRecordClosed = {
  _id: string;
  bike: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  mileageKmPerLiter: number;
  periodStartDate: string;
  periodEndDate: string;
  fuelLogIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type TCreateFuelLogResponse = {
  fuelLog: TFuelLog;
  mileageRecordClosed: TMileageRecordClosed | null;
};

export type TFuelLogsApiResponse = {
  result: TFuelLog[];
  meta: number;
};

export type TMileageRecord = {
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

export type TApproximateMileage = {
  mileageKmPerLiter: number;
  basedOnFuelLogCount: number;
  isEstimate: boolean;
};

export type TMileageHistoryResponse = {
  exactRecords: TMileageRecord[];
  approximate: TApproximateMileage | null;
};

export type TMonthlyMileage = {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
};

export type TMonthlySummary = {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
};

export type TYearlyMileage = {
  targetYear: string;
  monthlySummary: TMonthlySummary[];
};

export type TLifetimeMileage = {
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
};

export type TMileageTrend = {
  months: number;
  monthlySummary: TMonthlySummary[];
};

export type TMileageInsight = {
  insight: string;
  generated: boolean;
  cached: boolean;
};

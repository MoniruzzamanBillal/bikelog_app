export type TMileageRecord = {
  _id: string;
  bike: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  mileageKmPerLiter: number;
  totalFuelCost: number;
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

export type TEfficiencyAlert = {
  isAnomaly: boolean;
  latestKmPerLiter: number;
  rollingAverageKmPerLiter: number;
  percentChange: number;
  periodsUsed: number;
};

export type TMileageHistoryResponse = {
  exactRecords: TMileageRecord[];
  approximate: TApproximateMileage | null;
  efficiencyAlert: TEfficiencyAlert | null;
};

export type TMonthlyMileage = {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
};

export type TMonthlySummary = {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
};

export type TYearlyMileage = {
  targetYear: string;
  monthlySummary: TMonthlySummary[];
};

// ! spec 62 / server spec 62: one entry per year the bike has fuel logs in,
// ! newest-first. Same figures as TMonthlySummary, so the Lifetime tab renders a
// ! per-year card exactly like the Yearly tab's per-month card.
export type TYearlyBreakdown = {
  targetYear: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
};

export type TLifetimeMileage = {
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
  // ! additive; an older server omits it, so every read is guarded with `?? []`.
  yearlySummary?: TYearlyBreakdown[];
};

export type TMileageInsight = {
  insight: string;
  generated: boolean;
  cached: boolean;
};

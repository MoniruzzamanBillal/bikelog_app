export type TCategoryBreakdown = {
  category: string;
  total: number;
};

export type TSpendingSummary = {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
};

export type TSpendingInsight = {
  insight: string;
  generated: boolean;
  cached: boolean;
};

// ! "accessory" and "oil" were both missing from this app's copy of the union (server
// ! H11); nothing here switches on `source`, so this is type hygiene, not behaviour.
export type TSpendingRecordSource =
  "fuel" | "maintenance" | "accessory" | "oil";

export type TSpendingRecord = {
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  remarks: string | null;
  source: TSpendingRecordSource;
  // ! Spec 65 / server spec 61: litres on a fuel record, null otherwise. Additive; nothing
  // ! that already consumes TSpendingRecord reads it.
  liters?: number | null;
};

export type TSpendingDetails = {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  records: TSpendingRecord[];
};

// ! Spec 62: the Month tab's accordion drill-down. One bucket per category with its
// ! line-item records nested inside, straight from `bikelog_server` spec 60's
// ! /spending-summary/monthly-breakdown. Month-only — the Year/Lifetime/Trend tabs still
// ! read TSpendingSummary.
export type TSpendingCategoryGroup = {
  category: string;
  total: number;
  records: TSpendingRecord[];
};

export type TMonthlyCategoryBreakdown = {
  period: "month";
  targetMonth: string;
  totalSpending: number;
  categories: TSpendingCategoryGroup[];
};

// ! Spec 65: the Year / Lifetime tabs' accordion drill-down, from `bikelog_server` spec
// ! 61's /spending-summary/period-breakdown. A category expands to time buckets — per-month
// ! for a year, per-year for lifetime — each with its total and (fuel only) its litres.
export type TSpendingPeriodBucket = {
  key: string;
  label: string; // "Jan" / "2026" — pre-formatted server-side
  total: number;
  liters: number | null;
};

export type TSpendingPeriodGroup = {
  category: string;
  total: number;
  totalLiters: number | null;
  buckets: TSpendingPeriodBucket[];
};

export type TPeriodCategoryBreakdown = {
  period: "year" | "lifetime";
  targetYear?: string;
  totalSpending: number;
  categories: TSpendingPeriodGroup[];
};

export type TMonthlySpending = {
  targetMonth: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
};

export type TSpendingTrend = {
  months: number;
  // ! spec 63 / server spec 63: present when the trend was requested for a fixed
  // ! calendar year (targetYear=YYYY) rather than a rolling window. Additive.
  targetYear?: string;
  monthlySummary: TMonthlySpending[];
};

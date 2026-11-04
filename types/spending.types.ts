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
  | "fuel"
  | "maintenance"
  | "accessory"
  | "oil";

export type TSpendingRecord = {
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  remarks: string | null;
  source: TSpendingRecordSource;
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

export type TMonthlySpending = {
  targetMonth: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
};

export type TSpendingTrend = {
  months: number;
  monthlySummary: TMonthlySpending[];
};

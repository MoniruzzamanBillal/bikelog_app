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

export type TMonthlySpending = {
  targetMonth: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
};

export type TSpendingTrend = {
  months: number;
  monthlySummary: TMonthlySpending[];
};

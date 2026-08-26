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

export type TSpendingRecordSource = "fuel" | "maintenance";

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

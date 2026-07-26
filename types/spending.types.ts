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

export type TMonthlySpending = {
  targetMonth: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
};

export type TSpendingTrend = {
  months: number;
  monthlySummary: TMonthlySpending[];
};

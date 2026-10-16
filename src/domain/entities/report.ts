export type ReportDateRange = { from: string; to: string };

export type SpendingSummary = {
  completedSessions: number;
  estimatedTotalCents: number;
  actualTotalCents: number;
  sessionsWithActualTotal: number;
};

export type SpendingPeriod = {
  period: string;
  estimatedTotalCents: number;
  actualTotalCents: number;
};

export type StoreSpending = {
  storeId: number;
  storeName: string;
  estimatedTotalCents: number;
  actualTotalCents: number;
  sessionCount: number;
};

export type ProductFrequency = {
  productId: number;
  productName: string;
  quantity: number;
  sessionCount: number;
};

export type ExpensiveProduct = {
  productId: number;
  productName: string;
  highestUnitPriceCents: number;
  totalSpentCents: number;
};

export type ProductPriceChange = {
  productId: number;
  productName: string;
  firstPriceCents: number;
  latestPriceCents: number;
  changeCents: number;
  firstRecordedAt: string;
  latestRecordedAt: string;
};

export type BudgetUsage = {
  sessionsWithBudget: number;
  budgetCents: number;
  estimatedTotalCents: number;
  actualTotalCents: number;
  overBudgetCount: number;
};

export type ReportsSnapshot = {
  range: ReportDateRange;
  summary: SpendingSummary;
  periods: SpendingPeriod[];
  byStore: StoreSpending[];
  frequentProducts: ProductFrequency[];
  expensiveProducts: ExpensiveProduct[];
  priceChanges: ProductPriceChange[];
  budgetUsage: BudgetUsage;
};

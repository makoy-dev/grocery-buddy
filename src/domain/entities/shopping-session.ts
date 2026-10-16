export type ShoppingSessionStatus = 'active' | 'completed' | 'cancelled';

export type ShoppingSession = {
  id: number;
  storeId: number;
  storeName: string;
  status: ShoppingSessionStatus;
  budgetCents: number;
  estimatedTotalCents: number;
  actualTotalCents: number | null;
  startedAt: string;
  completedAt: string | null;
  itemCount: number;
};

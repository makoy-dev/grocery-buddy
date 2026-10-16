export type ShoppingSessionStatus = 'active' | 'completed' | 'cancelled';

export type ShoppingSession = {
  id: number;
  storeId: number;
  storeName: string;
  status: ShoppingSessionStatus;
  budgetCents: number | null;
  estimatedTotalCents: number;
  actualTotalCents: number | null;
  startedAt: string;
  completedAt: string | null;
  itemCount: number;
};

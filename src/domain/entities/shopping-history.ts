import type { ShoppingSession } from '@/domain/entities/shopping-session';

export type ShoppingHistoryItem = {
  id: number;
  sessionId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineSubtotalCents: number;
};

export type ShoppingSessionDetails = ShoppingSession & { items: ShoppingHistoryItem[] };

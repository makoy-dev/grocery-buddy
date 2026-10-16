import type { ShoppingSession } from '@/domain/entities/shopping-session';

export interface SessionRepository {
  start(storeId: number): Promise<ShoppingSession>;
  findActive(storeId: number): Promise<ShoppingSession | null>;
  listHistory(storeId?: number): Promise<ShoppingSession[]>;
  complete(id: number, actualTotalCents: number | null): Promise<ShoppingSession>;
  discard(id: number): Promise<ShoppingSession>;
  setBudget(id: number, budgetCents: number | null): Promise<ShoppingSession>;
}

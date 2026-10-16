import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { ShoppingSessionDetails } from '@/domain/entities/shopping-history';

export type HistoryFilter = { storeId?: number; from?: string; to?: string; page?: number; pageSize?: number };

export interface ShoppingHistoryRepository {
  listCompleted(filter?: HistoryFilter): Promise<ShoppingSession[]>;
  getDetails(id: number): Promise<ShoppingSessionDetails | null>;
  deleteCompleted(id: number): Promise<void>;
}

import type { ShoppingSessionDetails } from '@/domain/entities/shopping-history';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { CartRepository } from '@/domain/interfaces/cart-repository';
import type { HistoryFilter, ShoppingHistoryRepository } from '@/domain/interfaces/shopping-history-repository';

export class HistoryService {
  constructor(private readonly history: ShoppingHistoryRepository, private readonly cart: CartRepository) {}
  list(filter?: HistoryFilter): Promise<ShoppingSession[]> { return this.history.listCompleted(filter); }
  details(id: number): Promise<ShoppingSessionDetails | null> { return this.history.getDetails(id); }
  delete(id: number): Promise<void> { return this.history.deleteCompleted(id); }
  async reuse(storeId: number, details: ShoppingSessionDetails): Promise<void> { for (const item of details.items) await this.cart.addItem({ storeId, productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents }); }
}

import type { ShoppingList, ShoppingListItem } from '@/domain/entities/shopping-list';
import type { ShoppingListRepository } from '@/domain/interfaces/shopping-list-repository';
import type { CartRepository } from '@/domain/interfaces/cart-repository';

export class ShoppingListService {
  constructor(private readonly lists: ShoppingListRepository, private readonly cart: CartRepository) {}
  list(): Promise<ShoppingList[]> { return this.lists.list(); }
  create(name: string): Promise<ShoppingList> { return this.lists.create({ name }); }
  rename(id: number, name: string): Promise<ShoppingList> { return this.lists.rename(id, name); }
  duplicate(id: number, name: string): Promise<ShoppingList> { return this.lists.duplicate(id, name); }
  delete(id: number): Promise<void> { return this.lists.delete(id); }
  items(id: number, storeId: number | null): Promise<ShoppingListItem[]> { return this.lists.items(id, storeId); }
  addItem(listId: number, productId: number, quantity: number): Promise<void> { return this.lists.addItem({ listId, productId, quantity }); }
  setQuantity(listId: number, productId: number, quantity: number): Promise<void> { return this.lists.updateQuantity(listId, productId, quantity); }
  removeItem(listId: number, productId: number): Promise<void> { return this.lists.removeItem(listId, productId); }
  setPickedUp(listId: number, productId: number, pickedUp: boolean): Promise<void> { return this.lists.setPickedUp(listId, productId, pickedUp); }

  async transferToSession(storeId: number, items: ShoppingListItem[], selectedProductIds: number[]): Promise<void> {
    const selected = items.filter((item) => selectedProductIds.includes(item.productId));
    const missing = selected.find((item) => item.priceCents === null);
    if (missing) throw new Error(`${missing.productName} has no saved price at this store.`);
    for (const item of selected) await this.cart.addItem({ storeId, productId: item.productId, unitPriceCents: item.priceCents!, quantity: item.quantity });
  }
}

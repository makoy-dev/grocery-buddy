import type { ShoppingList, ShoppingListItem } from '@/domain/entities/shopping-list';

export type CreateShoppingListInput = { name: string };
export type AddShoppingListItemInput = { listId: number; productId: number; quantity: number };

export interface ShoppingListRepository {
  list(): Promise<ShoppingList[]>;
  create(input: CreateShoppingListInput): Promise<ShoppingList>;
  rename(id: number, name: string): Promise<ShoppingList>;
  duplicate(id: number, name: string): Promise<ShoppingList>;
  delete(id: number): Promise<void>;
  items(listId: number, storeId: number | null): Promise<ShoppingListItem[]>;
  addItem(input: AddShoppingListItemInput): Promise<void>;
  updateQuantity(listId: number, productId: number, quantity: number): Promise<void>;
  removeItem(listId: number, productId: number): Promise<void>;
  setPickedUp(listId: number, productId: number, pickedUp: boolean): Promise<void>;
}

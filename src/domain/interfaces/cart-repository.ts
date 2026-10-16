import type { CartItem } from '@/domain/entities/cart-item';

export type AddCartItemInput = { storeId: number; productId: number; unitPriceCents: number };

export interface CartRepository {
  addItem(input: AddCartItemInput): Promise<void>;
  listActive(storeId: number): Promise<CartItem[]>;
  updateQuantity(storeId: number, productId: number, quantity: number): Promise<void>;
  updateUnitPrice(storeId: number, productId: number, unitPriceCents: number): Promise<void>;
  removeItem(storeId: number, productId: number): Promise<void>;
  clear(storeId: number): Promise<void>;
}

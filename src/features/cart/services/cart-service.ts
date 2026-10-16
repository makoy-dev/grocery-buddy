import type { CartItem } from '@/domain/entities/cart-item';
import type { CartRepository } from '@/domain/interfaces/cart-repository';

export class CartService {
  constructor(private readonly cart: CartRepository) {}
  addItem(storeId: number, productId: number, unitPriceCents: number): Promise<void> { return this.cart.addItem({ storeId, productId, unitPriceCents }); }
  list(storeId: number): Promise<CartItem[]> { return this.cart.listActive(storeId); }
  setQuantity(storeId: number, productId: number, quantity: number): Promise<void> { return this.cart.updateQuantity(storeId, productId, quantity); }
  setUnitPrice(storeId: number, productId: number, cents: number): Promise<void> { return this.cart.updateUnitPrice(storeId, productId, cents); }
  remove(storeId: number, productId: number): Promise<void> { return this.cart.removeItem(storeId, productId); }
  clear(storeId: number): Promise<void> { return this.cart.clear(storeId); }
}

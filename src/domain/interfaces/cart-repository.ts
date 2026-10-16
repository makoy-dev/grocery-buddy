export type AddCartItemInput = { storeId: number; productId: number; unitPriceCents: number };

export interface CartRepository {
  addItem(input: AddCartItemInput): Promise<void>;
}

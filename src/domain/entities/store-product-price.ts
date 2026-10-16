export type StoreProductPrice = {
  id: number;
  storeId: number;
  productId: number;
  currentPriceCents: number;
  updatedAt: string;
};

export type RecordPriceInput = {
  storeId: number;
  productId: number;
  priceCents: number;
  recordedAt?: string;
};

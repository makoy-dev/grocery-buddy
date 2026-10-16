import type { Product } from '@/domain/entities/product';

export type StorePriceComparison = {
  storeId: number;
  storeName: string;
  priceCents: number | null;
  updatedAt: string | null;
  isOutdated: boolean;
};

export type ProductPriceComparison = {
  product: Product;
  prices: StorePriceComparison[];
  lowestPriceCents: number | null;
};

export type ListStoreComparison = {
  storeId: number;
  storeName: string;
  totalCents: number | null;
  missingProductIds: number[];
  complete: boolean;
};

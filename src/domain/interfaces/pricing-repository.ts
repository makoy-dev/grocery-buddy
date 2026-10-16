import type {
  RecordPriceInput,
  StoreProductPrice,
} from '@/domain/entities/store-product-price';

export interface PricingRepository {
  record(input: RecordPriceInput): Promise<StoreProductPrice>;
  findCurrent(storeId: number, productId: number): Promise<StoreProductPrice | null>;
}

import type { DatabaseConnection } from '@/database/connection';
import { mapStoreProductRow } from '@/database/mappers';
import type { StoreProductRow } from '@/database/models';
import type {
  RecordPriceInput,
  StoreProductPrice,
} from '@/domain/entities/store-product-price';
import type { PricingRepository } from '@/domain/interfaces/pricing-repository';

type Clock = () => string;

export class SQLitePricingRepository implements PricingRepository {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly clock: Clock = () => new Date().toISOString(),
  ) {}

  async record(input: RecordPriceInput): Promise<StoreProductPrice> {
    assertMoneyInCents(input.priceCents);
    const recordedAt = input.recordedAt ?? this.clock();

    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `INSERT INTO store_products
          (store_id, product_id, current_price_cents, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(store_id, product_id) DO UPDATE SET
           current_price_cents = excluded.current_price_cents,
           updated_at = excluded.updated_at`,
        [input.storeId, input.productId, input.priceCents, recordedAt],
      );

      await transaction.run(
        `INSERT INTO price_history (store_id, product_id, price_cents, recorded_at)
         VALUES (?, ?, ?, ?)`,
        [input.storeId, input.productId, input.priceCents, recordedAt],
      );
    });

    const price = await this.findCurrent(input.storeId, input.productId);
    if (!price) {
      throw new Error('Price update succeeded but the stored row could not be read.');
    }

    return price;
  }

  async findCurrent(storeId: number, productId: number): Promise<StoreProductPrice | null> {
    const row = await this.database.first<StoreProductRow>(
      'SELECT * FROM store_products WHERE store_id = ? AND product_id = ?',
      [storeId, productId],
    );
    return row ? mapStoreProductRow(row) : null;
  }
}

function assertMoneyInCents(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('priceCents must be a non-negative integer.');
  }
}

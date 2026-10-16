import type { RecordPriceInput, StoreProductPrice } from '@/domain/entities/store-product-price';
import type { PricingRepository } from '@/domain/interfaces/pricing-repository';

export type PriceAmount = string | number;

export class PricingService {
  constructor(private readonly prices: PricingRepository) {}

  getCurrent(storeId: number, productId: number): Promise<StoreProductPrice | null> {
    return this.prices.findCurrent(storeId, productId);
  }

  save(storeId: number, productId: number, amount: PriceAmount): Promise<StoreProductPrice> {
    return this.prices.record({ storeId, productId, priceCents: parsePhpToCents(amount) });
  }

  saveCents(input: RecordPriceInput): Promise<StoreProductPrice> {
    return this.prices.record(input);
  }
}

export function parsePhpToCents(value: PriceAmount): number {
  const text = typeof value === 'number' ? String(value) : value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error('Enter a positive PHP amount with up to two decimal places.');
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error('Enter a positive, finite PHP amount.');
  }
  return cents;
}

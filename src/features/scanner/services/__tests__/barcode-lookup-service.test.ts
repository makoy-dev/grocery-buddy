import type { Product } from '@/domain/entities/product';
import type { StoreProductPrice } from '@/domain/entities/store-product-price';
import type { ProductRepository } from '@/domain/interfaces/product-repository';
import type { PricingRepository } from '@/domain/interfaces/pricing-repository';
import { acceptScan, BarcodeLookupService } from '@/features/scanner/services/barcode-lookup-service';

const product: Product = { id: 1, barcode: '0480000000001', name: 'Rice', brand: null, category: null, unit: null, packageSize: null, archivedAt: null, createdAt: '', updatedAt: '' };
const price = (storeId: number, cents: number): StoreProductPrice => ({ id: storeId, storeId, productId: 1, currentPriceCents: cents, updatedAt: '2026-10-16T00:00:00.000Z' });

describe('BarcodeLookupService', () => {
  it('returns the priced outcome for the selected store only', async () => {
    const products = { findByBarcode: jest.fn().mockResolvedValue(product) };
    const prices = { findCurrent: jest.fn().mockImplementation((storeId: number) => Promise.resolve(storeId === 10 ? price(10, 12500) : null)) };
    const service = new BarcodeLookupService(products as unknown as ProductRepository, prices as unknown as PricingRepository);

    await expect(service.lookup(10, '0480000000001', 'ean13')).resolves.toMatchObject({ kind: 'priced', price: { currentPriceCents: 12500 } });
    await expect(service.lookup(20, '0480000000001', 'ean13')).resolves.toMatchObject({ kind: 'missing-price' });
    expect(prices.findCurrent).toHaveBeenNthCalledWith(2, 20, product.id);
  });

  it('returns unknown for a barcode absent from the shared catalog', async () => {
    const service = new BarcodeLookupService({ findByBarcode: jest.fn().mockResolvedValue(null) } as unknown as ProductRepository, { findCurrent: jest.fn() } as unknown as PricingRepository);
    await expect(service.lookup(10, '012345678905', 'upc-a')).resolves.toEqual({ kind: 'unknown', barcode: '012345678905' });
  });

  it('accepts an EAN/UPC equivalent while preserving the stored barcode', async () => {
    const findByBarcode = jest.fn().mockImplementation((barcode: string) => Promise.resolve(barcode === '0480000000001' ? product : null));
    const service = new BarcodeLookupService({ findByBarcode } as unknown as ProductRepository, { findCurrent: jest.fn().mockResolvedValue(null) } as unknown as PricingRepository);
    await expect(service.lookup(10, '480000000001', 'upc-a')).resolves.toMatchObject({ kind: 'missing-price', barcode: '480000000001' });
    expect(findByBarcode).toHaveBeenCalledWith('0480000000001');
  });
});

describe('scan event gating', () => {
  it('rejects rapid duplicate events and accepts a later scan', () => {
    const state = { barcode: null as string | null, at: 0 };
    expect(acceptScan(state, '4800000000001', 1000)).toBe(true);
    expect(acceptScan(state, '4800000000001', 1200)).toBe(false);
    expect(acceptScan(state, '4800000000001', 2600)).toBe(true);
  });
});

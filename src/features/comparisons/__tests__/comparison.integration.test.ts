/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { configureDatabase } from '@/database/configure-database';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { SQLitePriceComparisonRepository } from '@/database/repositories/price-comparison-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteShoppingListRepository } from '@/database/repositories/shopping-list-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { lowestSavedPrice, priceDifferencePercent } from '@/features/comparisons/services/comparison-calculations';

describe('offline price comparisons', () => {
  let directory: string; let database: DatabaseConnection; let productId: number; let storeA: number; let storeB: number;
  beforeEach(async () => { directory = mkdtempSync(join(tmpdir(), 'grocery-godz-comparison-')); database = new NodeSQLiteConnection(join(directory, 'comparison.db')); await configureDatabase(database); const stores = new SQLiteStoreRepository(database); storeA = (await stores.create({ name: 'Alpha Market' })).id; storeB = (await stores.create({ name: 'Beta Market' })).id; productId = (await new SQLiteProductRepository(database).create({ barcode: '4800000000003', name: 'Milk' })).id; });
  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('returns store-isolated prices and highlights the lowest saved price', async () => {
    const pricing = new SQLitePricingRepository(database, () => '2026-10-17T00:00:00.000Z');
    await pricing.record({ storeId: storeA, productId, priceCents: 12500 }); await pricing.record({ storeId: storeB, productId, priceCents: 13200 });
    const result = await new SQLitePriceComparisonRepository(database, () => '2026-10-17T00:00:00.000Z').searchProducts('Milk');
    expect(result[0]!.lowestPriceCents).toBe(12500); expect(result[0]!.prices.map((price) => price.priceCents)).toEqual([12500, 13200]); expect(priceDifferencePercent(13200, 12500)).toBeCloseTo(5.6, 1);
  });

  it('keeps missing prices unknown and marks incomplete list totals', async () => {
    const lists = new SQLiteShoppingListRepository(database); const list = await lists.create({ name: 'Milk run' }); await lists.addItem({ listId: list.id, productId, quantity: 2 });
    await new SQLitePricingRepository(database).record({ storeId: storeA, productId, priceCents: 12500 });
    const repository = new SQLitePriceComparisonRepository(database); const product = await repository.searchProducts('4800000000003'); expect(product[0]!.prices.find((price) => price.storeId === storeB)!.priceCents).toBeNull(); const totals = await repository.compareShoppingList(list.id); expect(totals.find((total) => total.storeId === storeA)).toMatchObject({ complete: true, totalCents: 25000 }); expect(totals.find((total) => total.storeId === storeB)).toMatchObject({ complete: false, totalCents: null, missingProductIds: [productId] }); expect(lowestSavedPrice([12500, null])).toBe(12500);
  });
});

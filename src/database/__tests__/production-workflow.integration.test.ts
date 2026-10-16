/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { configureDatabase } from '@/database/configure-database';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLiteSessionRepository } from '@/database/repositories/session-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { BarcodeLookupService } from '@/features/scanner/services/barcode-lookup-service';

describe('production workflow business rules', () => {
  let database: DatabaseConnection;
  let directory: string;
  beforeEach(async () => { directory = mkdtempSync(join(tmpdir(), 'grocery-godz-production-')); database = new NodeSQLiteConnection(join(directory, 'production.db')); await configureDatabase(database); });
  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('keeps prices, scans, carts, and sessions isolated across three stores', async () => {
    const stores = new SQLiteStoreRepository(database);
    const [sm, robinsons, puregold] = await Promise.all([stores.create({ name: 'SM' }), stores.create({ name: 'Robinsons' }), stores.create({ name: 'Puregold' })]);
    const products = new SQLiteProductRepository(database);
    const product = await products.create({ barcode: '4800000000001', name: 'Coffee' });
    const pricing = new SQLitePricingRepository(database, () => '2026-10-17T10:00:00.000Z');
    await pricing.record({ storeId: sm.id, productId: product.id, priceCents: 12500 });
    await pricing.record({ storeId: robinsons.id, productId: product.id, priceCents: 13200 });
    const lookup = new BarcodeLookupService(products, pricing);
    expect((await lookup.lookup(sm.id, '4800000000001', 'ean13')).kind).toBe('priced');
    expect((await lookup.lookup(sm.id, '4800000000001', 'ean13')) as { price: { currentPriceCents: number } }).toMatchObject({ price: { currentPriceCents: 12500 } });
    expect((await lookup.lookup(robinsons.id, '4800000000001', 'ean13')) as { price: { currentPriceCents: number } }).toMatchObject({ price: { currentPriceCents: 13200 } });
    expect(await lookup.lookup(puregold.id, '4800000000001', 'ean13')).toMatchObject({ kind: 'missing-price' });
    expect(await lookup.lookup(sm.id, '4800000000002', 'ean13')).toMatchObject({ kind: 'unknown' });

    const sessions = new SQLiteSessionRepository(database, () => '2026-10-17T10:00:00.000Z');
    const cart = new SQLiteCartRepository(database);
    const smSession = await sessions.start(sm.id);
    await cart.addItem({ storeId: sm.id, productId: product.id, quantity: 2, unitPriceCents: 12500 });
    expect((await cart.listActive(sm.id))[0]).toMatchObject({ quantity: 2, lineSubtotalCents: 25000 });
    const robinsonsSession = await sessions.start(robinsons.id);
    expect(robinsonsSession.id).not.toBe(smSession.id);
    expect(await cart.listActive(robinsons.id)).toEqual([]);
    await sessions.complete(smSession.id, 26000);
    expect(await sessions.findActive(sm.id)).toBeNull();
    expect((await sessions.listHistory(sm.id))[0]).toMatchObject({ actualTotalCents: 26000, estimatedTotalCents: 25000 });
  });
});

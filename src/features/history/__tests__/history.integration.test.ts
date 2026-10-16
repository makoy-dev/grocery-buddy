/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { configureDatabase } from '@/database/configure-database';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLiteSessionRepository } from '@/database/repositories/session-repository';
import { SQLiteShoppingHistoryRepository } from '@/database/repositories/shopping-history-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';

describe('shopping history', () => {
  let directory: string;
  let database: DatabaseConnection;
  let storeId: number;
  let productId: number;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'grocery-godz-history-'));
    database = new NodeSQLiteConnection(join(directory, 'history.db'));
    await configureDatabase(database);
    storeId = (await new SQLiteStoreRepository(database).create({ name: 'History Market' })).id;
    productId = (await new SQLiteProductRepository(database).create({ barcode: '4800000000002', name: 'Original Name' })).id;
  });
  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('persists completed sessions and historical product name and price snapshots', async () => {
    const cart = new SQLiteCartRepository(database, () => '2026-10-15T10:00:00.000Z');
    const sessionRepo = new SQLiteSessionRepository(database, () => '2026-10-15T10:00:00.000Z');
    const session = await sessionRepo.start(storeId);
    await cart.addItem({ storeId, productId, quantity: 2, unitPriceCents: 12500 });
    await database.run('UPDATE products SET name = ?, archived_at = ? WHERE id = ?', ['Renamed Product', '2026-10-16T00:00:00.000Z', productId]);
    await sessionRepo.complete(session.id, 26000);
    const details = await new SQLiteShoppingHistoryRepository(database).getDetails(session.id);
    expect(details?.items[0]).toMatchObject({ productName: 'Original Name', quantity: 2, unitPriceCents: 12500, lineSubtotalCents: 25000 });
    expect(details?.actualTotalCents).toBe(26000);
  });

  it('filters completed sessions by store and date range', async () => {
    const sessionRepo = new SQLiteSessionRepository(database, () => '2026-10-15T10:00:00.000Z');
    const first = await sessionRepo.start(storeId);
    await sessionRepo.complete(first.id, null);
    const history = new SQLiteShoppingHistoryRepository(database);
    expect((await history.listCompleted({ storeId, from: '2026-10-15', to: '2026-10-15T23:59:59.999Z' })).map((item) => item.id)).toEqual([first.id]);
    expect(await history.listCompleted({ from: '2026-10-16' })).toEqual([]);
  });
});

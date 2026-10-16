/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { configureDatabase } from '@/database/configure-database';
import { SQLiteBackupRepository, assertBackupFormat } from '@/database/repositories/backup-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteSessionRepository } from '@/database/repositories/session-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { SQLiteSettingsRepository } from '@/database/repositories/settings-repository';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLiteShoppingListRepository } from '@/database/repositories/shopping-list-repository';

describe('offline backup and restore', () => {
  let directory: string;
  let database: DatabaseConnection;
  beforeEach(async () => { directory = mkdtempSync(join(tmpdir(), 'grocery-godz-backup-')); database = new NodeSQLiteConnection(join(directory, 'backup.db')); await configureDatabase(database); });
  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('exports and restores all supported application data', async () => {
    const store = await new SQLiteStoreRepository(database).create({ name: 'Backup Market' });
    const product = await new SQLiteProductRepository(database).create({ barcode: '0000000000001', name: 'Rice' });
    await new SQLitePricingRepository(database).record({ storeId: store.id, productId: product.id, priceCents: 5000 });
    const list = await new SQLiteShoppingListRepository(database).create({ name: 'Staples' });
    await new SQLiteShoppingListRepository(database).addItem({ listId: list.id, productId: product.id, quantity: 2 });
    const session = new SQLiteSessionRepository(database, () => '2026-10-17T10:00:00.000Z');
    const active = await session.start(store.id);
    await new SQLiteCartRepository(database).addItem({ storeId: store.id, productId: product.id, quantity: 2, unitPriceCents: 5000 });
    await session.complete(active.id, 10000);
    await new SQLiteSettingsRepository(database).set('theme_preference', 'dark');
    const repository = new SQLiteBackupRepository(database);
    const backup = await repository.exportData('2026-10-17T12:00:00.000Z');
    await repository.resetAllData();
    await repository.importData(backup);
    expect(await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM stores')).toEqual({ count: 1 });
    expect(await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM products')).toEqual({ count: 1 });
    expect(await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM price_history')).toEqual({ count: 1 });
    expect(await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM shopping_sessions')).toEqual({ count: 1 });
    expect(await database.first<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['theme_preference'])).toEqual({ value: 'dark' });
  });

  it('rejects malformed and duplicate-id backups before changing data', async () => {
    const store = await new SQLiteStoreRepository(database).create({ name: 'Keep Me' });
    const repository = new SQLiteBackupRepository(database);
    const backup = await repository.exportData();
    expect(() => assertBackupFormat({ ...backup, version: 99 })).toThrow('Unsupported backup format');
    const duplicate = { ...backup, data: { ...backup.data, stores: [backup.data.stores[0]!, backup.data.stores[0]!] } };
    expect(() => assertBackupFormat(duplicate)).toThrow('duplicate IDs');
    expect(await database.first<{ name: string }>('SELECT name FROM stores WHERE id = ?', [store.id])).toEqual({ name: 'Keep Me' });
  });

  it('rolls back an interrupted restore and preserves the previous database', async () => {
    const store = await new SQLiteStoreRepository(database).create({ name: 'Original' });
    const repository = new SQLiteBackupRepository(database);
    const backup = await repository.exportData();
    const broken = { ...backup, data: { ...backup.data, stores: [{ ...backup.data.stores[0]!, name: '' }] } };
    await expect(repository.importData(broken)).rejects.toThrow();
    expect(await database.first<{ name: string }>('SELECT name FROM stores WHERE id = ?', [store.id])).toEqual({ name: 'Original' });
  });
});

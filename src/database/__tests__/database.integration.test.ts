/** @jest-environment node */
/// <reference types="node" />

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseConnection } from '@/database/connection';
import { configureDatabase } from '@/database/configure-database';
import { initialSchemaMigration } from '@/database/migrations/001-initial-schema';
import { latestSchemaVersion } from '@/database/migrations';
import { runMigrations } from '@/database/migrations/migration-runner';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLiteSettingsRepository } from '@/database/repositories/settings-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { StoreDeletionBlockedError } from '@/domain/errors/store-errors';
import { StoreService } from '@/features/stores/services/store-service';
import { ProductService } from '@/features/products/services/product-service';
import { PricingService, parsePhpToCents } from '@/features/pricing/services/pricing-service';

import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';

const timestamp = '2026-10-16T00:00:00.000Z';
const clock = () => timestamp;

describe('SQLite database infrastructure', () => {
  let directory: string;
  let databasePath: string;
  let database: DatabaseConnection;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'grocery-buddy-database-'));
    databasePath = join(directory, 'grocery-buddy.test.db');
    database = new NodeSQLiteConnection(databasePath);
    await configureDatabase(database);
  });

  afterEach(async () => {
    await database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('initializes every table and enables foreign keys on first install', async () => {
    const rows = await database.all<{ name: string }>(
      `SELECT name
       FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    );
    const foreignKeys = await database.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    const schemaVersion = await database.first<{ version: number }>(
      'SELECT MAX(version) AS version FROM schema_version',
    );

    expect(rows.map(({ name }) => name)).toEqual([
      'app_settings',
      'price_history',
      'products',
      'schema_version',
      'shopping_items',
      'shopping_list_items',
      'shopping_lists',
      'shopping_sessions',
      'store_products',
      'stores',
    ]);
    expect(foreignKeys?.foreign_keys).toBe(1);
    expect(schemaVersion?.version).toBe(latestSchemaVersion);
  });

  it('runs migrations idempotently without removing existing data', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const store = await stores.create({ name: 'Neighborhood Market' });

    await runMigrations(database, clock);

    const versionRows = await database.all<{ version: number }>('SELECT version FROM schema_version ORDER BY version');
    expect(versionRows).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    await expect(stores.findById(store.id)).resolves.toEqual(store);
  });

  it('upgrades a version-one database without dropping its rows', async () => {
    await database.close();
    database = new NodeSQLiteConnection(join(directory, 'legacy.db'));
    await database.exec('PRAGMA foreign_keys = ON;');
    await initialSchemaMigration.up(database);
    await database.exec(`
      CREATE TABLE schema_version (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      ) STRICT;
    `);
    await database.run(
      'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
      [1, initialSchemaMigration.name, timestamp],
    );
    const stores = new SQLiteStoreRepository(database, clock);
    const createdStore = await stores.create({ name: 'Upgrade Market' });

    await runMigrations(database, clock);

    expect(await stores.findById(createdStore.id)).toEqual(createdStore);
    await expect(
      database.run('DELETE FROM stores WHERE id = ?', [createdStore.id]),
    ).resolves.toMatchObject({ changes: 1 });
    await expect(database.first<{ version: number }>(
      'SELECT MAX(version) AS version FROM schema_version',
    )).resolves.toEqual({ version: 3 });
  });

  it('enforces foreign-key relationships', async () => {
    await expect(
      database.run(
        `INSERT INTO store_products
          (store_id, product_id, current_price_cents, updated_at)
         VALUES (?, ?, ?, ?)`,
        [999, 999, 2500, timestamp],
      ),
    ).rejects.toThrow(/FOREIGN KEY/i);
  });

  it('prevents duplicate normalized stores and duplicate product barcodes', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);

    await stores.create({ name: 'Fresh  Mart' });
    await products.create({ barcode: '0012345678905', name: 'Milk' });

    await expect(stores.create({ name: ' fresh mart ' })).rejects.toThrow(/UNIQUE/i);
    await expect(
      products.create({ barcode: '0012345678905', name: 'Different Milk' }),
    ).rejects.toThrow(/UNIQUE/i);

    const storedProduct = await products.findByBarcode('0012345678905');
    expect(storedProduct?.barcode).toBe('0012345678905');
  });

  it('isolates the current product price for each store', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const firstStore = await stores.create({ name: 'Market One' });
    const secondStore = await stores.create({ name: 'Market Two' });
    const product = await products.create({ barcode: '0001002003004', name: 'Rice' });

    await prices.record({ storeId: firstStore.id, productId: product.id, priceCents: 8750 });
    await prices.record({ storeId: secondStore.id, productId: product.id, priceCents: 8995 });

    await expect(prices.findCurrent(firstStore.id, product.id)).resolves.toMatchObject({
      currentPriceCents: 8750,
    });
    await expect(prices.findCurrent(secondStore.id, product.id)).resolves.toMatchObject({
      currentPriceCents: 8995,
    });

    const historyCount = await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM price_history WHERE product_id = ?',
      [product.id],
    );
    expect(historyCount?.count).toBe(2);
  });

  it('stores money as integer cents and rejects fractional cents', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const store = await stores.create({ name: 'Cents Market' });
    const product = await products.create({ barcode: '0000000000017', name: 'Bread' });

    await prices.record({ storeId: store.id, productId: product.id, priceCents: 1299 });

    const storedValue = await database.first<{ price_cents: number; storage_type: string }>(
      `SELECT price_cents, typeof(price_cents) AS storage_type
       FROM price_history
       WHERE store_id = ? AND product_id = ?`,
      [store.id, product.id],
    );
    expect(storedValue).toEqual({ price_cents: 1299, storage_type: 'integer' });
    await expect(
      prices.record({ storeId: store.id, productId: product.id, priceCents: 12.99 }),
    ).rejects.toThrow('priceCents must be a positive integer.');
  });

  it('allows only one active shopping session per store', async () => {
    const store = await new SQLiteStoreRepository(database, clock).create({ name: 'Session Market' });

    await database.run(
      `INSERT INTO shopping_sessions
        (store_id, status, budget_cents, estimated_total_cents, started_at)
       VALUES (?, 'active', ?, ?, ?)`,
      [store.id, 5000, 0, timestamp],
    );

    await expect(
      database.run(
        `INSERT INTO shopping_sessions
          (store_id, status, budget_cents, estimated_total_cents, started_at)
         VALUES (?, 'active', ?, ?, ?)`,
        [store.id, 8000, 0, timestamp],
      ),
    ).rejects.toThrow(/UNIQUE/i);
  });

  it('persists data after the database is closed and reopened', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const createdStore = await stores.create({ name: 'Persistent Market', isFavorite: true });

    await database.close();
    database = new NodeSQLiteConnection(databasePath);
    await configureDatabase(database);

    const reopenedStore = await new SQLiteStoreRepository(database, clock).findById(createdStore.id);
    expect(reopenedStore).toEqual(createdStore);
  });

  it('supports store search, editing, favorites, and selected-store persistence', async () => {
    const storeRepository = new SQLiteStoreRepository(database, clock);
    const service = new StoreService(storeRepository, new SQLiteSettingsRepository(database));
    const created = await service.create({ name: '  Local  Grocer  ' });

    await expect(service.list('local')).resolves.toHaveLength(1);
    await service.update(created.id, { name: 'Local Grocer Updated' });
    await service.setFavorite(created.id, true);
    await service.select(created.id);

    await expect(service.getSelected()).resolves.toMatchObject({
      name: 'Local Grocer Updated',
      isFavorite: true,
      productCount: 0,
    });
  });

  it('blocks deletion when a store has saved price data', async () => {
    const storeRepository = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const service = new StoreService(storeRepository, new SQLiteSettingsRepository(database));
    const store = await service.create({ name: 'Protected Market' });
    const product = await products.create({ barcode: '0099999999999', name: 'Tea' });
    await prices.record({ storeId: store.id, productId: product.id, priceCents: 499 });

    await expect(service.delete(store.id)).rejects.toBeInstanceOf(StoreDeletionBlockedError);
    await expect(storeRepository.findById(store.id)).resolves.not.toBeNull();
  });

  it('deletes an empty store without affecting other stores', async () => {
    const storeRepository = new SQLiteStoreRepository(database, clock);
    const settings = new SQLiteSettingsRepository(database);
    const service = new StoreService(storeRepository, settings);
    const first = await service.create({ name: 'Temporary Market' });
    const second = await service.create({ name: 'Keep Market' });
    await service.select(first.id);

    await service.delete(first.id);

    await expect(storeRepository.findById(first.id)).resolves.toBeNull();
    await expect(storeRepository.findById(second.id)).resolves.not.toBeNull();
    await expect(service.getSelected()).resolves.toBeNull();
  });

  it('supports product search, archive, restore, and store-scoped missing prices', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const firstStore = await stores.create({ name: 'First Market' });
    const secondStore = await stores.create({ name: 'Second Market' });
    const rice = await products.create({ barcode: '00001', name: 'Jasmine Rice', brand: 'Local Farms' });
    const tea = await products.create({ barcode: '00002', name: 'Breakfast Tea', brand: 'Local Farms' });
    await prices.record({ storeId: firstStore.id, productId: rice.id, priceCents: 1299 });
    const service = new ProductService(products);

    await expect(service.list({ search: '00001' })).resolves.toHaveLength(1);
    await expect(service.list({ search: 'local farms' })).resolves.toHaveLength(2);
    await expect(service.list({ storeId: firstStore.id, missingPriceOnly: true })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: tea.id, hasPriceForStore: false })]),
    );
    await expect(service.list({ storeId: secondStore.id, missingPriceOnly: true })).resolves.toHaveLength(2);

    await service.archive(rice.id);
    await expect(service.list()).resolves.toHaveLength(1);
    await expect(service.list({ includeArchived: true })).resolves.toHaveLength(2);
    await service.unarchive(rice.id);
    await expect(service.list()).resolves.toHaveLength(2);
  });

  it('keeps referenced products safe from deletion while preserving price history on archive', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const store = await stores.create({ name: 'Safe Market' });
    const product = await products.create({ barcode: '00003', name: 'Protected Product' });
    await prices.record({ storeId: store.id, productId: product.id, priceCents: 500 });

    await expect(database.run('DELETE FROM products WHERE id = ?', [product.id])).rejects.toThrow(/Cannot delete a product/);
    await products.archive(product.id);
    await expect(database.first<{ count: number }>('SELECT COUNT(*) AS count FROM price_history WHERE product_id = ?', [product.id])).resolves.toEqual({ count: 1 });
  });

  it('records independent price history and keeps cart snapshot prices unchanged', async () => {
    const stores = new SQLiteStoreRepository(database, clock);
    const products = new SQLiteProductRepository(database, clock);
    const prices = new SQLitePricingRepository(database, clock);
    const service = new PricingService(prices);
    const store = await stores.create({ name: 'Snapshot Market' });
    const product = await products.create({ barcode: '00004', name: 'Coffee' });
    await service.save(store.id, product.id, '125.00');
    await database.run(
      `INSERT INTO shopping_sessions (store_id, status, budget_cents, estimated_total_cents, started_at)
       VALUES (?, 'active', 10000, 12500, ?)`,
      [store.id, timestamp],
    );
    const session = await database.first<{ id: number }>('SELECT id FROM shopping_sessions WHERE store_id = ?', [store.id]);
    if (!session) throw new Error('Expected the shopping session to be created.');
    await database.run(
      'INSERT INTO shopping_items (session_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)',
      [session.id, product.id, 1, 12500],
    );

    await service.save(store.id, product.id, 132);
    await expect(prices.findCurrent(store.id, product.id)).resolves.toMatchObject({ currentPriceCents: 13200 });
    await expect(database.first<{ unit_price_cents: number }>('SELECT unit_price_cents FROM shopping_items WHERE product_id = ?', [product.id])).resolves.toEqual({ unit_price_cents: 12500 });
    await expect(database.first<{ count: number }>('SELECT COUNT(*) AS count FROM price_history WHERE store_id = ? AND product_id = ?', [store.id, product.id])).resolves.toEqual({ count: 2 });
  });

  it('rejects invalid PHP amounts before writing a price', async () => {
    expect(parsePhpToCents('125.00')).toBe(12500);
    expect(parsePhpToCents(132)).toBe(13200);
    expect(() => parsePhpToCents('0')).toThrow(/positive/);
    expect(() => parsePhpToCents('-1')).toThrow(/PHP amount/);
    expect(() => parsePhpToCents('12.999')).toThrow(/two decimal/);
    expect(() => parsePhpToCents(Number.NaN)).toThrow(/PHP amount/);
  });
});

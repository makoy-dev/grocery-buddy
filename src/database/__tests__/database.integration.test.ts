/** @jest-environment node */
/// <reference types="node" />

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseConnection } from '@/database/connection';
import { configureDatabase } from '@/database/configure-database';
import { latestSchemaVersion } from '@/database/migrations';
import { runMigrations } from '@/database/migrations/migration-runner';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';

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

    const versionRows = await database.all<{ version: number }>('SELECT version FROM schema_version');
    expect(versionRows).toEqual([{ version: 1 }]);
    await expect(stores.findById(store.id)).resolves.toEqual(store);
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
    ).rejects.toThrow('priceCents must be a non-negative integer.');
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
});

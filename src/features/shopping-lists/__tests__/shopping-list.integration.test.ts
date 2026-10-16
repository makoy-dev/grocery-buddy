/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { configureDatabase } from '@/database/configure-database';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLiteShoppingListRepository } from '@/database/repositories/shopping-list-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { ShoppingListService } from '@/features/shopping-lists/services/shopping-list-service';

describe('shopping lists', () => {
  let directory: string;
  let database: DatabaseConnection;
  let lists: SQLiteShoppingListRepository;
  let products: SQLiteProductRepository;
  let storeId: number;
  let productId: number;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'grocery-godz-lists-'));
    database = new NodeSQLiteConnection(join(directory, 'lists.db'));
    await configureDatabase(database);
    lists = new SQLiteShoppingListRepository(database);
    products = new SQLiteProductRepository(database);
    storeId = (await new SQLiteStoreRepository(database).create({ name: 'List Market' })).id;
    productId = (await products.create({ barcode: '4800000000001', name: 'Rice' })).id;
  });

  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('supports CRUD, duplicate lists, and quantity changes', async () => {
    const created = await lists.create({ name: 'Weekly staples' });
    await lists.addItem({ listId: created.id, productId, quantity: 2 });
    await lists.updateQuantity(created.id, productId, 4);
    expect((await lists.items(created.id, storeId))[0]!.quantity).toBe(4);
    const copy = await lists.duplicate(created.id, 'Weekly staples copy');
    expect((await lists.items(copy.id, storeId))[0]!.productName).toBe('Rice');
    await lists.rename(copy.id, 'Next trip');
    await lists.delete(copy.id);
    expect((await lists.list()).map((list) => list.name)).toEqual(['Weekly staples']);
  });

  it('returns unknown prices and isolates the selected store', async () => {
    const secondStore = (await new SQLiteStoreRepository(database).create({ name: 'Other Market' })).id;
    const list = await lists.create({ name: 'Price check' });
    await lists.addItem({ listId: list.id, productId, quantity: 1 });
    await database.run('INSERT INTO store_products (store_id, product_id, current_price_cents, updated_at) VALUES (?, ?, ?, ?)', [secondStore, productId, 999, '2026-10-16T00:00:00.000Z']);
    expect((await lists.items(list.id, storeId))[0]!.priceCents).toBeNull();
    expect((await lists.items(list.id, secondStore))[0]!.priceCents).toBe(999);
  });

  it('transfers selected priced items to a cart and preserves the list', async () => {
    const list = await lists.create({ name: 'Transfer me' });
    await lists.addItem({ listId: list.id, productId, quantity: 3 });
    await database.run('INSERT INTO store_products (store_id, product_id, current_price_cents, updated_at) VALUES (?, ?, ?, ?)', [storeId, productId, 12500, '2026-10-16T00:00:00.000Z']);
    const service = new ShoppingListService(lists, new SQLiteCartRepository(database));
    const items = await lists.items(list.id, storeId);
    await service.transferToSession(storeId, items, [productId]);
    expect((await lists.items(list.id, storeId))[0]!.quantity).toBe(3);
    const cart = await database.first<{ quantity: number; unit_price_cents: number }>('SELECT quantity, unit_price_cents FROM shopping_items');
    expect(cart).toEqual({ quantity: 3, unit_price_cents: 12500 });
  });
});

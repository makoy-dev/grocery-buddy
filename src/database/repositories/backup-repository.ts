import type { DatabaseConnection } from '@/database/connection';
import { BACKUP_FORMAT_VERSION, type BackupData, type StorageInfo } from '@/domain/entities/backup';
import type { BackupRepository } from '@/domain/interfaces/backup-repository';

const TABLES = ['stores', 'products', 'store_products', 'price_history', 'shopping_sessions', 'shopping_items', 'shopping_lists', 'shopping_list_items', 'app_settings'] as const;

export class SQLiteBackupRepository implements BackupRepository {
  constructor(private readonly database: DatabaseConnection, private readonly databaseName = 'grocery-buddy.db') {}

  async exportData(exportedAt = new Date().toISOString()): Promise<BackupData> {
    const data = {
      stores: await this.database.all('SELECT * FROM stores ORDER BY id'),
      products: await this.database.all('SELECT * FROM products ORDER BY id'),
      store_products: await this.database.all('SELECT * FROM store_products ORDER BY id'),
      price_history: await this.database.all('SELECT * FROM price_history ORDER BY id'),
      shopping_sessions: await this.database.all('SELECT * FROM shopping_sessions ORDER BY id'),
      shopping_items: await this.database.all('SELECT * FROM shopping_items ORDER BY id'),
      shopping_lists: await this.database.all('SELECT * FROM shopping_lists ORDER BY id'),
      shopping_list_items: await this.database.all('SELECT * FROM shopping_list_items ORDER BY id'),
      app_settings: await this.database.all('SELECT * FROM app_settings ORDER BY key'),
    } as BackupData['data'];
    return { format: 'grocery-godz-backup', version: BACKUP_FORMAT_VERSION, exportedAt, data };
  }

  async importData(backup: BackupData): Promise<void> {
    await this.database.transaction(async (transaction) => {
      for (const table of ['shopping_items', 'shopping_list_items', 'price_history', 'store_products', 'shopping_sessions', 'shopping_lists', 'products', 'stores', 'app_settings'] as const) await transaction.run(`DELETE FROM ${table}`);
      for (const row of backup.data.stores) await transaction.run('INSERT INTO stores (id, name, normalized_name, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [row.id, row.name, row.normalized_name, row.is_favorite, row.created_at, row.updated_at]);
      for (const row of backup.data.products) await transaction.run('INSERT INTO products (id, barcode, name, brand, category, unit, package_size, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [row.id, row.barcode, row.name, row.brand, row.category, row.unit, row.package_size, row.archived_at, row.created_at, row.updated_at]);
      for (const row of backup.data.shopping_lists) await transaction.run('INSERT INTO shopping_lists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [row.id, row.name, row.created_at, row.updated_at]);
      for (const row of backup.data.store_products) await transaction.run('INSERT INTO store_products (id, store_id, product_id, current_price_cents, updated_at) VALUES (?, ?, ?, ?, ?)', [row.id, row.store_id, row.product_id, row.current_price_cents, row.updated_at]);
      for (const row of backup.data.price_history) await transaction.run('INSERT INTO price_history (id, store_id, product_id, price_cents, recorded_at) VALUES (?, ?, ?, ?, ?)', [row.id, row.store_id, row.product_id, row.price_cents, row.recorded_at]);
      for (const row of backup.data.shopping_sessions) await transaction.run('INSERT INTO shopping_sessions (id, store_id, status, budget_cents, budget_set, estimated_total_cents, actual_total_cents, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [row.id, row.store_id, row.status, row.budget_cents, row.budget_set ?? 1, row.estimated_total_cents, row.actual_total_cents, row.started_at, row.completed_at]);
      for (const row of backup.data.shopping_items) await transaction.run('INSERT INTO shopping_items (id, session_id, product_id, quantity, unit_price_cents, product_name_snapshot) VALUES (?, ?, ?, ?, ?, ?)', [row.id, row.session_id, row.product_id, row.quantity, row.unit_price_cents, row.product_name_snapshot]);
      for (const row of backup.data.shopping_list_items) await transaction.run('INSERT INTO shopping_list_items (id, list_id, product_id, quantity, picked_up) VALUES (?, ?, ?, ?, ?)', [row.id, row.list_id, row.product_id, row.quantity, row.picked_up ?? 0]);
      for (const row of backup.data.app_settings) await transaction.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', [row.key, row.value]);
    });
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const pages = await this.database.first<{ page_count: number; page_size: number; freelist_count: number }>('PRAGMA page_count');
    const pageSize = pages?.page_size ?? (await this.database.first<{ page_size: number }>('PRAGMA page_size'))?.page_size ?? 0;
    const pageCount = pages?.page_count ?? 0;
    const freePages = pages?.freelist_count ?? (await this.database.first<{ freelist_count: number }>('PRAGMA freelist_count'))?.freelist_count ?? 0;
    const rowCounts: Record<string, number> = {};
    for (const table of TABLES) rowCounts[table] = (await this.database.first<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`))?.count ?? 0;
    return { databaseName: this.databaseName, pageCount, pageSize, freePages, estimatedBytes: pageCount * pageSize, rowCounts };
  }

  async clearShoppingHistory(): Promise<void> { await this.database.transaction(async (transaction) => { await transaction.run("DELETE FROM shopping_sessions WHERE status IN ('completed', 'cancelled')"); }); }
  async resetAllData(): Promise<void> { await this.database.transaction(async (transaction) => { for (const table of ['shopping_items', 'shopping_list_items', 'price_history', 'store_products', 'shopping_sessions', 'shopping_lists', 'products', 'stores', 'app_settings']) await transaction.run(`DELETE FROM ${table}`); }); }
  async exportHistoryCsv(): Promise<string> {
    const rows = await this.database.all<{ date: string; store: string; product: string; quantity: number; unit_price_cents: number; line_total_cents: number; estimated_total_cents: number; actual_total_cents: number | null }>(`SELECT shopping_sessions.completed_at AS date, stores.name AS store, COALESCE(shopping_items.product_name_snapshot, products.name) AS product, shopping_items.quantity, shopping_items.unit_price_cents, shopping_items.quantity * shopping_items.unit_price_cents AS line_total_cents, shopping_sessions.estimated_total_cents, shopping_sessions.actual_total_cents FROM shopping_sessions JOIN stores ON stores.id = shopping_sessions.store_id JOIN shopping_items ON shopping_items.session_id = shopping_sessions.id JOIN products ON products.id = shopping_items.product_id WHERE shopping_sessions.status = 'completed' ORDER BY shopping_sessions.completed_at DESC, shopping_items.id`, []);
    const escape = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [['completed_at', 'store', 'product', 'quantity', 'unit_price_cents', 'line_total_cents', 'estimated_total_cents', 'actual_total_cents'], ...rows.map((row) => [row.date, row.store, row.product, row.quantity, row.unit_price_cents, row.line_total_cents, row.estimated_total_cents, row.actual_total_cents])].map((line) => line.map(escape).join(',')).join('\n');
  }
}

export function assertBackupFormat(value: unknown): asserts value is BackupData {
  if (!value || typeof value !== 'object') throw new Error('Backup file is not a JSON object.');
  const candidate = value as Partial<BackupData>;
  if (candidate.format !== 'grocery-godz-backup' || candidate.version !== BACKUP_FORMAT_VERSION || !candidate.data || typeof candidate.data !== 'object') throw new Error('Unsupported backup format.');
  const data = candidate.data as Record<string, unknown>;
  for (const table of TABLES) if (!Array.isArray(data[table])) throw new Error(`Backup is missing the ${table} table.`);
  const ids = (table: string) => { const rows = data[table] as { id?: unknown }[]; const seen = new Set<number>(); for (const row of rows) { if (!Number.isSafeInteger(row.id) || (row.id as number) < 1 || seen.has(row.id as number)) throw new Error(`Backup contains invalid or duplicate IDs in ${table}.`); seen.add(row.id as number); } };
  for (const table of ['stores', 'products', 'store_products', 'price_history', 'shopping_sessions', 'shopping_items', 'shopping_lists', 'shopping_list_items']) ids(table);
  const keys = new Set((data.app_settings as { key?: unknown }[]).map((row) => row.key)); if ([...keys].some((key) => typeof key !== 'string' || key.length === 0) || keys.size !== (data.app_settings as unknown[]).length) throw new Error('Backup contains invalid settings.');
  const refs = (table: string, key: string, target: string) => { const targetIds = new Set((data[target] as { id: number }[]).map((row) => row.id)); for (const row of data[table] as Record<string, unknown>[]) if (!targetIds.has(row[key] as number)) throw new Error(`Backup has a broken ${table} relationship.`); };
  refs('store_products', 'store_id', 'stores'); refs('store_products', 'product_id', 'products'); refs('price_history', 'store_id', 'stores'); refs('price_history', 'product_id', 'products'); refs('shopping_sessions', 'store_id', 'stores'); refs('shopping_items', 'session_id', 'shopping_sessions'); refs('shopping_items', 'product_id', 'products'); refs('shopping_list_items', 'list_id', 'shopping_lists'); refs('shopping_list_items', 'product_id', 'products');
  const unique = (table: string, key: (row: Record<string, unknown>) => string) => { const seen = new Set<string>(); for (const row of data[table] as Record<string, unknown>[]) { const value = key(row); if (seen.has(value)) throw new Error(`Backup contains duplicate values in ${table}.`); seen.add(value); } };
  unique('stores', (row) => String(row.normalized_name)); unique('products', (row) => String(row.barcode)); unique('store_products', (row) => `${row.store_id}:${row.product_id}`); unique('shopping_items', (row) => `${row.session_id}:${row.product_id}`); unique('shopping_list_items', (row) => `${row.list_id}:${row.product_id}`);
  const activeStores = new Set<string>(); for (const row of data.shopping_sessions as Record<string, unknown>[]) if (row.status === 'active') { const key = String(row.store_id); if (activeStores.has(key)) throw new Error('Backup contains more than one active session for a store.'); activeStores.add(key); }
}

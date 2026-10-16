import type { DatabaseConnection } from '@/database/connection';
import { mapStoreRow, mapStoreSummaryRow } from '@/database/mappers';
import type { StoreDeletionDependencyRow, StoreRow } from '@/database/models';
import {
  normalizeStoreName,
  type CreateStoreInput,
  type Store,
  type StoreSummary,
  type UpdateStoreInput,
} from '@/domain/entities/store';
import type {
  StoreDeletionDependencies,
  StoreRepository,
} from '@/domain/interfaces/store-repository';

type Clock = () => string;

export class SQLiteStoreRepository implements StoreRepository {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly clock: Clock = () => new Date().toISOString(),
  ) {}

  async create(input: CreateStoreInput): Promise<Store> {
    const name = input.name.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeStoreName(name);
    const timestamp = this.clock();

    const result = await this.database.run(
      `INSERT INTO stores
        (name, normalized_name, is_favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [name, normalizedName, input.isFavorite ? 1 : 0, timestamp, timestamp],
    );

    const store = await this.findById(result.lastInsertRowId);
    if (!store) {
      throw new Error('Store insert succeeded but the stored row could not be read.');
    }

    return store;
  }

  async findById(id: number): Promise<Store | null> {
    const row = await this.database.first<StoreRow>('SELECT * FROM stores WHERE id = ?', [id]);
    return row ? mapStoreRow(row) : null;
  }

  async findSummaryById(id: number): Promise<StoreSummary | null> {
    const row = await this.database.first<StoreRow & { product_count: number }>(
      `SELECT stores.*, COUNT(DISTINCT store_products.product_id) AS product_count
       FROM stores
       LEFT JOIN store_products ON store_products.store_id = stores.id
       WHERE stores.id = ?
       GROUP BY stores.id`,
      [id],
    );
    return row ? mapStoreSummaryRow(row) : null;
  }

  async findByNormalizedName(normalizedName: string, excludingId?: number): Promise<Store | null> {
    const row = excludingId === undefined
      ? await this.database.first<StoreRow>(
          'SELECT * FROM stores WHERE normalized_name = ?',
          [normalizedName],
        )
      : await this.database.first<StoreRow>(
          'SELECT * FROM stores WHERE normalized_name = ? AND id <> ?',
          [normalizedName, excludingId],
        );
    return row ? mapStoreRow(row) : null;
  }

  async list(search = ''): Promise<StoreSummary[]> {
    const normalizedSearch = normalizeStoreName(search);
    const rows = await this.database.all<StoreRow & { product_count: number }>(
      `SELECT stores.*, COUNT(DISTINCT store_products.product_id) AS product_count
       FROM stores
       LEFT JOIN store_products ON store_products.store_id = stores.id
       WHERE ? = '' OR instr(stores.normalized_name, ?) > 0
       GROUP BY stores.id
       ORDER BY stores.is_favorite DESC, stores.normalized_name ASC`,
      [normalizedSearch, normalizedSearch],
    );
    return rows.map(mapStoreSummaryRow);
  }

  async update(id: number, input: UpdateStoreInput): Promise<Store> {
    const name = input.name.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeStoreName(name);
    await this.database.run(
      `UPDATE stores
       SET name = ?, normalized_name = ?, updated_at = ?
       WHERE id = ?`,
      [name, normalizedName, this.clock(), id],
    );

    const store = await this.findById(id);
    if (!store) {
      throw new Error('Store update succeeded but the stored row could not be read.');
    }
    return store;
  }

  async setFavorite(id: number, isFavorite: boolean): Promise<Store> {
    await this.database.run('UPDATE stores SET is_favorite = ?, updated_at = ? WHERE id = ?', [
      isFavorite ? 1 : 0,
      this.clock(),
      id,
    ]);
    const store = await this.findById(id);
    if (!store) {
      throw new Error('Store favorite update succeeded but the stored row could not be read.');
    }
    return store;
  }

  async getDeletionDependencies(id: number): Promise<StoreDeletionDependencies> {
    const row = await this.database.first<StoreDeletionDependencyRow>(
      `SELECT
         (SELECT COUNT(*) FROM store_products WHERE store_id = ?) AS product_count,
         (SELECT COUNT(*) FROM price_history WHERE store_id = ?) AS history_count,
         (SELECT COUNT(*) FROM shopping_sessions WHERE store_id = ?) AS session_count`,
      [id, id, id],
    );
    return {
      productCount: row?.product_count ?? 0,
      historyCount: row?.history_count ?? 0,
      sessionCount: row?.session_count ?? 0,
    };
  }

  async delete(id: number): Promise<void> {
    await this.database.run('DELETE FROM stores WHERE id = ?', [id]);
  }
}

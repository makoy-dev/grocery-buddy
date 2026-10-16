import type { DatabaseConnection } from '@/database/connection';
import { mapStoreRow } from '@/database/mappers';
import type { StoreRow } from '@/database/models';
import { normalizeStoreName, type CreateStoreInput, type Store } from '@/domain/entities/store';
import type { StoreRepository } from '@/domain/interfaces/store-repository';

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

  async list(): Promise<Store[]> {
    const rows = await this.database.all<StoreRow>(
      'SELECT * FROM stores ORDER BY is_favorite DESC, normalized_name ASC',
    );
    return rows.map(mapStoreRow);
  }
}

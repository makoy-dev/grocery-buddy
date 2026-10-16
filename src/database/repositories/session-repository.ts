import type { DatabaseConnection } from '@/database/connection';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { SessionRepository } from '@/domain/interfaces/session-repository';
import type { ShoppingSessionRow } from '@/database/models';

type Clock = () => string;
type SessionQueryRow = ShoppingSessionRow & { store_name: string; item_count: number };

export class SQLiteSessionRepository implements SessionRepository {
  constructor(private readonly database: DatabaseConnection, private readonly clock: Clock = () => new Date().toISOString()) {}

  async start(storeId: number): Promise<ShoppingSession> {
    return this.database.transaction(async (transaction) => {
      const active = await this.queryOne(transaction, storeId, true);
      if (active) return active;
      const created = await transaction.run(
        `INSERT INTO shopping_sessions (store_id, status, budget_cents, estimated_total_cents, started_at) VALUES (?, 'active', 0, 0, ?)`,
        [storeId, this.clock()],
      );
      const session = await this.queryById(transaction, created.lastInsertRowId);
      if (!session) throw new Error('Session started but could not be read.');
      return session;
    });
  }

  findActive(storeId: number): Promise<ShoppingSession | null> { return this.queryOne(this.database, storeId, true); }

  async listHistory(storeId?: number): Promise<ShoppingSession[]> {
    const rows = await this.database.all<SessionQueryRow>(this.baseQuery() + (storeId ? ' WHERE shopping_sessions.store_id = ?' : '') + ' GROUP BY shopping_sessions.id, stores.name ORDER BY shopping_sessions.started_at DESC', storeId ? [storeId] : []);
    return rows.map(mapSession);
  }

  async complete(id: number, actualTotalCents: number | null): Promise<ShoppingSession> {
    return this.updateStatus(id, 'completed', actualTotalCents);
  }

  async discard(id: number): Promise<ShoppingSession> {
    return this.updateStatus(id, 'cancelled', null);
  }

  async setBudget(id: number, budgetCents: number | null): Promise<ShoppingSession> {
    if (budgetCents !== null && (!Number.isSafeInteger(budgetCents) || budgetCents < 0)) {
      throw new Error('Budget must be zero or a positive integer in cents.');
    }
    return this.database.transaction(async (transaction) => {
      const result = await transaction.run(
        `UPDATE shopping_sessions SET budget_cents = ?, budget_set = ? WHERE id = ? AND status = 'active'`,
        [budgetCents ?? 0, budgetCents === null ? 0 : 1, id],
      );
      if (result.changes !== 1) throw new Error('Only an active shopping session can change its budget.');
      const session = await this.queryById(transaction, id);
      if (!session) throw new Error('Budget update succeeded but the session could not be read.');
      return session;
    });
  }

  private async updateStatus(id: number, status: 'completed' | 'cancelled', actualTotalCents: number | null): Promise<ShoppingSession> {
    return this.database.transaction(async (transaction) => {
      const result = await transaction.run(
        `UPDATE shopping_sessions SET status = ?, actual_total_cents = ?, completed_at = ? WHERE id = ? AND status = 'active'`,
        [status, actualTotalCents, this.clock(), id],
      );
      if (result.changes !== 1) throw new Error('Only an active shopping session can be completed or discarded.');
      const session = await this.queryById(transaction, id);
      if (!session) throw new Error('Session update succeeded but could not be read.');
      return session;
    });
  }

  private baseQuery() { return `SELECT shopping_sessions.*, stores.name AS store_name, COUNT(shopping_items.id) AS item_count FROM shopping_sessions JOIN stores ON stores.id = shopping_sessions.store_id LEFT JOIN shopping_items ON shopping_items.session_id = shopping_sessions.id`; }
  private async queryOne(executor: { first<T>(sql: string, params?: (string | number | null)[]): Promise<T | null> }, storeId: number, active: boolean) { const row = await executor.first<SessionQueryRow>(this.baseQuery() + ` WHERE shopping_sessions.store_id = ? ${active ? "AND shopping_sessions.status = 'active'" : ''} GROUP BY shopping_sessions.id, stores.name`, [storeId]); return row ? mapSession(row) : null; }
  private async queryById(executor: { first<T>(sql: string, params?: (string | number | null)[]): Promise<T | null> }, id: number) { const row = await executor.first<SessionQueryRow>(this.baseQuery() + ' WHERE shopping_sessions.id = ? GROUP BY shopping_sessions.id, stores.name', [id]); return row ? mapSession(row) : null; }
}

function mapSession(row: SessionQueryRow): ShoppingSession {
  return { id: row.id, storeId: row.store_id, storeName: row.store_name, status: row.status, budgetCents: row.budget_set === 1 ? row.budget_cents : null, estimatedTotalCents: row.estimated_total_cents, actualTotalCents: row.actual_total_cents, startedAt: row.started_at, completedAt: row.completed_at, itemCount: row.item_count };
}

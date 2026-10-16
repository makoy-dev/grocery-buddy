import type { DatabaseConnection } from '@/database/connection';
import type { ShoppingSessionRow } from '@/database/models';
import type { ShoppingSessionDetails } from '@/domain/entities/shopping-history';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { HistoryFilter, ShoppingHistoryRepository } from '@/domain/interfaces/shopping-history-repository';

type SessionRow = ShoppingSessionRow & { store_name: string; item_count: number };
type ItemRow = { id: number; session_id: number; product_id: number; product_name_snapshot: string | null; product_name: string; quantity: number; unit_price_cents: number; line_subtotal_cents: number };

export class SQLiteShoppingHistoryRepository implements ShoppingHistoryRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async listCompleted(filter: HistoryFilter = {}): Promise<ShoppingSession[]> {
    const conditions = ["shopping_sessions.status = 'completed'"];
    const params: (string | number)[] = [];
    if (filter.storeId) { conditions.push('shopping_sessions.store_id = ?'); params.push(filter.storeId); }
    if (filter.from) { conditions.push('shopping_sessions.started_at >= ?'); params.push(filter.from); }
    if (filter.to) { conditions.push('shopping_sessions.started_at <= ?'); params.push(filter.to); }
    const pageSize = Math.min(Math.max(filter.pageSize ?? 20, 1), 100);
    const page = Math.max(filter.page ?? 0, 0);
    params.push(pageSize, page * pageSize);
    const rows = await this.database.all<SessionRow>(
      `SELECT shopping_sessions.*, stores.name AS store_name, COUNT(shopping_items.id) AS item_count
       FROM shopping_sessions JOIN stores ON stores.id = shopping_sessions.store_id
       LEFT JOIN shopping_items ON shopping_items.session_id = shopping_sessions.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY shopping_sessions.id, stores.name ORDER BY shopping_sessions.completed_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    return rows.map(mapSession);
  }

  async getDetails(id: number): Promise<ShoppingSessionDetails | null> {
    const session = await this.database.first<SessionRow>(
      `SELECT shopping_sessions.*, stores.name AS store_name, COUNT(shopping_items.id) AS item_count
       FROM shopping_sessions JOIN stores ON stores.id = shopping_sessions.store_id
       LEFT JOIN shopping_items ON shopping_items.session_id = shopping_sessions.id
       WHERE shopping_sessions.id = ? GROUP BY shopping_sessions.id, stores.name`, [id],
    );
    if (!session) return null;
    const rows = await this.database.all<ItemRow>(
      `SELECT shopping_items.id, shopping_items.session_id, shopping_items.product_id,
              shopping_items.product_name_snapshot, products.name AS product_name,
              shopping_items.quantity, shopping_items.unit_price_cents,
              shopping_items.quantity * shopping_items.unit_price_cents AS line_subtotal_cents
       FROM shopping_items JOIN products ON products.id = shopping_items.product_id
       WHERE shopping_items.session_id = ? ORDER BY shopping_items.id`, [id],
    );
    return { ...mapSession(session), items: rows.map((row) => ({ id: row.id, sessionId: row.session_id, productId: row.product_id, productName: row.product_name_snapshot ?? row.product_name, quantity: row.quantity, unitPriceCents: row.unit_price_cents, lineSubtotalCents: row.line_subtotal_cents })) };
  }

  async deleteCompleted(id: number): Promise<void> {
    const result = await this.database.run("DELETE FROM shopping_sessions WHERE id = ? AND status = 'completed'", [id]);
    if (result.changes !== 1) throw new Error('Only completed shopping sessions can be deleted.');
  }
}

function mapSession(row: SessionRow): ShoppingSession { return { id: row.id, storeId: row.store_id, storeName: row.store_name, status: row.status, budgetCents: row.budget_set === 1 ? row.budget_cents : null, estimatedTotalCents: row.estimated_total_cents, actualTotalCents: row.actual_total_cents, startedAt: row.started_at, completedAt: row.completed_at, itemCount: row.item_count }; }

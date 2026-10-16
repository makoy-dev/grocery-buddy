import type { DatabaseConnection } from '@/database/connection';
import type { AddCartItemInput, CartRepository } from '@/domain/interfaces/cart-repository';

type Clock = () => string;

export class SQLiteCartRepository implements CartRepository {
  constructor(private readonly database: DatabaseConnection, private readonly clock: Clock = () => new Date().toISOString()) {}

  async addItem(input: AddCartItemInput): Promise<void> {
    await this.database.transaction(async (transaction) => {
      let session = await transaction.first<{ id: number }>("SELECT id FROM shopping_sessions WHERE store_id = ? AND status = 'active'", [input.storeId]);
      if (!session) {
        const created = await transaction.run(
          `INSERT INTO shopping_sessions (store_id, status, budget_cents, estimated_total_cents, started_at) VALUES (?, 'active', 0, 0, ?)`,
          [input.storeId, this.clock()],
        );
        session = { id: created.lastInsertRowId };
      }
      await transaction.run(
        `INSERT INTO shopping_items (session_id, product_id, quantity, unit_price_cents) VALUES (?, ?, 1, ?)
         ON CONFLICT(session_id, product_id) DO UPDATE SET quantity = shopping_items.quantity + 1`,
        [session.id, input.productId, input.unitPriceCents],
      );
      await transaction.run(
        `UPDATE shopping_sessions SET estimated_total_cents = (SELECT COALESCE(SUM(quantity * unit_price_cents), 0) FROM shopping_items WHERE session_id = ?) WHERE id = ?`,
        [session.id, session.id],
      );
    });
  }
}

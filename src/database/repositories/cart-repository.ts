import type { DatabaseConnection } from '@/database/connection';
import type { AddCartItemInput, CartRepository } from '@/domain/interfaces/cart-repository';
import type { CartItem } from '@/domain/entities/cart-item';

type Clock = () => string;

export class SQLiteCartRepository implements CartRepository {
  constructor(private readonly database: DatabaseConnection, private readonly clock: Clock = () => new Date().toISOString()) {}

  async addItem(input: AddCartItemInput): Promise<void> {
    const quantity = input.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Cart quantity must be a positive whole number.');
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
        `INSERT INTO shopping_items (session_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)
         ON CONFLICT(session_id, product_id) DO UPDATE SET quantity = shopping_items.quantity + excluded.quantity`,
        [session.id, input.productId, quantity, input.unitPriceCents],
      );
      await transaction.run(
        `UPDATE shopping_sessions SET estimated_total_cents = (SELECT COALESCE(SUM(quantity * unit_price_cents), 0) FROM shopping_items WHERE session_id = ?) WHERE id = ?`,
        [session.id, session.id],
      );
    });
  }

  async listActive(storeId: number): Promise<CartItem[]> {
    const rows = await this.database.all<CartItemRow>(
      `SELECT shopping_items.id, shopping_items.session_id, shopping_items.product_id,
              products.name AS product_name, products.barcode,
              shopping_items.quantity, shopping_items.unit_price_cents,
              shopping_items.quantity * shopping_items.unit_price_cents AS line_subtotal_cents
       FROM shopping_items JOIN shopping_sessions ON shopping_sessions.id = shopping_items.session_id
       JOIN products ON products.id = shopping_items.product_id
       WHERE shopping_sessions.store_id = ? AND shopping_sessions.status = 'active'
       ORDER BY products.name COLLATE NOCASE`,
      [storeId],
    );
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      productId: row.product_id,
      productName: row.product_name,
      barcode: row.barcode,
      quantity: row.quantity,
      unitPriceCents: row.unit_price_cents,
      lineSubtotalCents: row.line_subtotal_cents,
    }));
  }

  async updateQuantity(storeId: number, productId: number, quantity: number): Promise<void> {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return this.removeItem(storeId, productId);
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `UPDATE shopping_items SET quantity = ? WHERE product_id = ? AND session_id IN (SELECT id FROM shopping_sessions WHERE store_id = ? AND status = 'active')`,
        [quantity, productId, storeId],
      );
      await this.recalculate(transaction, storeId);
    });
  }

  async updateUnitPrice(storeId: number, productId: number, unitPriceCents: number): Promise<void> {
    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0) throw new Error('Cart price must be a positive integer in cents.');
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `UPDATE shopping_items SET unit_price_cents = ? WHERE product_id = ? AND session_id IN (SELECT id FROM shopping_sessions WHERE store_id = ? AND status = 'active')`,
        [unitPriceCents, productId, storeId],
      );
      await this.recalculate(transaction, storeId);
    });
  }

  async removeItem(storeId: number, productId: number): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `DELETE FROM shopping_items WHERE product_id = ? AND session_id IN (SELECT id FROM shopping_sessions WHERE store_id = ? AND status = 'active')`,
        [productId, storeId],
      );
      await this.recalculate(transaction, storeId);
    });
  }

  async clear(storeId: number): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.run(`DELETE FROM shopping_items WHERE session_id IN (SELECT id FROM shopping_sessions WHERE store_id = ? AND status = 'active')`, [storeId]);
      await this.recalculate(transaction, storeId);
    });
  }

  private async recalculate(transaction: { run(sql: string, params?: (string | number | null)[]): Promise<unknown> }, storeId: number) {
    await transaction.run(
      `UPDATE shopping_sessions SET estimated_total_cents = (SELECT COALESCE(SUM(quantity * unit_price_cents), 0) FROM shopping_items WHERE session_id = shopping_sessions.id) WHERE store_id = ? AND status = 'active'`,
      [storeId],
    );
  }
}

type CartItemRow = {
  id: number; session_id: number; product_id: number; product_name: string; barcode: string;
  quantity: number; unit_price_cents: number; line_subtotal_cents: number;
};

import type { DatabaseConnection } from '@/database/connection';
import type { ShoppingListRow, ShoppingListItemRow } from '@/database/models';
import type { ShoppingList, ShoppingListItem } from '@/domain/entities/shopping-list';
import type { AddShoppingListItemInput, CreateShoppingListInput, ShoppingListRepository } from '@/domain/interfaces/shopping-list-repository';

type ListItemRow = ShoppingListItemRow & {
  product_name: string;
  barcode: string;
  price_cents: number | null;
};

export class SQLiteShoppingListRepository implements ShoppingListRepository {
  constructor(private readonly database: DatabaseConnection, private readonly clock: () => string = () => new Date().toISOString()) {}

  async list(): Promise<ShoppingList[]> {
    const rows = await this.database.all<ShoppingListRow>('SELECT * FROM shopping_lists ORDER BY updated_at DESC, name COLLATE NOCASE');
    return rows.map(mapList);
  }

  async create(input: CreateShoppingListInput): Promise<ShoppingList> {
    const name = cleanName(input.name);
    const now = this.clock();
    const result = await this.database.run('INSERT INTO shopping_lists (name, created_at, updated_at) VALUES (?, ?, ?)', [name, now, now]);
    return { id: result.lastInsertRowId, name, createdAt: now, updatedAt: now };
  }

  async rename(id: number, nameInput: string): Promise<ShoppingList> {
    const name = cleanName(nameInput);
    const now = this.clock();
    await this.database.run('UPDATE shopping_lists SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
    const row = await this.database.first<ShoppingListRow>('SELECT * FROM shopping_lists WHERE id = ?', [id]);
    if (!row) throw new Error('Shopping list was not found.');
    return mapList(row);
  }

  async duplicate(id: number, nameInput: string): Promise<ShoppingList> {
    const name = cleanName(nameInput);
    const now = this.clock();
    return this.database.transaction(async (transaction) => {
      const result = await transaction.run('INSERT INTO shopping_lists (name, created_at, updated_at) SELECT ?, ?, ? FROM shopping_lists WHERE id = ?', [name, now, now, id]);
      if (!result.lastInsertRowId) throw new Error('Shopping list was not found.');
      await transaction.run('INSERT INTO shopping_list_items (list_id, product_id, quantity, picked_up) SELECT ?, product_id, quantity, 0 FROM shopping_list_items WHERE list_id = ?', [result.lastInsertRowId, id]);
      return { id: result.lastInsertRowId, name, createdAt: now, updatedAt: now };
    });
  }

  async delete(id: number): Promise<void> { await this.database.run('DELETE FROM shopping_lists WHERE id = ?', [id]); }

  async items(listId: number, storeId: number | null): Promise<ShoppingListItem[]> {
    const rows = await this.database.all<ListItemRow>(
      `SELECT sli.id, sli.list_id, sli.product_id, sli.quantity, sli.picked_up,
              p.name AS product_name, p.barcode, sp.current_price_cents AS price_cents
       FROM shopping_list_items sli JOIN products p ON p.id = sli.product_id
       LEFT JOIN store_products sp ON sp.product_id = sli.product_id AND sp.store_id = ?
       WHERE sli.list_id = ? ORDER BY p.name COLLATE NOCASE`,
      [storeId, listId],
    );
    return rows.map((row) => ({ id: row.id, listId: row.list_id, productId: row.product_id, productName: row.product_name, barcode: row.barcode, quantity: row.quantity, pickedUp: row.picked_up === 1, priceCents: row.price_cents, lineTotalCents: row.price_cents === null ? null : row.price_cents * row.quantity }));
  }

  async addItem(input: AddShoppingListItemInput): Promise<void> {
    validateQuantity(input.quantity);
    await this.database.run(
      `INSERT INTO shopping_list_items (list_id, product_id, quantity, picked_up) VALUES (?, ?, ?, 0)
       ON CONFLICT(list_id, product_id) DO UPDATE SET quantity = shopping_list_items.quantity + excluded.quantity`,
      [input.listId, input.productId, input.quantity],
    );
    await this.touch(input.listId);
  }

  async updateQuantity(listId: number, productId: number, quantity: number): Promise<void> {
    validateQuantity(quantity);
    await this.database.run('UPDATE shopping_list_items SET quantity = ? WHERE list_id = ? AND product_id = ?', [quantity, listId, productId]);
    await this.touch(listId);
  }

  async removeItem(listId: number, productId: number): Promise<void> { await this.database.run('DELETE FROM shopping_list_items WHERE list_id = ? AND product_id = ?', [listId, productId]); await this.touch(listId); }

  async setPickedUp(listId: number, productId: number, pickedUp: boolean): Promise<void> { await this.database.run('UPDATE shopping_list_items SET picked_up = ? WHERE list_id = ? AND product_id = ?', [pickedUp ? 1 : 0, listId, productId]); }

  private async touch(listId: number): Promise<void> { await this.database.run('UPDATE shopping_lists SET updated_at = ? WHERE id = ?', [this.clock(), listId]); }
}

function cleanName(value: string): string { const name = value.trim(); if (!name) throw new Error('Shopping list name is required.'); return name; }
function validateQuantity(quantity: number): void { if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive whole number.'); }
function mapList(row: ShoppingListRow): ShoppingList { return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }; }

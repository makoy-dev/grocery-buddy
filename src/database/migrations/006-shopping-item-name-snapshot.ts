import type { DatabaseMigration } from '@/database/migrations/types';

export const shoppingItemNameSnapshotMigration: DatabaseMigration = {
  version: 6,
  name: 'add_shopping_item_name_snapshots',
  async up(database) {
    await database.exec(`
      ALTER TABLE shopping_items ADD COLUMN product_name_snapshot TEXT;
      UPDATE shopping_items SET product_name_snapshot = (
        SELECT name FROM products WHERE products.id = shopping_items.product_id
      ) WHERE product_name_snapshot IS NULL;
      CREATE INDEX idx_shopping_items_session_id ON shopping_items(session_id);
    `);
  },
};

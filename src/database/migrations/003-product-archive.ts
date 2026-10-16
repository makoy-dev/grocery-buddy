import type { DatabaseMigration } from '@/database/migrations/types';

export const productArchiveMigration: DatabaseMigration = {
  version: 3,
  name: 'add_product_archive_and_delete_guard',
  async up(database) {
    await database.exec(`
      ALTER TABLE products ADD COLUMN archived_at TEXT;
      CREATE INDEX idx_products_archived_name ON products(archived_at, name COLLATE NOCASE);
      CREATE TRIGGER prevent_product_data_loss_on_delete
      BEFORE DELETE ON products
      WHEN EXISTS (SELECT 1 FROM store_products WHERE product_id = OLD.id)
        OR EXISTS (SELECT 1 FROM price_history WHERE product_id = OLD.id)
        OR EXISTS (SELECT 1 FROM shopping_items WHERE product_id = OLD.id)
        OR EXISTS (SELECT 1 FROM shopping_list_items WHERE product_id = OLD.id)
      BEGIN
        SELECT RAISE(ABORT, 'Cannot delete a product referenced by prices or shopping history.');
      END;
    `);
  },
};

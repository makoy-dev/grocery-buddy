import type { DatabaseMigration } from '@/database/migrations/types';

export const protectStoreHistoryMigration: DatabaseMigration = {
  version: 2,
  name: 'protect_store_history_from_delete',
  async up(database) {
    await database.exec(`
      CREATE TRIGGER prevent_store_data_loss_on_delete
      BEFORE DELETE ON stores
      WHEN EXISTS (SELECT 1 FROM store_products WHERE store_id = OLD.id)
        OR EXISTS (SELECT 1 FROM price_history WHERE store_id = OLD.id)
        OR EXISTS (SELECT 1 FROM shopping_sessions WHERE store_id = OLD.id)
      BEGIN
        SELECT RAISE(ABORT, 'Cannot delete a store with saved prices or shopping history.');
      END;
    `);
  },
};

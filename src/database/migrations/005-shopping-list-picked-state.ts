import type { DatabaseMigration } from '@/database/migrations/types';

export const shoppingListPickedStateMigration: DatabaseMigration = {
  version: 5,
  name: 'add_shopping_list_picked_state',
  async up(database) {
    await database.exec(`
      ALTER TABLE shopping_list_items ADD COLUMN picked_up INTEGER NOT NULL DEFAULT 0
        CHECK (picked_up IN (0, 1));
      CREATE INDEX idx_shopping_list_items_list_picked
        ON shopping_list_items(list_id, picked_up);
    `);
  },
};

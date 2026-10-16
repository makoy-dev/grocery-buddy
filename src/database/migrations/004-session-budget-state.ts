import type { DatabaseMigration } from '@/database/migrations/types';

export const sessionBudgetStateMigration: DatabaseMigration = {
  version: 4,
  name: 'add_explicit_session_budget_state',
  async up(database) {
    await database.exec(`
      ALTER TABLE shopping_sessions ADD COLUMN budget_set INTEGER NOT NULL DEFAULT 0
        CHECK (budget_set IN (0, 1));
      CREATE INDEX idx_shopping_sessions_budget_state
        ON shopping_sessions(store_id, status, budget_set);
    `);
  },
};

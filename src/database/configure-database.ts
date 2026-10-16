import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations/migration-runner';

export const DATABASE_NAME = 'grocery-buddy.db';

export async function configureDatabase(database: DatabaseConnection): Promise<void> {
  await database.exec('PRAGMA journal_mode = WAL;');
  await database.exec('PRAGMA foreign_keys = ON;');
  await runMigrations(database);
}

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { configureDatabase, DATABASE_NAME } from '@/database/configure-database';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';

export { DATABASE_NAME } from '@/database/configure-database';

export async function initializeSQLiteDatabase(database: SQLiteDatabase): Promise<void> {
  await configureDatabase(new ExpoSQLiteConnection(database));
}

export async function openAppDatabase(): Promise<ExpoSQLiteConnection> {
  const sqliteDatabase = await openDatabaseAsync(DATABASE_NAME);
  const database = new ExpoSQLiteConnection(sqliteDatabase);

  try {
    await configureDatabase(database);
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}

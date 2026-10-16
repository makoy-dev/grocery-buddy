import type {
  SQLiteBindParams,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import type {
  DatabaseConnection,
  DatabaseExecutor,
  DatabaseParams,
  DatabaseRunResult,
} from '@/database/connection';

class ExpoSQLiteExecutor implements DatabaseExecutor {
  constructor(protected readonly database: SQLiteDatabase) {}

  async exec(sql: string): Promise<void> {
    await this.database.execAsync(sql);
  }

  async run(sql: string, params: DatabaseParams = []): Promise<DatabaseRunResult> {
    const statement = await this.database.prepareAsync(sql);

    try {
      const result: SQLiteRunResult = await statement.executeAsync(params as SQLiteBindParams);
      return {
        lastInsertRowId: result.lastInsertRowId,
        changes: result.changes,
      };
    } finally {
      await statement.finalizeAsync();
    }
  }

  async first<T>(sql: string, params: DatabaseParams = []): Promise<T | null> {
    const statement = await this.database.prepareAsync(sql);

    try {
      const result = await statement.executeAsync<T>(params as SQLiteBindParams);
      return await result.getFirstAsync();
    } finally {
      await statement.finalizeAsync();
    }
  }

  async all<T>(sql: string, params: DatabaseParams = []): Promise<T[]> {
    const statement = await this.database.prepareAsync(sql);

    try {
      const result = await statement.executeAsync<T>(params as SQLiteBindParams);
      return await result.getAllAsync();
    } finally {
      await statement.finalizeAsync();
    }
  }
}

export class ExpoSQLiteConnection extends ExpoSQLiteExecutor implements DatabaseConnection {
  async transaction<T>(task: (transaction: DatabaseExecutor) => Promise<T>): Promise<T> {
    let value!: T;

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      value = await task(new ExpoSQLiteExecutor(transaction));
    });

    return value;
  }

  async close(): Promise<void> {
    await this.database.closeAsync();
  }
}

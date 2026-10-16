/// <reference types="node" />

import { DatabaseSync } from 'node:sqlite';

import type {
  DatabaseConnection,
  DatabaseExecutor,
  DatabaseParams,
  DatabaseRunResult,
} from '@/database/connection';

export class NodeSQLiteConnection implements DatabaseConnection {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    this.database = new DatabaseSync(filename);
  }

  async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async run(sql: string, params: DatabaseParams = []): Promise<DatabaseRunResult> {
    const result = this.database.prepare(sql).run(...params);
    return {
      lastInsertRowId: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }

  async first<T>(sql: string, params: DatabaseParams = []): Promise<T | null> {
    const row = this.database.prepare(sql).get(...params);
    return row ? (row as T) : null;
  }

  async all<T>(sql: string, params: DatabaseParams = []): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async transaction<T>(task: (transaction: DatabaseExecutor) => Promise<T>): Promise<T> {
    this.database.exec('BEGIN IMMEDIATE');

    try {
      const result = await task(this);
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

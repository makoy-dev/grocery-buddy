export type DatabaseValue = string | number | null | Uint8Array;
export type DatabaseParams = DatabaseValue[];

export type DatabaseRunResult = {
  lastInsertRowId: number;
  changes: number;
};

export interface DatabaseExecutor {
  /** Executes trusted, static SQL such as migration DDL and PRAGMA statements. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: DatabaseParams): Promise<DatabaseRunResult>;
  first<T>(sql: string, params?: DatabaseParams): Promise<T | null>;
  all<T>(sql: string, params?: DatabaseParams): Promise<T[]>;
}

export interface DatabaseConnection extends DatabaseExecutor {
  transaction<T>(task: (transaction: DatabaseExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

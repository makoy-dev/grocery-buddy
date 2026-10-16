import type { DatabaseExecutor } from '@/database/connection';

export type DatabaseMigration = {
  version: number;
  name: string;
  up: (database: DatabaseExecutor) => Promise<void>;
};

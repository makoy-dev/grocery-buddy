import { initialSchemaMigration } from '@/database/migrations/001-initial-schema';
import { protectStoreHistoryMigration } from '@/database/migrations/002-protect-store-history';
import type { DatabaseMigration } from '@/database/migrations/types';

export const migrations: readonly DatabaseMigration[] = [
  initialSchemaMigration,
  protectStoreHistoryMigration,
];

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;

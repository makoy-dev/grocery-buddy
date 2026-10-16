import { initialSchemaMigration } from '@/database/migrations/001-initial-schema';
import { protectStoreHistoryMigration } from '@/database/migrations/002-protect-store-history';
import { productArchiveMigration } from '@/database/migrations/003-product-archive';
import { sessionBudgetStateMigration } from '@/database/migrations/004-session-budget-state';
import type { DatabaseMigration } from '@/database/migrations/types';

export const migrations: readonly DatabaseMigration[] = [
  initialSchemaMigration,
  protectStoreHistoryMigration,
  productArchiveMigration,
  sessionBudgetStateMigration,
];

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;

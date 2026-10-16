import { initialSchemaMigration } from '@/database/migrations/001-initial-schema';
import { protectStoreHistoryMigration } from '@/database/migrations/002-protect-store-history';
import { productArchiveMigration } from '@/database/migrations/003-product-archive';
import { sessionBudgetStateMigration } from '@/database/migrations/004-session-budget-state';
import { shoppingListPickedStateMigration } from '@/database/migrations/005-shopping-list-picked-state';
import { shoppingItemNameSnapshotMigration } from '@/database/migrations/006-shopping-item-name-snapshot';
import type { DatabaseMigration } from '@/database/migrations/types';

export const migrations: readonly DatabaseMigration[] = [
  initialSchemaMigration,
  protectStoreHistoryMigration,
  productArchiveMigration,
  sessionBudgetStateMigration,
  shoppingListPickedStateMigration,
  shoppingItemNameSnapshotMigration,
];

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;

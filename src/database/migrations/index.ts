import { initialSchemaMigration } from '@/database/migrations/001-initial-schema';
import type { DatabaseMigration } from '@/database/migrations/types';

export const migrations: readonly DatabaseMigration[] = [initialSchemaMigration];

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;

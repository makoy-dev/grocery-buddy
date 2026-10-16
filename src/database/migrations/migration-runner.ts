import type { DatabaseConnection } from '@/database/connection';
import { latestSchemaVersion, migrations } from '@/database/migrations';

type SchemaVersionRow = {
  version: number;
};

export async function runMigrations(
  database: DatabaseConnection,
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const appliedRows = await database.all<SchemaVersionRow>(
    'SELECT version FROM schema_version ORDER BY version ASC',
  );
  const appliedVersions = new Set(appliedRows.map(({ version }) => version));

  const unsupportedVersion = appliedRows.find(({ version }) => version > latestSchemaVersion);
  if (unsupportedVersion) {
    throw new Error(
      `Database schema version ${unsupportedVersion.version} is newer than supported version ${latestSchemaVersion}.`,
    );
  }

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    const previousVersionsApplied = migrations
      .filter(({ version }) => version < migration.version)
      .every(({ version }) => appliedVersions.has(version));

    if (!previousVersionsApplied) {
      throw new Error(`Cannot apply schema version ${migration.version}: an earlier migration is missing.`);
    }

    await database.transaction(async (transaction) => {
      await migration.up(transaction);
      await transaction.run(
        'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, now()],
      );
    });

    appliedVersions.add(migration.version);
  }
}

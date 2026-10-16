import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteBackupRepository } from '@/database/repositories/backup-repository';
import { SettingsService } from '@/features/settings/services/settings-service';

export function useSettingsService() {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new SettingsService(new SQLiteBackupRepository(connection)), [connection]);
}

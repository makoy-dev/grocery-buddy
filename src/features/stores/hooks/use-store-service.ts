import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteSettingsRepository } from '@/database/repositories/settings-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';
import { StoreService } from '@/features/stores/services/store-service';

export function useStoreService(): StoreService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);

  return useMemo(
    () => new StoreService(new SQLiteStoreRepository(connection), new SQLiteSettingsRepository(connection)),
    [connection],
  );
}

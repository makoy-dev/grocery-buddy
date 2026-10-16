import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLiteShoppingHistoryRepository } from '@/database/repositories/shopping-history-repository';
import { HistoryService } from '@/features/history/services/history-service';

export function useHistoryService(): HistoryService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new HistoryService(new SQLiteShoppingHistoryRepository(connection), new SQLiteCartRepository(connection)), [connection]);
}

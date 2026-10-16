import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';

export function useCartRepository(): SQLiteCartRepository {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new SQLiteCartRepository(connection), [connection]);
}

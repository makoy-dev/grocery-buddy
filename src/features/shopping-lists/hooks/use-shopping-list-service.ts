import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteShoppingListRepository } from '@/database/repositories/shopping-list-repository';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { ShoppingListService } from '@/features/shopping-lists/services/shopping-list-service';

export function useShoppingListService(): ShoppingListService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new ShoppingListService(new SQLiteShoppingListRepository(connection), new SQLiteCartRepository(connection)), [connection]);
}

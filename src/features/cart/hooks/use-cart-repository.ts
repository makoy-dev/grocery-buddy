import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { CartService } from '@/features/cart/services/cart-service';

export function useCartRepository(): CartService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new CartService(new SQLiteCartRepository(connection)), [connection]);
}

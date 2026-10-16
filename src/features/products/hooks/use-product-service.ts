import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { ProductService } from '@/features/products/services/product-service';

export function useProductService(): ProductService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new ProductService(new SQLiteProductRepository(connection)), [connection]);
}

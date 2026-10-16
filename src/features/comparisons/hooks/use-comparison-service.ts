import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLitePriceComparisonRepository } from '@/database/repositories/price-comparison-repository';
import { ComparisonService } from '@/features/comparisons/services/comparison-service';

export function useComparisonService(): ComparisonService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new ComparisonService(new SQLitePriceComparisonRepository(connection)), [connection]);
}

import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { PricingService } from '@/features/pricing/services/pricing-service';

export function usePricingService(): PricingService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new PricingService(new SQLitePricingRepository(connection)), [connection]);
}

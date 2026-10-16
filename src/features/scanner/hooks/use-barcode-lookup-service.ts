import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { BarcodeLookupService } from '@/features/scanner/services/barcode-lookup-service';

export function useBarcodeLookupService(): BarcodeLookupService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new BarcodeLookupService(new SQLiteProductRepository(connection), new SQLitePricingRepository(connection)), [connection]);
}

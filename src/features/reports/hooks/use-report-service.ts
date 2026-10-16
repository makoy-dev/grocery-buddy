import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteReportRepository } from '@/database/repositories/report-repository';
import { ReportService } from '@/features/reports/services/report-service';

export function useReportService() {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new ReportService(new SQLiteReportRepository(connection)), [connection]);
}

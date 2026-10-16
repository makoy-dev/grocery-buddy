import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteSessionRepository } from '@/database/repositories/session-repository';
import { SessionService } from '@/features/sessions/services/session-service';

export function useSessionService(): SessionService {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  return useMemo(() => new SessionService(new SQLiteSessionRepository(connection)), [connection]);
}

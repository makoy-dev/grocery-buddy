import '@/global.css';

import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colorScheme } from 'nativewind';

import { DATABASE_NAME, initializeSQLiteDatabase } from '@/database/initialize-database';
import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteSettingsRepository } from '@/database/repositories/settings-repository';
import { darkNavigationTheme, lightNavigationTheme } from '@/theme/navigation';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeSQLiteDatabase}>
        <AppTheme />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function AppTheme() {
  const database = useSQLiteContext();
  const [preference, setPreference] = useState<'system' | 'light' | 'dark'>('system');
  useEffect(() => {
    const settings = new SQLiteSettingsRepository(new ExpoSQLiteConnection(database));
    void settings.get('theme_preference').then((value) => {
      const next = value === 'light' || value === 'dark' ? value : 'system';
      setPreference(next);
      colorScheme.set(next);
    });
  }, [database]);
  useEffect(() => { colorScheme.set(preference); }, [preference]);
  const active = colorScheme.get();
  return <ThemeProvider value={active === 'dark' ? darkNavigationTheme : lightNavigationTheme}><Stack screenOptions={{ headerShown: false }} /><StatusBar style={active === 'dark' ? 'light' : 'dark'} /></ThemeProvider>;
}

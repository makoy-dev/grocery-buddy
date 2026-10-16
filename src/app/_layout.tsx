import '@/global.css';

import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initializeSQLiteDatabase } from '@/database/initialize-database';
import { darkNavigationTheme, lightNavigationTheme } from '@/theme/navigation';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeSQLiteDatabase}>
        <ThemeProvider value={colorScheme === 'dark' ? darkNavigationTheme : lightNavigationTheme}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

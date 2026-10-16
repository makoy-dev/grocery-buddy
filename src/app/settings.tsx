import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { colorScheme } from 'nativewind';

import { ExpoSQLiteConnection } from '@/database/expo-sqlite-connection';
import { SQLiteSettingsRepository } from '@/database/repositories/settings-repository';
import { useStoreService } from '@/features/stores/hooks/use-store-service';
import { useSelectedStore } from '@/features/stores/hooks/use-selected-store';
import { useSettingsService } from '@/features/settings/hooks/use-settings-service';
import { saveAndShareTextFile, pickTextFile } from '@/features/settings/services/backup-file-service';
import { useAppDialog } from '@/hooks/use-app-dialog';
import type { StorageInfo } from '@/domain/entities/backup';
import type { StoreSummary } from '@/domain/entities/store';

const THEME_KEY = 'theme_preference';
const VIBRATION_KEY = 'scanner_vibration_enabled';
const SOUND_KEY = 'scanner_sound_enabled';

export default function SettingsScreen() {
  const database = useSQLiteContext();
  const connection = useMemo(() => new ExpoSQLiteConnection(database), [database]);
  const settings = useMemo(() => new SQLiteSettingsRepository(connection), [connection]);
  const service = useSettingsService();
  const storesService = useStoreService();
  const { selectedStore, selectStore } = useSelectedStore();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [theme, setTheme] = useState('system');
  const [vibration, setVibration] = useState(true);
  const [sound, setSound] = useState(false);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showDialog, dialogElement } = useAppDialog();
  const load = useCallback(async () => {
    try {
      const [listed, savedTheme, savedVibration, savedSound, info] = await Promise.all([storesService.list(), settings.get(THEME_KEY), settings.get(VIBRATION_KEY), settings.get(SOUND_KEY), service.storageInfo()]);
      setStores(listed); setTheme(savedTheme ?? 'system'); setVibration(savedVibration !== 'false'); setSound(savedSound === 'true'); setStorage(info); setError(null);
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to load settings.'); }
  }, [service, settings, storesService]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const saveSetting = async (key: string, value: string) => { await settings.set(key, value); };
  const exportBackup = async () => { setBusy(true); try { const backup = await service.exportBackup(); await saveAndShareTextFile(JSON.stringify(backup, null, 2), `grocery-godz-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Backup export was cancelled or failed.'); } finally { setBusy(false); } };
  const importBackup = async () => { setBusy(true); try { const contents = await pickTextFile(); if (!contents) return; const parsed: unknown = JSON.parse(contents); await service.importBackup(parsed); await load(); showDialog({ title: 'Backup restored', message: 'All supported local data was restored successfully.' }); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'The backup file is malformed or unsupported. Your existing data was not changed.'); } finally { setBusy(false); } };
  const exportCsv = async () => { setBusy(true); try { await saveAndShareTextFile(await service.historyCsv(), `grocery-godz-history-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv'); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'CSV export was cancelled or failed.'); } finally { setBusy(false); } };
  const clearHistory = () => showDialog({ title: 'Clear shopping history?', message: 'Completed and cancelled sessions will be permanently removed. Active sessions and your catalog will remain.', confirmLabel: 'Clear history', cancelLabel: 'Cancel', destructive: true, onConfirm: () => void (async () => { setBusy(true); try { await service.clearHistory(); await load(); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to clear history.'); } finally { setBusy(false); } })() });
  const resetData = () => showDialog({ title: 'Reset all data?', message: 'This permanently removes stores, products, prices, lists, sessions, cart data, and settings. This cannot be undone.', confirmLabel: 'Reset everything', cancelLabel: 'Cancel', destructive: true, onConfirm: () => void (async () => { setBusy(true); try { await service.resetData(); await load(); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to reset data.'); } finally { setBusy(false); } })() });
  const selectTheme = (value: string) => { setTheme(value); colorScheme.set(value as 'system' | 'light' | 'dark'); void saveSetting(THEME_KEY, value); };

  return <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark"><ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 40 }}><Link href="/(tabs)/more" className="mb-4 self-start"><Text className="font-semibold text-primary">← Back to More</Text></Link><Text className="text-3xl font-bold text-ink dark:text-ink-dark">Settings</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">Control the offline experience and manage local data.</Text>{error && <Text className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</Text>}
    <Section title="Appearance"><Text className="text-sm text-muted dark:text-muted-dark">Theme</Text><View className="mt-3 flex-row gap-2">{['system', 'light', 'dark'].map((value) => <Choice key={value} label={value[0]!.toUpperCase() + value.slice(1)} selected={theme === value} onPress={() => selectTheme(value)} />)}</View><Text className="mt-4 text-sm text-muted dark:text-muted-dark">Currency: PHP (₱)</Text></Section>
    <Section title="Scanning"><ToggleRow label="Vibration" value={vibration} onPress={() => { const next = !vibration; setVibration(next); void saveSetting(VIBRATION_KEY, String(next)); }} /><ToggleRow label="Sound preference" value={sound} onPress={() => { const next = !sound; setSound(next); void saveSetting(SOUND_KEY, String(next)); }} /><Text className="text-xs leading-5 text-muted dark:text-muted-dark">Sound playback requires an Expo development build with an audio module. Expo Go does not include that native module.</Text></Section>
    <Section title="Preferred grocery store"><Text className="text-sm text-muted dark:text-muted-dark">Used as the default store when starting a trip.</Text>{stores.length === 0 ? <Text className="mt-3 text-sm text-muted dark:text-muted-dark">Add a store first.</Text> : stores.map((store) => <Pressable key={store.id} onPress={() => void selectStore(store.id)} className="mt-3 flex-row items-center justify-between rounded-xl border border-border px-4 py-3 dark:border-border-dark"><Text className="font-semibold text-ink dark:text-ink-dark">{store.name}</Text><Text className="text-sm font-semibold text-primary">{selectedStore?.id === store.id ? 'Selected' : 'Use this store'}</Text></Pressable>)}</Section>
    <Section title="Backup and export"><Action label="Export full backup" description="Save all local data as a versioned JSON backup." onPress={() => void exportBackup()} disabled={busy} /><Action label="Import backup" description="Validate and restore a previously exported backup." onPress={() => void importBackup()} disabled={busy} /><Action label="Export shopping history CSV" description="Save completed-session history for spreadsheets." onPress={() => void exportCsv()} disabled={busy} /></Section>
    <Section title="Storage"><Text className="text-sm text-muted dark:text-muted-dark">{storage ? `${storage.databaseName} · ${(storage.estimatedBytes / 1024).toFixed(1)} KB estimated · ${Object.values(storage.rowCounts).reduce((sum, count) => sum + count, 0)} records` : 'Loading storage information…'}</Text></Section>
    <Section title="Destructive actions"><Action label="Clear shopping history" description="Remove completed and cancelled sessions only." onPress={clearHistory} disabled={busy} destructive /><Action label="Reset all data" description="Delete every local record and setting." onPress={resetData} disabled={busy} destructive /></Section>
  </ScrollView>{dialogElement}</SafeAreaView>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View className="mt-5 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><Text className="mb-4 text-xs font-bold uppercase tracking-widest text-muted dark:text-muted-dark">{title}</Text>{children}</View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className={`flex-1 rounded-xl border px-3 py-3 ${selected ? 'border-primary bg-primary' : 'border-border dark:border-border-dark'}`}><Text className={`text-center font-semibold ${selected ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{label}</Text></Pressable>; }
function ToggleRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className="mb-3 flex-row items-center justify-between"><Text className="font-semibold text-ink dark:text-ink-dark">{label}</Text><View className={`h-7 w-12 justify-center rounded-full px-1 ${value ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}><View className={`h-5 w-5 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} /></View></Pressable>; }
function Action({ label, description, onPress, disabled, destructive }: { label: string; description: string; onPress: () => void; disabled?: boolean; destructive?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} className="mb-3 rounded-xl border border-border px-4 py-3 dark:border-border-dark"><Text className={`font-semibold ${destructive ? 'text-red-700 dark:text-red-300' : 'text-ink dark:text-ink-dark'}`}>{label}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{description}</Text></Pressable>; }

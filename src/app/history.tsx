import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StoreSummary } from '@/domain/entities/store';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { ShoppingSessionDetails } from '@/domain/entities/shopping-history';
import { useStoreService } from '@/features/stores/hooks/use-store-service';
import { useHistoryService } from '@/features/history/hooks/use-history-service';
import { useSelectedStore } from '@/features/stores/hooks/use-selected-store';
import { formatPhpCents } from '@/utils/format-money';
import { useAppDialog } from '@/hooks/use-app-dialog';

export default function HistoryScreen() {
  const history = useHistoryService();
  const storesService = useStoreService();
  const { selectedStore } = useSelectedStore();
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [details, setDetails] = useState<ShoppingSessionDetails | null>(null);
  const [storeId, setStoreId] = useState<number | undefined>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showDialog, dialogElement } = useAppDialog();

  const load = useCallback(async () => {
    try {
      const [rows, storeRows] = await Promise.all([
        history.list({ storeId, from: from || undefined, to: to ? `${to}T23:59:59.999Z` : undefined }),
        storesService.list(),
      ]);
      setSessions(rows); setStores(storeRows); setError(null);
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to load shopping history.'); }
  }, [from, history, storeId, storesService, to]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = async (session: ShoppingSession) => { const loaded = await history.details(session.id); if (loaded) setDetails(loaded); };
  const reuse = async () => { if (!details || !selectedStore) { setError('Select a store before reusing a session.'); return; } try { await history.reuse(selectedStore.id, details); showDialog({ title: 'Session reused', message: `Added ${details.items.length} item types to the active cart.` }); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to reuse this session.'); } };
  const remove = () => { if (!details) return; showDialog({ title: 'Delete historical session?', message: 'This permanently removes the session and its cart snapshots.', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true, onConfirm: () => void history.delete(details.id).then(() => { setDetails(null); void load(); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to delete historical session.')) }); };

  return <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark"><ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 32 }}><Link href="/(tabs)/more" className="mb-4 self-start"><Text className="font-semibold text-primary">← Back to More</Text></Link>
    <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Shopping history</Text>
    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">Completed trips and their saved price snapshots.</Text>
    {error && <Text className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</Text>}
    {!details ? <><View className="mt-5 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><Text className="font-semibold text-ink dark:text-ink-dark">Filter history</Text><View className="mt-3 flex-row gap-2"><TextInput className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" placeholder="From YYYY-MM-DD" placeholderTextColor="#78716c" onChangeText={setFrom} value={from} /><TextInput className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" placeholder="To YYYY-MM-DD" placeholderTextColor="#78716c" onChangeText={setTo} value={to} /></View><ScrollView horizontal className="mt-3" showsHorizontalScrollIndicator={false}><Pressable className={`mr-2 rounded-full border px-3 py-2 ${storeId === undefined ? 'border-primary bg-primary/10' : 'border-border dark:border-border-dark'}`} onPress={() => setStoreId(undefined)}><Text className="text-sm text-ink dark:text-ink-dark">All stores</Text></Pressable>{stores.map((store) => <Pressable key={store.id} className={`mr-2 rounded-full border px-3 py-2 ${storeId === store.id ? 'border-primary bg-primary/10' : 'border-border dark:border-border-dark'}`} onPress={() => setStoreId(store.id)}><Text className="text-sm text-ink dark:text-ink-dark">{store.name}</Text></Pressable>)}</ScrollView><Pressable className="mt-3 self-start rounded-xl bg-primary px-4 py-2" onPress={() => void load()}><Text className="font-semibold text-white">Apply filters</Text></Pressable></View>{sessions.length === 0 ? <View className="mt-6 rounded-2xl border border-dashed border-border p-6 dark:border-border-dark"><Text className="text-lg font-semibold text-ink dark:text-ink-dark">No completed trips</Text><Text className="mt-2 text-sm text-muted dark:text-muted-dark">Completed shopping sessions will appear here.</Text></View> : sessions.map((session) => <Pressable key={session.id} className="mt-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark" onPress={() => void open(session)}><View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-ink dark:text-ink-dark">{session.storeName}</Text><Text className="text-sm text-muted dark:text-muted-dark">{new Date(session.completedAt ?? session.startedAt).toLocaleDateString()}</Text></View><Text className="mt-2 text-sm text-muted dark:text-muted-dark">{session.itemCount} item types</Text><Text className="mt-2 text-xl font-bold text-ink dark:text-ink-dark">{formatPhpCents(session.estimatedTotalCents)}</Text>{session.actualTotalCents !== null && <Text className="mt-1 text-sm text-muted dark:text-muted-dark">Checkout: {formatPhpCents(session.actualTotalCents)}</Text>}</Pressable>)}</> : <><Pressable onPress={() => setDetails(null)}><Text className="font-semibold text-primary">← All history</Text></Pressable><Text className="mt-4 text-2xl font-bold text-ink dark:text-ink-dark">{details.storeName}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{new Date(details.completedAt ?? details.startedAt).toLocaleString()}</Text><View className="mt-5 rounded-2xl border border-primary bg-surface p-4 dark:bg-surface-dark"><Text className="text-sm text-muted dark:text-muted-dark">Estimated total</Text><Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">{formatPhpCents(details.estimatedTotalCents)}</Text>{details.actualTotalCents !== null && <><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Actual checkout total</Text><Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">{formatPhpCents(details.actualTotalCents)}</Text><Text className="mt-2 text-sm font-semibold text-primary">Difference: {formatPhpCents(details.actualTotalCents - details.estimatedTotalCents)}</Text></>}</View>{details.items.map((item) => <View key={item.id} className="mt-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><View className="flex-row justify-between"><Text className="flex-1 text-base font-semibold text-ink dark:text-ink-dark">{item.productName}</Text><Text className="font-bold text-ink dark:text-ink-dark">{formatPhpCents(item.lineSubtotalCents)}</Text></View><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{item.quantity} × {formatPhpCents(item.unitPriceCents)}</Text></View>)}<Pressable className="mt-5 rounded-xl bg-primary px-4 py-3" onPress={() => void reuse()}><Text className="text-center font-semibold text-white">Reuse items in active cart</Text></Pressable><Pressable className="mt-4 self-start" onPress={remove}><Text className="font-semibold text-red-700 dark:text-red-300">Delete historical session</Text></Pressable></>}
  </ScrollView>{dialogElement}</SafeAreaView>;
}

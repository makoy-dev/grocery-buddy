import { Link, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';

import { useSelectedStore } from '@/features/stores/hooks/use-selected-store';
import { useSessionService } from '@/features/sessions/hooks/use-session-service';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import { formatPhpCents } from '@/utils/format-money';
import { BrandLogo } from '@/components/ui/brand-logo';

export default function HomeScreen() {
  const { selectedStore, isLoading } = useSelectedStore();
  const sessions = useSessionService();
  const [session, setSession] = useState<ShoppingSession | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!selectedStore) {
        setSession(null);
        return undefined;
      }
      void sessions.getActive(selectedStore.id).then(setSession);
      return undefined;
    }, [selectedStore, sessions]),
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 py-8">
        <BrandLogo />
        <Text className="mt-3 text-base leading-6 text-muted dark:text-muted-dark">
          Your offline grocery price tracker.
        </Text>
        {isLoading ? (
          <Text className="mt-8 text-sm text-muted dark:text-muted-dark">Loading selected store…</Text>
        ) : selectedStore ? (
          <View className="mt-8 rounded-2xl border border-primary bg-surface p-5 dark:border-primary-dark dark:bg-surface-dark">
            <Text className="text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-dark">Shopping at</Text>
            <Text className="mt-2 text-2xl font-bold text-ink dark:text-ink-dark">{selectedStore.name}</Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              {selectedStore.productCount} saved {selectedStore.productCount === 1 ? 'product' : 'products'}
            </Text>
            {session && <View className="mt-5 border-t border-border pt-4 dark:border-border-dark"><Text className="text-sm font-semibold text-ink dark:text-ink-dark">Active trip</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">Estimated total: {formatPhpCents(session.estimatedTotalCents)}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{session.budgetCents === null ? 'No budget set' : `Budget: ${formatPhpCents(session.budgetCents)}`}</Text></View>}
          </View>
        ) : (
          <View className="mt-8 rounded-2xl border border-dashed border-border p-6 dark:border-border-dark">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">Choose a store first</Text>
            <Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">
              Select a store before using the scanner or cart.
            </Text>
            <Link className="mt-5 self-start rounded-xl bg-primary px-4 py-3 font-semibold text-white dark:bg-primary-dark dark:text-stone-950" href="/(tabs)/stores">
              Browse stores
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

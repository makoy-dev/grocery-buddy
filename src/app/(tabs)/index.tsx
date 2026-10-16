import { Link } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

import { useSelectedStore } from '@/features/stores/hooks/use-selected-store';

export default function HomeScreen() {
  const { selectedStore, isLoading } = useSelectedStore();

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 py-8">
        <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Grocery Buddy</Text>
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

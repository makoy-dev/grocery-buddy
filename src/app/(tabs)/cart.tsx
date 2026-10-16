import { Link } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

import { useSelectedStore } from '@/features/stores/hooks/use-selected-store';

export default function CartScreen() {
  const { selectedStore, isLoading } = useSelectedStore();

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-canvas px-6 py-8 dark:bg-canvas-dark"><Text className="text-sm text-muted dark:text-muted-dark">Loading selected store…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 py-8">
        <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Cart</Text>
        {selectedStore ? (
          <>
            <Text className="mt-3 text-base leading-6 text-muted dark:text-muted-dark">
              Your {selectedStore.name} shopping estimate will appear here once cart tracking is implemented.
            </Text>
            <View className="mt-8 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-sm leading-5 text-muted dark:text-muted-dark">Cart calculations are not implemented yet.</Text>
            </View>
          </>
        ) : (
          <View className="mt-8 rounded-2xl border border-dashed border-border p-6 dark:border-border-dark">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">Select a store first</Text>
            <Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">Cart prices must belong to a selected store.</Text>
            <Link className="mt-5 self-start rounded-xl bg-primary px-4 py-3 font-semibold text-white dark:bg-primary-dark dark:text-stone-950" href="/(tabs)/stores">Choose store</Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

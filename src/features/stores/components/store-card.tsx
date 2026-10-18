import { Pressable, Text, View } from 'react-native';

import type { StoreSummary } from '@/domain/entities/store';

type StoreCardProps = {
  store: StoreSummary;
  isSelected: boolean;
  onPress: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onFavorite: () => void;
};

export function StoreCard({ store, isSelected, onPress, onSelect, onEdit, onFavorite }: StoreCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${store.name}`}
      className={`rounded-2xl border p-4 ${
        isSelected
          ? 'border-primary bg-green-50 dark:border-primary-dark dark:bg-green-950/30'
          : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
      }`}
      onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-ink dark:text-ink-dark">{store.name}</Text>
          <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
            {store.productCount} saved {store.productCount === 1 ? 'product' : 'products'}
          </Text>
          {isSelected && (
            <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-dark">
              Selected store
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={store.isFavorite ? `Remove ${store.name} favorite` : `Favorite ${store.name}`}
          className="rounded-full px-2 py-1"
          onPress={onFavorite}>
          <Text className="text-xl">{store.isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isSelected ? `${store.name} is selected` : `Select ${store.name}`}
        className={`mt-4 self-start rounded-lg px-3 py-2 ${isSelected ? 'bg-primary/10' : 'bg-primary'}`}
        disabled={isSelected}
        onPress={onSelect}>
        <Text className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-white'}`}>
          {isSelected ? 'Selected' : 'Select store'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="mt-3 self-start rounded-lg bg-stone-100 px-3 py-2 dark:bg-stone-800"
        onPress={onPress}>
        <Text className="text-sm font-medium text-ink dark:text-ink-dark">View dashboard</Text>
      </Pressable>
      <Pressable className="mt-3 self-start" onPress={onEdit}>
        <Text className="text-sm font-semibold text-muted dark:text-muted-dark">Edit store</Text>
      </Pressable>
    </Pressable>
  );
}

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import type { StoreSummary } from "@/domain/entities/store";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { useStoreService } from "@/features/stores/hooks/use-store-service";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function StoreDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const service = useStoreService();
  const { selectedStore, selectStore, clearSelectedStore } = useSelectedStore();
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showDialog, dialogElement } = useAppDialog();

  useEffect(() => {
    if (!Number.isSafeInteger(storeId) || storeId <= 0) {
      // Invalid route parameters are a terminal screen state, not a loading state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("This store could not be found.");
      return;
    }

    void service
      .getById(storeId)
      .then((nextStore) => {
        setStore(nextStore);
        if (!nextStore) {
          setError("This store could not be found.");
          return;
        }
        return selectStore(storeId);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load this store.",
        ),
      );
  }, [selectStore, service, storeId]);

  const confirmDelete = () => {
    if (!store) {
      return;
    }
    showDialog({ title: `Delete ${store.name}?`, message: "Stores with saved prices or shopping history cannot be deleted.", confirmLabel: "Delete", cancelLabel: "Cancel", destructive: true, onConfirm: () => { void service.delete(store.id).then(() => { clearSelectedStore(); router.replace("/(tabs)/stores"); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to delete this store.")); } });
  };

  if (!store) {
    return (
      <SafeAreaView className="flex-1 bg-canvas px-6 py-8 dark:bg-canvas-dark">
        <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
          Store dashboard
        </Text>
        <Text className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error ?? "Loading store…"}
        </Text>
        <Pressable
          className="mt-6 self-start rounded-xl bg-primary px-4 py-3 dark:bg-primary-dark"
          onPress={() => router.replace("/(tabs)/stores")}
        >
          <Text className="font-semibold text-white dark:text-stone-950">
            Back to stores
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 py-8">
        <Pressable
          accessibilityRole="button"
          className="self-start"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-primary dark:text-primary-dark">
            ‹ Stores
          </Text>
        </Pressable>
        <Text className="mt-8 text-3xl font-bold text-ink dark:text-ink-dark">
          {store.name}
        </Text>
        <Text className="mt-2 text-base text-muted dark:text-muted-dark">
          Store dashboard
        </Text>
        <View className="mt-8 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
            Saved products
          </Text>
          <Text className="mt-2 text-3xl font-bold text-ink dark:text-ink-dark">
            {store.productCount}
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            Prices for this store stay separate from other stores.
          </Text>
        </View>
        {selectedStore?.id === store.id && (
          <Text className="mt-5 text-sm font-semibold text-primary dark:text-primary-dark">
            Selected shopping store
          </Text>
        )}
        {error && (
          <Text className="mt-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        )}
        <Pressable
          className="mt-auto self-center px-4 py-3"
          onPress={confirmDelete}
        >
          <Text className="font-semibold text-red-700 dark:text-red-300">
            Delete store
          </Text>
        </Pressable>
      </View>
    {dialogElement}
    </SafeAreaView>
  );
}

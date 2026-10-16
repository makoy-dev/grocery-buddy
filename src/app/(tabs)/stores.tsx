import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import type { StoreSummary } from "@/domain/entities/store";
import { EmptyState } from "@/features/stores/components/empty-state";
import { StoreCard } from "@/features/stores/components/store-card";
import {
  StoreForm,
  type StoreFormValues,
} from "@/features/stores/components/store-form";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { useStoreService } from "@/features/stores/hooks/use-store-service";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function StoresScreen() {
  const service = useStoreService();
  const { selectedStore, selectStore, clearSelectedStore } = useSelectedStore();
  const { showDialog, dialogElement } = useAppDialog();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // The list starts a new asynchronous load whenever the search term changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    void service
      .list(search)
      .then((nextStores) => {
        if (isMounted) {
          setStores(nextStores);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (isMounted) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load stores.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [search, service]);

  const reload = async () => {
    setStores(await service.list(search));
  };

  const openCreate = () => {
    setEditingStore(null);
    setError(null);
    setIsFormVisible(true);
  };

  const openEdit = (store: StoreSummary) => {
    setEditingStore(store);
    setError(null);
    setIsFormVisible(true);
  };

  const saveStore = async ({ name }: StoreFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingStore) {
        await service.update(editingStore.id, { name });
      } else {
        await service.create({ name });
      }
      setIsFormVisible(false);
      await reload();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this store.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = async (store: StoreSummary) => {
    try {
      await service.setFavorite(store.id, !store.isFavorite);
      await reload();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update this favorite.",
      );
    }
  };

  const openStore = async (store: StoreSummary) => {
    try {
      await selectStore(store.id);
      router.push({
        pathname: "/store/[id]",
        params: { id: String(store.id) },
      });
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to select this store.",
      );
    }
  };

  const confirmDelete = (store: StoreSummary) => {
    showDialog({ title: `Delete ${store.name}?`, message: "A store with saved prices or shopping history cannot be deleted. Empty stores can be removed permanently.", confirmLabel: "Delete", cancelLabel: "Cancel", destructive: true, onConfirm: () => { void service.delete(store.id).then(async () => { if (selectedStore?.id === store.id) clearSelectedStore(); await reload(); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to delete this store.")); } });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-ink dark:text-ink-dark">
              Stores
            </Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
              Choose where you shop.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            className="rounded-xl bg-primary px-4 py-3 dark:bg-primary-dark"
            onPress={openCreate}
          >
            <Text className="font-semibold text-white dark:text-stone-950">
              Add
            </Text>
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="Search stores"
          className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          onChangeText={setSearch}
          placeholder="Search stores"
          placeholderTextColor="#78716c"
          value={search}
        />
        {error && (
          <Text className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        )}

        <FlatList
          className="mt-5"
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          data={stores}
          keyExtractor={(store) => String(store.id)}
          ListEmptyComponent={
            isLoading ? undefined : (
              <EmptyState
                message={
                  search
                    ? "Try another name or add a new store."
                    : "Add your first grocery store to start tracking prices."
                }
                title={search ? "No stores found" : "No stores yet"}
              />
            )
          }
          renderItem={({ item }) => (
            <StoreCard
              isSelected={selectedStore?.id === item.id}
              onEdit={() => openEdit(item)}
              onFavorite={() => void toggleFavorite(item)}
              onPress={() => void openStore(item)}
              store={item}
            />
          )}
        />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsFormVisible(false)}
        visible={isFormVisible}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <StoreForm
            initialName={editingStore?.name}
            isBusy={isSaving}
            onCancel={() => setIsFormVisible(false)}
            onSubmit={saveStore}
            serverError={error}
            submitLabel={editingStore ? "Save changes" : "Create store"}
          />
          {editingStore && (
            <Pressable
              className="mt-8 self-center px-4 py-3"
              onPress={() => {
                setIsFormVisible(false);
                confirmDelete(editingStore);
              }}
            >
              <Text className="font-semibold text-red-700 dark:text-red-300">
                Delete store
              </Text>
            </Pressable>
          )}
        </SafeAreaView>
      </Modal>
    {dialogElement}
    </SafeAreaView>
  );
}

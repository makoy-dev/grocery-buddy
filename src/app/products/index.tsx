import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type {
  CreateProductInput,
  ProductSummary,
} from "@/domain/entities/product";
import { ProductForm } from "@/features/products/components/product-form";
import { useProductService } from "@/features/products/hooks/use-product-service";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";

export default function ProductsScreen() {
  const service = useProductService();
  const { selectedStore } = useSelectedStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isFormVisible, setFormVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = async () =>
    setProducts(
      await service.list({
        search,
        storeId: selectedStore?.id,
        missingPriceOnly: missingOnly,
        includeArchived,
      }),
    );
  useEffect(() => {
    let alive = true;
    void service
      .list({
        search,
        storeId: selectedStore?.id,
        missingPriceOnly: missingOnly,
        includeArchived,
      })
      .then((rows) => {
        if (alive) setProducts(rows);
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof Error ? e.message : "Unable to load products.");
      });
    return () => {
      alive = false;
    };
  }, [search, selectedStore?.id, missingOnly, includeArchived, service]);

  const save = async (values: CreateProductInput) => {
    setSaving(true);
    setError(null);
    try {
      await service.create(values);
      setFormVisible(false);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };
  const archive = (product: ProductSummary) =>
    Alert.alert(
      `Archive ${product.name}?`,
      "Archived products stay in the catalog and keep all saved prices and history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () =>
            void service
              .archive(product.id)
              .then(reload)
              .catch((e: unknown) =>
                setError(
                  e instanceof Error ? e.message : "Unable to archive product.",
                ),
              ),
        },
      ],
    );

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-ink dark:text-ink-dark">
              Products
            </Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
              Shared catalog; prices belong to stores.
            </Text>
          </View>
          <Pressable
            className="rounded-xl bg-primary px-4 py-3"
            onPress={() => {
              setError(null);
              setFormVisible(true);
            }}
          >
            <Text className="font-semibold text-white">Add</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Search products"
          className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          onChangeText={setSearch}
          placeholder="Search barcode, name, or brand"
          placeholderTextColor="#78716c"
          value={search}
        />
        <View className="mt-3 flex-row gap-2">
          <Pressable
            className={`rounded-full border px-3 py-2 ${missingOnly ? "border-primary bg-primary/10" : "border-border"}`}
            disabled={!selectedStore}
            onPress={() => setMissingOnly(!missingOnly)}
          >
            <Text className="text-sm text-ink dark:text-ink-dark">
              {missingOnly ? "Showing missing prices" : "Missing price only"}
            </Text>
          </Pressable>
          <Pressable
            className="rounded-full border border-border px-3 py-2 dark:border-border-dark"
            onPress={() => setIncludeArchived(!includeArchived)}
          >
            <Text className="text-sm text-ink dark:text-ink-dark">
              {includeArchived ? "Showing archived" : "Hide archived"}
            </Text>
          </Pressable>
        </View>
        {!selectedStore && missingOnly && (
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            Select a store to filter products missing a price.
          </Text>
        )}
        {error && <Text className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</Text>}
        <FlatList
          className="mt-5"
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          data={products}
          keyExtractor={(p) => String(p.id)}
          ListEmptyComponent={
            <View className="items-center rounded-2xl border border-dashed border-border p-8 dark:border-border-dark">
              <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                No products found
              </Text>
              <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">
                Create a product manually to build your local catalog.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              className="rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
              onPress={() =>
                router.push({
                  pathname: "/products/[id]",
                  params: { id: String(item.id) },
                })
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                    {item.name}
                  </Text>
                  {item.brand && (
                    <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                      {item.brand}
                    </Text>
                  )}
                  <Text className="mt-2 text-xs text-muted dark:text-muted-dark">
                    Barcode: {item.barcode}
                  </Text>
                </View>
                {item.archivedAt && (
                  <Text className="rounded-full bg-stone-200 px-2 py-1 text-xs text-muted dark:bg-stone-700 dark:text-muted-dark">
                    Archived
                  </Text>
                )}
              </View>
              {selectedStore && (
                <Text
                  className={`mt-3 text-sm ${item.hasPriceForStore ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                >
                  {item.hasPriceForStore
                    ? `Price saved for ${selectedStore.name}`
                    : `Missing price for ${selectedStore.name}`}
                </Text>
              )}
              <View className="mt-3 flex-row justify-end">
                <Text className="font-semibold text-primary">View details</Text>
                {!item.archivedAt && (
                  <Pressable className="ml-4" onPress={() => archive(item)}>
                    <Text className="font-semibold text-red-700 dark:text-red-300">Archive</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          )}
        />
      </View>
      <Modal
        animationType="slide"
        visible={isFormVisible}
        onRequestClose={() => setFormVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <ProductForm
            isBusy={saving}
            onCancel={() => setFormVisible(false)}
            onSubmit={save}
            serverError={error}
            submitLabel="Create product"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

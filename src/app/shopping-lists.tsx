import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ProductSummary } from "@/domain/entities/product";
import type {
  ShoppingList,
  ShoppingListItem,
} from "@/domain/entities/shopping-list";
import { useProductService } from "@/features/products/hooks/use-product-service";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { useShoppingListService } from "@/features/shopping-lists/hooks/use-shopping-list-service";
import { formatPhpCents } from "@/utils/format-money";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function ShoppingListsScreen() {
  const service = useShoppingListService();
  const products = useProductService();
  const { selectedStore } = useSelectedStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selected, setSelected] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [catalog, setCatalog] = useState<ProductSummary[]>([]);
  const [name, setName] = useState("");
  const [modal, setModal] = useState<
    "create" | "rename" | "duplicate" | "products" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showDialog, dialogElement } = useAppDialog();
  const [pickerQuantities, setPickerQuantities] = useState<Record<number, number>>({});
  const estimatedTotal = items.reduce(
    (sum, item) => sum + (item.lineTotalCents ?? 0),
    0,
  );
  const hasUnknownPrice = items.some((item) => item.priceCents === null);

  const refresh = useCallback(
    async (list = selected) => {
      setLists(await service.list());
      if (list) {
        setSelected(list);
        setItems(await service.items(list.id, selectedStore?.id ?? null));
      }
    },
    [selected, selectedStore, service],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update shopping list.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveName = () => {
    if (!name.trim()) return setError("Enter a list name.");
    void run(async () => {
      if (modal === "create") await service.create(name);
      else if (modal === "rename" && selected)
        await service.rename(selected.id, name);
      else if (modal === "duplicate" && selected)
        await service.duplicate(selected.id, name);
      setName("");
      setModal(null);
    });
  };
  const openList = async (list: ShoppingList) => {
    setSelected(list);
    const loaded = await service.items(list.id, selectedStore?.id ?? null);
    setItems(loaded);
    setSelectedProductIds(
      loaded.filter((item) => !item.pickedUp).map((item) => item.productId),
    );
  };
  const addProduct = async (product: ProductSummary) => {
    if (!selected) return;
    const quantity = pickerQuantities[product.id] ?? 1;
    setBusy(true);
    setError(null);
    try {
      await service.addItem(selected.id, product.id, quantity);
      setItems(await service.items(selected.id, selectedStore?.id ?? null));
      setSelectedProductIds((current) =>
        current.includes(product.id) ? current : [...current, product.id],
      );
      setPickerQuantities((current) => ({ ...current, [product.id]: 1 }));
      showDialog({ title: 'Added to list', message: `${quantity} × ${product.name} added to ${selected.name}.` });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to add product.');
    } finally {
      setBusy(false);
    }
  };
  const remove = (item: ShoppingListItem) => {
    if (!selected) return;
    void run(() => service.removeItem(selected.id, item.productId));
  };
  const quantity = (item: ShoppingListItem, next: number) => {
    if (!selected) return;
    if (next < 1) return remove(item);
    void run(() => service.setQuantity(selected.id, item.productId, next));
  };
  const togglePicked = (item: ShoppingListItem) => {
    if (!selected) return;
    void run(() =>
      service.setPickedUp(selected.id, item.productId, !item.pickedUp),
    );
  };
  const transfer = () => {
    if (!selected || !selectedStore)
      return setError("Select a store before transferring items.");
    void run(() =>
      service.transferToSession(selectedStore.id, items, selectedProductIds),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Link href="/(tabs)/more" className="mb-4 self-start"><Text className="font-semibold text-primary">← Back to More</Text></Link>
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-ink dark:text-ink-dark">
            Shopping lists
          </Text>
          <Pressable
            className="rounded-xl bg-primary px-4 py-3"
            onPress={() => {
              setName("");
              setModal("create");
            }}
          >
            <Text className="font-semibold text-white">New list</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Reusable plans kept separate from shopping sessions.
        </Text>
        {error && (
          <Text className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        )}
        {!selected ? (
          <View className="mt-6">
            {lists.length === 0 ? (
              <View className="rounded-2xl border border-dashed border-border p-6 dark:border-border-dark">
                <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                  No shopping lists yet
                </Text>
                <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                  Create a reusable list for your next trip.
                </Text>
              </View>
            ) : (
              lists.map((list) => (
                <Pressable
                  key={list.id}
                  className="mb-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
                  onPress={() => void openList(list)}
                >
                  <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                    {list.name}
                  </Text>
                  <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                    Updated {new Date(list.updatedAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View className="mt-6">
            <Pressable onPress={() => setSelected(null)}>
              <Text className="font-semibold text-primary">← All lists</Text>
            </Pressable>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                {selected.name}
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setName(selected.name);
                    setModal("rename");
                  }}
                >
                  <Text className="font-semibold text-primary">Rename</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setName(`${selected.name} copy`);
                    setModal("duplicate");
                  }}
                >
                  <Text className="font-semibold text-primary">Duplicate</Text>
                </Pressable>
              </View>
            </View>
            <Text className="mt-2 text-sm font-semibold text-ink dark:text-ink-dark">
              Estimated cost:{" "}
              {hasUnknownPrice
                ? "Unknown — missing store prices"
                : formatPhpCents(estimatedTotal)}
            </Text>
            <Pressable
              className="mt-4 self-start rounded-xl bg-primary px-4 py-3"
              onPress={async () => {
                setCatalog(
                  await products.list({
                    storeId: selectedStore?.id,
                    includeArchived: false,
                  }),
                );
                setModal("products");
              }}
            >
              <Text className="font-semibold text-white">Add products</Text>
            </Pressable>
            {items.length === 0 ? (
              <Text className="mt-6 text-sm text-muted dark:text-muted-dark">
                No products in this list yet.
              </Text>
            ) : (
              items.map((item) => (
                <View
                  key={item.id}
                  className="mt-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                      <Pressable
                        className="mr-3 h-7 w-7 items-center justify-center rounded-lg border border-border dark:border-border-dark"
                        onPress={() =>
                          setSelectedProductIds((current) =>
                            current.includes(item.productId)
                              ? current.filter((id) => id !== item.productId)
                              : [...current, item.productId],
                          )
                        }
                      >
                        <Text className="font-bold text-primary">
                          {selectedProductIds.includes(item.productId)
                            ? "✓"
                            : ""}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="flex-1"
                        onPress={() => void togglePicked(item)}
                      >
                        <Text
                          className={`text-lg font-semibold ${item.pickedUp ? "text-muted line-through dark:text-muted-dark" : "text-ink dark:text-ink-dark"}`}
                        >
                          {item.pickedUp ? "✓ " : ""}
                          {item.productName}
                        </Text>
                        <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                          {item.priceCents === null
                            ? "Price unknown for selected store"
                            : `${formatPhpCents(item.priceCents)} each · ${formatPhpCents(item.lineTotalCents ?? 0)}`}
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => remove(item)}>
                      <Text className="font-semibold text-red-700 dark:text-red-300">
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                  <View className="mt-3 flex-row items-center gap-3">
                    <Pressable
                      className="rounded-lg border border-border px-3 py-1 dark:border-border-dark"
                      onPress={() => void quantity(item, item.quantity - 1)}
                    >
                      <Text className="text-lg text-ink dark:text-ink-dark">
                        −
                      </Text>
                    </Pressable>
                    <Text className="font-semibold text-ink dark:text-ink-dark">
                      {item.quantity}
                    </Text>
                    <Pressable
                      className="rounded-lg border border-border px-3 py-1 dark:border-border-dark"
                      onPress={() => void quantity(item, item.quantity + 1)}
                    >
                      <Text className="text-lg text-ink dark:text-ink-dark">
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            {items.length > 0 && (
              <Pressable
                className="mt-5 rounded-xl bg-primary px-4 py-3"
                onPress={transfer}
              >
                <Text className="text-center font-semibold text-white">
                  Transfer selected items to cart
                </Text>
              </Pressable>
            )}
            <Pressable
              className="mt-4 self-start"
              onPress={() =>
                showDialog({ title: "Delete list?", message: "The original list and its items will be removed.", confirmLabel: "Delete", cancelLabel: "Cancel", destructive: true, onConfirm: () => { void run(async () => { await service.delete(selected.id); setSelected(null); setItems([]); }); } })
              }
            >
              <Text className="font-semibold text-red-700 dark:text-red-300">
                Delete list
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={modal === "products"}
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
            Add products
          </Text>
          <FlatList
            className="mt-4"
            data={catalog}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View className="mb-2 rounded-xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
                <Text className="font-semibold text-ink dark:text-ink-dark">{item.name}</Text>
                <Text className="mt-1 text-sm text-muted dark:text-muted-dark">{item.barcode}</Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Pressable className="rounded-lg border border-border px-3 py-1 dark:border-border-dark" onPress={() => setPickerQuantities((current) => ({ ...current, [item.id]: Math.max(1, (current[item.id] ?? 1) - 1) }))}>
                      <Text className="text-lg text-ink dark:text-ink-dark">−</Text>
                    </Pressable>
                    <Text className="font-semibold text-ink dark:text-ink-dark">{pickerQuantities[item.id] ?? 1}</Text>
                    <Pressable className="rounded-lg border border-border px-3 py-1 dark:border-border-dark" onPress={() => setPickerQuantities((current) => ({ ...current, [item.id]: (current[item.id] ?? 1) + 1 }))}>
                      <Text className="text-lg text-ink dark:text-ink-dark">+</Text>
                    </Pressable>
                  </View>
                  <Pressable disabled={busy} className="rounded-xl bg-primary px-4 py-2" onPress={() => void addProduct(item)}>
                    <Text className="font-semibold text-white">Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
          <Pressable className="mt-3 self-start" onPress={() => setModal(null)}>
            <Text className="font-semibold text-primary">Done</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={
          modal === "create" || modal === "rename" || modal === "duplicate"
        }
        animationType="slide"
        transparent
        onRequestClose={() => setModal(null)}
      >
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="rounded-2xl bg-surface p-5 dark:bg-surface-dark">
            <Text className="text-xl font-bold text-ink dark:text-ink-dark">
              {modal === "create"
                ? "New shopping list"
                : modal === "rename"
                  ? "Rename list"
                  : "Duplicate list"}
            </Text>
            <TextInput
              autoFocus
              className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              onChangeText={setName}
              placeholder="List name"
              placeholderTextColor="#78716c"
              value={name}
            />
            <View className="mt-4 flex-row justify-end gap-3">
              <Pressable onPress={() => setModal(null)}>
                <Text className="px-3 py-3 font-semibold text-muted dark:text-muted-dark">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                className="rounded-xl bg-primary px-4 py-3"
                onPress={saveName}
              >
                <Text className="font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    {dialogElement}
    </SafeAreaView>
  );
}

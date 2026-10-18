import { Link, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CartItem } from "@/domain/entities/cart-item";
import type { ShoppingSession } from "@/domain/entities/shopping-session";
import { useCartRepository } from "@/features/cart/hooks/use-cart-repository";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { useSessionService } from "@/features/sessions/hooks/use-session-service";
import { usePricingService } from "@/features/pricing/hooks/use-pricing-service";
import { useProductService } from "@/features/products/hooks/use-product-service";
import { parsePhpToCents } from "@/features/pricing/services/pricing-service";
import { formatPhpCents } from "@/utils/format-money";
import { BudgetPanel } from "@/features/budget/components/budget-panel";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function CartScreen() {
  const { selectedStore, isLoading } = useSelectedStore();
  const sessions = useSessionService();
  const cart = useCartRepository();
  const pricing = usePricingService();
  const products = useProductService();
  const [session, setSession] = useState<ShoppingSession | null>(null);
  const [history, setHistory] = useState<ShoppingSession[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [actual, setActual] = useState("");
  const [editing, setEditing] = useState<CartItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [temporaryVisible, setTemporaryVisible] = useState(false);
  const [temporaryName, setTemporaryName] = useState("");
  const [temporaryUnit, setTemporaryUnit] = useState("kg");
  const [temporaryPrice, setTemporaryPrice] = useState("");
  const [temporaryQuantity, setTemporaryQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showDialog, dialogElement } = useAppDialog();
  const load = useCallback(async () => {
    if (!selectedStore) return;
    try {
      const active = await sessions.getActive(selectedStore.id);
      setSession(active);
      setItems(active ? await cart.list(selectedStore.id) : []);
      setHistory(await sessions.history(selectedStore.id));
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to load cart.");
    }
  }, [cart, selectedStore, sessions]);
  // Cart state is synchronized with SQLite when the selected store changes.
  useFocusEffect(
    useCallback(() => {
    // SQLite synchronization intentionally updates local state when the selected store changes.
    void load();
      return undefined;
    }, [load]),
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.lineSubtotalCents, 0),
    [items],
  );
  if (isLoading)
    return (
      <SafeAreaView className="flex-1 bg-canvas px-6 py-8 dark:bg-canvas-dark">
        <Text className="text-sm text-muted dark:text-muted-dark">Loading selected store…</Text>
      </SafeAreaView>
    );
  if (!selectedStore)
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 px-6 py-8">
          <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Cart</Text>
          <View className="mt-8 rounded-2xl border border-dashed border-border p-6">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
              Select a store first
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Shopping sessions belong to exactly one store.
            </Text>
            <Link
              className="mt-5 self-start rounded-xl bg-primary px-4 py-3 font-semibold text-white"
              href="/(tabs)/stores"
            >
              Choose store
            </Link>
          </View>
        </View>
      </SafeAreaView>
    );
  const start = async () => {
    setBusy(true);
    try {
      await sessions.start(selectedStore.id);
      await load();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to start session.",
      );
    } finally {
      setBusy(false);
    }
  };
  const refreshItems = async () => setItems(await cart.list(selectedStore.id));
  const changeQuantity = async (item: CartItem, quantity: number) => {
    try {
      await cart.setQuantity(selectedStore.id, item.productId, quantity);
      await refreshItems();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update quantity.",
      );
    }
  };
  const remove = (item: CartItem) => showDialog({ title: `Remove ${item.productName}?`, message: "This removes the item from the active cart.", confirmLabel: "Remove", cancelLabel: "Cancel", destructive: true, onConfirm: () => void cart.remove(selectedStore.id, item.productId).then(refreshItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to remove item.")) });
  const saveCartPrice = async () => {
    if (!editing) return;
    try {
      const cents = parsePhpToCents(editPrice);
      await cart.setUnitPrice(selectedStore.id, editing.productId, cents);
      setEditing(null);
      await refreshItems();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Enter a valid price.");
    }
  };
  const saveStorePrice = async () => {
    if (!editing) return;
    try {
      const cents = parsePhpToCents(editPrice);
      await pricing.save(selectedStore.id, editing.productId, cents);
      setError(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save store price.",
      );
    }
  };
  const saveBudget = async (amount: string) => {
    if (!session) return;
    try {
      await sessions.setBudget(session.id, amount);
      await load();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save budget.",
      );
    }
  };
  const removeBudget = async () => {
    if (!session) return;
    try {
      await sessions.setBudget(session.id, null);
      await load();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove budget.",
      );
    }
  };
  const clear = () => showDialog({ title: "Clear cart?", message: "All items will be removed from this active session.", confirmLabel: "Clear", cancelLabel: "Cancel", destructive: true, onConfirm: () => void cart.clear(selectedStore.id).then(refreshItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to clear cart.")) });
  const addTemporaryItem = async () => {
    try {
      const name = temporaryName.trim();
      if (!name) throw new Error("Enter a temporary item name.");
      const quantity = Number(temporaryQuantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive whole number.");
      const cents = parsePhpToCents(temporaryPrice);
      const product = await products.create({
        barcode: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        name,
        unit: temporaryUnit.trim() || "unit",
        category: "Temporary item",
      });
      await cart.addItem(selectedStore.id, product.id, cents, quantity);
      setTemporaryVisible(false);
      setTemporaryName("");
      setTemporaryPrice("");
      setTemporaryQuantity("1");
      await load();
      showDialog({ title: "Added to cart", message: `${quantity} × ${name} was added as a temporary item.` });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to add temporary item.");
    }
  };
  const complete = () => showDialog({ title: "Complete shopping session?", message: "The estimated total will be preserved.", confirmLabel: "Complete", cancelLabel: "Cancel", onConfirm: () => void (async () => { setBusy(true); try { await sessions.complete(session!.id, actual.trim() ? actual : null); setActual(""); await load(); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Unable to complete session."); } finally { setBusy(false); } })() });
  const discard = () => showDialog({ title: "Discard shopping session?", message: "The session and its items remain in history as cancelled.", confirmLabel: "Discard", cancelLabel: "Keep", destructive: true, onConfirm: () => void (async () => { setBusy(true); try { await sessions.discard(session!.id); await load(); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Unable to discard session."); } finally { setBusy(false); } })() });
  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <ScrollView
        className="flex-1 px-6 py-8"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Cart</Text>
        <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
          Shopping at {selectedStore.name}
        </Text>
        {error && <Text className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</Text>}
        {!session ? (
          <View className="mt-8 rounded-2xl border border-dashed border-border p-6 dark:border-border-dark">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
              No active session
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Start a trip before adding scanned products.
            </Text>
            <Pressable
              className="mt-5 self-start rounded-xl bg-primary px-4 py-3"
              disabled={busy}
              onPress={() => void start()}
            >
              <Text className="font-semibold text-white">
                Start shopping session
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mt-6 rounded-2xl border border-primary bg-surface p-5 dark:bg-surface-dark">
              <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
                Active session ·{" "}
                {new Date(session.startedAt).toLocaleDateString()}
              </Text>
              <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                {items.length} {items.length === 1 ? "product" : "products"} ·{" "}
                {items.reduce((sum, item) => sum + item.quantity, 0)} total
                items
              </Text>
              <Text className="mt-4 text-sm text-muted dark:text-muted-dark">Estimated total</Text>
              <Text className="mt-1 text-3xl font-bold text-ink dark:text-ink-dark">
                {formatPhpCents(total)}
              </Text>
            </View>
            <BudgetPanel
              budgetCents={session.budgetCents}
              totalCents={total}
              isBusy={busy}
              error={error}
              onSave={saveBudget}
              onRemove={removeBudget}
            />
            <Pressable
              className="mt-4 self-start rounded-xl border border-primary px-4 py-3"
              onPress={() => setTemporaryVisible(true)}
            >
              <Text className="font-semibold text-primary">Add temporary item</Text>
            </Pressable>
            {items.length === 0 ? (
              <View className="mt-6 rounded-2xl border border-dashed border-border p-6 dark:border-border-dark">
                <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                  Your cart is empty
                </Text>
                <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                  Scan a priced product to add it to this session.
                </Text>
              </View>
            ) : (
              <View className="mt-5">
                {items.map((item) => (
                  <View
                    key={item.id}
                    className="mb-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
                  >
                    <View className="flex-row justify-between">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                          {item.productName}
                        </Text>
                        <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                          {formatPhpCents(item.unitPriceCents)} each
                        </Text>
                      </View>
                      <Text className="text-lg font-bold text-ink dark:text-ink-dark">
                        {formatPhpCents(item.lineSubtotalCents)}
                      </Text>
                    </View>
                    <View className="mt-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          className="rounded-lg border border-border px-3 py-2 dark:border-border-dark"
                          onPress={() =>
                            void changeQuantity(item, item.quantity - 1)
                          }
                        >
                          <Text className="text-lg text-ink dark:text-ink-dark">−</Text>
                        </Pressable>
                        <Text className="font-semibold text-ink dark:text-ink-dark">
                          {item.quantity}
                        </Text>
                        <Pressable
                          className="rounded-lg border border-border px-3 py-2 dark:border-border-dark"
                          onPress={() =>
                            void changeQuantity(item, item.quantity + 1)
                          }
                        >
                          <Text className="text-lg text-ink dark:text-ink-dark">+</Text>
                        </Pressable>
                      </View>
                      <View className="flex-row gap-3">
                        <Pressable
                          onPress={() => {
                            setEditing(item);
                            setEditPrice(
                              (item.unitPriceCents / 100).toFixed(2),
                            );
                          }}
                        >
                          <Text className="font-semibold text-primary">
                            Edit price
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => remove(item)}>
                          <Text className="font-semibold text-red-700 dark:text-red-300">
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View className="mt-5 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="font-semibold text-ink dark:text-ink-dark">Actual checkout total</Text>
              <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                Optional — enter the amount from your receipt before completing this session.
              </Text>
              <TextInput
                accessibilityLabel="Actual checkout total in PHP"
                className="mt-3 rounded-xl border border-border bg-canvas px-4 py-3 text-lg text-ink dark:border-border-dark dark:bg-canvas-dark dark:text-ink-dark"
                keyboardType="decimal-pad"
                onChangeText={setActual}
                placeholder="e.g. 1250.00"
                placeholderTextColor="#78716c"
                value={actual}
              />
            </View>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="rounded-xl border border-red-200 px-4 py-3 dark:border-red-800"
                onPress={clear}
              >
                <Text className="font-semibold text-red-700 dark:text-red-300">Clear cart</Text>
              </Pressable>
              <Pressable
                className="rounded-xl bg-primary px-4 py-3"
                disabled={busy}
                onPress={complete}
              >
                <Text className="font-semibold text-white">Complete</Text>
              </Pressable>
              <Pressable
                className="rounded-xl border border-border px-4 py-3 dark:border-border-dark"
                disabled={busy}
                onPress={discard}
              >
                <Text className="font-semibold text-ink dark:text-ink-dark">Discard</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      <View className="px-6 pb-5">
        {history.filter((item) => item.id !== session?.id).length > 0 && (
          <Text className="text-sm text-muted dark:text-muted-dark">
            {history.filter((item) => item.id !== session?.id).length} previous
            session(s) preserved for this store.
          </Text>
        )}
      </View>
      <Modal visible={temporaryVisible} animationType="slide" onRequestClose={() => setTemporaryVisible(false)}>
        <SafeAreaView className="flex-1 bg-canvas px-6 py-8 dark:bg-canvas-dark">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Add temporary item</Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            Use this for weighed or unpackaged goods without a barcode, such as chicken, vegetables, or fruit.
          </Text>
          <TextInput accessibilityLabel="Temporary item name" className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" onChangeText={setTemporaryName} placeholder="Item name" placeholderTextColor="#78716c" value={temporaryName} />
          <TextInput accessibilityLabel="Unit" className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" onChangeText={setTemporaryUnit} placeholder="Unit (e.g. kg)" placeholderTextColor="#78716c" value={temporaryUnit} />
          <TextInput accessibilityLabel="Price per unit" className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" keyboardType="decimal-pad" onChangeText={setTemporaryPrice} placeholder="Price per unit in PHP" placeholderTextColor="#78716c" value={temporaryPrice} />
          <TextInput accessibilityLabel="Temporary item quantity" className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" keyboardType="number-pad" onChangeText={setTemporaryQuantity} placeholder="Quantity" placeholderTextColor="#78716c" value={temporaryQuantity} />
          <View className="mt-5 flex-row gap-3">
            <Pressable className="rounded-xl bg-primary px-4 py-3" onPress={() => void addTemporaryItem()}><Text className="font-semibold text-white">Add to cart</Text></Pressable>
            <Pressable className="rounded-xl border border-border px-4 py-3 dark:border-border-dark" onPress={() => setTemporaryVisible(false)}><Text className="font-semibold text-ink dark:text-ink-dark">Cancel</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
      <View
        className="absolute inset-0"
        pointerEvents={editing ? "auto" : "none"}
      >
        {editing && (
          <View className="m-6 mt-32 rounded-2xl border border-border bg-surface p-5 shadow-lg dark:border-border-dark dark:bg-surface-dark">
            <Text className="text-xl font-bold text-ink dark:text-ink-dark">Edit cart price</Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
              This changes only this cart snapshot.
            </Text>
            <TextInput
              accessibilityLabel="Cart unit price"
              className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-lg text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              keyboardType="decimal-pad"
              onChangeText={setEditPrice}
              value={editPrice}
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="rounded-xl bg-primary px-4 py-3"
                onPress={() => void saveCartPrice()}
              >
                <Text className="font-semibold text-white">
                  Save cart price
                </Text>
              </Pressable>
              <Pressable
                className="rounded-xl border border-border px-4 py-3"
                onPress={() => void saveStorePrice()}
              >
                <Text className="font-semibold text-ink dark:text-ink-dark">Save store price</Text>
              </Pressable>
            </View>
            <Pressable
              className="mt-4 self-start"
              onPress={() => setEditing(null)}
            >
              <Text className="font-semibold text-primary">Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
      {dialogElement}
    </SafeAreaView>
  );
}

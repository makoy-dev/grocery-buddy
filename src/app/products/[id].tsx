import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import type { CreateProductInput, Product } from "@/domain/entities/product";
import { ProductForm } from "@/features/products/components/product-form";
import { useProductService } from "@/features/products/hooks/use-product-service";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { usePricingService } from "@/features/pricing/hooks/use-pricing-service";
import {
  PriceForm,
  type PriceFormValues,
} from "@/features/pricing/components/price-form";
import type { StoreProductPrice } from "@/domain/entities/store-product-price";
import { formatPhpCents } from "@/utils/format-money";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = useProductService();
  const pricing = usePricingService();
  const { selectedStore } = useSelectedStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [price, setPrice] = useState<StoreProductPrice | null>(null);
  const [priceEditing, setPriceEditing] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);
  const { showDialog, dialogElement } = useAppDialog();
  useEffect(() => {
    const productId = Number(id);
    if (!Number.isSafeInteger(productId)) return;
    void service
      .getById(productId)
      .then(setProduct)
      .catch(() => setError("Unable to load product."));
  }, [id, service]);
  useEffect(() => {
    const productId = Number(id);
    if (!selectedStore || !Number.isSafeInteger(productId)) return;
    void pricing
      .getCurrent(selectedStore.id, productId)
      .then(setPrice)
      .catch(() => setError("Unable to load this store price."));
  }, [id, pricing, selectedStore]);
  if (!product)
    return (
      <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
        <Text className="text-base text-muted dark:text-muted-dark">
          {error ?? "Loading product…"}
        </Text>
        <Pressable className="mt-5" onPress={() => router.back()}>
          <Text className="font-semibold text-primary">Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  const save = async (values: CreateProductInput) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await service.update(product.id, values);
      setProduct(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };
  const savePrice = async ({ amount }: PriceFormValues) => {
    if (!selectedStore) return;
    setPriceSaving(true);
    setError(null);
    try {
      const updated = await pricing.save(selectedStore.id, product.id, amount);
      setPrice(updated);
      setPriceEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to save price.");
    } finally {
      setPriceSaving(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-5 py-6">
        <Pressable onPress={() => router.back()}>
          <Text className="font-semibold text-primary">Back to products</Text>
        </Pressable>
        <Text className="mt-6 text-3xl font-bold text-ink dark:text-ink-dark">{product.name}</Text>
        {product.brand && (
          <Text className="mt-1 text-base text-muted dark:text-muted-dark">{product.brand}</Text>
        )}
        <View className="mt-6 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
          <Text className="text-sm text-muted dark:text-muted-dark">Barcode</Text>
          <Text className="mt-1 text-base text-ink dark:text-ink-dark">{product.barcode}</Text>
          {[
            ["Category", product.category],
            ["Unit", product.unit],
            ["Package size", product.packageSize],
          ].map(([label, value]) =>
            value ? (
              <View key={label} className="mt-4">
                <Text className="text-sm text-muted dark:text-muted-dark">{label}</Text>
                <Text className="mt-1 text-base text-ink dark:text-ink-dark">{value}</Text>
              </View>
            ) : null,
          )}
        </View>
        {selectedStore && (
          <View className="mt-5 rounded-2xl border border-primary bg-surface p-4 dark:bg-surface-dark">
            <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
              Price at {selectedStore.name}
            </Text>
            {price ? (
              <>
                <Text className="mt-2 text-2xl font-bold text-ink dark:text-ink-dark">
                  {formatPhpCents(price.currentPriceCents)}
                </Text>
                <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                  Last updated {new Date(price.updatedAt).toLocaleDateString()}
                </Text>
              </>
            ) : (
              <Text className="mt-2 text-base text-amber-700 dark:text-amber-300">
                No price saved for this store yet.
              </Text>
            )}
            <Pressable
              className="mt-4 self-start rounded-xl bg-primary px-4 py-3"
              onPress={() => setPriceEditing(true)}
            >
              <Text className="font-semibold text-white">
                {price ? "Update price" : "Save price"}
              </Text>
            </Pressable>
          </View>
        )}
        {error && <Text className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</Text>}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            className="rounded-xl bg-primary px-4 py-3"
            onPress={() => setEditing(true)}
          >
            <Text className="font-semibold text-white">Edit</Text>
          </Pressable>
          {product.archivedAt ? (
            <Pressable
              className="rounded-xl border border-border px-4 py-3 dark:border-border-dark"
              onPress={() =>
                void service.unarchive(product.id).then(setProduct)
              }
            >
              <Text className="font-semibold text-ink dark:text-ink-dark">Restore</Text>
            </Pressable>
          ) : (
            <Pressable
              className="rounded-xl border border-red-200 px-4 py-3"
              onPress={() =>
                showDialog({ title: "Archive product?", message: "Saved prices and history will remain available.", confirmLabel: "Archive", cancelLabel: "Cancel", destructive: true, onConfirm: () => void service.archive(product.id).then(setProduct) })
              }
            >
              <Text className="font-semibold text-red-700 dark:text-red-300">Archive</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Modal
        animationType="slide"
        visible={editing}
        onRequestClose={() => setEditing(false)}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <ProductForm
            initialValues={product}
            isBusy={saving}
            onCancel={() => setEditing(false)}
            onSubmit={save}
            serverError={error}
            submitLabel="Save changes"
          />
        </SafeAreaView>
      </Modal>
      <Modal
        animationType="slide"
        visible={priceEditing}
        onRequestClose={() => setPriceEditing(false)}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <PriceForm
            initialAmount={
              price ? (price.currentPriceCents / 100).toFixed(2) : ""
            }
            isBusy={priceSaving}
            onCancel={() => setPriceEditing(false)}
            onSubmit={savePrice}
            serverError={error}
            storeName={selectedStore?.name ?? ""}
          />
        </SafeAreaView>
      </Modal>
    {dialogElement}
    </SafeAreaView>
  );
}

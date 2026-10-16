import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CreateProductInput, Product } from "@/domain/entities/product";
import type { StoreProductPrice } from "@/domain/entities/store-product-price";
import { ProductForm } from "@/features/products/components/product-form";
import { useProductService } from "@/features/products/hooks/use-product-service";
import {
  PriceForm,
  type PriceFormValues,
} from "@/features/pricing/components/price-form";
import { usePricingService } from "@/features/pricing/hooks/use-pricing-service";
import { useBarcodeLookupService } from "@/features/scanner/hooks/use-barcode-lookup-service";
import {
  acceptScan,
  normalizeBarcode,
  type BarcodeLookup,
} from "@/features/scanner/services/barcode-lookup-service";
import { useCartRepository } from "@/features/cart/hooks/use-cart-repository";
import { useSelectedStore } from "@/features/stores/hooks/use-selected-store";
import { formatPhpCents } from "@/utils/format-money";

export default function ScanScreen() {
  const { selectedStore, isLoading } = useSelectedStore();
  const lookup = useBarcodeLookupService();
  const products = useProductService();
  const pricing = usePricingService();
  const cart = useCartRepository();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [torch, setTorch] = useState(false);
  const [lookupResult, setLookupResult] = useState<BarcodeLookup | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cartQuantity, setCartQuantity] = useState(1);
  const [form, setForm] = useState<"product" | "price" | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastScan = useRef<{ barcode: string | null; at: number }>({
    barcode: null,
    at: 0,
  });
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
          <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Scan</Text>
          <View className="mt-8 rounded-2xl border border-dashed border-border p-6">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
              Select a store first
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Scanned prices must belong to a selected store.
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

  const handleLookup = async (raw: string, type?: string) => {
    const barcode = normalizeBarcode(raw, type);
    if (!barcode) {
      setError(
        "Enter or scan a supported EAN-13, EAN-8, UPC-A, or UPC-E barcode.",
      );
      return;
    }
    if (!acceptScan(lastScan.current, barcode)) return;
    setScanning(false);
    setError(null);
    setManualBarcode("");
    try {
      setLookupResult(await lookup.lookup(selectedStore.id, barcode, type));
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to look up this barcode.",
      );
    }
  };
  const resume = () => {
    setLookupResult(null);
    setPendingProduct(null);
    setForm(null);
    setError(null);
    setCartQuantity(1);
    setCameraStarted(true);
    setScanning(true);
  };
  const startCamera = () => {
    setLookupResult(null);
    setError(null);
    setCameraStarted(true);
    setScanning(true);
  };
  const addToCart = async (product: Product, price: StoreProductPrice) => {
    try {
      await cart.addItem(selectedStore.id, product.id, price.currentPriceCents, cartQuantity);
      Alert.alert(
        "Added to cart",
        `${cartQuantity} × ${product.name} was added at ${formatPhpCents(price.currentPriceCents)} each.`,
      );
      resume();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to add this product to the cart.",
      );
    }
  };
  const savePrice = async ({ amount }: PriceFormValues) => {
    const product =
      pendingProduct ??
      (lookupResult && "product" in lookupResult ? lookupResult.product : null);
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await pricing.save(selectedStore.id, product.id, amount);
      setLookupResult({
        kind: "priced",
        barcode: lookupResult?.barcode ?? product.barcode,
        product,
        price: saved,
      });
      setPendingProduct(null);
      setForm(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this price.",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveProduct = async (values: CreateProductInput) => {
    setSaving(true);
    setError(null);
    try {
      const created = await products.create(values);
      setPendingProduct(created);
      setForm("price");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this product.",
      );
    } finally {
      setSaving(false);
    }
  };
  const cameraAvailable = Platform.OS !== "web";

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-5 py-6">
        <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Scan</Text>
        <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
          Scanning for {selectedStore.name}
        </Text>
        {cameraAvailable && permission?.granted && cameraStarted && scanning ? (
          <View className="mt-5" style={{ height: 360 }}>
            <View
              className="overflow-hidden rounded-2xl"
              style={{ height: 320 }}
            >
              <CameraView
                style={{ height: 320, width: "100%" }}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
                }}
                onBarcodeScanned={(event: BarcodeScanningResult) =>
                  void handleLookup(event.data, event.type)
                }
              />
              <View className="pointer-events-none absolute inset-0 items-center justify-center">
                <View className="h-36 w-72 rounded-2xl border-2 border-white" />
                <Text className="mt-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  Align the barcode inside the frame
                </Text>
              </View>
              <Pressable
                className="absolute bottom-4 right-4 rounded-full bg-black/60 px-4 py-3"
                onPress={() => setTorch(!torch)}
              >
                <Text className="font-semibold text-white">
                  {torch ? "Flash off" : "Flash on"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              className="mt-2 self-start"
              onPress={() => {
                setScanning(false);
                setCameraStarted(false);
              }}
            >
              <Text className="font-semibold text-primary">Close camera</Text>
            </Pressable>
          </View>
        ) : cameraAvailable && permission?.granted ? (
          <Pressable
            className="mt-5 items-center rounded-2xl bg-primary px-5 py-6"
            onPress={startCamera}
          >
            <Text className="text-lg font-bold text-white">Scan barcode</Text>
            <Text className="mt-1 text-sm text-white/80">
              Open camera and scan a product
            </Text>
          </Pressable>
        ) : cameraAvailable && permission && !permission.granted ? (
          <View className="mt-5 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
              Camera permission needed
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">
              Allow camera access to scan product barcodes. If access was
              denied, enable it for Grocery Godz in device settings.
            </Text>
            <Pressable
              className="mt-5 self-start rounded-xl bg-primary px-4 py-3"
              onPress={() => void requestPermission()}
            >
              <Text className="font-semibold text-white">Allow camera</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-5 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
              Camera scanning unavailable
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Use manual barcode entry below in this environment.
            </Text>
          </View>
        )}
        <View className="mt-5">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
            Manual barcode
          </Text>
          <View className="mt-2 flex-row gap-2">
            <TextInput
              accessibilityLabel="Manual barcode"
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              keyboardType="number-pad"
              onChangeText={setManualBarcode}
              placeholder="EAN or UPC digits"
              placeholderTextColor="#78716c"
              value={manualBarcode}
            />
            <Pressable
              className="rounded-xl bg-primary px-4 py-3"
              onPress={() => void handleLookup(manualBarcode)}
            >
              <Text className="font-semibold text-white">Look up</Text>
            </Pressable>
          </View>
        </View>
        {error && (
          <Text className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        )}
        {lookupResult && (
          <View className="mt-5 rounded-2xl border border-primary bg-surface p-5 dark:bg-surface-dark">
            <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
              {lookupResult.kind === "unknown"
                ? "Unknown product"
                : lookupResult.kind === "missing-price"
                  ? "Price missing for this store"
                  : "Product found"}
            </Text>
            {lookupResult.kind === "unknown" ? (
              <>
                <Text className="mt-2 text-lg font-semibold text-ink dark:text-ink-dark">
                  Barcode {lookupResult.barcode}
                </Text>
                <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                  Create the shared catalog product, then save its first price
                  for {selectedStore.name}.
                </Text>
                <Pressable
                  className="mt-4 self-start rounded-xl bg-primary px-4 py-3"
                  onPress={() => setForm("product")}
                >
                  <Text className="font-semibold text-white">Add product</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="mt-2 text-xl font-bold text-ink dark:text-ink-dark">
                  {lookupResult.product.name}
                </Text>
                {lookupResult.kind === "priced" ? (
                  <>
                    <Text className="mt-2 text-2xl font-bold text-ink dark:text-ink-dark">
                      {formatPhpCents(lookupResult.price.currentPriceCents)}
                    </Text>
                    <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                      Updated{" "}
                      {new Date(
                        lookupResult.price.updatedAt,
                      ).toLocaleDateString()}
                    </Text>
                    <View className="mt-4 flex-row items-center gap-3">
                      <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Quantity</Text>
                      <Pressable className="rounded-lg border border-border px-3 py-1 dark:border-border-dark" onPress={() => setCartQuantity(Math.max(1, cartQuantity - 1))}>
                        <Text className="text-lg text-ink dark:text-ink-dark">−</Text>
                      </Pressable>
                      <Text className="min-w-6 text-center font-semibold text-ink dark:text-ink-dark">{cartQuantity}</Text>
                      <Pressable className="rounded-lg border border-border px-3 py-1 dark:border-border-dark" onPress={() => setCartQuantity(cartQuantity + 1)}>
                        <Text className="text-lg text-ink dark:text-ink-dark">+</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      className="mt-4 self-start rounded-xl bg-primary px-4 py-3"
                      onPress={() =>
                        void addToCart(lookupResult.product, lookupResult.price)
                      }
                    >
                      <Text className="font-semibold text-white">
                        Add to cart
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      No saved price at {selectedStore.name}.
                    </Text>
                    <Pressable
                      className="mt-4 self-start rounded-xl bg-primary px-4 py-3"
                      onPress={() => {
                        setPendingProduct(lookupResult.product);
                        setForm("price");
                      }}
                    >
                      <Text className="font-semibold text-white">
                        Add store price
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
            <Pressable className="mt-4 self-start" onPress={resume}>
              <Text className="font-semibold text-primary">
                Cancel and scan again
              </Text>
            </Pressable>
          </View>
        )}
        {!scanning && !lookupResult && error && (
          <Pressable className="mt-4 self-start" onPress={resume}>
            <Text className="font-semibold text-primary">Resume scanning</Text>
          </Pressable>
        )}
      </View>
      <Modal
        animationType="slide"
        visible={form === "product"}
        onRequestClose={resume}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <ProductForm
            initialValues={{
              barcode:
                lookupResult?.kind === "unknown" ? lookupResult.barcode : "",
            }}
            isBusy={saving}
            onCancel={resume}
            onSubmit={saveProduct}
            serverError={error}
            submitLabel="Create product"
          />
        </SafeAreaView>
      </Modal>
      <Modal
        animationType="slide"
        visible={form === "price"}
        onRequestClose={resume}
      >
        <SafeAreaView className="flex-1 bg-canvas px-5 py-6 dark:bg-canvas-dark">
          <PriceForm
            initialAmount=""
            isBusy={saving}
            onCancel={resume}
            onSubmit={savePrice}
            serverError={error}
            storeName={selectedStore.name}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

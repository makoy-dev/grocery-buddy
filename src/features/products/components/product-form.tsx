import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as React from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { z } from "zod";
import type { CreateProductInput } from "@/domain/entities/product";
import { normalizeBarcode } from "@/features/scanner/services/barcode-lookup-service";

const schema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1, "Enter a barcode.")
    .max(80, "Barcode is too long."),
  name: z
    .string()
    .trim()
    .min(1, "Enter a product name.")
    .max(160, "Product name is too long."),
  brand: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  unit: z.string().trim().max(40).optional(),
  packageSize: z.string().trim().max(80).optional(),
});
type ProductFormValues = z.infer<typeof schema>;
type Props = {
  initialValues?: Partial<CreateProductInput>;
  submitLabel: string;
  isBusy?: boolean;
  serverError?: string | null;
  onCancel: () => void;
  onSubmit: (values: CreateProductInput) => Promise<void>;
};
const fields: [keyof ProductFormValues, string, string][] = [
  ["barcode", "Barcode", "Keep leading zeros exactly as printed"],
  ["name", "Product name", ""],
  ["brand", "Brand", "Optional"],
  ["category", "Category", "Optional"],
  ["unit", "Unit", "e.g. pack, kg, bottle"],
  ["packageSize", "Package size", "e.g. 500 g"],
];

export function ProductForm({
  initialValues = {},
  submitLabel,
  isBusy = false,
  serverError,
  onCancel,
  onSubmit,
}: Props) {
  const { control, formState, handleSubmit, setValue } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      barcode: initialValues.barcode ?? "",
      name: initialValues.name ?? "",
      brand: initialValues.brand ?? "",
      category: initialValues.category ?? "",
      unit: initialValues.unit ?? "",
      packageSize: initialValues.packageSize ?? "",
    },
  });
  const [scannerVisible, setScannerVisible] = React.useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerError, setScannerError] = React.useState<string | null>(null);
  const scanLock = React.useRef(false);
  const openScanner = async () => {
    setScannerError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setScannerError("Camera access is needed to scan a barcode. You can still enter it manually.");
        return;
      }
    }
    scanLock.current = false;
    setScannerVisible(true);
  };
  const handleBarcode = (result: BarcodeScanningResult) => {
    if (scanLock.current) return;
    const barcode = normalizeBarcode(result.data, result.type);
    if (!barcode) {
      setScannerError("That barcode format is not supported.");
      return;
    }
    scanLock.current = true;
    setValue("barcode", barcode, { shouldDirty: true, shouldValidate: true });
    setScannerVisible(false);
  };
  if (scannerVisible) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={{ flex: 1, width: "100%", height: "100%" }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={handleBarcode}
          onMountError={(mountError) => {
            setScannerError(`Unable to start the camera: ${mountError.message}`);
            setScannerVisible(false);
          }}
        />
        <View className="absolute inset-x-0 bottom-0 p-6">
          <Text className="mb-4 text-center text-white">Align the barcode inside the frame</Text>
          <Pressable className="rounded-xl bg-white px-4 py-3" onPress={() => setScannerVisible(false)}>
            <Text className="text-center font-semibold text-black">Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
        {submitLabel === "Create product" ? "Add a product" : "Edit product"}
      </Text>
      {fields.map(([name, label, hint]) => (
        <View key={name} className="mt-4">
          <Text className="mb-1 text-sm font-semibold text-ink dark:text-ink-dark">
            {label}
          </Text>
          {hint && (
            <Text className="mb-1 text-xs text-muted dark:text-muted-dark">
              {hint}
            </Text>
          )}
          <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                accessibilityLabel={label}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
                autoCapitalize={name === "barcode" ? "none" : "sentences"}
                onBlur={onBlur}
                onChangeText={onChange}
                onFocus={() => undefined}
                placeholderTextColor="#78716c"
                value={value ?? ""}
              />
            )}
          />
          {formState.errors[name]?.message && (
            <Text className="mt-1 text-sm text-red-700 dark:text-red-300">
              {formState.errors[name]?.message}
            </Text>
          )}
        </View>
      ))}
      <Pressable
        accessibilityLabel="Scan product barcode"
        className="mt-4 self-start rounded-xl border border-primary px-4 py-3"
        onPress={() => void openScanner()}
      >
        <Text className="font-semibold text-primary">Scan barcode with camera</Text>
      </Pressable>
      {scannerError && (
        <Text className="mt-2 text-sm text-red-700 dark:text-red-300">{scannerError}</Text>
      )}
      {serverError && (
        <Text className="mt-3 text-sm text-red-700 dark:text-red-300">{serverError}</Text>
      )}
      <View className="my-6 flex-row justify-end gap-3">
        <Pressable className="rounded-xl px-4 py-3" onPress={onCancel}>
          <Text className="font-semibold text-muted dark:text-muted-dark">Cancel</Text>
        </Pressable>
        <Pressable
          className="rounded-xl bg-primary px-4 py-3"
          disabled={isBusy}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          <Text className="font-semibold text-white">
            {isBusy ? "Saving…" : submitLabel}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

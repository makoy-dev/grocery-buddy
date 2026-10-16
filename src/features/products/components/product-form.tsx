import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import type { CreateProductInput } from '@/domain/entities/product';

const schema = z.object({
  barcode: z.string().trim().min(1, 'Enter a barcode.').max(80, 'Barcode is too long.'),
  name: z.string().trim().min(1, 'Enter a product name.').max(160, 'Product name is too long.'),
  brand: z.string().trim().max(120).optional(), category: z.string().trim().max(120).optional(),
  unit: z.string().trim().max(40).optional(), packageSize: z.string().trim().max(80).optional(),
});
type ProductFormValues = z.infer<typeof schema>;
type Props = { initialValues?: Partial<CreateProductInput>; submitLabel: string; isBusy?: boolean; serverError?: string | null; onCancel: () => void; onSubmit: (values: CreateProductInput) => Promise<void> };
const fields: [keyof ProductFormValues, string, string][] = [['barcode','Barcode','Keep leading zeros exactly as printed'],['name','Product name',''],['brand','Brand','Optional'],['category','Category','Optional'],['unit','Unit','e.g. pack, kg, bottle'],['packageSize','Package size','e.g. 500 g']];

export function ProductForm({ initialValues = {}, submitLabel, isBusy = false, serverError, onCancel, onSubmit }: Props) {
  const { control, formState, handleSubmit } = useForm<ProductFormValues>({ resolver: zodResolver(schema), defaultValues: { barcode: initialValues.barcode ?? '', name: initialValues.name ?? '', brand: initialValues.brand ?? '', category: initialValues.category ?? '', unit: initialValues.unit ?? '', packageSize: initialValues.packageSize ?? '' } });
  return <ScrollView keyboardShouldPersistTaps="handled">
    <Text className="text-2xl font-bold text-ink dark:text-ink-dark">{submitLabel === 'Create product' ? 'Add a product' : 'Edit product'}</Text>
    {fields.map(([name, label, hint]) => <View key={name} className="mt-4"><Text className="mb-1 text-sm font-semibold text-ink dark:text-ink-dark">{label}</Text>{hint && <Text className="mb-1 text-xs text-muted dark:text-muted-dark">{hint}</Text>}<Controller control={control} name={name} render={({ field: { onChange, onBlur, value } }) => <TextInput accessibilityLabel={label} className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" autoCapitalize={name === 'barcode' ? 'none' : 'sentences'} onBlur={onBlur} onChangeText={onChange} value={value ?? ''} />}/>{formState.errors[name]?.message && <Text className="mt-1 text-sm text-red-700">{formState.errors[name]?.message}</Text>}</View>)}
    {serverError && <Text className="mt-3 text-sm text-red-700">{serverError}</Text>}
    <View className="my-6 flex-row justify-end gap-3"><Pressable className="rounded-xl px-4 py-3" onPress={onCancel}><Text className="font-semibold text-muted">Cancel</Text></Pressable><Pressable className="rounded-xl bg-primary px-4 py-3" disabled={isBusy} onPress={() => void handleSubmit(onSubmit)()}><Text className="font-semibold text-white">{isBusy ? 'Saving…' : submitLabel}</Text></Pressable></View>
  </ScrollView>;
}

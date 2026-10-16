import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

const storeFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a store name.').max(120, 'Store names are limited to 120 characters.'),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

type StoreFormProps = {
  initialName?: string;
  submitLabel: string;
  isBusy?: boolean;
  serverError?: string | null;
  onCancel: () => void;
  onSubmit: (values: StoreFormValues) => Promise<void>;
};

export function StoreForm({
  initialName = '',
  submitLabel,
  isBusy = false,
  serverError,
  onCancel,
  onSubmit,
}: StoreFormProps) {
  const { control, formState, handleSubmit, reset } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    reset({ name: initialName });
  }, [initialName, reset]);

  return (
    <View>
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
        {submitLabel === 'Create store' ? 'Add a store' : 'Edit store'}
      </Text>
      <Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">
        Store names are compared without case or extra spaces.
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            accessibilityLabel="Store name"
            autoFocus
            className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Store name"
            placeholderTextColor="#78716c"
            value={value}
          />
        )}
      />
      {formState.errors.name?.message && (
        <Text className="mt-2 text-sm text-red-700 dark:text-red-300">{formState.errors.name.message}</Text>
      )}
      {serverError && <Text className="mt-2 text-sm text-red-700 dark:text-red-300">{serverError}</Text>}

      <View className="mt-6 flex-row justify-end gap-3">
        <Pressable
          accessibilityRole="button"
          className="rounded-xl px-4 py-3"
          onPress={() => {
            reset({ name: initialName });
            onCancel();
          }}>
          <Text className="font-semibold text-muted dark:text-muted-dark">Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="rounded-xl bg-primary px-4 py-3 dark:bg-primary-dark"
          disabled={isBusy}
          onPress={() => void handleSubmit(onSubmit)()}>
          <Text className="font-semibold text-white dark:text-stone-950">
            {isBusy ? 'Saving…' : submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export type { StoreFormValues };

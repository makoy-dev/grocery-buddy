import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { z } from "zod";

const schema = z.object({
  amount: z
    .string()
    .trim()
    .regex(
      /^\d+(?:\.\d{1,2})?$/,
      "Enter a PHP amount with up to two decimal places.",
    )
    .refine(
      (value) => Number(value) > 0 && Number.isFinite(Number(value)),
      "Price must be greater than zero.",
    ),
});
type Values = z.infer<typeof schema>;

type Props = {
  initialAmount?: string;
  storeName: string;
  isBusy?: boolean;
  serverError?: string | null;
  onCancel: () => void;
  onSubmit: (values: Values) => Promise<void>;
};

export function PriceForm({
  initialAmount = "",
  storeName,
  isBusy = false,
  serverError,
  onCancel,
  onSubmit,
}: Props) {
  const { control, formState, handleSubmit } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: initialAmount },
  });
  return (
    <View>
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
        {initialAmount ? "Update price" : "Save price"}
      </Text>
      <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
        Price for {storeName}, stored independently from other stores.
      </Text>
      <Controller
        control={control}
        name="amount"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            accessibilityLabel="Price in PHP"
            autoFocus
            className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-lg text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
            keyboardType="decimal-pad"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="0.00"
            placeholderTextColor="#78716c"
            value={value}
          />
        )}
      />
      {formState.errors.amount?.message && (
        <Text className="mt-2 text-sm text-red-700 dark:text-red-300">
          {formState.errors.amount.message}
        </Text>
      )}
      {serverError && (
        <Text className="mt-2 text-sm text-red-700 dark:text-red-300">{serverError}</Text>
      )}
      <View className="mt-6 flex-row justify-end gap-3">
        <Pressable className="rounded-xl px-4 py-3" onPress={onCancel}>
          <Text className="font-semibold text-muted dark:text-muted-dark">Cancel</Text>
        </Pressable>
        <Pressable
          className="rounded-xl bg-primary px-4 py-3"
          disabled={isBusy}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          <Text className="font-semibold text-white">
            {isBusy ? "Saving…" : "Save price"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export type { Values as PriceFormValues };

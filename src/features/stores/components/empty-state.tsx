import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border px-6 py-10 dark:border-border-dark">
      <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted dark:text-muted-dark">
        {message}
      </Text>
    </View>
  );
}

import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = {
  title: string;
  description: string;
  note: string;
};

export function AppScreen({ title, description, note }: AppScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 py-8">
        <Text className="text-3xl font-bold text-ink dark:text-ink-dark">{title}</Text>
        <Text className="mt-3 text-base leading-6 text-muted dark:text-muted-dark">
          {description}
        </Text>
        <View className="mt-8 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
          <Text className="text-sm leading-5 text-muted dark:text-muted-dark">{note}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

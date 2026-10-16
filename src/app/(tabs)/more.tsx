import { AppScreen } from '@/components/ui/app-screen';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text, View } from 'react-native';

export default function MoreScreen() {
  return (
    <AppScreen
      title="More"
      description="Manage reusable shopping lists, products, history, reports, and settings offline."
      note="Everything stays on this device. Your catalog, prices, and lists work offline."
    >
      <Text className="mt-8 text-xs font-bold uppercase tracking-widest text-muted dark:text-muted-dark">
        Manage
      </Text>
      <View className="mt-3 gap-4">
      <Link href="/products" className="rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary-dark/20">
            <SymbolView name={{ ios: 'barcode', android: 'inventory_2' }} tintColor="#208AEF" size={24} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-bold text-ink dark:text-ink-dark">Product catalog</Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">Add and manage your shared products</Text>
          </View>
          <Text className="text-2xl text-muted dark:text-muted-dark">›</Text>
        </View>
      </Link>
      <Link href="/shopping-lists" className="rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15">
            <SymbolView name={{ ios: 'checklist', android: 'format_list_bulleted' }} tintColor="#10B981" size={24} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-bold text-ink dark:text-ink-dark">Shopping lists</Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">Plan, reuse, and transfer your lists</Text>
          </View>
          <Text className="text-2xl text-muted dark:text-muted-dark">›</Text>
        </View>
      </Link>
      <Link href="/history" className="rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-400/15"><SymbolView name={{ ios: 'clock.arrow.circlepath', android: 'history' }} tintColor="#F59E0B" size={24} /></View>
          <View className="ml-4 flex-1"><Text className="text-base font-bold text-ink dark:text-ink-dark">Shopping history</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">Review completed trips and reuse items</Text></View>
          <Text className="text-2xl text-muted dark:text-muted-dark">›</Text>
        </View>
      </Link>
      <Link href="/comparisons" className="rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 dark:bg-sky-400/15"><SymbolView name={{ ios: 'arrow.left.arrow.right', android: 'compare_arrows' }} tintColor="#0EA5E9" size={24} /></View>
          <View className="ml-4 flex-1"><Text className="text-base font-bold text-ink dark:text-ink-dark">Price comparison</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">Compare saved prices across stores</Text></View>
          <Text className="text-2xl text-muted dark:text-muted-dark">›</Text>
        </View>
      </Link>
      </View>
    </AppScreen>
  );
}

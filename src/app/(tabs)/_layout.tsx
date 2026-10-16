import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'house.fill', android: 'home' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="stores" options={{ title: 'Stores', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'storefront.fill', android: 'store' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'barcode.viewfinder', android: 'qr_code_scanner' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'cart.fill', android: 'shopping_cart' }} tintColor={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <SymbolView name={{ ios: 'ellipsis.circle.fill', android: 'more_horiz' }} tintColor={color} size={size} /> }} />
    </Tabs>
  );
}

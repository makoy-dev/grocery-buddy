import { AppScreen } from '@/components/ui/app-screen';
import { Link } from 'expo-router';
import { Text } from 'react-native';

export default function MoreScreen() {
  return (
    <AppScreen
      title="More"
      description="Shopping lists, history, reports, and settings will be grouped here."
      note="Products are managed offline in the shared catalog."
    ><Link href="/products" className="mt-6 rounded-xl bg-primary px-4 py-3"><Text className="font-semibold text-white">Manage products</Text></Link></AppScreen>
  );
}

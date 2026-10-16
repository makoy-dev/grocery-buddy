import { Image } from 'expo-image';
import { View } from 'react-native';

type BrandLogoProps = { compact?: boolean };

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <View className={compact ? 'h-12 w-12' : 'h-28 w-full max-w-sm self-center'}>
      <Image
        source={require('../../../assets/images/grocerygodzlogo.svg')}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
        accessibilityLabel="Grocery Godz logo"
      />
    </View>
  );
}

import { Image } from 'expo-image';
import { View } from 'react-native';

type BrandLogoProps = { compact?: boolean };

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <View
      className={`${compact ? 'h-12 w-12' : 'h-32 w-40 self-center'}`}
      style={{ borderRadius: compact ? 14 : 24, overflow: 'hidden' }}
    >
      <Image
        source={require('../../../assets/images/grocery-godz-bg.svg')}
        contentFit="contain"
        style={{ width: '100%', height: '100%', borderRadius: compact ? 14 : 24 }}
        accessibilityLabel="Grocery Godz logo"
      />
    </View>
  );
}

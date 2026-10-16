import { DarkTheme, DefaultTheme } from 'expo-router';

import { palette } from '@/theme/tokens';

export const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.green600,
    background: palette.stone100,
    card: palette.white,
    text: palette.stone950,
    border: palette.stone200,
  },
};

export const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.green400,
    background: palette.stone950,
    card: palette.stone900,
    text: palette.white,
    border: palette.stone800,
  },
};

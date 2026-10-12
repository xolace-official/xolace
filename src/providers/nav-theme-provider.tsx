import { useEffect, type ReactNode } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router/react-navigation';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useThemeColor } from 'heroui-native';
import { useUniwind } from 'uniwind';
import { useAppStore } from '@/src/store/store';

// Single source of truth for the native route background. The navigator paints
// every screen container (and opaque / formSheet headers) with the nav theme's
// colors, so feeding it the active app palette themes all nested stacks at once
// and paints the container before JS content mounts — no stock grey/white edge.
export function NavThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();
  const [background, foreground, border, accent] = useThemeColor([
    'background',
    'foreground',
    'border',
    'accent',
  ]);
  const isDark = theme.includes('dark');
  const base = isDark ? DarkTheme : DefaultTheme;

  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background,
      card: background,
      text: foreground,
      border,
      primary: accent,
    },
    // Navigator-rendered text (headers, back labels) uses the app face. The
    // nominal weight comes first so a face carrying its own weight wins.
    fonts: {
      regular: { fontWeight: '400', fontFamily: 'SpaceGrotesk_400Regular' },
      medium: { fontWeight: '500', fontFamily: 'SpaceGrotesk_500Medium' },
      bold: { fontWeight: '600', fontFamily: 'SpaceGrotesk_600SemiBold' },
      heavy: { fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold' },
    },
  };

  // Keep the native root view / window (launch, overscroll bounce, transparent
  // sheets) in sync with the theme too.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  // Native chrome (liquid glass sheets/headers/tabs, alerts, keyboards) reads
  // the OS appearance, not our theme — a dark theme on a light-mode phone got
  // light glass under light text. Force it to match an explicit choice. In
  // "system" mode leave it unspecified: forcing would freeze the OS listener
  // that the system theme follows.
  const mode = useAppStore((s) => s.theme);
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : isDark ? 'dark' : 'light');
  }, [mode, isDark]);

  return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}

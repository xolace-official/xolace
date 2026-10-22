/**
 * Applies the persisted theme + colorThemeId to Uniwind before React renders.
 *
 * Imported for side effects from app/_layout.tsx. Because zustandJSONStorage
 * is synchronous (see unified-storage.ts), useAppStore.getState() returns
 * hydrated values immediately — no cold-start flicker.
 *
 * Mirrors the resolution logic in use-settings.ts (setColorTheme/setThemeMode).
 */
import { Appearance } from 'react-native';
import { Uniwind } from 'uniwind';
import { useAppStore } from '@/src/store/store';

const { theme, colorThemeId } = useAppStore.getState();

if (colorThemeId === 'default' && theme === 'system') {
  Uniwind.setTheme('system' as never);
} else {
  const mode =
    theme === 'system'
      ? Appearance.getColorScheme() === 'dark'
        ? 'dark'
        : 'light'
      : theme;
  const variant =
    colorThemeId === 'default' ? mode : `${colorThemeId}-${mode}`;
  Uniwind.setTheme(variant as never);
}

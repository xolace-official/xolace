import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { cn } from '@/src/lib/utils';
import { playSoftPress } from '@/src/lib/haptics';
import { type FC } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useAppTheme } from '@/src/context/app-theme-context';

const MOON_ICON = { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' } as const;
const SUN_ICON = { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' } as const;

export const ThemeToggle: FC = () => {
  const { toggleTheme, isLight } = useAppTheme();
  const tintColor = useThemeColor('foreground') as string;

  const isLGAvailable = isLiquidGlassAvailable();

  return (
    <TouchableOpacity
      onPressIn={() => {
        playSoftPress();
      }}
      onPressOut={() => {
        toggleTheme();
      }}
      className={cn('p-3 z-50', isLGAvailable && 'px-2.5 py-2')}
      hitSlop={12}
      activeOpacity={0.8}
    >
      {isLight ? (
        <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
          <SymbolView name={MOON_ICON} size={20} tintColor={tintColor} />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
          <SymbolView name={SUN_ICON} size={20} tintColor={tintColor} />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

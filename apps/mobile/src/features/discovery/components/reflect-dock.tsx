import { StyleSheet, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';

import { AppText } from '@/src/components/shared/app-text';
import { MINI_PLAYER_CLEARANCE, useMiniPlayerShown } from '@/src/features/browse/now-playing/now-playing-store';
import { playSoftPress } from '@/src/lib/haptics';

// iOS: the native tab bar is translucent and content runs underneath it, so the
// dock has to clear the whole bar. Android: the native BottomNavigationView is
// opaque and the content view already stops above it, so the same number
// stranded the dock ~90dp in mid-air — there it only needs a breathing margin.
export const TAB_BAR_CLEARANCE = process.env.EXPO_OS === 'android' ? 16 : 90;

// Dock height + its clearance — how much scroll tail the screen must reserve.
export const DOCK_CLEARANCE = 56 + TAB_BAR_CLEARANCE;

const ARROW_ICON = { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as const;

const styles = StyleSheet.create({
  // borderRadius lives here with the shadow, not only in `rounded-full` — the
  // shadow path follows the radius on this style object, otherwise it draws as
  // a rectangle and its corners show past the pill on light backgrounds.
  shadow: { borderRadius: 999 },
});

/**
 * The one persistent action on discovery — a floating pill above the tab bar,
 * not a row in the scroll content, so the way back to reflect is always within
 * thumb reach. `replace`s to "/" so the user never accumulates a back stack
 * between the tab surface and the idle screen.
 */
export function ReflectDock() {
  const router = useRouter();
  // const insets = useSafeAreaInsets();
  const accent = useThemeColor('accent');
  // Rides above the Browse mini-player when it's docked over the tab bar.
  const lift = useMiniPlayerShown() ? MINI_PLAYER_CLEARANCE : 0;

  const goToReflect = () => {
    playSoftPress();
    router.replace('/');
  };

  return (
    <View
      className="absolute left-4 right-4"
      style={{ bottom: TAB_BAR_CLEARANCE + lift }}
      pointerEvents="box-none"
    >
      <PressableFeedback
        onPress={goToReflect}
        accessibilityRole="button"
        accessibilityLabel="Start a reflection"
      >
        <View
          className="h-14 flex-row items-center gap-3 rounded-full bg-accent pl-5 pr-2"
          style={styles.shadow}
        >
          <AppText className="flex-1 text-[15px] font-semibold text-accent-foreground">
            Start a reflection
          </AppText>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-foreground">
            <SymbolView name={ARROW_ICON as any} size={16} tintColor={accent as string} />
          </View>
        </View>
      </PressableFeedback>
    </View>
  );
}

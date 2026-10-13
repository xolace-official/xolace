import { View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayerContent } from '@/src/features/browse/now-playing/mini-player-accessory';

const GAP = 8;
const ENTER = FadeInDown.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1));
const EXIT = FadeOutDown.duration(160).easing(Easing.out(Easing.quad));

/**
 * Where the native tab bar's top edge sits, measured from the screen bottom.
 * ponytail: hard-coded bar heights — NativeTabs exposes none. Recheck if the
 * bar's style changes (labels off, a compact Android variant).
 */
function useTabBarTop() {
  const { bottom } = useSafeAreaInsets();
  return (process.env.EXPO_OS === 'android' ? 80 : 49) + bottom;
}

/**
 * The Browse mini-player where the tab bar has no accessory slot (iOS < 26,
 * Android): the iOS 26 capsule's shape, solid instead of glass, floating just
 * above the bar. Sibling of NativeTabs, so the full player and every other
 * screen pushed over the tabs covers it.
 */
export function MiniPlayerOverlay() {
  const bottom = useTabBarTop() + GAP;
  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      className="absolute left-3 right-3"
      style={{ bottom }}
      pointerEvents="box-none"
    >
      {/* borderRadius on the style too, so the shadow path follows the pill. */}
      <View
        className="bg-surface border-border/50 h-12 flex-row rounded-full border shadow-lg"
        style={{ borderRadius: 999 }}
      >
        <MiniPlayerContent inline={false} />
      </View>
    </Animated.View>
  );
}

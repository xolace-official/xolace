import { NativeTabs } from 'expo-router/native-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { playSoftPress } from '@/src/lib/haptics';
import { useTabBarHidden } from '@/src/lib/tab-bar';
import { useUnreadBadge } from '@/src/features/xolacer-chat/use-unread-badge';
import { MiniPlayerAccessory } from '@/src/features/browse/now-playing/mini-player-accessory';
import { MiniPlayerOverlay } from '@/src/features/browse/now-playing/mini-player-overlay';
import { useMiniPlayerShown } from '@/src/features/browse/now-playing/now-playing-store';

/**
 * Tab surface — a sibling stack entry to the reflect (index) screen, not the
 * app entry. Reached via `router.replace('/discovery')` from the idle menu so
 * reflect stays the permanent "/" landing with no back-stack accumulation.
 */
export default function AppTabs() {
  const background = useThemeColor('background');
  const accent = useThemeColor('accent');
  // Yielded to a screen raising a bottom toolbar — the two share the same strip.
  const hidden = useTabBarHidden();
  // Stream's total across every conversation — the same number the app icon
  // shows, so the two never disagree. Null (no chat yet) reads as nothing.
  const unread = useUnreadBadge();
  const showPlayer = useMiniPlayerShown();
  // iOS 26 docks the player in the bar; elsewhere it floats above it.
  const nativeAccessory = isLiquidGlassAvailable();

  const screenListeners = {
    tabPress: () => {
      playSoftPress();
    },
  };

  return (
    <View className="flex-1">
      <NativeTabs
        hidden={hidden}
        backgroundColor={background}
        tintColor={accent}
        disableTransparentOnScrollEdge
        minimizeBehavior="onScrollDown"
        screenListeners={screenListeners}
      >
        {showPlayer && nativeAccessory && (
          <NativeTabs.BottomAccessory>
            <MiniPlayerAccessory />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger name="discovery">
          <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} md="explore" />
          <NativeTabs.Trigger.Label>Discovery</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* Catalogue browse (#338, docs/paths-v1.md §9.3) — the one override of
         * the no-new-tab map rule (map decision 19), and only for this tab. */}
        <NativeTabs.Trigger name="browse">
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'square.grid.2x2',
              selected: 'square.grid.2x2.fill',
            }}
            md="grid_view"
          />
          <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="connect">
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'bubble.left.and.bubble.right',
              selected: 'bubble.left.and.bubble.right.fill',
            }}
            md="forum"
          />
          <NativeTabs.Trigger.Label>Connect</NativeTabs.Trigger.Label>
          {/* No children at zero: `hidden` alone still painted a "0". */}
          <NativeTabs.Trigger.Badge hidden={!unread}>{unread ? String(unread) : undefined}</NativeTabs.Trigger.Badge>
        </NativeTabs.Trigger>
      </NativeTabs>
      {showPlayer && !nativeAccessory && <MiniPlayerOverlay />}
    </View>
  );
}

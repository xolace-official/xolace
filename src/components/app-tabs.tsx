import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useThemeColor } from 'heroui-native';
import { playSoftPress } from '@/src/lib/haptics';
import { useTabBarHidden } from '@/src/lib/tab-bar';
import { useUnreadBadge } from '@/src/features/xolacer-chat/use-unread-badge';

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

  const screenListeners = {
    tabPress: () => {
      playSoftPress();
    },
  };

  return (
    <NativeTabs
      hidden={hidden}
      backgroundColor={background}
      tintColor={accent}
      disableTransparentOnScrollEdge
      minimizeBehavior="onScrollDown"
      screenListeners={screenListeners}
    >
      <NativeTabs.Trigger name="discovery">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'safari', selected: 'safari.fill' }}
          md="explore"
        />
        <NativeTabs.Trigger.Label>Discovery</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* Catalogue browse (#338, docs/paths-v1.md §9.3) — the one override of
        * the no-new-tab map rule (map decision 19), and only for this tab. */}
      <NativeTabs.Trigger name="browse">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          md="grid_view"
        />
        <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="connect">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="forum"
        />
        <NativeTabs.Trigger.Label>Connect</NativeTabs.Trigger.Label>
        {/* No children at zero: `hidden` alone still painted a "0". */}
        <NativeTabs.Trigger.Badge hidden={!unread}>
          {unread ? String(unread) : undefined}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

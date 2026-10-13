import { useRef, type ReactNode } from 'react';
import { View, type ColorValue } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { PressableFeedback } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { useCSSVariable } from 'uniwind';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import type { PairConversation } from './chats-list';

const ARCHIVE_ICON = { ios: 'archivebox', android: 'archive', web: 'archive' } as const;
const UNARCHIVE_ICON = { ios: 'tray.and.arrow.up', android: 'unarchive', web: 'unarchive' } as const;
const ACTION_WIDTH = 88;

export type ArchiveHandler = (
  conversation: PairConversation,
  options?: { haptic?: boolean },
) => Promise<boolean>;

/**
 * The swipe's mirror for assistive tech: the same archive the gesture does,
 * plus the long-press sheet as a named action, so a swipe is never the only
 * way to anything.
 */
export function rowAccessibilityActions(
  conversation: PairConversation,
  onArchive: ArchiveHandler,
  onLongPress?: () => void,
) {
  const archiveName = conversation.archived ? 'unarchive' : 'archive';
  return {
    accessibilityActions: [
      { name: archiveName, label: conversation.archived ? 'Unarchive' : 'Archive' },
      ...(onLongPress ? [{ name: 'longpress', label: 'More actions' }] : []),
    ],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === archiveName) void onArchive(conversation);
      else if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
    },
  };
}

/**
 * Trailing swipe on a pair row: archive on Connect, unarchive on the Archived
 * screen. Mail-style — releasing past the threshold commits, so a row is never
 * left sitting open; tapping the revealed action commits too. Undo lives in
 * the toast `onArchive` raises, not here.
 *
 * Rightward drags never activate, which keeps the left edge free for the
 * stack's back swipe.
 */
export function SwipeableConversationRow({
  conversation,
  onArchive,
  children,
}: {
  conversation: PairConversation;
  onArchive: ArchiveHandler;
  children: ReactNode;
}) {
  const swipeable = useRef<SwipeableMethods>(null);
  const accent = useCSSVariable('--color-accent-foreground');
  const label = conversation.archived ? 'Unarchive' : 'Archive';

  // The revealed action's `openRight()` re-fires `onSwipeableWillOpen` while
  // the row is already open, so this ref is the latch: one haptic, one
  // mutation. On success the row leaves the list; on failure it slides shut
  // again and unlatches.
  const committed = useRef(false);
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    playSoftPress();
    void onArchive(conversation, { haptic: false }).then((ok) => {
      if (!ok) {
        committed.current = false;
        swipeable.current?.close();
      }
    });
  };

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      dragOffsetFromLeftEdge={Number.MAX_SAFE_INTEGER}
      onSwipeableWillOpen={commit}
      renderRightActions={() => (
        <PressableFeedback
          onPress={() => swipeable.current?.openRight()}
          // The row itself carries this as an accessibility action.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            className="h-full items-center justify-center gap-1 bg-accent"
            style={{ width: ACTION_WIDTH }}
          >
            <SymbolView
              name={conversation.archived ? UNARCHIVE_ICON : ARCHIVE_ICON}
              size={20}
              tintColor={accent as ColorValue}
            />
            <AppText className="text-[11px] font-semibold text-accent-foreground">{label}</AppText>
          </View>
        </PressableFeedback>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

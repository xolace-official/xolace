import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableFeedback } from 'heroui-native';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { ConversationRow } from './conversation-row';
import {
  rowAccessibilityActions,
  SwipeableConversationRow,
  type ArchiveHandler,
} from './swipeable-conversation-row';

export type ConversationList = FunctionReturnType<typeof api.xolacerChat.myConversations>;
/** The `xolacer_conversations`-backed rows — every row except the synthetic Xolace-channel one. */
export type PairConversation = Extract<ConversationList[number], { kind: 'pair' }>;

/**
 * All lifecycle states live in one flat list — one continuous run of rows the
 * way every messaging app reads, so a request or a resting thread is never a
 * screen to remember.
 *
 * Archive is the one thing that does hide a row, and it is a route rather than
 * a filter over this list: a place with an address, reached from an entry row
 * passed in as `header`, so it inherits the stack's header and back button and
 * the tab bar keeps working. This component only ever renders the list it was
 * handed — both screens hand it the same kind of rows.
 *
 * The long-press action sheet is deliberately not rendered here — see
 * `useConversationRowActions` for where it has to live instead.
 */
export function ChatsList({
  conversations,
  empty,
  header,
  onArchive,
  onBrowseXolacers,
  onLongPress,
  onOpen,
}: {
  conversations: ConversationList;
  /**
   * Copy for the empty state. Defaults to the never-had-a-chat one; a caller
   * that filtered the list (Connect hides archived rows) has to say so itself,
   * or someone whose chats are all archived is told they have none.
   */
  empty?: { title: string; body: string };
  /** Rendered above the rows, full-bleed like them. */
  header?: ReactNode;
  /** Trailing swipe + accessibility action on pair rows; flips by `archived`. */
  onArchive: ArchiveHandler;
  /** Omitted where there is nowhere to browse from — the Archived screen. */
  onBrowseXolacers?: () => void;
  onLongPress: (conversation: PairConversation) => void;
  onOpen: () => void;
}) {
  const router = useRouter();

  if (conversations.length === 0) {
    return (
      <View className="gap-2.5">
        {header && <View className="-mx-4">{header}</View>}
        <View className="min-h-95 items-center justify-center gap-2.5 px-8">
          <View className="h-12 w-12 rounded-2xl bg-surface-secondary items-center justify-center">
            <AppText className="text-lg">💬</AppText>
          </View>
          <AppText className="text-[15px] font-semibold text-foreground">
            {empty?.title ?? 'No conversations yet'}
          </AppText>
          <AppText className="text-[13px] text-muted text-center leading-5 max-w-60">
            {empty?.body ??
              "When you message a Xolacer, it'll live here - including anything you've talked about before."}
          </AppText>
          {onBrowseXolacers && (
            <PressableFeedback
              onPress={() => {
                playSoftPress();
                onBrowseXolacers();
              }}
              accessibilityRole="button"
              accessibilityLabel="See who's listening"
            >
              <AppText className="text-[13px] font-semibold text-accent mt-1.5">
                See who&apos;s listening →
              </AppText>
            </PressableFeedback>
          )}
        </View>
      </View>
    );
  }

  return (
    // Rows are full-bleed, so the list cancels the scroll container's own
    // horizontal padding and each row puts it back on itself.
    <View className="-mx-4">
      {header}
      {conversations.map((conversation, index) => {
        const onPress = () => {
          playSoftPress();
          // Opening a thread leaves this screen mounted, so a sheet raised on
          // another row would still be waiting — over the wrong row, with the
          // tab bar still hidden — when you come back.
          onOpen();
          if (conversation.kind === 'broadcast') {
            router.push('/xolace-channel');
            return;
          }
          router.push({
            pathname: '/chat/[conversationId]',
            params: { conversationId: conversation.id },
          });
        };
        const showSeparator = index < conversations.length - 1;
        // Archive/close/delete are xolacer_conversations operations — the
        // broadcast row has no such row behind it, so it gets no long-press
        // sheet, no swipe and no accessibility actions.
        if (conversation.kind === 'broadcast') {
          return (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              showSeparator={showSeparator}
              onPress={onPress}
            />
          );
        }
        const longPress = () => {
          playSoftPress();
          onLongPress(conversation);
        };
        return (
          <SwipeableConversationRow
            key={conversation.id}
            conversation={conversation}
            onArchive={onArchive}
          >
            <ConversationRow
              conversation={conversation}
              showSeparator={showSeparator}
              onPress={onPress}
              onLongPress={longPress}
              a11yActions={rowAccessibilityActions(conversation, onArchive, longPress)}
            />
          </SwipeableConversationRow>
        );
      })}
    </View>
  );
}

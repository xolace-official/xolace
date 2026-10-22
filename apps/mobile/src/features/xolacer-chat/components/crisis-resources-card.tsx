import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { MessageSystem, type MessageSystemProps } from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';
import { ResourceItem } from '@/src/components/shared/resource-item';
import type { Resource } from '@/src/features/crisis-resources/types';
import { useConversationIdentity } from './message-author';

/** Mirrors `CRISIS_RESOURCES_KIND` in `convex/ai/chat/moderate.ts`. */
export const CRISIS_RESOURCES_KIND = 'crisis_resources';

const LIFERING_ICON = { ios: 'lifepreserver', android: 'support', web: 'support' } as const;

/**
 * The silent resources card the post-delivery moderation lane sends into a
 * thread when a message reads as a crisis (#344). It is the app speaking, not
 * either person, so it renders as a card with no author, worded for whoever
 * is looking at it. Every other system message falls through to the SDK's own.
 */
export function ConversationMessageSystem(props: MessageSystemProps) {
  const { message } = props;
  const identity = useConversationIdentity();
  const accent = useThemeColor('accent') as string;

  const custom = message as unknown as { kind?: unknown; resources?: unknown };
  if (custom.kind !== CRISIS_RESOURCES_KIND || !Array.isArray(custom.resources)) {
    return <MessageSystem {...props} />;
  }
  const resources = custom.resources as Resource[];
  const isXolacer = identity?.conversation.role === 'xolacer';

  return (
    <View className="mx-4 my-3 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4 gap-3">
      <View className="flex-row items-center gap-2">
        <SymbolView name={LIFERING_ICON} size={14} tintColor={accent} />
        <AppText className="text-[11px] uppercase tracking-wider" style={{ color: accent }}>
          From Xolace
        </AppText>
      </View>
      <AppText className="text-sm text-foreground/80">
        {isXolacer
          ? 'What was just shared may be more than a conversation can hold. These are here for both of you — you can point to them, and you don’t have to carry this alone.'
          : 'This sounds like a lot to be holding right now. You don’t have to carry it alone — these are here for you, any time.'}
      </AppText>
      <View className="gap-2">
        {resources.map((resource, i) => (
          <ResourceItem key={`${resource.type}-${resource.value}`} resource={resource} index={i} />
        ))}
      </View>
    </View>
  );
}

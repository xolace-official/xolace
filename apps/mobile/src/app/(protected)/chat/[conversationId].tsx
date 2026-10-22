import { useLocalSearchParams } from 'expo-router';
import { ThreadScreen } from '@/src/features/xolacer-chat/components/thread-screen';

/**
 * No layout and no provider between this screen and the protected stack.
 *
 * A `chat/_layout.tsx` — `Slot` included — is a navigator, and a navigator here
 * swallows the `<Stack.Screen options>` the thread sets for its own header
 * (avatar + name) and leaves a one-screen stack with nothing to pop to, so no
 * back chevron renders. As a direct child of the protected stack the thread
 * gets the native back button, native glass header, and a title slot it can
 * actually fill.
 *
 * The Stream connection lives at the protected layout — shared with the Connect
 * tab, which is a sibling route this screen could never have reached. The
 * thread declares its need via `useStreamConnection` instead of owning it.
 */
export default function ChatThreadRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return <ThreadScreen conversationId={conversationId} />;
}

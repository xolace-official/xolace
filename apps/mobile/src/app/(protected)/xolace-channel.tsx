import { XolaceChannelScreen } from '@/src/features/xolacer-chat/components/xolace-channel-screen';

/**
 * Direct route to the fixed Xolace channel (#375) — not in the chats list yet,
 * so this is the only way in for now. Same "no layout between this and the
 * protected stack" reasoning as `chat/[conversationId]` applies here.
 */
export default function XolaceChannelRoute() {
  return <XolaceChannelScreen />;
}

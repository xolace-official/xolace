import { CHAT_REQUEST_SUBTITLE } from '@/convex/lib/chatNotifications';
import type { ConversationList } from './chats-list';

type Conversation = ConversationList[number];

export type RowPresentation = {
  chip: { label: string; tone: 'warn' | 'muted' } | null;
  /** Line 2. Null means the row is a single line — only `open` gets there. */
  statusLine: string | null;
  /** A xolacer's incoming request. Lives in the badge slot, which a request can never occupy. */
  requestDot: boolean;
  mutedAvatar: boolean;
};

const NONE = { chip: null, statusLine: null, requestDot: false, mutedAvatar: false };

/**
 * Everything a row decides, in one place: which pill, which sentence, whether
 * the request dot burns and whether the avatar is greyed.
 */
export function rowPresentation(conversation: Conversation): RowPresentation {
  if (conversation.status === 'open') return NONE;

  if (conversation.status === 'requested') {
    const isXolacer = conversation.role === 'xolacer';
    return {
      chip: { label: isXolacer ? 'New request' : 'Waiting', tone: 'warn' },
      statusLine: isXolacer
        ? // Freshness, never assignment. "Suggested" would read as the app
          // dumping someone on a xolacer, which is exactly how the heaviest
          // requests would end up deprioritised. It says when, and never what
          // about — the first message is the user's to write.
          conversation.origin === 'suggestion'
          ? 'Just after a session'
          : CHAT_REQUEST_SUBTITLE
        : `Request sent, ${conversation.counterpartName} will reply when they can`,
      requestDot: isXolacer,
      mutedAvatar: false,
    };
  }

  if (conversation.status === 'resting') {
    // Same state, different story: one was wrapped up on purpose, the other
    // just went quiet. Absent reason predates the field and reads as quiet.
    const manual = conversation.restingReason === 'manual';
    return {
      chip: { label: manual ? 'Wrapped up' : 'Resting', tone: 'muted' },
      statusLine: manual
        ? conversation.role === 'xolacer'
          ? 'You wrapped this up, it can still be picked back up'
          : `${conversation.counterpartName} wrapped this up, pick it back up anytime`
        : 'Gone quiet, pick it back up anytime',
      requestDot: false,
      // Not muted: a greyed-out row would contradict the copy telling you it
      // can be picked back up.
      mutedAvatar: false,
    };
  }

  return {
    chip: { label: 'Closed', tone: 'muted' },
    statusLine: closedLine(conversation),
    requestDot: false,
    mutedAvatar: true,
  };
}

function closedLine(conversation: Conversation): string {
  if (conversation.closedReason === 'declined') {
    return conversation.role === 'xolacer'
      ? 'You closed this request'
      : `${conversation.counterpartName} couldn't take this one on`;
  }
  if (conversation.closedReason === 'expired') return 'This request quietly expired';
  // Blocked rows are filtered out of the list server-side and left-xolacer rows
  // aren't coming back, so neither can honestly be sold as still open to read —
  // the fallthrough below is for a plain close with no reason recorded.
  if (conversation.closedReason === 'blocked' || conversation.closedReason === 'xolacer_left') {
    return 'This conversation is closed';
  }
  return 'Everything you two wrote is still here';
}

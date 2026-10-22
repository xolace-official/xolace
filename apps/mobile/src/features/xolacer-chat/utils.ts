export type ConversationStatus = 'requested' | 'open' | 'resting' | 'closed';

/**
 * Did these two ever actually exchange a message? A channel is only created on
 * accept, so a request that was declined or left to expire has no history at
 * all — and copy that reassures someone their words are kept is a false promise
 * on a thread where nothing was ever written.
 *
 * Derived from status + closedReason because that pair is the one shape
 * available on every screen; the profile query deliberately doesn't return
 * `streamChannelId`.
 */
export function hasSpoken(conversation: {
  status: ConversationStatus;
  closedReason?: 'declined' | 'expired' | 'blocked' | 'xolacer_left';
}): boolean {
  if (conversation.status === 'requested') return false;
  if (conversation.status !== 'closed') return true;
  return (
    conversation.closedReason !== 'declined' &&
    conversation.closedReason !== 'expired'
  );
}

/**
 * Who to show for one message bubble, or null to leave the SDK's own answer
 * alone.
 *
 * The SDK's answer is a globally-shared, mutable user record keyed by profile
 * id — one record per person for the whole app. A seeker who is *also* an
 * active xolacer has that record written with their real name and photo, and
 * it then renders in conversations where they are anonymous. The conversation
 * itself already carries the right answer (`counterpartName` /
 * `counterpartPhotoUrl`, computed per-conversation and per-role by the
 * server), so that is the only thing read here.
 *
 * Pure, and resolved at render time from data already fetched for the header —
 * which makes the fix retroactive for free: every existing message corrects
 * itself the moment this ships, with nothing stored and nothing to backfill.
 *
 * The match is positive — sender *is* the counterpart — rather than "sender is
 * not me". Matching by negation fails open onto the counterpart for every
 * sender it can't classify: your own bubbles wear the other person's name for
 * the moment the client's user id is unset during a reconnect, and any sender
 * who is neither member (a system notice, a safety intervention) would render
 * as if the other person wrote it. Anything unrecognised keeps the SDK's own
 * record instead, so nothing is impersonated.
 */
export function resolveMessageIdentity(
  senderId: string | undefined,
  conversation: {
    counterpartProfileId: string;
    counterpartName: string;
    counterpartPhotoUrl?: string;
  },
): { name: string; image?: string } | null {
  if (senderId !== conversation.counterpartProfileId) return null;
  return {
    name: conversation.counterpartName,
    image: conversation.counterpartPhotoUrl,
  };
}

/** Past this the pill stops growing and starts counting for itself. */
const UNREAD_CAP = 99;

/**
 * Whether unread messages mean anything on a conversation in this state.
 *
 * `requested` has nothing to read yet — a badge there would read as "there is
 * something to decide" rather than "there is something to read" — and `closed`
 * is finished and should stop asking for attention. `resting` is not dormant:
 * it is a live thread the row itself invites you back into, so a new message
 * there is exactly the signal that should surface.
 *
 * Exported so the row can also skip *subscribing* on a conversation that could
 * never show a count, without holding a second copy of this rule.
 */
export function canHoldUnread(status: ConversationStatus): boolean {
  return status === 'open' || status === 'resting';
}

/**
 * What a conversation row shows for its unread count, or null for no badge.
 *
 * `label` caps; `a11y` never does. A screen reader has no layout constraint,
 * and "99+ unread" is worse information than "150 unread".
 */
export function unreadBadge(
  status: ConversationStatus,
  count: number,
): { label: string; a11y: string } | null {
  if (!canHoldUnread(status)) return null;
  return formatUnreadBadge(count);
}

/**
 * Same cap/copy as `unreadBadge`, without the lifecycle gate — for the
 * Xolace broadcast row (#377), which has no status and so nothing to gate on.
 */
export function formatUnreadBadge(count: number): { label: string; a11y: string } | null {
  if (count <= 0) return null;
  return {
    label: count > UNREAD_CAP ? `${UNREAD_CAP}+` : String(count),
    a11y: `${count} unread message${count === 1 ? '' : 's'}`,
  };
}

/**
 * The `{ code, max, party, until }` payload a Convex refusal carries, or null
 * for any other failure. Shared so the surfaces that can hit a limit read it
 * the same way and only differ in the sentence they show.
 */
export function chatLimitError(error: unknown): {
  code?: string;
  max?: number;
  party?: 'seeker' | 'xolacer';
  until?: number;
} | null {
  const data = (error as { data?: unknown } | null)?.data;
  if (!data || typeof data !== 'object') return null;
  return data as {
    code?: string;
    max?: number;
    party?: 'seeker' | 'xolacer';
    until?: number;
  };
}

/**
 * Is a decline cooldown still running right now?
 *
 * The server computes `retryAvailableAt` with its own clock inside a reactive
 * query, and nothing writes to that query's read set when the window elapses —
 * a Convex query only re-runs when a document it read is written. So a seeker
 * returning to a quiet xolacer's profile after the window can be handed a
 * cached timestamp that is already in the past. Reading it as "a cooldown
 * exists" rather than comparing it leaves the CTA disabled on a request the
 * server would now accept, and disabled means no write, so nothing ever
 * invalidates the cache — the door stays shut permanently.
 */
export function declineCooldownActive(until: number | undefined): until is number {
  return until !== undefined && until > Date.now();
}

/**
 * Whole days from now until `timestamp`, floored at 1. Rounds up so the last
 * few hours read as "1 day" rather than "0 days", which would be a wait the
 * sentence claims is already over.
 */
export function daysUntil(timestamp: number): number {
  return Math.max(1, Math.ceil((timestamp - Date.now()) / 86400000));
}

/**
 * What a seeker reads in place of the request CTA on a xolacer who turned them
 * down inside the cooldown window.
 *
 * Says when the door reopens and points outward in the same breath. A refusal
 * with no date is the version of this that reads as the app taking a side, and
 * a decline is already a hard enough moment without the product agreeing with
 * it.
 */
export function declineCooldownNote(displayName: string, until: number): string {
  const days = daysUntil(until);
  return `${displayName} couldn't take this one on. You can ask them again in ${days} day${days === 1 ? '' : 's'} — others on the roster have space in the meantime.`;
}

/**
 * Why an accept didn't go through. `party` matters here and nowhere else: the
 * xolacer tapping Accept is not always the one who is full, and "you have too
 * many open conversations" is a confusing thing to read when you have two.
 * The seeker is never named — only that they have no room right now.
 */
export function acceptFailureLabel(error: unknown): string {
  const data = chatLimitError(error);
  if (data?.code !== 'open_conversation_limit') {
    return "Couldn't open the conversation. Try again.";
  }
  return data.party === 'xolacer'
    ? `You're holding ${data.max ?? 8} open conversations. Let one rest before accepting another.`
    : "They've got as many conversations open as they can hold right now. This request stays in your inbox.";
}

/**
 * What the rate call-to-action should be doing right now.
 *
 * One rule, three surfaces: the profile's rate card, the thread overflow menu,
 * and the post-quiet prompt in the status bar. The server has already decided
 * whether rating is allowed at all (`canRate` — role, blocking, and the
 * message-count threshold); this only picks between asking and acknowledging.
 *
 * `hidden` wins over a defined `myRating`: a conversation that became
 * un-rateable (a block) stops offering the link even to someone who already
 * scored it.
 */
export function rateCtaState(input: {
  canRate: boolean;
  myRating?: number;
}): 'hidden' | 'prompt' | 'rated' {
  if (!input.canRate) return 'hidden';
  return input.myRating === undefined ? 'prompt' : 'rated';
}

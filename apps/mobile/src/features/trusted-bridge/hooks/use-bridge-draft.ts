import { useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'rate_limited';

const FALLBACK_DRAFT =
  "Hey — I've been working through something lately and I'd really like to talk to you about it. " +
  "Could we find some time soon?";

function isRateLimited(error: unknown): boolean {
  return (
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    (error.data as { code?: string }).code === 'bridge_rate_limited'
  );
}

export function useBridgeDraft() {
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState('');
  const requestDraft = useAction(api.ai.bridge.requestBridgeDraft);
  // Identifies the latest generation. The back button is reachable mid-load, so
  // the user can change recipient and regenerate while an earlier request is
  // still in flight — we drop any response that isn't from the newest call.
  const requestId = useRef(0);

  const generate = async (
    sessionId: Id<'sessions'>,
    recipientName: string,
    recipientRelationship?: string,
    addressTerm?: string,
  ) => {
    const id = ++requestId.current;
    setStatus('loading');
    try {
      const result = await requestDraft({ sessionId, recipientName, recipientRelationship, addressTerm });
      if (id !== requestId.current) return; // superseded by a newer request
      setDraft(result.draft);
      setStatus('success');
    } catch (error) {
      if (id !== requestId.current) return;
      // Out of drafts is not a failure — the user still gets something to send,
      // but they're told why it isn't personalized instead of being handed a
      // template that silently pretends to be their words.
      setDraft(FALLBACK_DRAFT);
      setStatus(isRateLimited(error) ? 'rate_limited' : 'error');
    }
  };

  return { status, draft, setDraft, generate };
}

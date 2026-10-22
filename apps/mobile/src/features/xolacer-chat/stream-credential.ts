import { zustandJSONStorage } from '@/src/lib/storage/unified-storage';

/** What `xolacerChat.getStreamToken` returns, plus who it was minted for. */
export type StreamCredential = {
  clerkUserId: string;
  apiKey: string;
  token: string;
  userId: string;
};

/**
 * Not in the Zustand store on purpose: the store is devtools-visible app
 * state, and this is a bearer credential. Same storage underneath, same
 * synchronous read, so a returning chat user connects on the first render.
 *
 * Same class of secret as the Clerk session the device already holds; the
 * token's server-side `exp` is what bounds a lost device (see
 * `convex/integrations/stream.ts`).
 */
const KEY = 'xolace-stream-credential';

export function readStreamCredential(): StreamCredential | null {
  try {
    const raw = zustandJSONStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StreamCredential) : null;
  } catch {
    return null;
  }
}

export function writeStreamCredential(credential: StreamCredential) {
  void zustandJSONStorage.setItem(KEY, JSON.stringify(credential));
}

export function clearStreamCredential() {
  void zustandJSONStorage.removeItem(KEY);
}

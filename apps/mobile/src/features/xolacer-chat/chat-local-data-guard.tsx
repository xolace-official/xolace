import { useEffect } from 'react';
import { useAuth } from '@clerk/expo';
import { connectPlan } from '@/src/features/xolacer-chat/connect-plan';
import { resetChatLocalData } from '@/src/features/xolacer-chat/offline-db';
import { readStreamCredential } from '@/src/features/xolacer-chat/stream-credential';

/**
 * The single reset choke point for on-device chat data.
 *
 * Mounted at the root, not in `StreamChatProvider`: the provider lives under
 * `(protected)`, which the route guard unmounts the moment Clerk drops the
 * user — it never renders with `userId === null`, so it can't be the thing
 * that reacts to it. This sees every transition: sign-out, account deletion
 * (which ends in a sign-out), and a switch to another account, each of which
 * is "the previous owner's data is on this phone and must not be the next
 * owner's". Stateless — the stored credential names the owner, so a switch
 * that happened while the app was closed is caught on mount the same way.
 * `connectPlan` decides; this only carries it out.
 */
export function ChatLocalDataGuard() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    const { resetDb } = connectPlan({
      cachedEnabled: false,
      cachedCredential: readStreamCredential(),
      liveStatus: undefined,
      clerkUserId: userId ?? null,
    });
    if (!resetDb) return;
    resetChatLocalData().catch((error) =>
      console.error('[xolacer-chat] local data reset failed', error),
    );
  }, [isLoaded, userId]);

  return null;
}

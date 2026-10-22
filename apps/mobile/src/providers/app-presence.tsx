import { useConvexAuth } from 'convex/react';
import { usePresence } from '@convex-dev/presence/react-native';
import { api } from '@/convex/_generated/api';

/** Must match `PRESENCE_ROOM` in convex/presence.ts. */
const PRESENCE_ROOM = 'app';

/**
 * 30s, matching the server. The component times a session out at 2.5x this,
 * so a client that dies without a graceful disconnect drops in ~75s.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * The app-wide presence heartbeat. One per client, rendering nothing.
 *
 * Mounted at the protected-route layout root rather than on the Connect
 * screen: a xolacer reflecting on another tab is still reachable and must
 * still read as present, so correctness can't depend on the tab navigator's
 * eager-mount behaviour.
 *
 * Gated on `isAuthenticated` because the heartbeat is a *mutation*, and the
 * server derives identity through `requireAuth`. An unauthenticated beat
 * rejects, and a rejected mutation is an unhandled promise rejection rather
 * than a render error — so `AccountBootstrapBoundary`, which only catches the
 * latter, would never see it. The gate stops the signed-out case dead.
 *
 * It does not close the window entirely. `isAuthenticated` is already true
 * during the two bootstrap races that boundary documents — sign-in before
 * `getOrCreate` lands, and deletion patching `accountStatus` before `signOut`
 * — where `requireAuth` throws `user_not_found` / `account_inactive`. A beat
 * landing in there still rejects unhandled, because the rejection happens
 * inside the library hook's own `void sendHeartbeat()` where we have nothing
 * to catch it with. It is bounded rather than eliminated: at most a beat or
 * two per sign-in, and it self-heals the moment the row lands, or the
 * boundary unmounts this subtree and clears the interval outright. Worth
 * revisiting only if it shows up as Sentry noise.
 */
export function AppPresence() {
  const { isAuthenticated } = useConvexAuth();
  // Hooks can't be called conditionally, so the gate is a mount boundary.
  return isAuthenticated ? <Heartbeat /> : null;
}

/**
 * The return value is deliberately discarded. Room membership never reaches a
 * client — the server's `list` returns an empty array by design, and nothing
 * renders from it. Every presence signal in the product is a narrow
 * server-side query returning only its own derived answer.
 *
 * `userId` is required by the hook's signature but ignored by the server,
 * which derives identity from the authenticated session. The empty string
 * keeps it obvious that this value carries no authority — a client cannot
 * heartbeat as someone else, and cannot choose its own room.
 */
function Heartbeat() {
  usePresence(api.presence, PRESENCE_ROOM, '', HEARTBEAT_INTERVAL_MS);
  return null;
}

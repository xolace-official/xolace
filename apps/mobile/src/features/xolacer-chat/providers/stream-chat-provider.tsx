import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import { useAuth } from '@clerk/expo';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAppStore } from '@/src/store/store';
import { connectPlan } from '@/src/features/xolacer-chat/connect-plan';
import {
  attachOfflineDb,
  chatLocalDataGeneration,
  chatLocalDataSettled,
} from '@/src/features/xolacer-chat/offline-db';
import {
  readStreamCredential,
  writeStreamCredential,
  type StreamCredential,
} from '@/src/features/xolacer-chat/stream-credential';
import { useStreamTheme } from './stream-theme';

/**
 * Public Stream key — the same one that ships inside every Stream client app.
 * Read here rather than only off the token action so `Chat` can be mounted from
 * the first frame; see `StreamChatProvider` for why that matters. The token,
 * which is the part that actually grants access, is still minted server-side
 * per user and never lives in the bundle.
 *
 * Must exist in the build environment (`.env.local` locally, EAS environment
 * variables for cloud builds) alongside the other `EXPO_PUBLIC_*` keys.
 */
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;

/**
 * `ready` — the client is usable: its user is set and its offline database is
 * open, whether or not the socket is up yet. Screens render from the local
 * copy and the `OfflineStrip` reports the socket. `unavailable` — no client is
 * possible: no key, a key the token wasn't signed for, or a token that could
 * not be fetched and was not on the device. `connecting` is the few
 * milliseconds between activation and the database opening, and no screen
 * blocks on it for longer than that.
 */
export type StreamStatus = 'connecting' | 'ready' | 'unavailable';

type StreamStatusValue = {
  status: StreamStatus;
  /** Non-null only at `ready`. */
  client: StreamChat | null;
  /** Re-runs the token fetch after `unavailable`; a no-op otherwise. */
  retry: () => void;
  /** Opens the connection. Idempotent — see `useStreamConnection`. */
  activate: () => void;
};

const NOOP = () => {};
const DISCONNECTED: StreamStatusValue = {
  status: 'connecting',
  client: null,
  retry: NOOP,
  activate: NOOP,
};

const StreamStatusContext = createContext<StreamStatusValue>(DISCONNECTED);

export const useStreamStatus = () => use(StreamStatusContext);

/**
 * Declares "this screen needs Stream", and returns the same value as
 * `useStreamStatus`.
 *
 * The provider connects to nothing on its own for a user who has never opened
 * chat. Chat is server-gated (`chatEnabled()`), so an unconditional connect
 * would put a token action and a WS handshake on every user's cold start —
 * competing with Clerk and Convex on the reflect screen — and would log a
 * failed token fetch for everyone when the flag is off. A returning chat user
 * is the exception: their cached gate and credential let `connectPlan` start
 * the connection at mount, before any surface asks.
 *
 * Pass `enabled: false` while a caller still doesn't know whether it needs chat
 * — the Connect tab holds it off until `xolacerChat.status` confirms the
 * feature is on, so a disabled deployment never fetches a token that would
 * throw.
 */
export function useStreamConnection(enabled = true) {
  const value = use(StreamStatusContext);
  const { activate } = value;
  useEffect(() => {
    if (enabled) activate();
  }, [enabled, activate]);
  return value;
}

/**
 * Overlay host for the long-press message menu and image gallery.
 *
 * Cheap to hoist: it renders context, a portal host, and nothing else until an
 * overlay is actually open. No Stream connection is involved.
 */
export function StreamOverlayProvider({ children }: { children: React.ReactNode }) {
  const streamTheme = useStreamTheme();
  return <OverlayProvider value={{ style: streamTheme }}>{children}</OverlayProvider>;
}

/**
 * Connects the authenticated user to Stream. The Stream user id is minted
 * server-side from the authed profile; the client never names it.
 *
 * `Chat` is mounted unconditionally, from the first frame, and that is
 * load-bearing. It wraps the entire protected navigator, so a version of this
 * that only mounted it once a client existed changed the element type sitting
 * above `children` — which unmounts and rebuilds every screen in the app.
 * Keeping the shape fixed means only the context value moves. The same
 * concern is why the offline database is opened *before* `connectUser` sets
 * `client.userID`: with offline support on, `Chat` renders nothing for a user
 * whose database isn't open yet, and that gap would blank every screen.
 *
 * Mounting `Chat` early costs no network. `new StreamChat()` opens nothing —
 * `connectUser` is what does, and that still waits for `activate()`.
 */
export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const getStreamToken = useAction(api.xolacerChat.getStreamToken);
  const { userId: clerkUserId } = useAuth();
  const cachedEnabled = useAppStore((s) => s.chatEnabledCached);
  const setChatEnabledCached = useAppStore((s) => s.setChatEnabledCached);
  const [credential, setCredential] = useState<StreamCredential | null>(() => {
    const stored = readStreamCredential();
    return stored?.clerkUserId === clerkUserId ? stored : null;
  });
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Stays false for users who never open a chat surface — see useStreamConnection.
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const streamTheme = useStreamTheme();

  // Serializes connect/disconnect. `disconnectUser` is async, so an unawaited
  // teardown can still be closing the socket when the next effect run calls
  // `connectUser` — the close then lands on the new connection. Every op chains
  // onto the previous one instead.
  const streamOp = useRef<Promise<unknown>>(Promise.resolve());

  // One instance for the life of the app. `getInstance` is idempotent per key
  // and so is the attach, so a plain call each render is correct and a remount
  // above this can never leave two sockets racing.
  const client = STREAM_API_KEY ? StreamChat.getInstance(STREAM_API_KEY) : null;
  if (client) attachOfflineDb(client);

  // Only chat users pay for this subscription. It keeps the cached gate honest:
  // a kill-switch flip lands here, the cache flips, and the next cold start
  // stays quiet. The credential is kept — see `connectPlan`.
  const liveStatus = useQuery(api.xolacerChat.status, activated || cachedEnabled ? {} : 'skip');
  useEffect(() => {
    if (liveStatus) setChatEnabledCached(liveStatus.enabled);
  }, [liveStatus, setChatEnabledCached]);

  const plan = connectPlan({
    cachedEnabled,
    cachedCredential: credential,
    liveStatus: liveStatus?.enabled,
    // Never `foreign` here: the credential was filtered to ours at init, and
    // ChatLocalDataGuard above this provider owns the wipe on a switch.
    clerkUserId: clerkUserId ?? null,
  });
  // The kill switch is the one live answer that overrides a surface asking:
  // the server said no, so the client is `unavailable` and comes down.
  const killed = liveStatus?.enabled === false;
  const active = !killed && (activated || plan.activateNow);

  const retry = useCallback(() => {
    setError(false);
    setCredential(null);
    setActivated(true);
    setAttempt((n) => n + 1);
  }, []);

  const activate = useCallback(() => setActivated(true), []);

  useEffect(() => {
    if (!active || !clerkUserId || credential) return;
    let alive = true;
    getStreamToken()
      .then((result) => {
        const next = { clerkUserId, ...result };
        writeStreamCredential(next);
        if (alive) setCredential(next);
      })
      .catch((err) => {
        console.error('[xolacer-chat] Stream token fetch failed', err);
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [getStreamToken, clerkUserId, credential, attempt, active]);

  // The token is signed for one Stream app. If the bundled key names a
  // different one the handshake fails with an opaque "signature is not valid",
  // so refuse to connect and say what actually went wrong instead.
  const keyMismatch = !!credential && credential.apiKey !== STREAM_API_KEY;
  useEffect(() => {
    if (!keyMismatch) return;
    console.error(
      '[xolacer-chat] EXPO_PUBLIC_STREAM_API_KEY does not match the key the server signed this token with',
    );
  }, [keyMismatch]);

  useEffect(() => {
    if (!client || !active || !credential || keyMismatch) return;

    let alive = true;
    // The stored token first, so a cold start costs no round trip; Stream
    // calls back in on expiry or rejection and the refreshed token is stored
    // for the next launch. Offline, the refresh fails and so does the
    // handshake — the client keeps its user and serves the local copy.
    let storedToken: string | null = credential.token;
    const tokenProvider = async () => {
      if (storedToken) {
        const token = storedToken;
        storedToken = null;
        return token;
      }
      const fresh = await getStreamToken();
      writeStreamCredential({ clerkUserId: credential.clerkUserId, ...fresh });
      return fresh.token;
    };

    const opening = streamOp.current.catch(() => {}).then(async () => {
      // A reset still dropping the previous owner's tables must finish before
      // this opens them; one that starts while `init` runs means this
      // credential is already gone, so the handshake is skipped. See
      // `chatLocalDataSettled`.
      const generation = await chatLocalDataSettled();
      // Opened before `connectUser` so `Chat` never sees a user without a
      // database — see the component comment. A database that fails to open
      // degrades to today's online-only chat rather than blocking it.
      await client.offlineDb?.init(credential.userId);
      const dbOpen = client.offlineDb?.shouldInitialize(credential.userId) ?? false;
      if (!alive || generation !== chatLocalDataGeneration()) return;
      setOfflineReady(dbOpen);
      // `Chat` sets this too, but in an effect that may land after a fast
      // failure. Without it a refused handshake wipes the user off the client
      // and the local copy is unreachable.
      client.persistUserOnConnectionFailure = dbOpen;
      // Not awaited here: `connectUser` sets the user synchronously and
      // resolves only once the socket is up, which is exactly the wait the
      // thread no longer pays. Failure isn't `unavailable` — the client is
      // still usable against the local copy, and the SDK reconnects when the
      // network is back. The handshake is still chained below so a teardown
      // never lands mid-handshake.
      const handshake = client
        .connectUser({ id: credential.userId }, tokenProvider)
        .catch((err) => {
          console.warn('[xolacer-chat] Stream connect failed', err);
          // Without a database the SDK drops the user on failure, and a
          // client with no user throws from `channel()` — so it can't stay
          // handed out. With one, the local copy is still readable.
          if (!dbOpen && alive) {
            setReady(false);
            setError(true);
          }
        });
      setReady(true);
      return handshake;
    });
    streamOp.current = opening;

    return () => {
      alive = false;
      setReady(false);
      setOfflineReady(false);
      streamOp.current = opening.catch(() => {}).then(() => client.disconnectUser());
    };
  }, [client, active, credential, keyMismatch, getStreamToken]);

  const value = useMemo(
    () => ({
      status: (ready && !killed
        ? 'ready'
        : error || killed || keyMismatch || !client
          ? 'unavailable'
          : 'connecting') as StreamStatus,
      client: ready && !killed ? client : null,
      retry,
      activate,
    }),
    [ready, killed, error, keyMismatch, client, retry, activate],
  );

  // Build-time constant, so this branch never flips at runtime and cannot
  // remount anything. Chat is simply unavailable in a build with no key.
  if (!client) {
    return <StreamStatusContext value={value}>{children}</StreamStatusContext>;
  }

  // Theme applied here as well as on OverlayProvider — the overlay host reads
  // its own ThemeProvider, and this one covers everything under `Chat`.
  return (
    <Chat client={client} style={streamTheme} enableOfflineSupport={offlineReady}>
      <StreamStatusContext value={value}>{children}</StreamStatusContext>
    </Chat>
  );
}

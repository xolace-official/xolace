import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { StreamChat } from "stream-chat";
import { Chat, OverlayProvider } from "stream-chat-expo";
import { connectPlan } from "@/features/xolacer-chat/connect-plan";
import {
	attachOfflineDb,
	chatLocalDataGeneration,
	chatLocalDataSettled,
} from "@/features/xolacer-chat/offline-db";
import {
	readStreamCredential,
	type StreamCredential,
	writeStreamCredential,
} from "@/features/xolacer-chat/stream-credential";
import { registerStreamHaptics } from "@/features/xolacer-chat/stream-haptics";
import { useAppStore } from "@/store/store";
import { useStreamTheme } from "./stream-theme";

/** Public Stream key, read at build time so `Chat` mounts from the first frame; the token is
 * still minted server-side. */
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;

// Module scope, so it lands before any Stream component mounts.
registerStreamHaptics();

/** `ready`: user set and offline db open, socket or not. `unavailable`: no client possible (no
 * key, key mismatch, no token). `connecting`: the gap before the db opens. */
export type StreamStatus = "connecting" | "ready" | "unavailable";

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
	activate: NOOP,
	client: null,
	retry: NOOP,
	status: "connecting",
};

const StreamStatusContext = createContext<StreamStatusValue>(DISCONNECTED);

export const useStreamStatus = () => use(StreamStatusContext);

/** Declares that this screen needs Stream and returns `useStreamStatus`. Pass `enabled: false`
 * until the caller knows chat is on, so a disabled deployment never fetches a token. */
export function useStreamConnection(enabled = true) {
	const value = use(StreamStatusContext);
	const { activate } = value;
	useEffect(() => {
		if (enabled) {
			activate();
		}
	}, [enabled, activate]);
	return value;
}

/** Overlay host for the long-press message menu and image gallery; no Stream connection
 * involved. */
export function StreamOverlayProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const streamTheme = useStreamTheme();
	return (
		<OverlayProvider value={{ style: streamTheme }}>{children}</OverlayProvider>
	);
}

/** Connects the authed user to Stream. `Chat` wraps the whole protected navigator and mounts
 * from the first frame: changing its element type would remount every screen. */
export function StreamChatProvider({
	children,
}: {
	children: React.ReactNode;
}) {
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

	// Serializes connect/disconnect: `disconnectUser` is async, so an unawaited
	// teardown can close the socket of the next `connectUser`. Every op chains
	// onto the previous one.
	const streamOp = useRef<Promise<unknown>>(Promise.resolve());

	// `getInstance` and the attach are idempotent per key, so a plain call each
	// render is correct and a remount above this never races two sockets.
	const client = STREAM_API_KEY ? StreamChat.getInstance(STREAM_API_KEY) : null;
	if (client) {
		attachOfflineDb(client);
	}

	// Only chat users pay for this subscription; a kill-switch flip updates the
	// cached gate so the next cold start stays quiet. Credential kept: see `connectPlan`.
	const liveStatus = useQuery(
		api.xolacerChat.status,
		activated || cachedEnabled ? {} : "skip"
	);
	useEffect(() => {
		if (liveStatus) {
			setChatEnabledCached(liveStatus.enabled);
		}
	}, [liveStatus, setChatEnabledCached]);

	const plan = connectPlan({
		cachedCredential: credential,
		cachedEnabled,
		// Never `foreign` here: the credential was filtered to ours at init, and
		// ChatLocalDataGuard above this provider owns the wipe on a switch.
		clerkUserId: clerkUserId ?? null,
		liveStatus: liveStatus?.enabled,
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
		if (!(active && clerkUserId) || credential) {
			return;
		}
		let alive = true;
		getStreamToken()
			.then((result) => {
				const next = { clerkUserId, ...result };
				writeStreamCredential(next);
				if (alive) {
					setCredential(next);
				}
			})
			.catch((err) => {
				console.error("[xolacer-chat] Stream token fetch failed", err);
				if (alive) {
					setError(true);
				}
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
		if (!keyMismatch) {
			return;
		}
		console.error(
			"[xolacer-chat] EXPO_PUBLIC_STREAM_API_KEY does not match the key the server signed this token with"
		);
	}, [keyMismatch]);

	useEffect(() => {
		if (!(client && active && credential) || keyMismatch) {
			return;
		}

		let alive = true;
		// Stored token first so a cold start costs no round trip; Stream calls back
		// on expiry or rejection and the refreshed token is stored for next launch.
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

		const opening = streamOp.current
			.catch(() => {})
			.then(async () => {
				// A reset still dropping the previous owner's tables must finish first;
				// one that starts during `init` skips the handshake. See `chatLocalDataSettled`.
				const generation = await chatLocalDataSettled();
				// Opened before `connectUser` so `Chat` never sees a user without a
				// database; a failed open degrades to online-only chat.
				await client.offlineDb?.init(credential.userId);
				const dbOpen =
					client.offlineDb?.shouldInitialize(credential.userId) ?? false;
				if (!alive || generation !== chatLocalDataGeneration()) {
					return;
				}
				setOfflineReady(dbOpen);
				// `Chat` sets this too, but in an effect that may land after a fast
				// failure, and a refused handshake would then wipe the user off the client.
				client.persistUserOnConnectionFailure = dbOpen;
				// Not awaited: `connectUser` sets the user synchronously and resolves only
				// once the socket is up. Failure is not `unavailable` (the local copy stays
				// readable); still chained so a teardown never lands mid-handshake.
				const handshake = client
					.connectUser({ id: credential.userId }, tokenProvider)
					.catch((err) => {
						console.warn("[xolacer-chat] Stream connect failed", err);
						// Without a database the SDK drops the user on failure and `channel()`
						// then throws, so the client cannot stay handed out.
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
			streamOp.current = opening
				.catch(() => {})
				.then(() => client.disconnectUser());
		};
	}, [client, active, credential, keyMismatch, getStreamToken]);

	const value = useMemo(
		() => ({
			activate,
			client: ready && !killed ? client : null,
			retry,
			status: (ready && !killed
				? "ready"
				: error || killed || keyMismatch || !client
					? "unavailable"
					: "connecting") as StreamStatus,
		}),
		[ready, killed, error, keyMismatch, client, retry, activate]
	);

	// Build-time constant, so this branch never flips at runtime and cannot
	// remount anything. Chat is simply unavailable in a build with no key.
	if (!client) {
		return <StreamStatusContext value={value}>{children}</StreamStatusContext>;
	}

	// Theme applied here as well as on OverlayProvider — the overlay host reads
	// its own ThemeProvider, and this one covers everything under `Chat`.
	return (
		<Chat
			client={client}
			enableOfflineSupport={offlineReady}
			style={streamTheme}
		>
			<StreamStatusContext value={value}>{children}</StreamStatusContext>
		</Chat>
	);
}

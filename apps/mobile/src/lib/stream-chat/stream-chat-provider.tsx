import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
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
import { connectPlan } from "@/lib/stream-chat/connect-plan";
import {
	attachOfflineDb,
	chatLocalDataGeneration,
	chatLocalDataSettled,
} from "@/lib/stream-chat/offline-db";
import {
	readStreamCredential,
	type StreamCredential,
	writeStreamCredential,
} from "@/lib/stream-chat/stream-credential";
import { registerStreamHaptics } from "@/lib/stream-chat/stream-haptics";
import { useStreamTheme } from "@/lib/stream-chat/stream-theme";
import { useAppStore } from "@/store/store";

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;

registerStreamHaptics();

export type StreamStatus = "connecting" | "ready" | "unavailable";

type StreamStatusValue = {
	status: StreamStatus;
	client: StreamChat | null;
	retry: () => void;
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
	const [activated, setActivated] = useState(false);
	const [ready, setReady] = useState(false);
	const [offlineReady, setOfflineReady] = useState(false);
	const streamTheme = useStreamTheme();

	const streamOp = useRef<Promise<unknown>>(Promise.resolve());

	// `getInstance` and the attach are idempotent per key, so a plain call each
	// render is correct and a remount above this never races two sockets.
	const client = STREAM_API_KEY ? StreamChat.getInstance(STREAM_API_KEY) : null;
	if (client) {
		attachOfflineDb(client);
	}

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
		clerkUserId: clerkUserId ?? null,
		liveStatus: liveStatus?.enabled,
	});
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
				const generation = await chatLocalDataSettled();
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

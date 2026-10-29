import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

/** On a prod cold start Clerk reports `isSignedIn` a few seconds before `getToken` can succeed;
 * 6s still bails fast when signed out. */
const RETRY_WINDOW_MS = 6000;
const RETRY_DELAY_MS = 300;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** `ConvexProviderWithClerk` re-runs `setAuth` only on a `sessionId` change, so AuthSyncGuard
 * bumps this nonce folded into it. */
let reauthEpoch = 0;
const epochListeners = new Set<() => void>();
export const subscribeEpoch = (listener: () => void) => {
	epochListeners.add(listener);
	return () => {
		epochListeners.delete(listener);
	};
};
export const getReauthEpoch = () => reauthEpoch;

export function requestConvexReauth() {
	reauthEpoch++;
	epochListeners.forEach((listener) => listener());
}

/** The reported `sessionId` tagged with the re-auth nonce; epoch 0 reports Clerk's value
 * untouched. */
export const sessionIdWithEpoch = (
	sessionId: string | null | undefined,
	epoch: number
) => (epoch > 0 && sessionId ? `${sessionId}#${epoch}` : sessionId);

/** `useAuth` for `ConvexProviderWithClerk` that retries `getToken` while Clerk claims a
 * session: Convex never retries its init fetch. `useCallback([])` is a documented React
 * Compiler exception. */
export function useResilientClerkAuth() {
	const auth = useAuth();
	const epoch = useSyncExternalStore(
		subscribeEpoch,
		getReauthEpoch,
		getReauthEpoch
	);
	const getTokenRef = useRef(auth.getToken);
	const isSignedInRef = useRef(auth.isSignedIn);
	useEffect(() => {
		getTokenRef.current = auth.getToken;
		isSignedInRef.current = auth.isSignedIn;
	}, [auth.getToken, auth.isSignedIn]);

	const getToken = useCallback<ClerkGetToken>(async (options) => {
		const start = Date.now();
		let attempt = 0;
		let lastError: unknown = null;

		// Retry only while Clerk still claims a session: a failure then is the boot race, not a
		// sign-out.
		while (true) {
			attempt++;
			try {
				const token = await getTokenRef.current(options);
				if (token) {
					return token;
				}
				lastError = null;
			} catch (error) {
				lastError = error;
			}
			if (isSignedInRef.current !== true) {
				break;
			}
			if (Date.now() - start + RETRY_DELAY_MS >= RETRY_WINDOW_MS) {
				break;
			}
			await sleep(RETRY_DELAY_MS);
		}

		// Exhausted while still signed in: a genuine failure, rare and actionable, so surface it.
		if (isSignedInRef.current === true) {
			const err =
				lastError instanceof Error
					? `${lastError.name}: ${lastError.message}`
					: lastError == null
						? "null-token"
						: String(lastError);
			Sentry.captureMessage(
				`Clerk getToken never minted after ${attempt} attempts in ${Date.now() - start}ms (skipCache:${options?.skipCache ?? false} err:${err})`,
				"error"
			);
		}
		// Match Clerk's native contract: null means unauthenticated.
		return null;
	}, []);

	return {
		...auth,
		getToken,
		sessionId: sessionIdWithEpoch(auth.sessionId, epoch),
	};
}

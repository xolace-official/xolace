/**
 * The CLI's `fetchToken`: hands Convex a Clerk OAuth ID token, refreshing it when
 * it's near expiry or Convex asks. Clerk rotates the refresh token on every use, so
 * each refresh saves the new one, and concurrent refreshes share one request.
 */
import type { CliConfig } from "../config";
import { type FetchLike, OAuthError, refreshTokens } from "./oauth";
import type { StoredSession, TokenStore } from "./token-store";

const MS_PER_SECOND = 1000;
// Refresh this long before `exp`, so a token never expires mid-request.
const EXPIRY_MARGIN_MS = 5 * 60 * MS_PER_SECOND;

export class NotSignedInError extends Error {
	constructor(options?: { cause?: unknown }) {
		super("Not signed in. Run `xolace login`.", options);
		this.name = "NotSignedInError";
	}
}

/** `exp` in milliseconds, or null if the token isn't a JWT with one. */
export const idTokenExpiresAt = (idToken: string): number | null => {
	const [, payload] = idToken.split(".");
	if (!payload) {
		return null;
	}
	try {
		const claims: unknown = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8")
		);
		if (typeof claims !== "object" || claims === null || !("exp" in claims)) {
			return null;
		}
		return typeof claims.exp === "number" ? claims.exp * MS_PER_SECOND : null;
	} catch {
		return null;
	}
};

export interface Session {
	/** Convex's `AuthTokenFetcher` shape: null means signed out. */
	fetchToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
	/** Like fetchToken, but throws NotSignedInError instead of returning null. */
	getIdToken: (args?: { forceRefresh?: boolean }) => Promise<string>;
}

export const createSession = ({
	config,
	fetchImpl = fetch,
	now = Date.now,
	store,
}: {
	config: Pick<CliConfig, "clerkClientId" | "clerkIssuer">;
	fetchImpl?: FetchLike;
	now?: () => number;
	store: TokenStore;
}): Session => {
	let inFlight: Promise<string> | null = null;

	const isFresh = (session: StoredSession) => {
		if (!session.idToken) {
			return false;
		}
		const expiresAt = idTokenExpiresAt(session.idToken);
		return expiresAt !== null && expiresAt - EXPIRY_MARGIN_MS > now();
	};

	const refresh = async (
		from: StoredSession,
		retried = false
	): Promise<string> => {
		try {
			const tokens = await refreshTokens(config, from.refreshToken, fetchImpl);
			await store.save({
				idToken: tokens.idToken,
				refreshToken: tokens.refreshToken ?? from.refreshToken,
			});
			return tokens.idToken;
		} catch (error) {
			if (!(error instanceof OAuthError && error.code === "invalid_grant")) {
				throw error;
			}
			return recoverFromRotation(from, retried, error);
		}
	};

	// Another `xolace` process may have refreshed first and rotated our token away.
	// Take what it saved; otherwise the sign-in is gone.
	const recoverFromRotation = async (
		from: StoredSession,
		retried: boolean,
		cause: OAuthError
	): Promise<string> => {
		const latest = await store.load();
		if (retried || !latest || latest.refreshToken === from.refreshToken) {
			throw new NotSignedInError({ cause });
		}
		return latest.idToken && isFresh(latest)
			? latest.idToken
			: refresh(latest, true);
	};

	const getIdToken: Session["getIdToken"] = async ({
		forceRefresh = false,
	} = {}) => {
		if (inFlight) {
			return inFlight;
		}
		const stored = await store.load();
		if (!stored) {
			throw new NotSignedInError();
		}
		if (!forceRefresh && stored.idToken && isFresh(stored)) {
			return stored.idToken;
		}
		inFlight ??= refresh(stored).finally(() => {
			inFlight = null;
		});
		return inFlight;
	};

	return {
		fetchToken: async ({ forceRefreshToken }) => {
			try {
				return await getIdToken({ forceRefresh: forceRefreshToken });
			} catch (error) {
				if (error instanceof NotSignedInError) {
					return null;
				}
				throw error;
			}
		},
		getIdToken,
	};
};

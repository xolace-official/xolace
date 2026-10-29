import { tokenCache as clerkTokenCache } from "@clerk/expo/token-cache";
import * as Sentry from "@sentry/react-native";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

type TokenCache = NonNullable<typeof clerkTokenCache>;

/** Diagnostic wrapper around Clerk's token cache: Sentry breadcrumbs (`clerk.tokenCache`) for
 * the prod cold-start logout hunt. */
function breadcrumb(message: string, data?: Record<string, unknown>) {
	Sentry.addBreadcrumb({
		category: "clerk.tokenCache",
		data,
		level: "info",
		message,
	});
}

/** A miss only matters for a key previously stored, so a marker (key name only) is written on
 * save and dropped on clear. */
const SAVED_MARKER_PREFIX = "clerk.tokenCache.saved:";

const markerKey = (key: string) => `${SAVED_MARKER_PREFIX}${key}`;
const wasEverSaved = (key: string) => {
	try {
		return zustandJSONStorage.getItem(markerKey(key)) !== null;
	} catch {
		// No marker readable ⇒ treat the miss as expected rather than alerting.
		return false;
	}
};
// Clerk re-saves the client JWT on every FAPI response that carries an
// `authorization` header, so the marker write is throttled to once per process.
const markedThisProcess = new Set<string>();
const markSaved = (key: string) => {
	if (markedThisProcess.has(key)) {
		return;
	}
	markedThisProcess.add(key);
	void zustandJSONStorage.setItem(markerKey(key), "1").catch(() => {});
};
const markCleared = (key: string) => {
	markedThisProcess.delete(key);
	void zustandJSONStorage.removeItem(markerKey(key)).catch(() => {});
};

function wrap(cache: TokenCache): TokenCache {
	return {
		async getToken(key: string): Promise<string | null> {
			try {
				const token = await cache.getToken(key);
				breadcrumb("getToken", {
					hit: !!token,
					key,
					length: token?.length ?? 0,
				});
				// A cold start reading nothing for a previously written key is the prod logout
				// failure mode.
				if (!token && wasEverSaved(key)) {
					Sentry.captureMessage(
						`Clerk tokenCache MISS for "${key}" (previously saved)`,
						"warning"
					);
				}
				return token ?? null;
			} catch (error) {
				breadcrumb("getToken THREW", { error: stringifyError(error), key });
				Sentry.captureException(error, {
					tags: { area: "clerk.tokenCache", op: "getToken" },
				});
				throw error;
			}
		},

		async saveToken(key: string, token: string): Promise<void> {
			try {
				await cache.saveToken(key, token);
				markSaved(key);
				breadcrumb("saveToken", { key, length: token?.length ?? 0 });
			} catch (error) {
				breadcrumb("saveToken THREW", { error: stringifyError(error), key });
				Sentry.captureException(error, {
					tags: { area: "clerk.tokenCache", op: "saveToken" },
				});
				throw error;
			}
		},

		...(cache.clearToken
			? {
					async clearToken(key: string): Promise<void> {
						breadcrumb("clearToken", { key });
						markCleared(key);
						await cache.clearToken!(key);
					},
				}
			: {}),
	};
}

export const instrumentedTokenCache = clerkTokenCache
	? wrap(clerkTokenCache)
	: clerkTokenCache;

function stringifyError(error: unknown): string {
	return error instanceof Error
		? `${error.name}: ${error.message}`
		: String(error);
}

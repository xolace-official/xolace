import * as Sentry from "@sentry/react-native";
import { tokenCache as clerkTokenCache } from "@clerk/expo/token-cache";
import { zustandJSONStorage } from "@/src/lib/storage/unified-storage";

type TokenCache = NonNullable<typeof clerkTokenCache>;

/**
 * Diagnostic wrapper around Clerk's secure-store token cache.
 *
 * The prod-only symptom we are hunting: a signed-in user is dropped to the auth
 * screen on cold start / refresh (works in dev + preview). The first suspect is
 * the token cache — if the session JWT is not read back out of secure storage on
 * a cold start, Clerk boots signed-out and the route guard sends the user to
 * `(auth)`.
 *
 * This wrapper leaves Clerk's behaviour untouched and only emits Sentry
 * breadcrumbs (plus a message on the smoking-gun case: a read that returns
 * nothing for a key we previously stored — see {@link SAVED_MARKER_PREFIX};
 * a miss on a key we never wrote is normal and stays quiet). Breadcrumbs ride
 * along on every later event/error, so when the desync is reported we can see
 * the exact cache read/write sequence that led to it.
 * `category: "clerk.tokenCache"` makes them filterable in Sentry.
 *
 * `clerkTokenCache` is `undefined` on web — fall through to it untouched there.
 */
function breadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: "clerk.tokenCache",
    level: "info",
    message,
    data,
  });
}

/**
 * A read that returns nothing is only a smoking gun if we stored that key in the
 * first place. A fresh install, and a genuinely signed-out user, both miss on
 * every read — those were the bulk of the warnings. We record a marker whenever
 * a key is written and drop it when the key is cleared, so the alert fires only
 * for a token that was stored and then vanished. The marker outlives the process
 * (which is the point: the failure shows up on the *next* cold start) and holds
 * no token material, just the key name.
 */
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
  if (markedThisProcess.has(key)) return;
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
            key,
            hit: !!token,
            length: token?.length ?? 0,
          });
          // A cold start that reads back nothing for a key we previously wrote
          // is the exact failure mode behind the prod logout — surface it
          // loudly. A miss on a key we never wrote is normal; stay quiet.
          if (!token && wasEverSaved(key)) {
            Sentry.captureMessage(
              `Clerk tokenCache MISS for "${key}" (previously saved)`,
              "warning",
            );
          }
          return token ?? null;
        } catch (error) {
          breadcrumb("getToken THREW", { key, error: stringifyError(error) });
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
          breadcrumb("saveToken THREW", { key, error: stringifyError(error) });
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

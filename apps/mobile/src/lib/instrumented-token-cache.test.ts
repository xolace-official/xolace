import { beforeEach, describe, expect, it, vi } from "vitest";

import { instrumentedTokenCache } from "./instrumented-token-cache";

/** Stands in for expo-secure-store; tests can drop a key to simulate a loss. */
const store = new Map<string, string>();

vi.mock("@clerk/expo/token-cache", () => ({
	tokenCache: {
		clearToken: async (key: string) => void store.delete(key),
		getToken: async (key: string) => store.get(key) ?? null,
		saveToken: async (key: string, token: string) => void store.set(key, token),
	},
}));

const captureMessage = vi.fn();
vi.mock("@sentry/react-native", () => ({
	addBreadcrumb: () => {},
	captureException: () => {},
	captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

const cache = instrumentedTokenCache!;
const KEY = "__clerk_client_jwt";
// The marker write is fire-and-forget; let it land before the next read.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The alert exists for one case: a token we stored is gone on a later read.
 * Warning on every miss buried that under fresh installs and signed-out users.
 */
describe("instrumentedTokenCache miss warning", () => {
	beforeEach(() => {
		store.clear();
		captureMessage.mockClear();
	});

	it("stays quiet on a first read (fresh install / signed-out user)", async () => {
		await expect(cache.getToken(KEY)).resolves.toBe(null);
		expect(captureMessage).not.toHaveBeenCalled();
	});

	it("warns when a token we stored has vanished", async () => {
		await cache.saveToken(KEY, "jwt");
		await settle();

		store.delete(KEY); // keychain wiped / item destroyed under us
		await expect(cache.getToken(KEY)).resolves.toBe(null);
		expect(captureMessage).toHaveBeenCalledTimes(1);
	});

	it("stays quiet after the key was cleared on purpose", async () => {
		await cache.saveToken(KEY, "jwt");
		await settle();
		await cache.clearToken!(KEY);
		await settle();

		await expect(cache.getToken(KEY)).resolves.toBe(null);
		expect(captureMessage).not.toHaveBeenCalled();
	});
});

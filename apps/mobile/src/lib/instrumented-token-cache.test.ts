import { beforeEach, describe, expect, it, vi } from "vitest";

import { instrumentedTokenCache } from "./instrumented-token-cache";

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
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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

		store.delete(KEY);
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

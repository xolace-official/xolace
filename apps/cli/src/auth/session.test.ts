import { describe, expect, test } from "bun:test";
import { createSession, idTokenExpiresAt, NotSignedInError } from "./session";
import { CONFIG, fakeFetch, fakeIdToken, memoryStore } from "./test-helpers";

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;
const HOUR_S = 3600;
const now = () => NOW_MS;

const freshToken = fakeIdToken(NOW_S + HOUR_S, "fresh");
// Inside the 5-minute margin, so it counts as expired.
const staleToken = fakeIdToken(NOW_S + 60, "stale");
const newToken = fakeIdToken(NOW_S + 24 * HOUR_S, "new");

const refreshed = () =>
	fakeFetch(() => ({ body: { id_token: newToken, refresh_token: "rt-2" } }));

describe("idTokenExpiresAt", () => {
	test("reads exp in milliseconds", () => {
		expect(idTokenExpiresAt(freshToken)).toBe((NOW_S + HOUR_S) * 1000);
	});

	test("is null for something that isn't a JWT", () => {
		expect(idTokenExpiresAt("opaque")).toBeNull();
		expect(idTokenExpiresAt("a.!!!.c")).toBeNull();
	});
});

describe("createSession", () => {
	test("throws NotSignedInError with nothing stored; fetchToken returns null", async () => {
		const { store } = memoryStore();
		const session = createSession({ config: CONFIG, now, store });
		await expect(session.getIdToken()).rejects.toBeInstanceOf(NotSignedInError);
		expect(await session.fetchToken({ forceRefreshToken: false })).toBeNull();
	});

	test("reuses a fresh cached ID token without calling Clerk", async () => {
		const { store } = memoryStore({
			idToken: freshToken,
			refreshToken: "rt-1",
		});
		const { calls, fetchImpl } = refreshed();
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		expect(await session.getIdToken()).toBe(freshToken);
		expect(calls).toHaveLength(0);
	});

	test("refreshes a near-expiry token and saves the rotated refresh token", async () => {
		const { state, store } = memoryStore({
			idToken: staleToken,
			refreshToken: "rt-1",
		});
		const { calls, fetchImpl } = refreshed();
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		expect(await session.getIdToken()).toBe(newToken);
		expect(calls[0]?.form).toMatchObject({
			grant_type: "refresh_token",
			refresh_token: "rt-1",
		});
		expect(state.saved).toEqual({ idToken: newToken, refreshToken: "rt-2" });
	});

	test("refreshes when Convex forces it, even with a fresh token", async () => {
		const { store } = memoryStore({
			idToken: freshToken,
			refreshToken: "rt-1",
		});
		const { calls, fetchImpl } = refreshed();
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		expect(await session.fetchToken({ forceRefreshToken: true })).toBe(
			newToken
		);
		expect(calls).toHaveLength(1);
	});

	test("concurrent callers share one refresh, so the token rotates once", async () => {
		const { state, store } = memoryStore({ refreshToken: "rt-1" });
		const { calls, fetchImpl } = refreshed();
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		const tokens = await Promise.all([
			session.getIdToken(),
			session.fetchToken({ forceRefreshToken: true }),
			session.getIdToken(),
		]);
		expect(tokens).toEqual([newToken, newToken, newToken]);
		expect(calls).toHaveLength(1);
		expect(state.saves).toBe(1);
	});

	test("takes another process's newer sign-in when ours was rotated away", async () => {
		const { state, store } = memoryStore({ refreshToken: "rt-1" });
		const { fetchImpl } = fakeFetch(() => {
			// The other process saved its rotated token while our refresh was in flight.
			state.saved = { idToken: freshToken, refreshToken: "rt-other" };
			return { body: { error: "invalid_grant" }, status: 400 };
		});
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		expect(await session.getIdToken()).toBe(freshToken);
	});

	test("a revoked sign-in becomes NotSignedInError", async () => {
		const { store } = memoryStore({ refreshToken: "rt-1" });
		const { fetchImpl } = fakeFetch(() => ({
			body: { error: "invalid_grant" },
			status: 400,
		}));
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		await expect(session.getIdToken()).rejects.toBeInstanceOf(NotSignedInError);
		expect(await session.fetchToken({ forceRefreshToken: false })).toBeNull();
	});

	test("other failures (Clerk down) propagate instead of signing out", async () => {
		const { state, store } = memoryStore({ refreshToken: "rt-1" });
		const { fetchImpl } = fakeFetch(() => ({ body: {}, status: 503 }));
		const session = createSession({ config: CONFIG, fetchImpl, now, store });
		await expect(session.getIdToken()).rejects.toMatchObject({
			code: "http_error",
		});
		expect(state.saved).toEqual({ refreshToken: "rt-1" });
	});
});

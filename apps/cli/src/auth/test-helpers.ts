import type { FetchLike } from "./oauth";
import type { StoredSession, TokenStore } from "./token-store";

export const CONFIG = {
	clerkClientId: "client_test",
	clerkIssuer: "https://test.clerk.accounts.dev",
	convexUrl: "https://test.convex.cloud",
};

/** An unsigned JWT-shaped string; only `exp` (in seconds) matters to the CLI. */
export const fakeIdToken = (expSeconds: number, tag = "a") =>
	[
		Buffer.from('{"alg":"none"}').toString("base64url"),
		Buffer.from(JSON.stringify({ exp: expSeconds, tag })).toString("base64url"),
		"sig",
	].join(".");

export interface Call {
	form: Record<string, string>;
	url: string;
}

/** A fetch that records each form POST and answers from `respond`. */
export const fakeFetch = (
	respond: (call: Call) => { body: unknown; status?: number }
) => {
	const calls: Call[] = [];
	const fetchImpl: FetchLike = (url, init) => {
		const call = { form: Object.fromEntries(init.body), url };
		calls.push(call);
		const { body, status = 200 } = respond(call);
		return Promise.resolve({ json: () => Promise.resolve(body), status });
	};
	return { calls, fetchImpl };
};

export const memoryStore = (initial: StoredSession | null = null) => {
	const state = { saved: initial, saves: 0 };
	const store: TokenStore = {
		clear: () => {
			state.saved = null;
			return Promise.resolve();
		},
		load: () => Promise.resolve(state.saved),
		save: (session) => {
			state.saved = session;
			state.saves += 1;
			return Promise.resolve();
		},
	};
	return { state, store };
};

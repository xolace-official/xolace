import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	authorizeUrl,
	createPkce,
	exchangeCode,
	OAuthError,
	pollDeviceToken,
	refreshTokens,
	SCOPES,
} from "./oauth";
import { CONFIG, fakeFetch } from "./test-helpers";

describe("PKCE and the authorize URL", () => {
	test("the challenge is the S256 of the verifier", () => {
		const { challenge, verifier } = createPkce();
		expect(challenge).toBe(
			createHash("sha256").update(verifier).digest("base64url")
		);
	});

	test("asks Clerk for a code with PKCE and offline access", () => {
		const url = authorizeUrl(CONFIG, {
			challenge: "chal",
			redirectUri: "http://127.0.0.1:5000/callback",
			state: "st",
		});
		expect(url.origin + url.pathname).toBe(
			`${CONFIG.clerkIssuer}/oauth/authorize`
		);
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			client_id: CONFIG.clerkClientId,
			code_challenge: "chal",
			code_challenge_method: "S256",
			redirect_uri: "http://127.0.0.1:5000/callback",
			response_type: "code",
			scope: SCOPES,
			state: "st",
		});
	});
});

describe("token endpoint", () => {
	test("exchanges a code as a public client, with no secret", async () => {
		const { calls, fetchImpl } = fakeFetch(() => ({
			body: { id_token: "id", refresh_token: "rt" },
		}));
		const tokens = await exchangeCode(
			CONFIG,
			{ code: "c", redirectUri: "http://127.0.0.1:1/callback", verifier: "v" },
			fetchImpl
		);
		expect(tokens).toEqual({ idToken: "id", refreshToken: "rt" });
		expect(calls[0]?.url).toBe(`${CONFIG.clerkIssuer}/oauth/token`);
		expect(calls[0]?.form).toEqual({
			client_id: CONFIG.clerkClientId,
			code: "c",
			code_verifier: "v",
			grant_type: "authorization_code",
			redirect_uri: "http://127.0.0.1:1/callback",
		});
	});

	test("surfaces Clerk's error code", async () => {
		const { fetchImpl } = fakeFetch(() => ({
			body: { error: "invalid_grant", error_description: "revoked" },
			status: 400,
		}));
		const failure = refreshTokens(CONFIG, "rt", fetchImpl);
		await expect(failure).rejects.toBeInstanceOf(OAuthError);
		await expect(failure).rejects.toMatchObject({ code: "invalid_grant" });
	});

	test("rejects a response without an ID token", async () => {
		const { fetchImpl } = fakeFetch(() => ({ body: { access_token: "x" } }));
		await expect(refreshTokens(CONFIG, "rt", fetchImpl)).rejects.toMatchObject({
			code: "no_id_token",
		});
	});
});

describe("device grant polling", () => {
	const device = {
		deviceCode: "dc",
		expiresInSeconds: 600,
		intervalSeconds: 5,
	};

	test("waits through pending and slow_down, then returns tokens", async () => {
		const answers = [
			{ error: "authorization_pending" },
			{ error: "slow_down" },
			{ id_token: "id", refresh_token: "rt" },
		];
		const { calls, fetchImpl } = fakeFetch(() => ({
			body: answers.shift(),
			status: answers.length > 0 ? 400 : 200,
		}));
		const waits: number[] = [];
		const tokens = await pollDeviceToken(CONFIG, device, {
			fetchImpl,
			now: () => 0,
			wait: (ms) => {
				waits.push(ms);
				return Promise.resolve();
			},
		});
		expect(tokens).toEqual({ idToken: "id", refreshToken: "rt" });
		expect(waits).toEqual([5000, 5000, 10_000]);
		expect(calls[0]?.form.grant_type).toBe(
			"urn:ietf:params:oauth:grant-type:device_code"
		);
	});

	test("stops on access_denied", async () => {
		const { fetchImpl } = fakeFetch(() => ({
			body: { error: "access_denied" },
			status: 400,
		}));
		await expect(
			pollDeviceToken(CONFIG, device, {
				fetchImpl,
				now: () => 0,
				wait: () => Promise.resolve(),
			})
		).rejects.toMatchObject({ code: "access_denied" });
	});

	test("gives up when the code expires", async () => {
		let clock = 0;
		const { fetchImpl } = fakeFetch(() => ({
			body: { error: "authorization_pending" },
			status: 400,
		}));
		await expect(
			pollDeviceToken(CONFIG, device, {
				fetchImpl,
				now: () => clock,
				wait: (ms) => {
					clock += ms;
					return Promise.resolve();
				},
			})
		).rejects.toMatchObject({ code: "expired_token" });
	});
});

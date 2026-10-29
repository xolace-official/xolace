/**
 * Clerk OAuth for a public client: authorization code + PKCE, refresh, and the
 * device authorization grant (RFC 8628). No client secret anywhere.
 */
import { createHash, randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import type { CliConfig } from "../config";

export const SCOPES = "openid profile email offline_access";

const MS_PER_SECOND = 1000;
const DEFAULT_DEVICE_INTERVAL_SECONDS = 5;
// RFC 8628 §3.5: on slow_down, add 5 seconds to the polling interval.
const SLOW_DOWN_STEP_SECONDS = 5;
// A refresh runs while holding the cross-process lock, so it must not hang forever.
export const REQUEST_TIMEOUT_MS = 15 * MS_PER_SECOND;

export interface Tokens {
	idToken: string;
	/** Clerk rotates it on every refresh; absent only if `offline_access` was dropped. */
	refreshToken?: string;
}

export class OAuthError extends Error {
	readonly code: string;

	constructor(code: string, description?: string) {
		super(description ? `${code}: ${description}` : code);
		this.name = "OAuthError";
		this.code = code;
	}
}

export type FetchLike = (
	input: string,
	init: {
		body: URLSearchParams;
		headers: Record<string, string>;
		method: "POST";
		signal?: AbortSignal;
	}
) => Promise<{ json: () => Promise<unknown>; status: number }>;

type OAuthConfig = Pick<CliConfig, "clerkClientId" | "clerkIssuer">;

const base64url = (bytes: Buffer) => bytes.toString("base64url");

const stringField = (body: Record<string, unknown>, key: string) => {
	const value = body[key];
	return typeof value === "string" ? value : undefined;
};

const postForm = async (
	config: OAuthConfig,
	path: string,
	form: Record<string, string>,
	fetchImpl: FetchLike
) => {
	const response = await fetchImpl(`${config.clerkIssuer}${path}`, {
		body: new URLSearchParams({ client_id: config.clerkClientId, ...form }),
		headers: { "content-type": "application/x-www-form-urlencoded" },
		method: "POST",
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	const parsed = await response.json();
	const body: Record<string, unknown> =
		typeof parsed === "object" && parsed !== null ? { ...parsed } : {};
	const error = stringField(body, "error");
	if (error) {
		throw new OAuthError(error, stringField(body, "error_description"));
	}
	if (response.status >= 400) {
		throw new OAuthError("http_error", `status ${response.status}`);
	}
	return body;
};

const toTokens = (body: Record<string, unknown>): Tokens => {
	const idToken = stringField(body, "id_token");
	if (!idToken) {
		throw new OAuthError("no_id_token", "Clerk returned no ID token");
	}
	return { idToken, refreshToken: stringField(body, "refresh_token") };
};

export const createPkce = () => {
	const verifier = base64url(randomBytes(32));
	return {
		challenge: base64url(createHash("sha256").update(verifier).digest()),
		state: base64url(randomBytes(16)),
		verifier,
	};
};

export const authorizeUrl = (
	config: OAuthConfig,
	{
		challenge,
		redirectUri,
		state,
	}: { challenge: string; redirectUri: string; state: string }
) => {
	const url = new URL(`${config.clerkIssuer}/oauth/authorize`);
	url.search = new URLSearchParams({
		client_id: config.clerkClientId,
		code_challenge: challenge,
		code_challenge_method: "S256",
		nonce: base64url(randomBytes(16)),
		redirect_uri: redirectUri,
		response_type: "code",
		scope: SCOPES,
		state,
	}).toString();
	return url;
};

export const exchangeCode = async (
	config: OAuthConfig,
	{
		code,
		redirectUri,
		verifier,
	}: { code: string; redirectUri: string; verifier: string },
	fetchImpl: FetchLike = fetch
) =>
	toTokens(
		await postForm(
			config,
			"/oauth/token",
			{
				code,
				code_verifier: verifier,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
			},
			fetchImpl
		)
	);

export const refreshTokens = async (
	config: OAuthConfig,
	refreshToken: string,
	fetchImpl: FetchLike = fetch
) =>
	toTokens(
		await postForm(
			config,
			"/oauth/token",
			{ grant_type: "refresh_token", refresh_token: refreshToken },
			fetchImpl
		)
	);

export interface DeviceAuthorization {
	deviceCode: string;
	expiresInSeconds: number;
	intervalSeconds: number;
	userCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
}

export const startDeviceAuthorization = async (
	config: OAuthConfig,
	fetchImpl: FetchLike = fetch
): Promise<DeviceAuthorization> => {
	const body = await postForm(
		config,
		"/oauth/device_authorization",
		{ scope: SCOPES },
		fetchImpl
	);
	const deviceCode = stringField(body, "device_code");
	const userCode = stringField(body, "user_code");
	const verificationUri = stringField(body, "verification_uri");
	if (!(deviceCode && userCode && verificationUri)) {
		throw new OAuthError(
			"bad_device_response",
			"Clerk's device authorization response is missing fields"
		);
	}
	const { expires_in: expiresIn, interval } = body;
	return {
		deviceCode,
		expiresInSeconds: typeof expiresIn === "number" ? expiresIn : 0,
		intervalSeconds:
			typeof interval === "number" ? interval : DEFAULT_DEVICE_INTERVAL_SECONDS,
		userCode,
		verificationUri,
		verificationUriComplete: stringField(body, "verification_uri_complete"),
	};
};

export interface PollOptions {
	fetchImpl?: FetchLike;
	now?: () => number;
	wait?: (ms: number) => Promise<unknown>;
}

const pollUntil = async (
	config: OAuthConfig,
	deviceCode: string,
	intervalSeconds: number,
	deadline: number,
	options: Required<PollOptions>
): Promise<Tokens> => {
	if (options.now() >= deadline) {
		throw new OAuthError("expired_token", "The device code expired");
	}
	await options.wait(intervalSeconds * MS_PER_SECOND);
	try {
		return toTokens(
			await postForm(
				config,
				"/oauth/token",
				{
					device_code: deviceCode,
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				options.fetchImpl
			)
		);
	} catch (error) {
		if (!(error instanceof OAuthError)) {
			throw error;
		}
		if (error.code === "authorization_pending") {
			return pollUntil(config, deviceCode, intervalSeconds, deadline, options);
		}
		if (error.code === "slow_down") {
			return pollUntil(
				config,
				deviceCode,
				intervalSeconds + SLOW_DOWN_STEP_SECONDS,
				deadline,
				options
			);
		}
		throw error;
	}
};

/** Polls until the user approves, denies, or the code expires. */
export const pollDeviceToken = (
	config: OAuthConfig,
	{
		deviceCode,
		expiresInSeconds,
		intervalSeconds,
	}: Pick<
		DeviceAuthorization,
		"deviceCode" | "expiresInSeconds" | "intervalSeconds"
	>,
	{ fetchImpl = fetch, now = Date.now, wait = sleep }: PollOptions = {}
): Promise<Tokens> =>
	pollUntil(
		config,
		deviceCode,
		intervalSeconds,
		now() + expiresInSeconds * MS_PER_SECOND,
		{ fetchImpl, now, wait }
	);

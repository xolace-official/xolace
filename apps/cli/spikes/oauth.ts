// Spikes 1-4: Clerk OAuth for the CLI. Never prints a token, only claims and booleans.
//
//   bun spikes/oauth.ts login [port]   PKCE in the browser, then refresh (spikes 1, 2)
//   bun spikes/oauth.ts probe <port>   does Clerk accept this redirect port? (spike 3)
//   bun spikes/oauth.ts device         device authorization grant (spike 4)
//
// Env: SPIKE_CLERK_ISSUER, SPIKE_CLERK_CLIENT_ID. Optional SPIKE_CONVEX_URL: a
// throwaway Convex backend whose auth.config trusts this client, exposing `whoami`.
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const DEFAULT_PORT = 53_682;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const SCOPES = "openid profile email offline_access";
const MS_PER_SECOND = 1000;

const issuer = process.env.SPIKE_CLERK_ISSUER;
const clientId = process.env.SPIKE_CLERK_CLIENT_ID;
const convexUrl = process.env.SPIKE_CONVEX_URL;
if (!(issuer && clientId)) {
	throw new Error("Set SPIKE_CLERK_ISSUER and SPIKE_CLERK_CLIENT_ID.");
}

const whoami = makeFunctionReference<
	"query",
	Record<string, never>,
	{ tokenIdentifier: string; issuer: string; subject: string } | null
>("whoami:get");

const log = (label: string, value: unknown) => {
	process.stdout.write(`${label}: ${JSON.stringify(value, null, 2)}\n`);
};

const base64url = (bytes: Buffer) => bytes.toString("base64url");

const claimsOf = (jwt: string) => {
	const [, payload] = jwt.split(".");
	if (!payload) {
		throw new Error("not a JWT");
	}
	const claims: Record<string, unknown> = JSON.parse(
		Buffer.from(payload, "base64url").toString("utf8")
	);
	const { iss, sub, aud, azp, iat, exp } = claims;
	return {
		aud,
		azp,
		claimNames: Object.keys(claims).sort(),
		iss,
		lifetimeSeconds:
			typeof exp === "number" && typeof iat === "number" ? exp - iat : null,
		sub,
	};
};

interface TokenResponse {
	access_token?: string;
	error?: string;
	error_description?: string;
	id_token?: string;
	refresh_token?: string;
	scope?: string;
}

const postForm = async (path: string, form: Record<string, string>) => {
	const response = await fetch(`${issuer}${path}`, {
		body: new URLSearchParams(form),
		headers: { "content-type": "application/x-www-form-urlencoded" },
		method: "POST",
	});
	const body: TokenResponse & Record<string, unknown> = await response.json();
	return { body, status: response.status };
};

const describeTokens = (body: TokenResponse) => ({
	error: body.error,
	errorDescription: body.error_description,
	hasAccessToken: Boolean(body.access_token),
	hasIdToken: Boolean(body.id_token),
	hasRefreshToken: Boolean(body.refresh_token),
	idToken: body.id_token ? claimsOf(body.id_token) : null,
	scope: body.scope,
});

const convexIdentity = async (idToken: string) => {
	if (!convexUrl) {
		return "skipped (no SPIKE_CONVEX_URL)";
	}
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(idToken);
	try {
		return await client.query(whoami, {});
	} catch (error) {
		return `rejected: ${error instanceof Error ? error.message : String(error)}`;
	}
};

const authorizeUrl = (
	redirectUri: string,
	challenge: string,
	state: string
) => {
	const url = new URL(`${issuer}/oauth/authorize`);
	url.search = new URLSearchParams({
		client_id: clientId,
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

const waitForCode = (port: number, state: string) =>
	new Promise<string>((resolve, reject) => {
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
			if (url.pathname !== "/callback") {
				res.writeHead(404).end();
				return;
			}
			const code = url.searchParams.get("code");
			const error = url.searchParams.get("error");
			res.writeHead(200, { "content-type": "text/plain" });
			res.end("Spike done. You can close this tab.");
			server.close();
			if (error || !code) {
				reject(new Error(`authorize failed: ${error ?? "no code"}`));
			} else if (url.searchParams.get("state") === state) {
				resolve(code);
			} else {
				reject(new Error("state mismatch"));
			}
		});
		server.listen(port, "127.0.0.1");
		setTimeout(() => {
			server.close();
			reject(new Error("timed out waiting for the browser"));
		}, LOGIN_TIMEOUT_MS).unref();
	});

const login = async (port: number) => {
	const redirectUri = `http://127.0.0.1:${port}/callback`;
	const verifier = base64url(randomBytes(32));
	const challenge = base64url(createHash("sha256").update(verifier).digest());
	const state = base64url(randomBytes(16));
	const url = authorizeUrl(redirectUri, challenge, state);

	const code = waitForCode(port, state);
	process.stdout.write(
		`Opening the browser to sign in (port ${port}). If no tab opens, visit:\n${url.toString()}\n`
	);
	// Opening the browser is a convenience: if `open` is missing, keep waiting for
	// a sign-in through the printed URL.
	spawn("open", [url.toString()], { stdio: "ignore" }).on("error", () => {
		process.stdout.write(
			"Could not open the browser. Visit the URL above to sign in.\n"
		);
	});

	const exchanged = await postForm("/oauth/token", {
		client_id: clientId,
		code: await code,
		code_verifier: verifier,
		grant_type: "authorization_code",
		redirect_uri: redirectUri,
	});
	log("spike 1: code exchange", {
		status: exchanged.status,
		...describeTokens(exchanged.body),
	});
	if (exchanged.body.id_token) {
		log(
			"spike 1: Convex identity from id_token",
			await convexIdentity(exchanged.body.id_token)
		);
	}

	const { refresh_token: refreshToken } = exchanged.body;
	if (!refreshToken) {
		log("spike 2: refresh", "no refresh_token issued");
		return;
	}
	const refreshed = await postForm("/oauth/token", {
		client_id: clientId,
		grant_type: "refresh_token",
		refresh_token: refreshToken,
	});
	log("spike 2: refresh", {
		newIdTokenDiffers:
			Boolean(refreshed.body.id_token) &&
			refreshed.body.id_token !== exchanged.body.id_token,
		rotatedRefreshToken:
			Boolean(refreshed.body.refresh_token) &&
			refreshed.body.refresh_token !== refreshToken,
		status: refreshed.status,
		...describeTokens(refreshed.body),
	});
	if (refreshed.body.id_token) {
		log(
			"spike 2: Convex identity from refreshed id_token",
			await convexIdentity(refreshed.body.id_token)
		);
	}
};

// Spike 3: ask /oauth/authorize about a redirect URI without signing in. A rejected
// URI should answer with an error instead of sending us on to sign-in.
const probe = async (port: number) => {
	const results = await Promise.all(
		[DEFAULT_PORT, port].map(async (p) => {
			const url = authorizeUrl(
				`http://127.0.0.1:${p}/callback`,
				base64url(randomBytes(32)),
				"probe"
			);
			const response = await fetch(url, { redirect: "manual" });
			const location = response.headers.get("location") ?? "";
			const body = location ? "" : (await response.text()).slice(0, 300);
			return {
				body,
				location: location.split("?")[0],
				locationError: location
					? new URL(location, issuer).searchParams.get("error")
					: null,
				port: p,
				status: response.status,
			};
		})
	);
	log("spike 3: authorize probe", results);
};

const pollDevice = async (
	deviceCode: string,
	intervalSeconds: number,
	deadline: number
): Promise<TokenResponse> => {
	await sleep(intervalSeconds * MS_PER_SECOND);
	const { body } = await postForm("/oauth/token", {
		client_id: clientId,
		device_code: deviceCode,
		grant_type: "urn:ietf:params:oauth:grant-type:device_code",
	});
	if (body.error === "authorization_pending" && Date.now() < deadline) {
		return pollDevice(deviceCode, intervalSeconds, deadline);
	}
	if (body.error === "slow_down" && Date.now() < deadline) {
		return pollDevice(deviceCode, intervalSeconds + 5, deadline);
	}
	return body;
};

const device = async () => {
	const started = await postForm("/oauth/device_authorization", {
		client_id: clientId,
		scope: SCOPES,
	});
	const { device_code: deviceCode, interval, error } = started.body;
	if (typeof deviceCode !== "string") {
		log("spike 4: device authorization", {
			error,
			errorDescription: started.body.error_description,
			status: started.status,
		});
		return;
	}
	log("spike 4: go here and enter the code", {
		expiresIn: started.body.expires_in,
		userCode: started.body.user_code,
		verificationUri: started.body.verification_uri,
		verificationUriComplete: started.body.verification_uri_complete,
	});
	const tokens = await pollDevice(
		deviceCode,
		typeof interval === "number" ? interval : 5,
		Date.now() + LOGIN_TIMEOUT_MS
	);
	log("spike 4: device tokens", describeTokens(tokens));
	if (tokens.id_token) {
		log(
			"spike 4: Convex identity from device id_token",
			await convexIdentity(tokens.id_token)
		);
	}
};

const [mode, portArg] = process.argv.slice(2);
const cliPort = portArg ? Number(portArg) : DEFAULT_PORT;
if (mode === "login") {
	await login(cliPort);
} else if (mode === "probe") {
	await probe(cliPort);
} else if (mode === "device") {
	await device();
} else {
	throw new Error("usage: oauth.ts login [port] | probe <port> | device");
}

/**
 * Where the CLI signs in and which backend it talks to. All three values are
 * public: the Clerk issuer and OAuth client ID appear in every authorize URL.
 */
export interface CliConfig {
	clerkClientId: string;
	clerkIssuer: string;
	convexUrl: string;
}

const ENV_NAMES = {
	clerkClientId: "XOLACE_CLERK_OAUTH_CLIENT_ID",
	clerkIssuer: "XOLACE_CLERK_ISSUER",
	convexUrl: "XOLACE_CONVEX_URL",
} as const satisfies Record<keyof CliConfig, string>;

const TRAILING_SLASHES = /\/+$/;

type Env = Record<string, string | undefined>;

const requireEnv = (env: Env, keys: (keyof CliConfig)[]) => {
	const missing = keys
		.map((key) => ENV_NAMES[key])
		.filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`Missing ${missing.join(", ")}. Copy apps/cli/.env.example to .env and fill it in.`
		);
	}
};

/**
 * Just the issuer, which keys the stored sign-in. Enough for `logout`, which must
 * work even when the rest of the config is missing.
 */
export const readIssuer = (env: Env = process.env) => {
	requireEnv(env, ["clerkIssuer"]);
	// Convex compares `iss` to the issuer exactly, and Clerk's has no slash.
	return (env[ENV_NAMES.clerkIssuer] ?? "").replace(TRAILING_SLASHES, "");
};

export const readConfig = (env: Env = process.env): CliConfig => {
	requireEnv(env, ["clerkClientId", "clerkIssuer", "convexUrl"]);
	return {
		clerkClientId: env[ENV_NAMES.clerkClientId] ?? "",
		clerkIssuer: readIssuer(env),
		convexUrl: env[ENV_NAMES.convexUrl] ?? "",
	};
};

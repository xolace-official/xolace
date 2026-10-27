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

export const readConfig = (
	env: Record<string, string | undefined> = process.env
): CliConfig => {
	const missing = Object.values(ENV_NAMES).filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`Missing ${missing.join(", ")}. Copy apps/cli/.env.example to .env and fill it in.`
		);
	}
	return {
		clerkClientId: env[ENV_NAMES.clerkClientId] ?? "",
		// Convex compares `iss` to the issuer exactly, and Clerk's has no slash.
		clerkIssuer: (env[ENV_NAMES.clerkIssuer] ?? "").replace(
			TRAILING_SLASHES,
			""
		),
		convexUrl: env[ENV_NAMES.convexUrl] ?? "",
	};
};

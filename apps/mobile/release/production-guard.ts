// Build-time guard for production mobile releases (plan §5.2).
//
// A production binary or OTA update must never inherit test configuration
// (E2E/seed/mock flags, the dev Clerk instance, a dev or E2E Convex deployment)
// or ship a secret in an EXPO_PUBLIC_* variable, which Metro inlines into the
// public JS bundle. app.config.ts calls assertProductionEnvironment(), so
// `eas build` and `eas update` fail before anything is built or published.
//
// Messages name the offending variables, never their values.

type Env = Record<string, string | undefined>;

export const PRODUCTION_CONVEX_URL =
	"https://energetic-guineapig-283.convex.cloud";
export const PRODUCTION_CONVEX_SITE_URL =
	"https://energetic-guineapig-283.convex.site";

const PUBLIC_PREFIX = "EXPO_PUBLIC_";

// Name segments (split on "_") that mark a test-only switch.
const TEST_FLAG_SEGMENTS = new Set([
	"AUTOMATION",
	"E2E",
	"FIXTURE",
	"FIXTURES",
	"MOCK",
	"MOCKS",
	"SEED",
]);

// Non-public names that also mean "this is a test build".
const TEST_FLAG_NAMES = new Set(["E2E", "E2E_ENABLED"]);

const FALSY_VALUES = new Set(["", "0", "false", "no", "off"]);

// Variable names that say the value is a secret, whatever the value looks like.
const SECRET_NAME =
	/SECRET|PASSWORD|PRIVATE|SERVICE_ACCOUNT|ADMIN_KEY|DEPLOY_KEY/;

// Prefixes of well-known secret formats (Stripe/Clerk secret and restricted
// keys, OpenAI/Anthropic keys, GitHub and Slack tokens, AWS access key ids).
const SECRET_PREFIX =
	/^(?:sk_|rk_|sk-|ghp_|gho_|ghs_|github_pat_|xox[abprs]-|AKIA[0-9A-Z]{12})/;

const PEM_BLOCK = /-----BEGIN [A-Z ]+-----/;
const JWT = /^eyJ[\w-]+\.[\w-]+\./;

// A bare long opaque token: only hex, or only base64/base64url characters.
// Public values here are URLs, Google client ids (contain dots), short ids or
// carry an allowlisted public prefix, so none of them match.
const MIN_HEX_TOKEN_LENGTH = 32;
const MIN_BASE64_TOKEN_LENGTH = 40;
const HEX_TOKEN = new RegExp(`^[0-9a-fA-F]{${MIN_HEX_TOKEN_LENGTH},}$`);
const BASE64_TOKEN = new RegExp(
	`^[A-Za-z0-9+/_-]{${MIN_BASE64_TOKEN_LENGTH},}={0,2}$`
);

// Publishable keys that are public by design (Clerk, RevenueCat).
const PUBLIC_KEY_PREFIX = /^(?:pk_live_|pk_test_|appl_|goog_|amzn_)/;

const TRAILING_SLASHES = /\/+$/;

export interface Violation {
	name: string;
	rule: "test-flag" | "clerk-key" | "convex-url" | "secret-value";
}

function isTruthy(value: string | undefined): boolean {
	return value !== undefined && !FALSY_VALUES.has(value.trim().toLowerCase());
}

function isTestFlag(name: string): boolean {
	if (TEST_FLAG_NAMES.has(name)) {
		return true;
	}
	if (!name.startsWith(PUBLIC_PREFIX)) {
		return false;
	}
	return name
		.slice(PUBLIC_PREFIX.length)
		.split("_")
		.some((segment) => TEST_FLAG_SEGMENTS.has(segment));
}

export function looksLikeSecret(name: string, value: string): boolean {
	const trimmed = value.trim();
	if (trimmed === "") {
		return false;
	}
	if (SECRET_NAME.test(name)) {
		return true;
	}
	if (
		SECRET_PREFIX.test(trimmed) ||
		PEM_BLOCK.test(trimmed) ||
		JWT.test(trimmed)
	) {
		return true;
	}
	if (PUBLIC_KEY_PREFIX.test(trimmed)) {
		return false;
	}
	return HEX_TOKEN.test(trimmed) || BASE64_TOKEN.test(trimmed);
}

function withoutTrailingSlash(value: string | undefined): string | undefined {
	return value?.trim().replace(TRAILING_SLASHES, "");
}

export function findProductionViolations(env: Env): Violation[] {
	const violations: Violation[] = [];
	const names = Object.keys(env).sort();

	for (const name of names) {
		if (isTestFlag(name) && isTruthy(env[name])) {
			violations.push({ name, rule: "test-flag" });
		}
	}

	if (!env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim().startsWith("pk_live_")) {
		violations.push({
			name: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
			rule: "clerk-key",
		});
	}

	if (
		withoutTrailingSlash(env.EXPO_PUBLIC_CONVEX_URL) !== PRODUCTION_CONVEX_URL
	) {
		violations.push({ name: "EXPO_PUBLIC_CONVEX_URL", rule: "convex-url" });
	}
	const siteUrl = withoutTrailingSlash(env.EXPO_PUBLIC_CONVEX_SITE_URL);
	if (siteUrl && siteUrl !== PRODUCTION_CONVEX_SITE_URL) {
		violations.push({
			name: "EXPO_PUBLIC_CONVEX_SITE_URL",
			rule: "convex-url",
		});
	}

	for (const name of names) {
		const value = env[name];
		if (
			name.startsWith(PUBLIC_PREFIX) &&
			value &&
			looksLikeSecret(name, value)
		) {
			violations.push({ name, rule: "secret-value" });
		}
	}

	return violations;
}

const RULE_MESSAGES: Record<Violation["rule"], string> = {
	"clerk-key": "is not a live Clerk publishable key (pk_live_)",
	"convex-url": "is not the production Convex deployment",
	"secret-value":
		"looks like a secret; EXPO_PUBLIC_* values ship in the bundle",
	"test-flag": "is a test/E2E/seed/mock flag and is set",
};

/**
 * True for the runs that produce a production artifact: an EAS build
 * (`EAS_BUILD` is "true" on EAS servers and "1" for `eas build --local`) or an
 * export for `eas update` (`expo export` sets NODE_ENV=production before it
 * reads the config). `expo start`, fingerprinting and config reads in CI set
 * neither, so they are left alone.
 */
export function isProductionRelease(env: Env): boolean {
	if (env.APP_VARIANT !== "production") {
		return false;
	}
	const easBuild = env.EAS_BUILD === "true" || env.EAS_BUILD === "1";
	return easBuild || env.NODE_ENV === "production";
}

export function assertProductionEnvironment(env: Env = process.env): void {
	if (!isProductionRelease(env)) {
		return;
	}
	const violations = findProductionViolations(env);
	if (violations.length === 0) {
		return;
	}
	const lines = violations.map(
		({ name, rule }) => `  - ${name} ${RULE_MESSAGES[rule]}`
	);
	throw new Error(
		`Unsafe production environment (APP_VARIANT=production):\n${lines.join("\n")}\nFix the EAS "production" environment; see apps/mobile/AGENTS.md.`
	);
}

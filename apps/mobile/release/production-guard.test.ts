import { describe, expect, it } from "vitest";
import {
	assertProductionEnvironment,
	findProductionViolations,
	isProductionRelease,
	looksLikeSecret,
	PRODUCTION_CONVEX_SITE_URL,
	PRODUCTION_CONVEX_URL,
} from "./production-guard";

// Shapes of the real public values, not the values themselves.
const release = {
	APP_VARIANT: "production",
	EAS_BUILD: "true",
	EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
		"123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com",
	EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME:
		"com.googleusercontent.apps.123456789012-abcdefghijklmnopqrstuvwxyz012345",
	EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
		"pk_live_Y2xlcmsueG9sYWNlLmV4YW1wbGUuY29tJA",
	EXPO_PUBLIC_CONVEX_SITE_URL: PRODUCTION_CONVEX_SITE_URL,
	EXPO_PUBLIC_CONVEX_URL: PRODUCTION_CONVEX_URL,
	EXPO_PUBLIC_FB_APP_ID: "1234567890123456",
	EXPO_PUBLIC_SENTRY_DNS:
		"https://0123456789abcdef0123456789abcdef@o123456.ingest.us.sentry.io/1234567",
	EXPO_PUBLIC_STREAM_API_KEY: "abcd1234efgh",
} satisfies Record<string, string>;

describe("isProductionRelease", () => {
	it("runs for EAS builds and production exports of the production variant", () => {
		expect(
			isProductionRelease({ APP_VARIANT: "production", EAS_BUILD: "true" })
		).toBe(true);
		expect(
			isProductionRelease({ APP_VARIANT: "production", EAS_BUILD: "1" })
		).toBe(true);
		expect(
			isProductionRelease({ APP_VARIANT: "production", NODE_ENV: "production" })
		).toBe(true);
	});

	it("skips expo start, CI fingerprinting and other variants", () => {
		expect(isProductionRelease({ APP_VARIANT: "production" })).toBe(false);
		expect(isProductionRelease({ APP_VARIANT: "production", CI: "true" })).toBe(
			false
		);
		expect(
			isProductionRelease({
				APP_VARIANT: "production",
				NODE_ENV: "development",
			})
		).toBe(false);
		expect(
			isProductionRelease({ APP_VARIANT: "preview", EAS_BUILD: "true" })
		).toBe(false);
		expect(
			isProductionRelease({ EAS_BUILD: "true", NODE_ENV: "production" })
		).toBe(false);
	});
});

describe("assertProductionEnvironment", () => {
	it("accepts a production environment with real-shaped public values", () => {
		expect(findProductionViolations(release)).toEqual([]);
		expect(() => assertProductionEnvironment(release)).not.toThrow();
	});

	it("does nothing outside a production release", () => {
		expect(() =>
			assertProductionEnvironment({ APP_VARIANT: "preview", EAS_BUILD: "true" })
		).not.toThrow();
		expect(() =>
			assertProductionEnvironment({ APP_VARIANT: "production" })
		).not.toThrow();
	});

	it.each([
		"EXPO_PUBLIC_E2E",
		"EXPO_PUBLIC_SEED_HOOKS",
		"EXPO_PUBLIC_MOCK_PRACTICE",
		"EXPO_PUBLIC_AUTOMATION",
		"E2E",
		"E2E_ENABLED",
	])("rejects the test flag %s", (name) => {
		expect(findProductionViolations({ ...release, [name]: "1" })).toEqual([
			{ name, rule: "test-flag" },
		]);
		expect(() =>
			assertProductionEnvironment({ ...release, [name]: "true" })
		).toThrow(name);
	});

	it("ignores test flags that are explicitly off", () => {
		expect(
			findProductionViolations({ ...release, EXPO_PUBLIC_E2E: "0" })
		).toEqual([]);
		expect(
			findProductionViolations({ ...release, EXPO_PUBLIC_E2E: "false" })
		).toEqual([]);
		expect(
			findProductionViolations({ ...release, EXPO_PUBLIC_E2E: "" })
		).toEqual([]);
	});

	it("requires a live Clerk publishable key", () => {
		const testKey = {
			...release,
			EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
		};
		expect(() => assertProductionEnvironment(testKey)).toThrow(
			"EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
		);
		const { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: _key, ...missing } = release;
		expect(() => assertProductionEnvironment(missing)).toThrow("pk_live_");
	});

	it("requires the production Convex deployment", () => {
		const dev = {
			...release,
			EXPO_PUBLIC_CONVEX_URL:
				"https://groovy-mandrill-892.eu-west-1.convex.cloud",
		};
		expect(() => assertProductionEnvironment(dev)).toThrow(
			"EXPO_PUBLIC_CONVEX_URL"
		);
		const devSite = {
			...release,
			EXPO_PUBLIC_CONVEX_SITE_URL: "https://example.convex.site",
		};
		expect(() => assertProductionEnvironment(devSite)).toThrow(
			"EXPO_PUBLIC_CONVEX_SITE_URL"
		);
		expect(
			findProductionViolations({
				...release,
				EXPO_PUBLIC_CONVEX_URL: `${PRODUCTION_CONVEX_URL}/`,
			})
		).toEqual([]);
	});

	it("never puts a value in the error message", () => {
		const value = "sk_live_supersecretvalue";
		const env = { ...release, EXPO_PUBLIC_STRIPE_KEY: value };
		expect(() => assertProductionEnvironment(env)).toThrow(
			"EXPO_PUBLIC_STRIPE_KEY"
		);
		try {
			assertProductionEnvironment(env);
		} catch (error) {
			expect(String(error)).not.toContain(value);
		}
	});
});

describe("looksLikeSecret", () => {
	it.each([
		["EXPO_PUBLIC_KEY", "sk_live_abc123"],
		["EXPO_PUBLIC_KEY", "sk-ant-api03-abc"],
		["EXPO_PUBLIC_KEY", "rk_live_abc123"],
		["EXPO_PUBLIC_KEY", "ghp_abcdefghijklmnop"],
		["EXPO_PUBLIC_KEY", "-----BEGIN PRIVATE KEY-----\nabc"],
		["EXPO_PUBLIC_KEY", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig"],
		["EXPO_PUBLIC_KEY", "AKIAABCDEFGHIJKLMNOP"],
		["EXPO_PUBLIC_KEY", "0123456789abcdef0123456789abcdef"],
		["EXPO_PUBLIC_KEY", "dGhpcyBpcyBhIGxvbmcgYmFzZTY0IHRva2VuIHZhbHVlIQ=="],
		["EXPO_PUBLIC_CLERK_SECRET", "anything"],
		["EXPO_PUBLIC_ADMIN_PASSWORD", "hunter2"],
	])("flags %s=%s", (name, value) => {
		expect(looksLikeSecret(name, value)).toBe(true);
	});

	it.each(Object.entries(release))(
		"passes the public value of %s",
		(name, value) => {
			expect(looksLikeSecret(name, value)).toBe(false);
		}
	);

	it("passes RevenueCat public SDK keys and empty values", () => {
		expect(
			looksLikeSecret(
				"EXPO_PUBLIC_RC_IOS",
				"appl_abcdefghijklmnopqrstuvwxyz0123456789AB"
			)
		).toBe(false);
		expect(looksLikeSecret("EXPO_PUBLIC_ANYTHING", "")).toBe(false);
	});
});

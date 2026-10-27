/**
 * `auth.config.ts` reads env when Convex loads it. Re-imported per case with the
 * env a deployment would have.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const ISSUER = "https://test.clerk.accounts.dev";
const OAUTH_CLIENT_ID = "oauth_client_test";

const loadConfig = async () => {
	vi.resetModules();
	return (await import("../auth.config")).default;
};

describe("auth.config", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("accepts only session JWTs when no OAuth client is configured", async () => {
		vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", ISSUER);
		vi.stubEnv("CLERK_OAUTH_CLIENT_ID", "");

		expect((await loadConfig()).providers).toEqual([
			{ applicationID: "convex", domain: ISSUER },
		]);
	});

	it("adds the OAuth client as a second provider on the same issuer", async () => {
		vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", ISSUER);
		vi.stubEnv("CLERK_OAUTH_CLIENT_ID", OAUTH_CLIENT_ID);

		expect((await loadConfig()).providers).toEqual([
			{ applicationID: "convex", domain: ISSUER },
			{ applicationID: OAUTH_CLIENT_ID, domain: ISSUER },
		]);
	});

	it("refuses to load without an issuer", async () => {
		vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", "");

		await expect(loadConfig()).rejects.toThrow("CLERK_JWT_ISSUER_DOMAIN");
	});
});

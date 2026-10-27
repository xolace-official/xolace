import { describe, expect, test } from "bun:test";
import { readConfig, readIssuer } from "./config";

describe("readConfig", () => {
	test("reads the three values and trims the issuer's trailing slash", () => {
		expect(
			readConfig({
				XOLACE_CLERK_ISSUER: "https://x.clerk.accounts.dev/",
				XOLACE_CLERK_OAUTH_CLIENT_ID: "client",
				XOLACE_CONVEX_URL: "https://x.convex.cloud",
			})
		).toEqual({
			clerkClientId: "client",
			clerkIssuer: "https://x.clerk.accounts.dev",
			convexUrl: "https://x.convex.cloud",
		});
	});

	test("readIssuer needs only the issuer, so logout works without the rest", () => {
		expect(
			readIssuer({ XOLACE_CLERK_ISSUER: "https://x.clerk.accounts.dev/" })
		).toBe("https://x.clerk.accounts.dev");
		expect(() => readIssuer({})).toThrow("Missing XOLACE_CLERK_ISSUER");
	});

	test("names every missing variable", () => {
		expect(() => readConfig({ XOLACE_CONVEX_URL: "u" })).toThrow(
			"Missing XOLACE_CLERK_OAUTH_CLIENT_ID, XOLACE_CLERK_ISSUER"
		);
	});
});

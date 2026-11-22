/**
 * #690: the content scripts (badge art, quote backgrounds, Kindling, Library)
 * never reach prod or staging by default. What can go wrong: a bare run follows a CONVEX_DEPLOY_KEY left in the shell (it beats
 * CONVEX_DEPLOYMENT in the Convex CLI) or a `.env.local` pointing at prod.
 */
import { describe, expect, it } from "vitest";
import { catalogueFor, resolveTarget } from "./target";

const DEV = { CONVEX_DEPLOYMENT: "dev:groovy-mink-123" };

describe("resolveTarget", () => {
	it("targets your own dev deployment by default", () => {
		expect(resolveTarget([], {}, DEV)).toEqual({
			convexArgs: [],
			label: "dev:groovy-mink-123",
			pushFunctions: true,
		});
	});

	it("prefers CONVEX_DEPLOYMENT from the shell over .env.local", () => {
		expect(
			resolveTarget([], { CONVEX_DEPLOYMENT: "local:mine" }, DEV).label
		).toBe("local:mine");
	});

	it("refuses a bare run with no dev deployment", () => {
		expect(() => resolveTarget([], {}, {})).toThrow(/no dev deployment/);
		expect(() =>
			resolveTarget(
				[],
				{},
				{ CONVEX_DEPLOYMENT: "prod:energetic-guineapig-283" }
			)
		).toThrow(/not a dev deployment/);
	});

	it("refuses a bare run while a deploy key is set", () => {
		expect(() =>
			resolveTarget([], { CONVEX_DEPLOY_KEY: "prod:staging|key" }, DEV)
		).toThrow(/CONVEX_DEPLOY_KEY/);
	});

	it("reaches prod only when asked, without pushing functions", () => {
		expect(resolveTarget(["--prod"], {}, DEV)).toEqual({
			convexArgs: ["--prod"],
			label: "prod",
			pushFunctions: false,
		});
	});

	it("uses a deploy key (staging, a preview) only when asked", () => {
		expect(
			resolveTarget(["--deploy-key"], { CONVEX_DEPLOY_KEY: "k" }, DEV)
		).toEqual({
			convexArgs: [],
			label: "the deployment CONVEX_DEPLOY_KEY names",
			pushFunctions: false,
		});
		expect(() => resolveTarget(["--deploy-key"], {}, DEV)).toThrow(
			/CONVEX_DEPLOY_KEY/
		);
		expect(() =>
			resolveTarget(["--prod", "--deploy-key"], { CONVEX_DEPLOY_KEY: "k" }, DEV)
		).toThrow(/one of/);
	});

	it("follows the deploy key even when .env.local names another deployment", () => {
		expect(
			resolveTarget(
				["--deploy-key", "--dry-run"],
				{ CONVEX_DEPLOY_KEY: "k" },
				{ CONVEX_DEPLOYMENT: "prod:energetic-guineapig-283" }
			).pushFunctions
		).toBe(false);
	});
});

describe("catalogueFor", () => {
	it("gives the real catalogue only to --prod", () => {
		expect(catalogueFor(["--prod"])).toBe("prod");
		expect(catalogueFor(["--prod", "--thumbs-only"])).toBe("prod");
	});

	it("gives your dev deployment and a deploy key (staging) the dev fixtures", () => {
		expect(catalogueFor([])).toBe("dev");
		expect(catalogueFor(["--deploy-key"])).toBe("dev");
		expect(catalogueFor(["--deploy-key", "--cover-variants"])).toBe("dev");
	});
});

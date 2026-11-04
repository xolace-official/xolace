/**
 * #690: the upload script never reaches prod or staging by default. What can
 * go wrong: a bare run follows a CONVEX_DEPLOY_KEY left in the shell (it beats
 * CONVEX_DEPLOYMENT in the Convex CLI) or a `.env.local` pointing at prod.
 */
import { describe, expect, it } from "vitest";
import { resolveTarget } from "./target";

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
});

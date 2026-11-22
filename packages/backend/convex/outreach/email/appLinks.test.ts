// @vitest-environment edge-runtime
/**
 * #915: the links in an email go through this deployment's site into the
 * app. What can go wrong: a link opens the wrong screen, loses `from=email`,
 * or the route redirects anywhere a stranger asks it to.
 */
import { describe, expect, it } from "vitest";
import { asUnauthed } from "../../test/harness.helpers";

describe("email app links", () => {
	it("redirect into the app's scheme, marked as from email, and nothing else", async () => {
		const t = asUnauthed();
		const open = (target: string) =>
			t.fetch(`/email/open/${target}`, { method: "GET" });

		const expected = {
			explore: "xolace://explore?from=email",
			support: "xolace://crisis-resources?from=email",
			talk: "xolace://talk?from=email",
			vent: "xolace://voice-vent?from=email",
		};
		for (const [target, location] of Object.entries(expected)) {
			const response = await open(target);
			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(location);
		}
		expect((await open("https:evil")).status).toBe(404);
		expect((await open("app")).status).toBe(404);
	});
});

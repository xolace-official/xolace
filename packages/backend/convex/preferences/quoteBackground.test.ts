// @vitest-environment edge-runtime
/**
 * The daily quote's background, kept on the account (redesign B7), chosen
 * from the `quote_backgrounds` catalogue (B18).
 *
 * Failure modes:
 *  1. An account that never chose reads anything but Poster.
 *  2. A choice doesn't hold, or lands on someone else's account.
 *  3. Choosing a background writes `preferences.quotes`, whose presence
 *     opts the account into the nightly quote generator.
 *  4. The shipped quote-setup path (`updateQuotePreferences`) erases it, or
 *     it erases what setup saved.
 *  5. Signed out, it answers instead of refusing.
 *  6. A free account saves a Xolace+ background (the fence is the server's,
 *     not the sheet's), or a key the catalogue doesn't offer.
 *  7. Going back to Poster fails because the catalogue isn't filled yet.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { seedQuoteBackgrounds } from "../test/quoteBackgrounds.helpers";

let isPlus = false;

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => isPlus));

afterEach(() => {
	isPlus = false;
});

const background = (user: SeededUser) =>
	user.t.query(api.preferences.quoteBackground.get, {});

const choose = (user: SeededUser, key: string) =>
	user.t.mutation(api.preferences.quoteBackground.set, { background: key });

async function seededUser(n = 1, root = asUnauthed()) {
	if (n === 1) {
		await seedQuoteBackgrounds(root);
	}
	return asNewUser(n, root);
}

const withPlus = () => {
	isPlus = true;
};

describe("preferences/quoteBackground", () => {
	it("is Poster for an account that never chose", async () => {
		const user = await seededUser();
		expect(await background(user)).toBe("poster");
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.quoteBackground).toBeUndefined();
	});

	it("keeps the chosen background, and the next choice replaces it", async () => {
		const user = await seededUser();
		await choose(user, "rain-window");
		expect(await background(user)).toBe("rain-window");

		await choose(user, "night");
		expect(await background(user)).toBe("night");
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.quoteBackground).toBe("night");
	});

	it("doesn't opt the account into the nightly generator", async () => {
		const user = await seededUser();
		await choose(user, "first-light");
		expect(
			await user.t.query(api.preferences.getQuotePreferences, {})
		).toBeNull();
	});

	it("and quote setup leave each other's fields alone", async () => {
		const user = await seededUser();
		await choose(user, "first-light");
		await user.t.mutation(api.preferences.updateQuotePreferences, {
			notificationEnabled: true,
			notificationTime: "morning",
			themes: ["rest", "courage"],
		});
		await choose(user, "night");

		expect(await background(user)).toBe("night");
		expect(await user.t.query(api.preferences.getQuotePreferences, {})).toEqual(
			{
				notificationEnabled: true,
				notificationTime: "morning",
				shownQuoteIds: [],
				themes: ["rest", "courage"],
			}
		);
	});

	it("changes only the caller's preferences", async () => {
		const a = await seededUser(1);
		const b = await seededUser(2, a.root);
		await choose(a, "rain-window");
		expect(await background(a)).toBe("rain-window");
		expect(await background(b)).toBe("poster");
	});

	it("rejects a key the catalogue doesn't offer, or has retired", async () => {
		const user = await seededUser();
		await seedQuoteBackgrounds(user.root, [{ active: false, key: "dunes" }]);
		await expectCode(() => choose(user, "aurora"), "unknown_background");
		await expectCode(() => choose(user, "dunes"), "unknown_background");
		expect(await background(user)).toBe("poster");
	});

	it("takes Poster even before the catalogue is filled", async () => {
		const user = await asNewUser();
		await expectCode(() => choose(user, "night"), "unknown_background");
		await choose(user, "poster");
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.quoteBackground).toBe("poster");
	});

	describe("Xolace+ backgrounds", () => {
		it("refuses a free account, still or loop, and keeps its choice", async () => {
			const user = await seededUser();
			await choose(user, "first-light");
			await expect(choose(user, "deep-forest")).rejects.toThrow(
				"Xolace+ required"
			);
			await expect(choose(user, "quiet-lake")).rejects.toThrow(
				"Xolace+ required"
			);
			expect(await background(user)).toBe("first-light");
		});

		it("takes them with Xolace+", async () => {
			withPlus();
			const user = await seededUser();
			await choose(user, "quiet-lake");
			expect(await background(user)).toBe("quiet-lake");
		});

		it("follows the catalogue's flag, so a tier can change without a release", async () => {
			const user = await seededUser();
			await user.root.run(async (ctx) => {
				const row = await ctx.db
					.query("quote_backgrounds")
					.withIndex("by_key", (q) => q.eq("key", "quiet-lake"))
					.unique();
				if (row) {
					await ctx.db.patch("quote_backgrounds", row._id, { plus: false });
				}
			});
			await choose(user, "quiet-lake");
			expect(await background(user)).toBe("quiet-lake");
		});

		it("keeps a saved Plus key after Plus lapses (the app draws Poster)", async () => {
			withPlus();
			const user = await seededUser();
			await choose(user, "deep-forest");
			isPlus = false;
			expect(await background(user)).toBe("deep-forest");
			// Going back to a free background is never gated.
			await choose(user, "night");
			expect(await background(user)).toBe("night");
		});
	});

	it("refuses signed out", async () => {
		await expectCode(
			() => asUnauthed().query(api.preferences.quoteBackground.get, {}),
			"not_authenticated"
		);
		await expectCode(
			() =>
				asUnauthed().mutation(api.preferences.quoteBackground.set, {
					background: "poster",
				}),
			"not_authenticated"
		);
	});
});

// @vitest-environment edge-runtime
/**
 * The daily quote's background, kept on the account (redesign B7).
 *
 * Failure modes:
 *  1. An account that never chose reads anything but Poster.
 *  2. A choice doesn't hold, or lands on someone else's account.
 *  3. Choosing a background writes `preferences.quotes`, whose presence
 *     opts the account into the nightly quote generator.
 *  4. The shipped quote-setup path (`updateQuotePreferences`) erases it, or
 *     it erases what setup saved.
 *  5. Signed out, it answers instead of refusing.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const background = (user: SeededUser) =>
	user.t.query(api.preferences.quoteBackground.get, {});

describe("preferences/quoteBackground", () => {
	it("is Poster for an account that never chose", async () => {
		const user = await asNewUser();
		expect(await background(user)).toBe("poster");
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.quoteBackground).toBeUndefined();
	});

	it("keeps the chosen background, and the next choice replaces it", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.preferences.quoteBackground.set, {
			background: "quiet-lake",
		});
		expect(await background(user)).toBe("quiet-lake");

		await user.t.mutation(api.preferences.quoteBackground.set, {
			background: "night",
		});
		expect(await background(user)).toBe("night");
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.quoteBackground).toBe("night");
	});

	it("doesn't opt the account into the nightly generator", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.preferences.quoteBackground.set, {
			background: "hearth",
		});
		expect(
			await user.t.query(api.preferences.getQuotePreferences, {})
		).toBeNull();
	});

	it("and quote setup leave each other's fields alone", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.preferences.quoteBackground.set, {
			background: "first-light",
		});
		await user.t.mutation(api.preferences.updateQuotePreferences, {
			notificationEnabled: true,
			notificationTime: "morning",
			themes: ["rest", "courage"],
		});
		await user.t.mutation(api.preferences.quoteBackground.set, {
			background: "deep-forest",
		});

		expect(await background(user)).toBe("deep-forest");
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
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await a.t.mutation(api.preferences.quoteBackground.set, {
			background: "golden-meadow",
		});
		expect(await background(a)).toBe("golden-meadow");
		expect(await background(b)).toBe("poster");
	});

	it("rejects a background outside the set", async () => {
		const user = await asNewUser();
		await expect(
			user.t.mutation(api.preferences.quoteBackground.set, {
				background: "aurora" as never,
			})
		).rejects.toThrow();
		expect(await background(user)).toBe("poster");
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

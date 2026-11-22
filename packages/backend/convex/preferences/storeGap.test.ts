// @vitest-environment edge-runtime
/**
 * The redesign's preference fields (B7) against the store-gap rule: shipped
 * builds keep calling `preferences.get`, `preferences.update`,
 * `getQuotePreferences`/`updateQuotePreferences` and `users.getFullContext`
 * for weeks, against rows written before these fields existed.
 *
 * Failure modes:
 *  1. A row with none of the new fields stops reading or updating.
 *  2. The new fields, once set, fail a shipped query's `returns` validator.
 *  3. A shipped write erases them (an update that rebuilds the row).
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { seedQuoteBackgrounds } from "../test/quoteBackgrounds.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const NEW_FIELDS = [
	"exploreHiddenContinue",
	"exploreUsesSessions",
	"hiddenProfileCards",
	"quoteBackground",
] as const satisfies readonly (keyof Doc<"preferences">)[];

const row = (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!prefs) {
			throw new Error("no preferences row");
		}
		return prefs;
	});

/** Every redesign field set, through the new mutations. */
async function setAll(user: SeededUser) {
	await seedQuoteBackgrounds(user.root);
	await user.t.mutation(api.preferences.profileCards.setHidden, {
		card: "rank",
		hidden: true,
	});
	await user.t.mutation(api.preferences.quoteBackground.set, {
		background: "rain-window",
	});
	await user.t.mutation(api.preferences.explore.setUsesSessions, {
		usesSessions: false,
	});
	const entryId = await user.root.run((ctx) =>
		ctx.db.insert("library_entries", {
			active: true,
			dek: "D",
			kind: "advice",
			lastReviewedAt: 1,
			primarySubject: "sleep",
			readMin: 6,
			reuse: "adapted",
			searchText: "night",
			slug: "loud-at-night",
			title: "Why your mind gets loud at night",
		} as Doc<"library_entries">)
	);
	await user.t.mutation(api.preferences.explore.hideContinueItem, {
		item: { id: entryId, kind: "entry" },
	});
	return entryId;
}

describe("redesign preferences and shipped builds", () => {
	it("an old-shape row reads and updates through every shipped path", async () => {
		const user = await asNewUser();
		const before = await row(user);
		for (const field of NEW_FIELDS) {
			expect(before).not.toHaveProperty(field);
		}

		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs._id).toBe(before._id);
		await user.t.mutation(api.preferences.update, {
			colorTheme: "lavender",
			theme: "dark",
		});
		await user.t.mutation(api.preferences.updateQuotePreferences, {
			notificationEnabled: false,
			themes: ["rest"],
		});
		const context = await user.t.query(api.users.getFullContext, {});
		expect(context.preferences?.theme).toBe("dark");
		expect(context.preferences?.colorTheme).toBe("lavender");

		const after = await row(user);
		for (const field of NEW_FIELDS) {
			expect(after).not.toHaveProperty(field);
		}
	});

	it("an old-shape row takes the new writes", async () => {
		const user = await asNewUser();
		const entryId = await setAll(user);
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs).toMatchObject({
			exploreHiddenContinue: [{ item: { id: entryId, kind: "entry" } }],
			exploreUsesSessions: false,
			hiddenProfileCards: ["rank"],
			quoteBackground: "rain-window",
		});
	});

	it("shipped reads return the new fields and shipped writes keep them", async () => {
		const user = await asNewUser();
		await setAll(user);
		const set = await row(user);

		await user.t.mutation(api.preferences.update, {
			contributeByDefault: true,
			motionPreference: "reduced",
			notifications: {
				enabled: true,
				gentleReturn: true,
				milestone: true,
				patternNudge: false,
			},
		});
		await user.t.mutation(api.preferences.updateQuotePreferences, {
			notificationEnabled: true,
			notificationTime: "evening",
			themes: ["courage"],
		});

		const after = await row(user);
		for (const field of NEW_FIELDS) {
			expect(after[field]).toEqual(set[field]);
		}
		const prefs = await user.t.query(api.preferences.get, {});
		const context = await user.t.query(api.users.getFullContext, {});
		for (const field of NEW_FIELDS) {
			expect(prefs[field]).toEqual(set[field]);
			expect(context.preferences?.[field]).toEqual(set[field]);
		}
	});
});

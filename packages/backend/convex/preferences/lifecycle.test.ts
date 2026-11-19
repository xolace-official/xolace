// @vitest-environment edge-runtime
/**
 * The redesign's preferences (B7) at either end of an account's life.
 *
 * Failure modes:
 *  1. Before onboarding writes the preferences row, a read throws instead of
 *     answering with the defaults, or a write quietly creates a partial row.
 *  2. A data wipe keeps the Continue cards someone removed from Explore,
 *     each of which names something they listened to or read, while it
 *     deletes the rest of that history (`library_reads`).
 *  3. A data wipe resets choices that aren't history: hidden profile cards,
 *     the quote background, or "Don't use my sessions here" (a consent).
 *  4. Account deletion leaves any of them behind.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, ragMock } from "../test/mocks.helpers";
import { seedQuoteBackgrounds } from "../test/quoteBackgrounds.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock());
// Account deletion's push-device step calls a component convex-test doesn't
// register; the deletion of the preferences row is what's under test.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

const row = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique()
	);

async function withoutPreferencesRow() {
	const user = await asNewUser();
	await user.root.run(async (ctx) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (prefs) {
			await ctx.db.delete("preferences", prefs._id);
		}
	});
	return user;
}

/** Every redesign field set, through the new mutations. */
async function setAll(user: SeededUser) {
	await seedQuoteBackgrounds(user.root);
	await user.t.mutation(api.preferences.profileCards.setHidden, {
		card: "week",
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
}

describe("before the preferences row exists", () => {
	it("the reads answer with the defaults", async () => {
		const user = await withoutPreferencesRow();
		expect(
			await user.t.query(api.preferences.profileCards.getHidden, {})
		).toEqual([]);
		expect(await user.t.query(api.preferences.quoteBackground.get, {})).toBe(
			"poster"
		);
		expect(await user.t.query(api.preferences.explore.get, {})).toEqual({
			hiddenContinue: [],
			usesSessions: true,
		});
	});

	it("the writes refuse and create nothing", async () => {
		const user = await withoutPreferencesRow();
		const writes = [
			() =>
				user.t.mutation(api.preferences.profileCards.setHidden, {
					card: "rank",
					hidden: true,
				}),
			() =>
				user.t.mutation(api.preferences.quoteBackground.set, {
					background: "night",
				}),
			() =>
				user.t.mutation(api.preferences.explore.setUsesSessions, {
					usesSessions: false,
				}),
		];
		for (const write of writes) {
			await expect(write()).rejects.toThrow("Preferences not found");
		}
		expect(await row(user)).toBeNull();
	});
});

describe("erasure", () => {
	it("a data wipe forgets the removed Continue cards and keeps the choices", async () => {
		const user = await asNewUser();
		await setAll(user);
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});

		const prefs = await row(user);
		expect(prefs).not.toBeNull();
		expect(prefs?.exploreHiddenContinue).toBeUndefined();
		expect(prefs?.hiddenProfileCards).toEqual(["week"]);
		expect(prefs?.quoteBackground).toBe("rain-window");
		expect(prefs?.exploreUsesSessions).toBe(false);
	});

	it("account deletion removes them with the row", async () => {
		const user = await asNewUser();
		await setAll(user);
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "purging" })
		);
		await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
			userId: user.userId,
		});
		expect(await row(user)).toBeNull();
	});
});

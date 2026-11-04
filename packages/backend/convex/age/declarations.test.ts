// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, asUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
// Account deletion's push teardown: the component isn't registered in tests.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

// 2026-11-04 12:00 UTC.
const NOW = Date.UTC(2026, 10, 4, 12);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const declare = (user: SeededUser, dateOfBirth: string) =>
	user.t.mutation(api.age.declarations.declare, {
		appVersion: "1.15.0",
		dateOfBirth,
		platform: "ios",
		promptVersion: "xolacer_chat.v1",
		surface: "xolacer_chat",
	});

const rows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("age_declarations")
			.withIndex("by_user_declared", (q) => q.eq("userId", user.userId))
			.collect()
	);

const setTimezone = (user: SeededUser, timezone: string) =>
	user.root.run(async (ctx) => {
		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!preferences) {
			throw new Error("getOrCreate made no preferences row");
		}
		await ctx.db.patch("preferences", preferences._id, {
			notifications: { ...preferences.notifications, timezone },
		});
	});

const status = async (user: SeededUser) =>
	(await user.t.query(api.age.declarations.status, {})).status;

describe("age.declarations", () => {
	it("is unknown until the user declares, then follows the date of birth", async () => {
		const adult = await asNewUser(1);
		const teen = await asNewUser(2, adult.root);
		expect(await status(adult)).toBe("unknown");

		await declare(adult, "1990-05-01");
		await declare(teen, "2010-05-01");

		expect(await status(adult)).toBe("adult");
		expect(await status(teen)).toBe("13_17");
	});

	it("records what was asked, where and when, and returns the status", async () => {
		const user = await asNewUser();

		expect(await declare(user, "1990-05-01")).toEqual({ status: "adult" });

		expect(await rows(user)).toMatchObject([
			{
				appVersion: "1.15.0",
				dateOfBirth: "1990-05-01",
				declaredAt: NOW,
				platform: "ios",
				promptVersion: "xolacer_chat.v1",
				source: "self",
				surface: "xolacer_chat",
			},
		]);
	});

	it("lets the first date stand: a repeat writes nothing, a different date is refused", async () => {
		const user = await asNewUser();
		await declare(user, "2010-05-01");

		expect(await declare(user, "2010-05-01")).toEqual({ status: "13_17" });
		await expectCode(() => declare(user, "1990-05-01"), "age_already_declared");

		expect(await rows(user)).toHaveLength(1);
		expect(await status(user)).toBe("13_17");
	});

	it("refuses a date that isn't a real date of birth", async () => {
		const user = await asNewUser();

		await expectCode(
			() => declare(user, "2027-01-01"),
			"invalid_date_of_birth"
		);
		await expectCode(
			() => declare(user, "1990-02-30"),
			"invalid_date_of_birth"
		);
		expect(await rows(user)).toEqual([]);
	});

	it("counts age on the user's own day, not UTC's", async () => {
		// Their 18th birthday is 5 November. At 12:00 UTC on the 4th it is
		// already the 5th in Kiritimati (UTC+14), still the 4th in UTC.
		const there = await asNewUser(1);
		const here = await asNewUser(2, there.root);
		await setTimezone(there, "Pacific/Kiritimati");
		await declare(there, "2008-11-05");
		await declare(here, "2008-11-05");

		expect(await status(there)).toBe("adult");
		expect(await status(here)).toBe("13_17");
	});

	it("survives a data wipe and goes with account deletion", async () => {
		const user = await asNewUser();
		await declare(user, "1990-05-01");

		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});
		expect(await status(user)).toBe("adult");

		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "purging" })
		);
		await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
			userId: user.userId,
		});
		expect(await rows(user)).toEqual([]);
	});

	it("needs a signed-in user", async () => {
		await expectCode(
			() => asUser(9).query(api.age.declarations.status, {}),
			"user_not_found"
		);
	});
});

describe("devTools.clearAgeDeclarations", () => {
	afterEach(() => {
		process.env.DEV_TOOLS_ENABLED = undefined;
	});

	it("clears the caller's declarations so the gate asks again, and no one else's", async () => {
		process.env.DEV_TOOLS_ENABLED = "true";
		const user = await asNewUser(1);
		const other = await asNewUser(2, user.root);
		await declare(user, "1990-05-01");
		await declare(other, "1990-05-01");

		await user.t.mutation(api.devTools.clearAgeDeclarations, {});

		expect(await status(user)).toBe("unknown");
		expect(await status(other)).toBe("adult");
		// Cleared, a different date is a first declaration again.
		expect(await declare(user, "2010-05-01")).toEqual({ status: "13_17" });
	});

	it("does nothing without DEV_TOOLS_ENABLED", async () => {
		const user = await asNewUser();
		await declare(user, "1990-05-01");

		await expect(
			user.t.mutation(api.devTools.clearAgeDeclarations, {})
		).rejects.toThrow("Dev tools are disabled");
		expect(await status(user)).toBe("adult");
	});
});

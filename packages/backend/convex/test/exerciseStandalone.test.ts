// @vitest-environment edge-runtime
/**
 * `exercises.getStandalone` and `completeStandalone`: the exercise Sit with this plays when
 * Today opens it outside a session (Three breaths, `reset`), and the streak credit for
 * finishing it. Active only, by its stable title, signed in.
 */

import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, posthogMock, revenuecatMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

async function seedReset(user: SeededUser, active: boolean) {
	const now = Date.now();
	await user.root.run((ctx) =>
		ctx.db.insert("exercises", {
			active,
			createdAt: now,
			estimatedMinutes: 2,
			intensityRange: { max: 10, min: 0 },
			steps: [{ content: "Breathe in.", order: 1, type: "breath" }],
			targetEmotions: [],
			title: "reset",
			type: "breathing",
			updatedAt: now,
		})
	);
}

describe("exercises.getStandalone", () => {
	it("returns Three breaths when it's active, for a free user too", async () => {
		const user = await asNewUser();
		await seedReset(user, true);
		const exercise = await user.t.query(api.exercises.getStandalone, {
			title: "reset",
		});
		expect(exercise).toMatchObject({ active: true, title: "reset" });
		expect(exercise?.steps).toHaveLength(1);
	});

	it("is null when the exercise is inactive", async () => {
		const user = await asNewUser();
		await seedReset(user, false);
		expect(
			await user.t.query(api.exercises.getStandalone, { title: "reset" })
		).toBeNull();
	});

	it("is null when the exercise is missing", async () => {
		const user = await asNewUser();
		expect(
			await user.t.query(api.exercises.getStandalone, { title: "reset" })
		).toBeNull();
	});

	it("needs a signed-in user", async () => {
		const user = await asNewUser();
		await seedReset(user, true);
		await expect(
			user.root.query(api.exercises.getStandalone, { title: "reset" })
		).rejects.toThrow();
	});
});

async function credit(user: SeededUser) {
	const profile = await user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	);
	const activity = await user.root.run((ctx) =>
		ctx.db
			.query("activity_log")
			.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);
	const achievements = await user.root.run((ctx) =>
		ctx.db.query("user_achievements").collect()
	);
	return {
		daysShowedUp: profile?.daysShowedUp ?? 0,
		sat: achievements.filter(
			(a) =>
				a.emotionalProfileId === user.profileId &&
				a.achievementId === "sat-with-it"
		).length,
		sitDays: activity.filter((a) => a.actionType === "sit_with_this").length,
	};
}

describe("exercises.completeStandalone", () => {
	it("counts the day and awards sat-with-it on a first completion", async () => {
		const user = await asNewUser();
		await seedReset(user, true);
		const before = await credit(user);
		await user.t.mutation(api.exercises.completeStandalone, { title: "reset" });
		const after = await credit(user);
		expect(after.sitDays).toBe(1);
		expect(after.daysShowedUp).toBe(before.daysShowedUp + 1);
		expect(after.sat).toBe(1);
	});

	it("changes nothing on a second completion the same day", async () => {
		const user = await asNewUser();
		await seedReset(user, true);
		await user.t.mutation(api.exercises.completeStandalone, { title: "reset" });
		const once = await credit(user);
		await user.t.mutation(api.exercises.completeStandalone, { title: "reset" });
		expect(await credit(user)).toEqual(once);
	});

	it("records nothing for an inactive exercise", async () => {
		const user = await asNewUser();
		await seedReset(user, false);
		const before = await credit(user);
		expect(
			await user.t.mutation(api.exercises.completeStandalone, {
				title: "reset",
			})
		).toBeNull();
		expect(await credit(user)).toEqual(before);
	});

	it("rejects a signed-out call", async () => {
		const user = await asNewUser();
		await seedReset(user, true);
		await expect(
			user.root.mutation(api.exercises.completeStandalone, { title: "reset" })
		).rejects.toThrow();
	});
});

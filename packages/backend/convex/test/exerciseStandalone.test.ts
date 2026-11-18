// @vitest-environment edge-runtime
/**
 * `exercises.getStandalone`: the exercise Sit with this plays when Today opens it outside a
 * session (Three breaths, `reset`). Active only, by its stable title, signed in.
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

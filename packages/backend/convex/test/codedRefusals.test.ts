// @vitest-environment edge-runtime
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { expectCode, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
	aggregatesMock,
	posthogMock,
	rateLimiterMock,
	revenuecatMock,
} from "./mocks.helpers";

const stub = vi.hoisted(() => ({ limit: { ok: true } as { ok: boolean } }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(() => stub.limit),
}));

beforeEach(() => {
	stub.limit = { ok: true };
});

const CONTEXT = {
	appVersion: "1",
	platform: "ios",
	route: "/feedback",
	themeName: "quiet",
};

describe("productFeedback.submit when rate limited", () => {
	it("refuses with rate_limited and the kind, keeping the old message", async () => {
		const user = await asNewUser();
		stub.limit = { ok: false };

		await expect(
			user.t.mutation(api.productFeedback.submit, {
				context: CONTEXT,
				kind: "concern",
				text: "Something happened",
			})
		).rejects.toMatchObject({
			data: {
				code: "rate_limited",
				kind: "concern",
				message: expect.stringContaining("support@xolaceinc.com"),
			},
		});
	});
});

describe("feedback.submit when rate limited", () => {
	it("refuses general feedback with rate_limited", async () => {
		const user = await asNewUser();
		stub.limit = { ok: false };

		await expectCode(
			() =>
				user.t.mutation(api.feedback.submit, {
					text: "Love it",
					type: "general",
				}),
			"rate_limited"
		);
	});
});

async function seedExercise(
	user: SeededUser,
	title: "reset" | "make_room"
): Promise<Id<"exercises">> {
	const now = Date.now();
	return await user.root.run((ctx) =>
		ctx.db.insert("exercises", {
			active: true,
			createdAt: now,
			estimatedMinutes: 2,
			intensityRange: { max: 10, min: 0 },
			steps: [{ content: "Breathe in.", order: 1, type: "breath" }],
			targetEmotions: [],
			title,
			type: "breathing",
			updatedAt: now,
		})
	);
}

describe("exercises.recordSwap", () => {
	it("refuses a third swap with swap_limit_reached", async () => {
		const user = await asNewUser();
		const exerciseId = await seedExercise(user, "reset");
		const sessionId = await seedSession(user.root, user.profileId, {
			state: "path_in_progress",
			swappedExerciseIds: [exerciseId, exerciseId],
		});

		await expectCode(
			() =>
				user.t.mutation(api.exercises.recordSwap, {
					newExerciseId: exerciseId,
					sessionId,
				}),
			"swap_limit_reached"
		);
	});

	it("refuses an exercise the session wasn't offered with swap_not_allowed", async () => {
		const user = await asNewUser();
		const exerciseId = await seedExercise(user, "make_room");
		const sessionId = await seedSession(user.root, user.profileId, {
			state: "path_in_progress",
		});

		await expectCode(
			() =>
				user.t.mutation(api.exercises.recordSwap, {
					newExerciseId: exerciseId,
					sessionId,
				}),
			"swap_not_allowed"
		);
	});
});

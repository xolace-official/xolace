// @vitest-environment edge-runtime
/**
 * The loader seam of the steadiness engine (#515): rows in the database →
 * readings → the dev query. Failure modes (see steadiness.test.ts for the
 * formula's): metadata whose session
 * was purged crashing the read, burned or crisis sessions dropped, a follow-up
 * answer joined to the wrong session or dated wrong, the person's timezone
 * ignored, and the query answering on a deployment without dev tools.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { seedMetadata, seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);

beforeEach(() => vi.stubEnv("DEV_TOOLS_ENABLED", "true"));
afterEach(() => vi.unstubAllEnvs());

async function seed(
	user: SeededUser,
	daysAgo: number,
	intensity: number,
	extra: object = {}
) {
	const at = NOW - daysAgo * DAY;
	const sessionId = await seedSession(user.root, user.profileId, {
		confirmationState: "confirmed",
		createdAt: at,
		state: "completed",
		...extra,
	});
	await seedMetadata(user.root, sessionId, user.profileId, {
		createdAt: at,
		intensity,
		primaryEmotion: "anxiety",
		thematicTags: ["work", "loss"],
	});
	return sessionId;
}

const read = (user: SeededUser) =>
	user.root.query(internal.compounding.dev.steadiness, {
		now: NOW,
		profileId: user.profileId,
	});

describe("compounding/dev.steadiness", () => {
	it("reads sessions, burned and crisis ones included, into an unlocked domain", async () => {
		const user = await asNewUser();
		await seed(user, 0, 1);
		await seed(user, 1, 10, { kept: false });
		await seed(user, 2, 10, {
			escalationTriggered: true,
			safeguardLevel: "crisis",
		});

		const out = await read(user);
		expect(out.domains).toHaveLength(1);
		expect(out.domains[0]).toMatchObject({
			domain: "work",
			sessionDays: 3,
			state: "unlocked",
		});
		expect(out.domains[0].readings).toHaveLength(3);
		expect(out.overall).toBeNull();
	});

	it("skips metadata whose session was purged", async () => {
		const user = await asNewUser();
		const gone = await seed(user, 0, 5);
		await user.root.run((ctx) => ctx.db.delete("sessions", gone));
		expect((await read(user)).domains).toEqual([]);
	});

	it("adds an answered follow-up on the day it was answered", async () => {
		const user = await asNewUser();
		const sessionId = await seed(user, 5, 7);
		await user.root.run((ctx) =>
			ctx.db.insert("follow_up_cards", {
				cardText: "How's it sitting now?",
				createdAt: NOW - 5 * DAY,
				emotionalProfileId: user.profileId,
				escalationDerived: false,
				resolvedAt: NOW - 2 * DAY,
				sessionId,
				status: "resolved",
				tier: "standard",
				userResponse: "processed",
				workflowId: "wf1" as WorkflowId,
			})
		);
		const [work] = (await read(user)).domains;
		const followUp = work.readings.find((r) => r.source === "follow_up");
		expect(followUp?.at).toBe(NOW - 2 * DAY);
		expect(followUp?.value).toBeCloseTo(100 - (6 * 100) / 9 + 30, 6);
		expect(work.sessionDays).toBe(1);
	});

	it("cuts days in the timezone from preferences", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			await ctx.db.patch("preferences", prefs!._id, {
				notifications: {
					...prefs!.notifications,
					timezone: "America/New_York",
				},
			});
		});
		// 23:30 and 00:30 UTC are the same New York evening.
		const lateUtc = (NOW - Date.UTC(2026, 9, 7, 23, 30)) / DAY;
		await seed(user, lateUtc, 5);
		await seed(user, lateUtc - 1 / 24, 5);
		const out = await read(user);
		expect(out.timezone).toBe("America/New_York");
		expect(out.domains[0].sessionDays).toBe(1);
	});

	it("refuses without dev tools", async () => {
		vi.stubEnv("DEV_TOOLS_ENABLED", "false");
		const user = await asNewUser();
		await expect(read(user)).rejects.toThrow(/Dev tools are disabled/);
	});
});

describe("compounding/devSeedCompounding.seedCompounding", () => {
	it("leaves Work compounding with the kindling hand-off for a Xolace+ reader", async () => {
		vi.stubEnv("PREMIUM_DEV_OVERRIDE", "true");
		const user = await asNewUser();
		await user.root.mutation(
			internal.compounding.devSeedCompounding.seedCompounding,
			{ profileId: user.profileId }
		);
		const out = await user.t.query(api.compounding.insights.plusView, {
			now: Date.now(),
		});
		expect(out!.domains[0]).toMatchObject({
			compounding: "compounding",
			domain: "work",
			kindling: true,
		});
	});
});

describe("compounding/devSeedCompounding.unseedCompounding", () => {
	it("removes every seeded row and restores the replaced kindling", async () => {
		const user = await asNewUser();
		const sessionId = await seed(user, 1, 4);
		const pathId = await user.root.run((ctx) =>
			ctx.db.insert("paths", {
				emotionalProfileId: user.profileId,
				generatedAt: NOW,
				model: "m",
				modelVersion: "m",
				sessionId,
				status: "active",
			})
		);
		await user.root.mutation(
			internal.compounding.devSeedCompounding.seedCompounding,
			{ profileId: user.profileId }
		);
		expect(
			await user.root.mutation(
				internal.compounding.devSeedCompounding.unseedCompounding,
				{ profileId: user.profileId, restorePathId: pathId }
			)
		).toBe(58);
		const left = await user.root.run(async (ctx) => ({
			paths: (await ctx.db.query("paths").collect()).map((p) => [
				p._id,
				p.status,
			]),
			sessions: (await ctx.db.query("sessions").collect()).length,
			steps: (await ctx.db.query("path_steps").collect()).length,
			stretches: (await ctx.db.query("compounding_stretches").collect()).length,
		}));
		expect(left).toEqual({
			paths: [[pathId, "active"]],
			sessions: 1,
			steps: 0,
			stretches: 0,
		});
	});
});

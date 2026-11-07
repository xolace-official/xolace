// @vitest-environment edge-runtime
/**
 * #695: the Exploring and Understanding badges, each earned at its write site.
 * What can go wrong: a write site forgets the award, awards on the wrong
 * action (any session for First talk, a re-read for the Read ladder), a
 * ladder skips a rung when a count jumps, or an undo (unsaving a quote, an
 * area going cold) takes a badge back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	runEvaluations,
	seedMetadata,
	seedSession,
} from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import {
	aggregatesMock,
	anthropicMock,
	noopJob,
	posthogMock,
	ragMock,
	revenuecatMock,
} from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(true));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({
	onSessionComplete: noopJob(),
}));
vi.mock("../ai/paths/generate", () => ({ run: noopJob() }));
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	...anthropicMock("A check-in."),
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));
vi.mock("../followUps", async (orig) => ({
	...(await orig<typeof import("../followUps")>()),
	startFollowUpWorkflow: noopJob(),
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Every achievement the user holds except Joined, oldest first. */
const earned = async (user: SeededUser) =>
	(
		await user.root.run((ctx) =>
			ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		)
	)
		.map((r) => r.achievementId)
		.filter((id) => id !== "joined");
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

// ── Library ──────────────────────────────────────────────────────

async function seedEntries(user: SeededUser, count: number) {
	return await user.root.run(async (ctx) => {
		const ids: Id<"library_entries">[] = [];
		for (let i = 0; i < count; i++) {
			ids.push(
				await ctx.db.insert("library_entries", {
					active: true,
					dek: "d",
					kind: "advice",
					lastReviewedAt: 1,
					primarySubject: "anxiety",
					readMin: 4,
					reuse: "original",
					slug: `piece-${i}`,
					title: "t",
				})
			);
		}
		return ids;
	});
}
const finish = (user: SeededUser, entryId: Id<"library_entries">) =>
	user.t.mutation(api.library.reads.record, { entryId, finished: true });

describe("Read ladder", () => {
	it("the first finished piece earns First read, and the fifth Read 5", async () => {
		const user = await asNewUser();
		const pieces = await seedEntries(user, 5);
		await finish(user, pieces[0]);
		expect(await earned(user)).toEqual(["first-read"]);

		for (const entryId of pieces.slice(1, 4)) {
			await finish(user, entryId);
		}
		expect(await earned(user)).toEqual(["first-read"]);

		await finish(user, pieces[4]);
		expect(await earned(user)).toEqual(["first-read", "read-5"]);
		// Joined 10 + First read 10 + Read 5 25.
		expect((await profile(user)).sparksEarned).toBe(45);
	});

	it("re-reading a piece already read doesn't advance the ladder", async () => {
		const user = await asNewUser();
		const pieces = await seedEntries(user, 4);
		for (const entryId of pieces) {
			await finish(user, entryId);
		}
		await user.t.mutation(api.library.reads.record, {
			entryId: pieces[0],
			opened: true,
		});
		await finish(user, pieces[0]);
		await finish(user, pieces[0]);

		expect(await earned(user)).toEqual(["first-read"]);
	});
});

// ── Quotes ───────────────────────────────────────────────────────

const seedQuote = (user: SeededUser, date: string) =>
	user.root.run((ctx) =>
		ctx.db.insert("daily_quotes", {
			createdAt: Date.now(),
			date,
			emotionalProfileId: user.profileId,
			isPremium: false,
			text: "q",
			type: "curated" as const,
		})
	);

describe("First quote saved", () => {
	it("is earned by the first save, once, and unsaving keeps it", async () => {
		const user = await asNewUser();
		const first = await seedQuote(user, "2026-01-01");
		const second = await seedQuote(user, "2026-01-02");

		await user.t.mutation(api.dailyQuotes.save, { quoteId: first });
		expect(await earned(user)).toEqual(["first-quote"]);

		await user.t.mutation(api.dailyQuotes.unsave, { quoteId: first });
		await user.t.mutation(api.dailyQuotes.save, { quoteId: first });
		await user.t.mutation(api.dailyQuotes.save, { quoteId: second });
		expect(await earned(user)).toEqual(["first-quote"]);
		expect((await profile(user)).sparksEarned).toBe(20);
	});
});

// ── Kindling ─────────────────────────────────────────────────────

async function seedTwigs(user: SeededUser, kinds: string[]) {
	return await user.root.run(async (ctx) => {
		const sessionId = await ctx.db.insert("sessions", {
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			entryType: "open_prompt",
			kept: true,
			state: "completed",
			updatedAt: Date.now(),
		});
		const pathId = await ctx.db.insert("paths", {
			emotionalProfileId: user.profileId,
			generatedAt: Date.now(),
			model: "m",
			modelVersion: "v",
			sessionId,
			status: "active",
		});
		return Promise.all(
			kinds.map((actionType, i) =>
				ctx.db.insert("path_steps", {
					actionType,
					order: i + 1,
					params: {},
					pathId,
					state: "pending",
					why: "w",
				})
			)
		);
	});
}

describe("Kindling", () => {
	it("a tended breathing twig earns Sat with it; other twigs don't", async () => {
		const user = await asNewUser();
		const [bridge, breathing] = await seedTwigs(user, [
			"bridge",
			"breathing",
			"read",
		]);
		await user.t.mutation(api.paths.completeStep, { stepId: bridge });
		expect(await earned(user)).toEqual([]);

		await user.t.mutation(api.paths.completeStep, { stepId: breathing });
		expect(await earned(user)).toEqual(["sat-with-it"]);
	});

	it("the path completing earns First kindling finished, once", async () => {
		const user = await asNewUser();
		const [read, bridge] = await seedTwigs(user, ["read", "bridge"]);
		await user.t.mutation(api.paths.completeStep, { stepId: read });
		expect(await earned(user)).toEqual([]);

		await user.t.mutation(api.paths.skipStep, { stepId: bridge });
		expect(await earned(user)).toEqual(["first-kindling"]);

		const [again] = await seedTwigs(user, ["bridge"]);
		await user.t.mutation(api.paths.completeStep, { stepId: again });
		expect(await earned(user)).toEqual(["first-kindling"]);
		expect((await profile(user)).sparksEarned).toBe(20);
	});
});

// ── Sessions ─────────────────────────────────────────────────────

const sorted = async (user: SeededUser) => (await earned(user)).sort();

describe("First talk", () => {
	it("is earned by a completed talk, not by any other session", async () => {
		const user = await asNewUser();
		const reflect = await seedSession(user.root, user.profileId, {
			state: "confirmed",
		});
		await user.t.mutation(api.sessions.completeSession, {
			sessionId: reflect,
		});
		expect(await sorted(user)).toEqual(["first-session"]);

		const talk = await seedSession(user.root, user.profileId, {
			entryType: "talk",
			state: "confirmed",
		});
		await user.t.mutation(api.sessions.completeSession, { sessionId: talk });
		expect(await sorted(user)).toEqual(["first-session", "first-talk"]);
	});
});

describe("Sit with this path", () => {
	const seedExercise = (user: SeededUser) =>
		user.root.run((ctx) =>
			ctx.db.insert("exercises", {
				active: true,
				createdAt: Date.now(),
				estimatedMinutes: 2,
				intensityRange: { max: 10, min: 0 },
				steps: [],
				targetEmotions: [],
				title: "Ground",
				type: "grounding",
				updatedAt: Date.now(),
			})
		);
	const soloSession = async (user: SeededUser, pathCompleted: boolean) => {
		const sessionId = await seedSession(user.root, user.profileId, {
			exerciseId: await seedExercise(user),
			pathChosen: "solo",
			state: "path_in_progress",
		});
		await user.t.mutation(api.sessions.completePath, {
			pathCompleted,
			sessionId,
		});
	};

	it("a completed exercise earns Sat with it and First exercise", async () => {
		const user = await asNewUser();
		await soloSession(user, true);
		expect(await sorted(user)).toEqual([
			"first-exercise",
			"first-session",
			"sat-with-it",
		]);
	});

	it("leaving the exercise early earns neither", async () => {
		const user = await asNewUser();
		await soloSession(user, false);
		expect(await sorted(user)).toEqual(["first-session"]);
	});
});

describe("Shared a reflection", () => {
	it("is earned by the first contribution to the peer pool, once", async () => {
		const user = await asNewUser();
		const contribute = async (contributedReflection: boolean) => {
			const sessionId = await seedSession(user.root, user.profileId, {
				state: "completed",
			});
			await user.t.mutation(api.sessions.recordPostSessionFeedback, {
				contributedReflection,
				sessionId,
			});
		};
		await contribute(false);
		expect(await earned(user)).toEqual([]);

		await contribute(true);
		await contribute(true);
		expect(await earned(user)).toEqual(["shared-reflection"]);
		expect((await profile(user)).sparksEarned).toBe(20);
	});
});

// ── Understanding ────────────────────────────────────────────────

const DAY = 86_400_000;

/** A reading on `tags`, `daysAgo` days back; tonight's (0) completes for real. */
async function reading(user: SeededUser, daysAgo: number, tags: string[]) {
	const tonight = daysAgo === 0;
	const sessionId = await seedSession(user.root, user.profileId, {
		confirmationState: "confirmed",
		createdAt: Date.now() - daysAgo * DAY,
		state: tonight ? "confirmed" : "completed",
	});
	await seedMetadata(user.root, sessionId, user.profileId, {
		intensity: 5,
		thematicTags: tags,
	});
	if (tonight) {
		await user.t.mutation(api.sessions.completeSession, { sessionId });
		await runEvaluations(user.root);
	}
}
/** A third distinct day on `tags` unlocks each one's area. */
async function unlock(user: SeededUser, tags: string[]) {
	await reading(user, 2, tags);
	await reading(user, 1, tags);
	await reading(user, 0, tags);
}
const understanding = async (user: SeededUser) =>
	(await earned(user)).filter((id) => id.startsWith("understanding-"));

describe("Understanding ladder", () => {
	it("the first area unlocked earns First area unlocked", async () => {
		const user = await asNewUser();
		await unlock(user, ["work"]);
		expect((await profile(user)).unlockedDomains).toHaveLength(1);
		expect(await understanding(user)).toEqual(["understanding-1"]);
	});

	it("three areas unlocking at once earn both rungs they cross", async () => {
		const user = await asNewUser();
		await unlock(user, ["work", "family", "health"]);
		expect((await profile(user)).unlockedDomains).toHaveLength(3);
		expect(await understanding(user)).toEqual([
			"understanding-1",
			"understanding-3",
		]);
	});

	it("an area going cold doesn't take the badge back", async () => {
		const user = await asNewUser();
		await unlock(user, ["work"]);
		await user.root.run(async (ctx) => {
			const readings = await ctx.db
				.query("emotional_metadata")
				.withIndex("by_profile_createdAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect();
			for (const r of readings) {
				await ctx.db.delete("emotional_metadata", r._id);
			}
		});
		await user.root.mutation(internal.compounding.unlocks.dropColdUnlocks, {
			profileId: user.profileId,
		});

		expect((await profile(user)).unlockedDomains).toEqual([]);
		expect(await understanding(user)).toEqual(["understanding-1"]);
	});
});

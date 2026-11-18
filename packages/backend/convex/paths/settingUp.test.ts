// @vitest-environment edge-runtime
/**
 * "Setting up" for Today's kindling card (B13): when a session is marked, that
 * every way its run ends clears exactly that session's mark, and what
 * `paths.settingUp.get` answers at each step.
 *
 * Fake timers: `convex-test` runs scheduled work on real timers, so without
 * them the queued `generate.run` (and its clear) would race each assertion.
 * Each test runs the run or the backstop itself, from the args that were
 * actually scheduled.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import {
	scheduledCalls,
	seedMetadata,
	seedSession,
} from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import {
	aggregatesMock,
	anthropicMock,
	ragMock,
	revenuecatMock,
} from "../test/mocks.helpers";
import { SETTING_UP_MAX_MS } from "./settingUp";

const WHY =
	"You said the mornings are the hardest, so this is one slow minute before the day starts.";
const twig = (actionType: string, order: number) => ({
	actionType,
	order,
	why: WHY,
});
const goodReply = JSON.stringify([
	twig("breathing", 1),
	twig("xolacer", 2),
	twig("bridge", 3),
]);

const stub = vi.hoisted(() => ({
	isPlus: true,
	notifyThrows: false,
	// The real rate-limiter component instead of the stubs below; the test
	// registers it.
	realLimiter: false,
	reply: "" as string | Error,
	slotCheckThrows: false,
	// The day's kindling slot, read (`check`) and spent (`limit`) separately,
	// so a test can open the gate and still lose the slot at write.
	slotOpen: true,
	slotSpendable: true,
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => ({ posthog: { capture: async () => {} } }));
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => {
	const actual = await orig<typeof import("../lib/rateLimits")>();
	type Check = typeof actual.rateLimiter.check;
	type Limit = typeof actual.rateLimiter.limit;
	return {
		...actual,
		rateLimiter: {
			check: async (...args: Parameters<Check>) => {
				if (stub.realLimiter) {
					return await actual.rateLimiter.check(...args);
				}
				if (stub.slotCheckThrows) {
					throw new Error("rate limiter unavailable");
				}
				return { ok: stub.slotOpen };
			},
			limit: async (...args: Parameters<Limit>) =>
				stub.realLimiter
					? await actual.rateLimiter.limit(...args)
					: { ok: stub.slotSpendable },
			reset: async () => {},
		},
	};
});
// The kindling_ready push is outreach's (its own tests); here it only needs
// to be able to fail after the kindling is written.
vi.mock("../ai/paths/notify", async () => {
	const { v } = await import("convex/values");
	return {
		notifyReady: internalMutation({
			args: {
				emotionalProfileId: v.id("emotional_profiles"),
				pathId: v.id("paths"),
			},
			handler: async () => {
				if (stub.notifyThrows) {
					throw new Error("outreach down");
				}
				return null;
			},
			returns: v.null(),
		}),
	};
});
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	...anthropicMock(() => stub.reply),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));

beforeEach(() => {
	vi.useFakeTimers();
	stub.isPlus = true;
	stub.notifyThrows = false;
	stub.realLimiter = false;
	stub.reply = goodReply;
	stub.slotCheckThrows = false;
	stub.slotOpen = true;
	stub.slotSpendable = true;
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

/** A confirmed session with a qualifying (light) Understanding. */
async function seedQualifying(
	user: SeededUser,
	supportNeed: NonNullable<Doc<"emotional_metadata">["supportNeed"]> = "light"
): Promise<Id<"sessions">> {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "confirmed",
	});
	await seedMetadata(user.root, sessionId, user.profileId, {
		suggestedSpecialty: "burnout",
		supportNeed,
	});
	return sessionId;
}

/** End a qualifying session the way the app does. */
async function complete(user: SeededUser, sessionId: Id<"sessions">) {
	await user.t.mutation(api.sessions.completeSession, { sessionId });
}

type RunArgs = {
	emotionalProfileId: Id<"emotional_profiles">;
	sessionId: Id<"sessions">;
	settingUpAt?: number;
};

/** Every `generate.run` queued for this session, oldest first. */
async function queuedRuns(
	user: SeededUser,
	sessionId: Id<"sessions">
): Promise<RunArgs[]> {
	return (await scheduledCalls(user.root))
		.filter(
			(c) =>
				c.name.endsWith("ai/paths/generate:run") &&
				c.args.sessionId === sessionId
		)
		.map((c) => c.args as RunArgs);
}

/** The `generate.run` queued for this session, with the args it carries. */
async function queuedRun(
	user: SeededUser,
	sessionId: Id<"sessions">
): Promise<RunArgs> {
	const [run] = await queuedRuns(user, sessionId);
	if (!run) {
		throw new Error("expected generate.run to be queued");
	}
	return run;
}

/** Run the queued `generate.run` now, as the scheduler would. */
async function runQueued(user: SeededUser, sessionId: Id<"sessions">) {
	await user.root.action(
		internal.ai.paths.generate.run,
		await queuedRun(user, sessionId)
	);
}

/** The backstops queued for a session, with when they fire. */
async function backstops(user: SeededUser, sessionId: Id<"sessions">) {
	const jobs = await user.root.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect()
	);
	return jobs
		.filter(
			(j) =>
				j.name.replace(".js:", ":").endsWith("paths/settingUp:clear") &&
				(j.args[0] as { sessionId: string }).sessionId === sessionId
		)
		.map((j) => ({
			args: j.args[0] as { sessionId: Id<"sessions">; settingUpAt: number },
			scheduledTime: j.scheduledTime,
		}));
}

/** The session's mark, or null without one (`run` returns undefined as null). */
const markOf = (user: SeededUser, sessionId: Id<"sessions">) =>
	user.root.run(
		async (ctx) =>
			(await ctx.db.get("sessions", sessionId))?.kindlingSettingUpAt ?? null
	);

const settingUp = (user: SeededUser) =>
	user.t.query(api.paths.settingUp.get, {});

describe("paths.settingUp.get", () => {
	it("rejects an unauthenticated caller", async () => {
		await expect(
			asUnauthed().query(api.paths.settingUp.get, {})
		).rejects.toThrow(/Not authenticated/);
	});

	it("is null when nothing is being set up", async () => {
		const user = await asNewUser();
		await seedQualifying(user);

		expect(await settingUp(user)).toBeNull();
	});

	it("returns the session from the moment a qualifying session ends", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await complete(user, sessionId);

		const startedAt = await markOf(user, sessionId);
		expect(startedAt).toEqual(expect.any(Number));
		expect(await settingUp(user)).toEqual({ sessionId, startedAt });
		expect(await user.t.query(api.paths.getActive, {})).toBeNull();
		expect((await queuedRun(user, sessionId)).settingUpAt).toBe(startedAt);
	});

	it("flips to null in the same transaction that lands the kindling", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);

		await runQueued(user, sessionId);

		expect(await settingUp(user)).toBeNull();
		expect(await markOf(user, sessionId)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId,
		});
	});

	it("is null for a member with a live kindling, even while a new one is set up", async () => {
		const user = await asNewUser();
		const first = await seedQualifying(user);
		await complete(user, first);
		await runQueued(user, first);
		const second = await seedQualifying(user);
		vi.setSystemTime(Date.now() + 1000);

		await complete(user, second);

		expect(await markOf(user, second)).toEqual(expect.any(Number));
		expect(await settingUp(user)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId: first,
		});
	});

	it("is null for a free member, like getActive", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		stub.isPlus = false;

		expect(await settingUp(user)).toBeNull();
	});

	it("never shows another member's session", async () => {
		const root = asUnauthed();
		const owner = await asNewUser(1, root);
		const other = await asNewUser(2, root);
		const sessionId = await seedQualifying(owner);
		await complete(owner, sessionId);

		expect(await settingUp(owner)).toMatchObject({ sessionId });
		expect(await settingUp(other)).toBeNull();
	});
});

describe("when a session is marked", () => {
	it("marks a session from requestKindling and from the Plus webhook", async () => {
		const user = await asNewUser();
		const asked = await seedQualifying(user);
		await user.t.mutation(api.paths.requestKindling, { sessionId: asked });
		expect(await markOf(user, asked)).toEqual(expect.any(Number));

		const parked = await seedQualifying(user);
		stub.isPlus = false;
		await user.t.mutation(api.paths.requestKindling, { sessionId: parked });
		expect(await markOf(user, parked)).toBeNull();
		stub.isPlus = true;
		await user.root.mutation(internal.premium.onEntitlementActivated, {
			appUserId: user.profileId,
			entitlementId: "xolace-plus",
			isSandbox: true,
			sourceEventType: "INITIAL_PURCHASE",
		});
		expect(await markOf(user, parked)).toEqual(expect.any(Number));
	});

	it("never marks once today's kindling slot is spent, so nothing flashes", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		stub.slotOpen = false;

		await complete(user, sessionId);

		expect(await markOf(user, sessionId)).toBeNull();
		expect(await settingUp(user)).toBeNull();
		// The run is still queued as before; it just carries no mark.
		expect(await queuedRun(user, sessionId)).toEqual({
			emotionalProfileId: user.profileId,
			sessionId,
		});
		expect(await backstops(user, sessionId)).toEqual([]);
	});

	it("never marks a session that doesn't qualify, or a free member's", async () => {
		const user = await asNewUser();
		const quiet = await seedQualifying(user, "none");
		await complete(user, quiet);
		expect(await markOf(user, quiet)).toBeNull();

		stub.isPlus = false;
		const free = await seedQualifying(user);
		await complete(user, free);
		expect(await markOf(user, free)).toBeNull();
	});

	it(`queues a backstop ${SETTING_UP_MAX_MS / 60_000} minutes out`, async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await complete(user, sessionId);

		const settingUpAt = await markOf(user, sessionId);
		expect(await backstops(user, sessionId)).toEqual([
			{
				args: { sessionId, settingUpAt },
				scheduledTime: (settingUpAt ?? 0) + SETTING_UP_MAX_MS,
			},
		]);
	});
});

describe("every way a run ends clears its session", () => {
	/** A marked, completed session whose run hasn't started yet. */
	async function marked() {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		expect(await settingUp(user)).toMatchObject({ sessionId });
		return { sessionId, user };
	}

	async function expectCleared(user: SeededUser, sessionId: Id<"sessions">) {
		expect(await markOf(user, sessionId)).toBeNull();
		expect(await settingUp(user)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toBeNull();
	}

	it("no context: Plus lapsed before the run", async () => {
		const { user, sessionId } = await marked();
		stub.isPlus = false;

		await runQueued(user, sessionId);

		stub.isPlus = true;
		await expectCleared(user, sessionId);
	});

	it("rate-limited at the gate", async () => {
		const { user, sessionId } = await marked();
		stub.slotOpen = false;

		await runQueued(user, sessionId);

		await expectCleared(user, sessionId);
	});

	it("rate-limited at write: another kindling took the slot meanwhile", async () => {
		const { user, sessionId } = await marked();
		stub.slotSpendable = false;

		await runQueued(user, sessionId);

		await expectCleared(user, sessionId);
	});

	it("no-ship: too few twigs survive", async () => {
		const { user, sessionId } = await marked();
		stub.reply = JSON.stringify([twig("breathing", 1)]);

		await runQueued(user, sessionId);

		await expectCleared(user, sessionId);
	});

	it("a caught throw: the provider fails", async () => {
		const { user, sessionId } = await marked();
		stub.reply = new Error("anthropic down");
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});

		await runQueued(user, sessionId);

		expect(logged).toHaveBeenCalledWith(
			"kindling: generation failed",
			expect.objectContaining({ sessionId })
		);
		await expectCleared(user, sessionId);
	});

	it("the backstop, when the run never reports back", async () => {
		const { user, sessionId } = await marked();
		const [backstop] = await backstops(user, sessionId);

		await user.root.mutation(internal.paths.settingUp.clear, backstop.args);

		await expectCleared(user, sessionId);
	});

	it("the backstop is a no-op once the run cleared it, and leaves the kindling", async () => {
		const { user, sessionId } = await marked();
		const [backstop] = await backstops(user, sessionId);
		await runQueued(user, sessionId);

		await user.root.mutation(internal.paths.settingUp.clear, backstop.args);

		expect(await markOf(user, sessionId)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId,
		});
	});
});

describe("clears go to the exact session and mark", () => {
	it("two sessions in flight: each clear ends only its own", async () => {
		const user = await asNewUser();
		const a = await seedQualifying(user);
		await complete(user, a);
		vi.setSystemTime(Date.now() + 1000);
		const b = await seedQualifying(user);
		await complete(user, b);
		const bMark = await markOf(user, b);

		// Newest first.
		expect(await settingUp(user)).toEqual({ sessionId: b, startedAt: bMark });

		// A's run no-ships; A's backstop fires later. B is untouched by both.
		stub.reply = JSON.stringify([twig("breathing", 1)]);
		await runQueued(user, a);
		const [aBackstop] = await backstops(user, a);
		await user.root.mutation(internal.paths.settingUp.clear, aBackstop.args);
		expect(await markOf(user, a)).toBeNull();
		expect(await settingUp(user)).toEqual({ sessionId: b, startedAt: bMark });

		// B's run lands its kindling.
		stub.reply = goodReply;
		await runQueued(user, b);
		expect(await settingUp(user)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId: b,
		});
	});

	it("a late clear from an earlier queueing never wipes a newer mark", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		const [first] = await backstops(user, sessionId);
		vi.setSystemTime(Date.now() + 1000);

		// Queued again for the same session (session end's "get my kindling").
		await user.t.mutation(api.paths.requestKindling, { sessionId });
		const newer = await markOf(user, sessionId);
		expect(newer).toBeGreaterThan(first.args.settingUpAt);

		await user.root.mutation(internal.paths.settingUp.clear, first.args);

		expect(await markOf(user, sessionId)).toBe(newer);
		expect(await settingUp(user)).toEqual({ sessionId, startedAt: newer });
	});

	it("a run queued before B13 (no settingUpAt) clears nothing", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		const mark = await markOf(user, sessionId);
		stub.reply = JSON.stringify([twig("breathing", 1)]);

		await user.root.action(internal.ai.paths.generate.run, {
			emotionalProfileId: user.profileId,
			sessionId,
		});

		// Left to its own run or the backstop.
		expect(await markOf(user, sessionId)).toBe(mark);
	});
});

describe("the mark never gets in the way", () => {
	it("completes the session, unmarked, when the check throws", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		stub.slotCheckThrows = true;
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});

		await complete(user, sessionId);

		const session = await user.root.run((ctx) =>
			ctx.db.get("sessions", sessionId)
		);
		expect(session?.state).toBe("completed");
		expect(await markOf(user, sessionId)).toBeNull();
		expect(await backstops(user, sessionId)).toEqual([]);
		// The run is still queued, exactly as before B13.
		expect(await queuedRun(user, sessionId)).toEqual({
			emotionalProfileId: user.profileId,
			sessionId,
		});
		expect(logged).toHaveBeenCalledWith(
			"kindling: setting-up mark skipped",
			expect.objectContaining({ sessionId })
		);
	});

	it("re-queued: the older run lands, the newer mark stays until its own run ends", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		vi.setSystemTime(Date.now() + 1000);
		await user.t.mutation(api.paths.requestKindling, { sessionId });
		const [older, newer] = await queuedRuns(user, sessionId);
		expect(newer.settingUpAt).toBeGreaterThan(older.settingUpAt ?? 0);

		await user.root.action(internal.ai.paths.generate.run, older);

		// The kindling is live, so Today shows it, never "setting up"; the newer
		// mark is still there, for the run still in flight.
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId,
		});
		expect(await settingUp(user)).toBeNull();
		expect(await markOf(user, sessionId)).toBe(newer.settingUpAt);

		// That run finds the day's slot spent and clears its own mark.
		stub.slotOpen = false;
		await user.root.action(internal.ai.paths.generate.run, newer);
		expect(await markOf(user, sessionId)).toBeNull();
	});

	it("a notifyReady throw after the write leaves the kindling and no mark", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await complete(user, sessionId);
		stub.notifyThrows = true;
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});

		await runQueued(user, sessionId);

		expect(logged).toHaveBeenCalledWith(
			"kindling: generation failed",
			expect.objectContaining({ message: "outreach down", sessionId })
		);
		expect(await markOf(user, sessionId)).toBeNull();
		expect(await settingUp(user)).toBeNull();
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId,
		});
	});
});

describe("with the real rate limiter", () => {
	const rateLimiterModules = import.meta.glob(
		"../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
	);

	it("checks pathsGenerate on this profile's key without spending it, so a second session that day isn't marked", async () => {
		stub.realLimiter = true;
		const user = await asNewUser();
		user.root.registerComponent(
			"rateLimiter",
			rateLimiterSchema,
			rateLimiterModules
		);
		const first = await seedQualifying(user);

		// Marking checked the slot twice (queue + the run's gate); only the
		// write spends it, so the kindling still lands.
		await complete(user, first);
		expect(await markOf(user, first)).toEqual(expect.any(Number));
		await runQueued(user, first);
		expect(await user.t.query(api.paths.getActive, {})).toMatchObject({
			sessionId: first,
		});
		expect(await markOf(user, first)).toBeNull();

		// Same day: the slot is spent, so the second session is never marked.
		const second = await seedQualifying(user);
		await complete(user, second);
		expect(await markOf(user, second)).toBeNull();
		expect((await queuedRun(user, second)).settingUpAt).toBeUndefined();

		// Another member's slot is their own.
		const other = await asNewUser(2, user.root);
		const theirs = await seedQualifying(other);
		await complete(other, theirs);
		expect(await markOf(other, theirs)).toEqual(expect.any(Number));
	});
});

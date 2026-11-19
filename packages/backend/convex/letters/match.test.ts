// @vitest-environment edge-runtime
/**
 * The letters contract, slice 3 (spec: docs/plan/letters.md §5, §6): the
 * recipient pool, placement and its live checks, the three pushes, the
 * background re-check and the hourly sweep. Model calls and pushes are
 * stubbed.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { WordsVerdict } from "../ai/intake/read";
import type { LetterVerdict } from "../ai/letters/check";
import {
	classificationArgs,
	scheduledCalls,
	seedMetadata,
	seedSession,
} from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, rateLimiterMock } from "../test/mocks.helpers";
import { letterAimOf } from "./aims";
import { waitBucketOf } from "./analytics";
import {
	CANDIDATES_TRIED_MAX,
	DAY_MS,
	LETTER_WAIT_DAYS,
	RECHECK_DELAYS_MS,
	SWEEP_BATCH,
} from "./rules";

type Pushed = {
	emotionalProfileId: Id<"emotional_profiles">;
	notification: { title: string; body?: string; data: Record<string, unknown> };
};

type Captured = {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
};

const stub = vi.hoisted(() => ({
	events: [] as Captured[],
	pushes: [] as Pushed[],
	safety: { level: "none", resources: [], unavailable: false } as WordsVerdict,
	verdict: {
		fixable: null,
		hostile: false,
		language: "en",
	} as LetterVerdict | null,
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => ({
	posthog: {
		capture: async (_ctx: unknown, event: Captured) => {
			stub.events.push(event);
		},
	},
}));
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(() => ({ ok: true })),
}));
vi.mock("../ai/letters/run", () => ({
	classifyLetter: async () => null,
	letterCheckDeps: {
		classify: async () => stub.verdict,
		safety: async () => stub.safety,
	},
}));
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: Pushed) => {
		stub.pushes.push(args);
		return 1;
	},
}));

// 2026-11-19 12:00 UTC.
const NOW = Date.UTC(2026, 10, 19, 12);
const HOUR_MS = 60 * 60 * 1000;

const KIND_LETTER =
	"I don't know what you're carrying tonight, but the night ends. Be gentle with yourself.";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	stub.pushes = [];
	stub.events = [];
	stub.safety = { level: "none", resources: [], unavailable: false };
	stub.verdict = {
		fixable: null,
		hostile: false,
		language: "en",
	};
});
afterEach(() => vi.useRealTimers());

const declareAge = (user: SeededUser, dateOfBirth = "1990-05-01") =>
	user.t.mutation(api.age.declarations.declare, {
		dateOfBirth,
		platform: "ios",
		promptVersion: "letters.v1",
		surface: "letters",
	});

async function adult(n: number, root: SeededUser["root"]): Promise<SeededUser> {
	const user = await asNewUser(n, root);
	await declareAge(user);
	await user.root.run((ctx) =>
		ctx.db.patch("emotional_profiles", user.profileId, { sessionCount: 1 })
	);
	return user;
}

/** A session's understanding for `user`, as the pipeline stores it. */
async function session(
	user: SeededUser,
	metadata: Partial<Doc<"emotional_metadata">> = {},
	sessionOverrides: Partial<Doc<"sessions">> = {}
): Promise<Id<"sessions">> {
	const sessionId = await seedSession(
		user.root,
		user.profileId,
		sessionOverrides
	);
	await seedMetadata(user.root, sessionId, user.profileId, {
		intensity: 7,
		primaryEmotion: "loneliness",
		thematicTags: ["isolation"],
		...metadata,
	});
	return sessionId;
}

const optIn = (user: SeededUser) =>
	user.t.mutation(api.letters.optIn.set, {
		choice: "yes",
		locale: "en-GB",
		promptVersion: "letters.offer.v1",
	});

/** An adult with a fresh, matchable session who said Yes. */
async function recipient(
	n: number,
	root: SeededUser["root"],
	metadata: Partial<Doc<"emotional_metadata">> = {}
): Promise<SeededUser> {
	const user = await adult(n, root);
	await session(user, metadata);
	await optIn(user);
	return user;
}

const rowOf = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("letter_profiles")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique()
	);

/** Out of the pool, with nothing copied from a session left behind. */
function expectOut(row: Doc<"letter_profiles"> | null) {
	expect(row?.pool).toBe("out");
	expect(row?.aim).toBeUndefined();
	expect(row?.band).toBeUndefined();
}

const refresh = (user: SeededUser) =>
	user.root.mutation(internal.letters.pool.refresh, {
		emotionalProfileId: user.profileId,
	});

/** A letter that passed the check `checkedAgoMs` ago. */
const waitingLetter = (
	sender: SeededUser,
	extra: Partial<Doc<"letters">> = {},
	checkedAgoMs = 0
) =>
	sender.root.run((ctx) =>
		ctx.db.insert("letters", {
			checkedAt: Date.now() - checkedAgoMs,
			createdAt: Date.now() - checkedAgoMs,
			language: "en",
			senderProfileId: sender.profileId,
			status: "waiting",
			text: KIND_LETTER,
			...extra,
		})
	);

const place = (root: SeededUser["root"], letterId: Id<"letters">) =>
	root.mutation(internal.letters.match.place, { letterId });

/**
 * One sweep's placement pass: `placeWaiting` and every run it schedules
 * after itself, in order. Returns how many mutations the pass took.
 */
async function sweepPlace(root: SeededUser["root"]): Promise<number> {
	const MAX_RUNS = 500;
	let args = {};
	for (let runs = 1; runs <= MAX_RUNS; runs++) {
		await root.mutation(internal.letters.sweep.placeWaiting, args);
		const next = (
			await root.run((ctx) =>
				ctx.db.system.query("_scheduled_functions").collect()
			)
		).filter(
			(j) =>
				j.name.endsWith("letters/sweep:placeWaiting") &&
				j.state.kind === "pending"
		);
		const job = next.at(-1);
		if (!job) {
			return runs;
		}
		await root.run((ctx) => ctx.scheduler.cancel(job._id));
		args = job.args[0] ?? {};
	}
	throw new Error("the placement pass never finished");
}

const letter = (root: SeededUser["root"], id: Id<"letters">) =>
	root.run((ctx) => ctx.db.get("letters", id));

const setNotifications = (
	user: SeededUser,
	patch: Partial<Doc<"preferences">["notifications"]>
) =>
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
		await ctx.db.patch("preferences", prefs._id, {
			notifications: { ...prefs.notifications, ...patch },
		});
	});

const openFollowUp = (
	user: SeededUser,
	sessionId: Id<"sessions">,
	card: Pick<Doc<"follow_up_cards">, "escalationDerived" | "tier">
) =>
	user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "still here",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			sessionId,
			status: "ready",
			workflowId: "wf1" as WorkflowId,
			...card,
		})
	);

describe("letters aims", () => {
	it("maps a session to the writing screen's For list, most specific first", () => {
		expect(letterAimOf({ primaryEmotion: "overwhelm", thematicTags: [] })).toBe(
			"anxiety"
		);
		expect(letterAimOf({ primaryEmotion: "grief", thematicTags: [] })).toBe(
			"grief"
		);
		expect(
			letterAimOf({ primaryEmotion: "exhaustion", thematicTags: [] })
		).toBe("sleep");
		// A theme beats the emotion's broad family…
		expect(
			letterAimOf({
				primaryEmotion: "homesickness",
				thematicTags: ["isolation"],
			})
		).toBe("loneliness");
		// …and the family is the last resort.
		expect(
			letterAimOf({ primaryEmotion: "disappointment", thematicTags: ["work"] })
		).toBe("low");
		expect(letterAimOf({ primaryEmotion: "joy", thematicTags: ["work"] })).toBe(
			undefined
		);
	});
});

describe("letters.pool", () => {
	it("puts an adult with a fresh session who said Yes in the pool", async () => {
		const root = asUnauthed();
		const user = await recipient(1, root);
		const row = await rowOf(user);
		expect(row).toMatchObject({
			aim: "loneliness",
			band: "heavier",
			language: "en",
			pool: "ready",
			poolCheckAt: NOW + 14 * DAY_MS,
		});
	});

	it("bands a lighter session lighter", async () => {
		const user = await recipient(1, asUnauthed(), { intensity: 3 });
		expect((await rowOf(user))?.band).toBe("lighter");
	});

	it.each([
		["an elevated session", { safeguardLevel: "elevated" as const }],
		["a crisis session", { safeguardLevel: "crisis" as const }],
		["a trauma theme", { thematicTags: ["trauma"] }],
		["a body-image theme", { thematicTags: ["Body-Image"] }],
	])("keeps someone out after %s", async (_name, metadata) => {
		const user = await recipient(1, asUnauthed(), metadata);
		expectOut(await rowOf(user));
	});

	it("keeps someone out after a tap-only session", async () => {
		const user = await adult(1, asUnauthed());
		await session(user, {}, { entryType: "word_cloud" });
		await optIn(user);
		expect((await rowOf(user))?.pool).toBe("out");
	});

	it("keeps someone out with no session in 14 days, and with none at all", async () => {
		const root = asUnauthed();
		const none = await adult(1, root);
		await optIn(none);
		expect((await rowOf(none))?.pool).toBe("out");

		const stale = await recipient(2, root);
		vi.setSystemTime(NOW + 14 * DAY_MS);
		await refresh(stale);
		expect((await rowOf(stale))?.pool).toBe("out");
	});

	it("keeps out anyone who isn't a confirmed adult", async () => {
		const root = asUnauthed();
		// Opted in as an adult; support later corrected the date of birth.
		const user = await recipient(1, root);
		await root.run(async (ctx) => {
			const declaration = await ctx.db
				.query("age_declarations")
				.withIndex("by_user_declared", (q) => q.eq("userId", user.userId))
				.first();
			await ctx.db.patch("age_declarations", declaration!._id, {
				dateOfBirth: "2012-01-01",
			});
		});
		await refresh(user);
		expect((await rowOf(user))?.pool).toBe("out");
	});

	it("keeps out a deleted account and a wipe in progress", async () => {
		const root = asUnauthed();
		const deleted = await recipient(1, root);
		await root.run((ctx) =>
			ctx.db.patch("users", deleted.userId, { accountStatus: "deleted" })
		);
		await refresh(deleted);
		expect((await rowOf(deleted))?.pool).toBe("out");

		const wiping = await recipient(2, root);
		await root.run((ctx) =>
			ctx.db.patch("emotional_profiles", wiping.profileId, {
				dataWipeInProgress: true,
			})
		);
		await refresh(wiping);
		expect((await rowOf(wiping))?.pool).toBe("out");
	});

	it("rests someone for 7 days after a letter, then lets them back", async () => {
		const root = asUnauthed();
		const user = await recipient(1, root);
		const row = await rowOf(user);
		await root.run((ctx) =>
			ctx.db.patch("letter_profiles", row!._id, { lastReceivedAt: NOW })
		);
		await refresh(user);
		expect(await rowOf(user)).toMatchObject({
			pool: "out",
			poolCheckAt: NOW + 7 * DAY_MS,
		});

		vi.setSystemTime(NOW + 7 * DAY_MS);
		await session(user);
		await root.mutation(internal.letters.sweep.refreshDue, {});
		expect((await rowOf(user))?.pool).toBe("ready");
	});

	it("leaves the pool when receiving is turned off", async () => {
		const user = await recipient(1, asUnauthed());
		await user.t.mutation(api.letters.optIn.set, {
			choice: "no",
			promptVersion: "letters.offer.v1",
		});
		expectOut(await rowOf(user));
	});

	it("refreshes after a session is stored, for people receiving letters only", async () => {
		const root = asUnauthed();
		const receiving = await adult(1, root);
		await optIn(receiving);
		const quiet = await adult(2, root);

		for (const user of [receiving, quiet]) {
			const sessionId = await seedSession(root, user.profileId);
			await root.mutation(
				internal.emotionalMetadata.store,
				classificationArgs({ emotionalProfileId: user.profileId, sessionId })
			);
		}
		const refreshes = (await scheduledCalls(root)).filter((c) =>
			c.name.endsWith("letters/pool:refresh")
		);
		expect(refreshes.map((c) => c.args.emotionalProfileId)).toEqual([
			receiving.profileId,
		]);
	});
});

describe("letters.match.place", () => {
	it("gives a waiting letter to a ready recipient and tells both", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		const id = await waitingLetter(sender);

		expect(await place(root, id)).toBe(true);
		expect(await letter(root, id)).toMatchObject({
			receivedAt: NOW,
			recipientProfileId: reader.profileId,
			status: "received",
		});
		expect(await rowOf(reader)).toMatchObject({
			lastReceivedAt: NOW,
			pool: "out",
			unopenedLetterId: id,
		});
		const pushes = (await scheduledCalls(root)).filter((c) =>
			c.name.endsWith("letters/push:send")
		);
		expect(pushes.map((c) => c.args)).toEqual([
			{ letterId: id, to: reader.profileId, type: "letter_for_you" },
			{ letterId: id, to: sender.profileId, type: "letter_received" },
		]);
	});

	it("gives a recipient one letter a week at most", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		await recipient(2, root);
		expect(await place(root, await waitingLetter(sender))).toBe(true);
		expect(await place(root, await waitingLetter(sender))).toBe(false);
	});

	it("never places a letter with its own sender", async () => {
		const root = asUnauthed();
		const both = await recipient(1, root);
		expect(await place(root, await waitingLetter(both))).toBe(false);
	});

	it("never places an unchecked or held letter", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		await recipient(2, root);
		for (const status of ["unchecked", "held"] as const) {
			const id = await waitingLetter(sender, { checkedAt: undefined, status });
			expect(await place(root, id)).toBe(false);
			expect((await letter(root, id))?.status).toBe(status);
		}
	});

	it("skips a recipient who blocked this sender", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		await root.run((ctx) =>
			ctx.db.insert("letter_blocks", {
				cause: "hide",
				createdAt: NOW,
				recipientProfileId: reader.profileId,
				senderProfileId: sender.profileId,
			})
		);
		expect(await place(root, await waitingLetter(sender))).toBe(false);
	});

	it("skips, without reserving, a recipient inside their quiet window", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const sleeping = await recipient(2, root);
		// 12:00 UTC is before 13:00: quiet.
		await setNotifications(sleeping, {
			quietWindow: { dontReachAfter: 22, dontReachBefore: 13 },
			timezone: "UTC",
		});
		const awake = await recipient(3, root);
		const id = await waitingLetter(sender);
		expect(await place(root, id)).toBe(true);
		expect((await letter(root, id))?.recipientProfileId).toBe(awake.profileId);
		expect((await rowOf(sleeping))?.pool).toBe("ready");
	});

	it.each([
		[
			"an acute follow-up",
			{ escalationDerived: false, tier: "acute" as const },
		],
		[
			"an escalation-derived follow-up",
			{ escalationDerived: true, tier: "elevated" as const },
		],
	])("skips a recipient with %s open", async (_name, card) => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		const sessionId = await seedSession(root, reader.profileId);
		await openFollowUp(reader, sessionId, card);
		expect(await place(root, await waitingLetter(sender))).toBe(false);
	});

	it("doesn't skip for a standard follow-up", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		const sessionId = await seedSession(root, reader.profileId);
		await openFollowUp(reader, sessionId, {
			escalationDerived: false,
			tier: "standard",
		});
		expect(await place(root, await waitingLetter(sender))).toBe(true);
	});

	it("never places a paused sender's letters, silently", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		await recipient(2, root);
		await root.run(async (ctx) => {
			await ctx.db.insert("letter_profiles", {
				emotionalProfileId: sender.profileId,
				lastReceivedAt: 0,
				pausedBy: "strikes",
				pausedUntil: NOW + DAY_MS,
				pool: "out",
				tiebreak: 0.5,
			});
		});
		const id = await waitingLetter(sender);
		expect(await place(root, id)).toBe(false);
		expect((await letter(root, id))?.status).toBe("waiting");
	});

	it("keeps an aimed letter to its aim for 72 hours, then opens it up", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		await recipient(2, root, {
			primaryEmotion: "grief",
			thematicTags: ["loss"],
		});
		const id = await waitingLetter(sender, { aim: "sleep" });
		expect(await place(root, id)).toBe(false);

		vi.setSystemTime(NOW + 72 * HOUR_MS);
		expect(await place(root, id)).toBe(true);
	});

	it("prefers the aim, heavier first, then whoever waited longest", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const lighterAimed = await recipient(2, root, { intensity: 2 });
		const heavierOther = await recipient(3, root, {
			primaryEmotion: "grief",
			thematicTags: ["loss"],
		});
		const heavierAimed = await recipient(4, root);
		const longestAimed = await recipient(5, root);
		// heavierAimed had a letter long ago; longestAimed never has.
		const row = await rowOf(heavierAimed);
		await root.run((ctx) =>
			ctx.db.patch("letter_profiles", row!._id, {
				lastReceivedAt: NOW - 30 * DAY_MS,
			})
		);

		const order: Id<"emotional_profiles">[] = [];
		for (let i = 0; i < 3; i++) {
			const id = await waitingLetter(sender, { aim: "loneliness" });
			await place(root, id);
			const placed = await letter(root, id);
			if (placed?.recipientProfileId) {
				order.push(placed.recipientProfileId);
			}
		}
		expect(order).toEqual([
			longestAimed.profileId,
			heavierAimed.profileId,
			lighterAimed.profileId,
		]);
		expect((await rowOf(heavierOther))?.pool).toBe("ready");
	});

	it("places a passed letter as soon as it's sent", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		await sender.t.action(api.letters.send.send, { text: KIND_LETTER });
		const [job] = (await scheduledCalls(root)).filter((c) =>
			c.name.endsWith("letters/match:place")
		);
		expect(job).toBeDefined();
		await place(root, job!.args.letterId as Id<"letters">);
		expect((await rowOf(reader))?.unopenedLetterId).toBe(job!.args.letterId);
	});
});

describe("letters.push.send", () => {
	async function placed() {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		const id = await waitingLetter(sender);
		await place(root, id);
		for (const user of [sender, reader]) {
			await setNotifications(user, { enabled: true });
		}
		return { id, reader, root, sender };
	}

	const push = (
		root: SeededUser["root"],
		letterId: Id<"letters">,
		to: SeededUser,
		type: "letter_for_you" | "letter_received" | "letter_acknowledged"
	) =>
		root.mutation(internal.letters.push.send, {
			letterId,
			to: to.profileId,
			type,
		});

	it("sends ids only, never the words", async () => {
		const { id, reader, root, sender } = await placed();
		await push(root, id, reader, "letter_for_you");
		await push(root, id, sender, "letter_received");
		expect(stub.pushes).toMatchObject([
			{
				emotionalProfileId: reader.profileId,
				notification: {
					data: { letterId: id, type: "letter_for_you" },
					title: "Someone wrote you a letter",
				},
			},
			{
				emotionalProfileId: sender.profileId,
				notification: {
					body: "Xolace placed it with someone it fits.",
					data: { type: "letter_received" },
					title: "One of your letters was received",
				},
			},
		]);
		expect(JSON.stringify(stub.pushes)).not.toContain("carrying");
	});

	it("honours notifications off and the letters switch", async () => {
		const { id, reader, root, sender } = await placed();
		await setNotifications(reader, { enabled: false });
		await push(root, id, reader, "letter_for_you");
		await sender.t.mutation(api.letters.settings.setPush, { on: false });
		await push(root, id, sender, "letter_received");
		expect(stub.pushes).toEqual([]);
	});

	it("waits out the quiet window, then checks again", async () => {
		const { id, reader, root } = await placed();
		await setNotifications(reader, {
			quietWindow: { dontReachAfter: 22, dontReachBefore: 13 },
			timezone: "UTC",
		});
		await push(root, id, reader, "letter_for_you");
		expect(stub.pushes).toEqual([]);
		const later = await root.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect()
		);
		expect(
			later.some(
				(j) =>
					j.name.includes("letters/push") &&
					j.scheduledTime === NOW + HOUR_MS &&
					j.state.kind === "pending"
			)
		).toBe(true);
	});

	it("drops itself once it no longer applies", async () => {
		const { id, reader, root, sender } = await placed();
		await root.run((ctx) => ctx.db.patch("letters", id, { openedAt: NOW }));
		await push(root, id, reader, "letter_for_you");
		// Not acknowledged: nothing to say.
		await push(root, id, sender, "letter_acknowledged");
		// Not theirs.
		await push(root, id, reader, "letter_received");
		await root.run((ctx) =>
			ctx.db.patch("letters", id, { acknowledgedAt: NOW, reportedAt: NOW })
		);
		await push(root, id, sender, "letter_acknowledged");
		expect(stub.pushes).toEqual([]);
	});

	it("doesn't push a deleted account", async () => {
		const { id, root, sender } = await placed();
		await root.run((ctx) =>
			ctx.db.patch("users", sender.userId, { accountStatus: "deleted" })
		);
		await push(root, id, sender, "letter_received");
		expect(stub.pushes).toEqual([]);
	});
});

describe("letters.check.recheck", () => {
	async function unchecked() {
		const root = asUnauthed();
		const sender = await adult(1, root);
		stub.safety = { level: "none", resources: [], unavailable: true };
		await sender.t.action(api.letters.send.send, { text: KIND_LETTER });
		const [row] = await root.run((ctx) => ctx.db.query("letters").collect());
		stub.safety = { level: "none", resources: [], unavailable: false };
		return { id: row!._id, root, sender };
	}
	const recheck = (root: SeededUser["root"], letterId: Id<"letters">) =>
		root.action(internal.letters.check.recheck, { letterId });

	it("schedules the first re-check 5 minutes after the send", async () => {
		const { id, root } = await unchecked();
		const jobs = await root.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect()
		);
		expect(jobs.find((j) => j.name.includes("letters/check"))).toMatchObject({
			args: [{ letterId: id }],
			scheduledTime: NOW + RECHECK_DELAYS_MS[0],
		});
	});

	it("a late pass makes it waiting, and it tries the pool", async () => {
		const { id, root } = await unchecked();
		await recheck(root, id);
		expect(await letter(root, id)).toMatchObject({
			checkedAt: NOW,
			status: "waiting",
		});
		expect(
			(await scheduledCalls(root)).some(
				(c) => c.name.endsWith("letters/match:place") && c.args.letterId === id
			)
		).toBe(true);
	});

	it("a late risk writes the escalation and deletes the letter", async () => {
		const { id, root, sender } = await unchecked();
		stub.safety = { level: "crisis", resources: [], unavailable: false };
		await recheck(root, id);
		expect(await letter(root, id)).toBeNull();
		const events = await root.run((ctx) =>
			ctx.db.query("escalation_events").collect()
		);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			emotionalProfileId: sender.profileId,
			source: "letter",
		});
		expect(JSON.stringify(events)).not.toContain("carrying");
	});

	it("a late hostile verdict holds it, with a review and a strike", async () => {
		const { id, root } = await unchecked();
		stub.verdict = {
			fixable: null,
			hostile: true,
			language: "en",
		};
		await recheck(root, id);
		expect((await letter(root, id))?.status).toBe("held");
		const [reviews, strikes] = await root.run(async (ctx) => [
			await ctx.db.query("letter_reviews").collect(),
			await ctx.db.query("letter_strikes").collect(),
		]);
		expect(reviews).toHaveLength(1);
		expect(strikes).toHaveLength(1);
	});

	it.each([
		[
			"fixable",
			{
				fixable: "link" as const,
				hostile: false,
				language: "en",
			},
		],
		[
			"not English",
			{ confidence: 0.9, fixable: null, hostile: false, language: "fr" },
		],
	])("a late %s verdict returns it", async (_name, verdict) => {
		const { id, root } = await unchecked();
		stub.verdict = verdict;
		await recheck(root, id);
		expect((await letter(root, id))?.status).toBe("returned");
	});

	it("still unavailable: tries again later, then leaves it to the sweep", async () => {
		const { id, root } = await unchecked();
		stub.verdict = null;
		// One re-check per scheduled delay.
		for (const _delay of RECHECK_DELAYS_MS) {
			await recheck(root, id);
		}
		expect(await letter(root, id)).toMatchObject({
			recheckCount: RECHECK_DELAYS_MS.length,
			status: "unchecked",
		});
		const rechecks = (
			await root.run((ctx) =>
				ctx.db.system.query("_scheduled_functions").collect()
			)
		)
			.filter((j) => j.name.includes("letters/check"))
			.map((j) => j.scheduledTime - NOW);
		expect(rechecks).toEqual([...RECHECK_DELAYS_MS]);

		await root.mutation(internal.letters.sweep.uncheckedDue, {});
		const after = (
			await root.run((ctx) =>
				ctx.db.system.query("_scheduled_functions").collect()
			)
		).filter((j) => j.name.includes("letters/check"));
		expect(after).toHaveLength(RECHECK_DELAYS_MS.length + 1);
	});

	it("does nothing for a letter withdrawn meanwhile", async () => {
		const { id, root, sender } = await unchecked();
		await sender.t.mutation(api.letters.sent.withdraw, { id });
		await recheck(root, id);
		expect(await letter(root, id)).toBeNull();
	});
});

describe("letters.sweep", () => {
	it("places waiting letters oldest first", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const reader = await recipient(2, root);
		const newer = await waitingLetter(sender, {}, HOUR_MS);
		const older = await waitingLetter(sender, {}, 2 * HOUR_MS);
		await sweepPlace(root);
		expect((await rowOf(reader))?.unopenedLetterId).toBe(older);
		expect((await letter(root, newer))?.status).toBe("waiting");
	});

	it("returns a letter still waiting 30 days after it passed", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const old = await waitingLetter(sender, {}, LETTER_WAIT_DAYS * DAY_MS);
		const unchecked = await sender.root.run((ctx) =>
			ctx.db.insert("letters", {
				createdAt: NOW - LETTER_WAIT_DAYS * DAY_MS,
				language: "en",
				senderProfileId: sender.profileId,
				status: "unchecked",
				text: KIND_LETTER,
			})
		);
		await sweepPlace(root);
		await root.mutation(internal.letters.sweep.uncheckedDue, {});
		expect((await letter(root, old))?.status).toBe("returned");
		expect((await letter(root, unchecked))?.status).toBe("returned");
		const sent = await sender.t.query(api.letters.sent.list, {});
		expect(sent.map((s) => s.status)).toEqual(["returned", "returned"]);
	});

	it("handles more than a batch of letters, one placement to a mutation", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const first = await recipient(2, root);
		const second = await recipient(3, root);
		const expired = SWEEP_BATCH + 5;
		await root.run(async (ctx) => {
			for (let i = 0; i < expired; i++) {
				await ctx.db.insert("letters", {
					checkedAt: NOW - LETTER_WAIT_DAYS * DAY_MS - i,
					createdAt: NOW - LETTER_WAIT_DAYS * DAY_MS - i,
					language: "en",
					senderProfileId: sender.profileId,
					status: "waiting",
					text: KIND_LETTER,
				});
			}
		});
		const live: Id<"letters">[] = [];
		for (let i = 0; i < SWEEP_BATCH + 5; i++) {
			live.push(await waitingLetter(sender, {}, HOUR_MS - i));
		}

		const runs = await sweepPlace(root);

		const all = await root.run((ctx) => ctx.db.query("letters").collect());
		const count = (status: string) =>
			all.filter((l) => l.status === status).length;
		expect(count("returned")).toBe(expired);
		expect(count("received")).toBe(2);
		expect(count("waiting")).toBe(live.length - 2);
		// The two oldest live letters, one to each recipient.
		expect(
			new Set([
				(await rowOf(first))?.unopenedLetterId,
				(await rowOf(second))?.unopenedLetterId,
			])
		).toEqual(new Set([live[0], live[1]]));
		// Two placements, one search that found no one, then cheap skips.
		expect(runs).toBeLessThanOrEqual(
			3 + Math.ceil((expired + live.length) / SWEEP_BATCH) + 1
		);
	});

	it("steps past more turned-away candidates than one page", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const turnedAway = CANDIDATES_TRIED_MAX - 10;
		const blocked: SeededUser[] = [];
		for (let n = 0; n < turnedAway; n++) {
			blocked.push(await asNewUser(100 + n, root));
		}
		await root.run(async (ctx) => {
			for (const [i, user] of blocked.entries()) {
				await ctx.db.insert("letter_profiles", {
					band: "heavier",
					emotionalProfileId: user.profileId,
					language: "en",
					lastReceivedAt: 0,
					optIn: "yes",
					pool: "ready",
					tiebreak: i / (2 * turnedAway),
				});
				await ctx.db.insert("letter_blocks", {
					cause: "hide",
					createdAt: NOW,
					recipientProfileId: user.profileId,
					senderProfileId: sender.profileId,
				});
			}
		});
		const reader = await recipient(2, root);
		const readerRow = await rowOf(reader);
		await root.run((ctx) =>
			ctx.db.patch("letter_profiles", readerRow!._id, { tiebreak: 0.99 })
		);
		const id = await waitingLetter(sender);

		expect(await place(root, id)).toBe(true);
		expect((await rowOf(reader))?.unopenedLetterId).toBe(id);
	});

	it("stops inviting letters while more wait than a week of placements", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		const status = () => sender.t.query(api.letters.status.get, {});
		expect((await status()).invite).toBe(true);

		await waitingLetter(sender);
		await root.mutation(internal.letters.sweep.invite, {});
		expect((await status()).invite).toBe(false);

		await recipient(2, root);
		await sweepPlace(root);
		await root.mutation(internal.letters.sweep.invite, {});
		expect((await status()).invite).toBe(true);
	});
});

describe("letters analytics", () => {
	it("buckets the wait from pass to placement", () => {
		expect(waitBucketOf(10 * 60 * 1000)).toBe("under_1h");
		expect(waitBucketOf(5 * HOUR_MS)).toBe("1h_1d");
		expect(waitBucketOf(2 * DAY_MS)).toBe("1d_3d");
		expect(waitBucketOf(4 * DAY_MS)).toBe("3d_7d");
		expect(waitBucketOf(9 * DAY_MS)).toBe("over_7d");
	});

	it("records placements and returns on the sender, with no letter id", async () => {
		const root = asUnauthed();
		const sender = await adult(1, root);
		await recipient(2, root);
		await place(root, await waitingLetter(sender, {}, 5 * HOUR_MS));
		await waitingLetter(sender, {}, LETTER_WAIT_DAYS * DAY_MS);
		await sweepPlace(root);

		const letterEvents = stub.events.filter((e) =>
			e.event.startsWith("letter_")
		);
		expect(letterEvents).toEqual([
			{
				distinctId: sender.profileId,
				event: "letter_placed",
				properties: { waitBucket: "1h_1d" },
			},
			{
				distinctId: sender.profileId,
				event: "letter_returned",
				properties: { why: "unplaced" },
			},
		]);
	});
});

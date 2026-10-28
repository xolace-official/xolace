// @vitest-environment edge-runtime
/**
 * Kindling (#330 / #331, docs/paths-v1.md §2, §5, §6, §7): the trigger, the
 * premium boundary, the model-pick + validation + fallback, the one-active
 * lifecycle, and the cascade. The Haiku reply is faked at the provider seam.
 */

import type { WorkflowId } from "@convex-dev/workflow";
import { MockEmbeddingModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "../../scripts/kindling/dev/manifest.json";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	scheduled,
	scheduledCalls,
	seedMetadata,
	seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
	aggregatesMock,
	anthropicMock,
	noopJob,
	ragMock,
	rateLimiterMock,
	revenuecatMock,
} from "./mocks.helpers";

type ManifestTrack = Omit<
	Doc<"audio_tracks">,
	"_id" | "_creationTime" | "key" | "thumbKey" | "active"
> & {
	audioPath: string;
	thumbPath: string;
};

const WHY =
	"You said the mornings are the hardest, so this is one slow minute before the day starts.";
const twig = (actionType: string, order: number, why = WHY) => ({
	actionType,
	order,
	why,
});
const goodReply = JSON.stringify([
	twig("breathing", 1),
	twig("xolacer", 2),
	twig("bridge", 3),
]);

const stub = vi.hoisted(() => ({
	embedFails: false,
	embeds: 0,
	entitlementThrows: false,
	events: [] as { event: string; properties: Record<string, unknown> }[],
	indexed: [] as { namespace: string; key: string; text: string }[],
	isPlus: true,
	// The Library meaning search (#568): what it returns, and whether the embed fails.
	libraryHits: [] as { key: string; scores: number[] }[],
	limit: { ok: true } as { ok: boolean; retryAfter?: number },
	reply: "" as string,
	requests: [] as { messages: { content: unknown }[] }[],
	searched: [] as string[],
	searchFails: false,
	// The track meaning search (#572): hits per namespace, and what got indexed / removed.
	trackHits: {} as Record<string, { key: string; scores: number[] }[]>,
	unindexed: [] as string[],
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => ({
	posthog: {
		capture: async (
			_ctx: unknown,
			e: { event: string; properties: Record<string, unknown> }
		) => {
			stub.events.push(e);
		},
	},
}));
vi.mock("../rag", () => {
	const base = ragMock();
	return {
		...base,
		rag: {
			...base.rag,
			add: async (
				_ctx: unknown,
				args: { namespace: string; key: string; text: string }
			) => {
				stub.indexed.push({
					key: args.key,
					namespace: args.namespace,
					text: args.text,
				});
			},
			deleteByKey: async (
				_ctx: unknown,
				args: { namespaceId: string; key: string }
			) => {
				stub.unindexed.push(`${args.namespaceId}/${args.key}`);
			},
			getNamespace: async (_ctx: unknown, args: { namespace: string }) => ({
				namespaceId: args.namespace,
			}),
			options: {
				...base.rag.options,
				textEmbeddingModel: new MockEmbeddingModelV3({
					doEmbed: async ({ values }) => {
						stub.embeds++;
						if (stub.embedFails) {
							throw new Error("embeddings down");
						}
						return { embeddings: values.map(() => [0]), warnings: [] };
					},
				}),
			},
			// One result per chunk; an entry's score is its best chunk's.
			search: async (_ctx: unknown, args: { namespace: string }) => {
				stub.searched.push(args.namespace);
				if (stub.searchFails) {
					throw new Error("vector search down");
				}
				const hits =
					args.namespace === "library"
						? stub.libraryHits
						: (stub.trackHits[args.namespace] ?? []);
				return {
					entries: hits.map((h) => ({
						entryId: `e_${h.key}`,
						key: h.key,
						text: "",
					})),
					results: hits.flatMap((h) =>
						h.scores.map((score) => ({ entryId: `e_${h.key}`, score }))
					),
				};
			},
		},
	};
});
vi.mock("../ai/paths/audioTracks", async (orig) => ({
	...(await orig<typeof import("../ai/paths/audioTracks")>()),
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(() => stub.limit),
}));
vi.mock("../ai/providers/anthropic", async (orig) => {
	const mock = anthropicMock(() => stub.reply);
	return {
		...(await orig<typeof import("../ai/providers/anthropic")>()),
		getAnthropicClient: () => ({
			messages: {
				create: async (req: { messages: { content: unknown }[] }) => {
					stub.requests.push(req);
					return mock.getAnthropicClient().messages.create();
				},
			},
		}),
	};
});
vi.mock("../revenuecat", () =>
	revenuecatMock(() => {
		if (stub.entitlementThrows) {
			throw new Error("RC down");
		}
		return stub.isPlus;
	})
);
// Sibling jobs `finalizeCompletion` enqueues — neutered so a job firing after
// the test body can't reach an unregistered component.
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({
	onSessionComplete: noopJob(),
}));
vi.mock("../followUps", async (orig) => ({
	...(await orig<typeof import("../followUps")>()),
	purgeForProfile: noopJob(),
	startFollowUpWorkflow: noopJob(),
}));
type Sent = { notification: { title?: string; body?: string; data?: unknown } };
const sentPushes = vi.hoisted(() => [] as Sent[]);
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: Sent) => {
		sentPushes.push(args);
	},
}));

beforeEach(() => {
	stub.isPlus = true;
	stub.entitlementThrows = false;
	stub.reply = goodReply;
	stub.limit = { ok: true };
	stub.requests = [];
	stub.libraryHits = [];
	stub.embedFails = false;
	stub.embeds = 0;
	stub.searchFails = false;
	stub.searched = [];
	stub.trackHits = {};
	stub.indexed = [];
	stub.unindexed = [];
	stub.events = [];
	sentPushes.length = 0;
});
afterEach(() => vi.restoreAllMocks());

type SupportNeed = NonNullable<Doc<"emotional_metadata">["supportNeed"]>;

/** A confirmed session with its Understanding, ready for `completeSession`. */
async function seedQualifying(
	user: SeededUser,
	supportNeed: SupportNeed = "light"
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

/** Flip the notifications master switch, as token registration does. */
async function setNotifications(user: SeededUser, enabled: boolean) {
	await user.root.run(async (ctx) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		await ctx.db.patch("preferences", prefs!._id, {
			notifications: { ...prefs!.notifications, enabled },
		});
	});
}

/** A new user's master switch is off until a push token registers. */
async function asNotifiableUser() {
	const user = await asNewUser();
	await setNotifications(user, true);
	return user;
}

const generate = (user: SeededUser, sessionId: Id<"sessions">) =>
	user.root.action(internal.ai.paths.generate.run, {
		emotionalProfileId: user.profileId,
		sessionId,
	});

const readPaths = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("paths")
			.withIndex("by_profile_and_status", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

/** The checked-in dev catalogue, as `ingest.ts` would have upserted it. */
async function seedCatalogue(user: SeededUser) {
	await user.root.run(async (ctx) => {
		for (const { audioPath, thumbPath, ...t } of manifest as ManifestTrack[]) {
			await ctx.db.insert("audio_tracks", {
				...t,
				active: true,
				key: audioPath,
				thumbKey: thumbPath,
			} as Doc<"audio_tracks">);
		}
	});
}

/** A topic the dev catalogue can actually bind — the manifest's contents move. */
const CATALOGUE_TOPIC = (manifest as ManifestTrack[])[0].topic;
const CATALOGUE_KIND = CATALOGUE_TOPIC.startsWith("music_topic_")
	? "music"
	: "audio";

const readSteps = (user: SeededUser, pathId: Id<"paths">) =>
	user.root.run((ctx) =>
		ctx.db
			.query("path_steps")
			.withIndex("by_path", (q) => q.eq("pathId", pathId))
			.collect()
	);

describe("ai/paths/generate.run", () => {
	it("writes one active kindling with 3–4 pending twigs for a Plus user", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user, "light");

		await generate(user, sessionId);

		const [path, ...rest] = await readPaths(user);
		expect(rest).toEqual([]);
		expect(path).toMatchObject({ sessionId, status: "active" });
		const steps = await readSteps(user, path._id);
		expect(steps.length).toBeGreaterThanOrEqual(3);
		expect(steps.length).toBeLessThanOrEqual(4);
		expect(steps.every((s) => s.state === "pending")).toBe(true);
		expect(steps.map((s) => s.actionType).sort()).toEqual([
			"breathing",
			"bridge",
			"xolacer",
		]);
		expect(steps.find((s) => s.actionType === "xolacer")?.params).toEqual({
			specialty: "burnout",
		});
		expect(path.modelVersion).toBe("paths-v2-haiku-5.5");
	});

	it("drops a twig whose why fails validation and ships the rest", async () => {
		stub.reply = JSON.stringify([
			twig(
				"breathing",
				1,
				"You mentioned anxiety, so this helps you cope and regulate for a minute."
			),
			twig("breathing", 2),
			twig("xolacer", 3),
			twig("bridge", 4),
		]);
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, sessionId);

		const [path] = await readPaths(user);
		const steps = await readSteps(user, path._id);
		expect(steps.map((s) => [s.actionType, s.order])).toEqual([
			["breathing", 1],
			["xolacer", 2],
			["bridge", 3],
		]);
		expect(error).toHaveBeenCalledWith(
			"kindling: twig dropped",
			expect.objectContaining({
				actionType: "breathing",
				reason: "why_vocabulary",
			})
		);
	});

	it("writes no paths row when fewer than 3 twigs survive", async () => {
		stub.reply = JSON.stringify([
			twig("breathing", 1),
			twig("xolacer", 2),
			twig("not_a_key", 3),
		]);
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, sessionId);

		expect(await readPaths(user)).toEqual([]);
		expect(error).toHaveBeenCalledWith(
			"kindling: no-ship",
			expect.objectContaining({ reason: "fewer_than_min_twigs", surviving: 2 })
		);
	});

	it("writes nothing when the per-profile rate limit is spent", async () => {
		stub.limit = { ok: false, retryAfter: 1000 };
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, sessionId);

		expect(await readPaths(user)).toEqual([]);
	});

	it("writes nothing for a free user", async () => {
		stub.isPlus = false;
		const user = await asNewUser();
		const sessionId = await seedQualifying(user, "active");
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, sessionId);

		expect(await readPaths(user)).toEqual([]);
		expect(error).not.toHaveBeenCalled();
	});

	it("writes nothing when supportNeed is none", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user, "none");

		await generate(user, sessionId);

		expect(await readPaths(user)).toEqual([]);
	});

	it("swallows and logs a thrown error; nothing is written", async () => {
		stub.entitlementThrows = true;
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(generate(user, sessionId)).resolves.toBeNull();

		expect(error).toHaveBeenCalled();
		expect(await readPaths(user)).toEqual([]);
	});

	it("binds a *_topic_* twig to a real slug from the dev catalogue", async () => {
		stub.reply = JSON.stringify([
			twig(CATALOGUE_TOPIC, 1),
			twig("breathing", 2),
			twig("bridge", 3),
		]);
		const user = await asNewUser();
		await seedCatalogue(user);
		const sessionId = await seedQualifying(user);

		await generate(user, sessionId);

		const [path] = await readPaths(user);
		const audio = (await readSteps(user, path._id)).find(
			(s) => s.actionType === CATALOGUE_TOPIC
		);
		const slugs = manifest.map((t) => t.slug);
		expect(slugs).toContain((audio?.params as { slug: string }).slug);
	});

	it("offers the model only action types that can bind for this session", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await generate(user, sessionId);

		const offered = String(stub.requests[0].messages[0].content);
		expect(offered).toContain("- breathing:");
		expect(offered).toContain("- xolacer:");
		expect(offered).not.toContain("audio_topic_");
		expect(offered).not.toContain("music_topic_");
	});

	it("offers try-this on an unflagged session, never on one safeguard flagged (#567)", async () => {
		stub.reply = JSON.stringify([
			twig("try_brisk_walk", 1),
			twig("breathing", 2),
			twig("bridge", 3),
			twig("xolacer", 4),
		]);
		const user = await asNewUser();
		await generate(user, await seedQualifying(user));
		expect(String(stub.requests[0].messages[0].content)).toContain(
			"- try_brisk_walk:"
		);

		const flagged = await seedSession(user.root, user.profileId, {
			state: "confirmed",
		});
		await seedMetadata(user.root, flagged, user.profileId, {
			safeguardLevel: "gentle",
			suggestedSpecialty: "burnout",
			supportNeed: "light",
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		await generate(user, flagged);
		expect(String(stub.requests[1].messages[0].content)).not.toContain("try_");
		const path = (await readPaths(user)).find((p) => p.sessionId === flagged);
		const types = (await readSteps(user, path!._id)).map((s) => s.actionType);
		expect(types.sort()).toEqual(["breathing", "bridge", "xolacer"]);
	});

	it("writes no kindling and no notification when every twig is unbindable", async () => {
		// No catalogue rows and no specialty: only breathing can bind, and the
		// model returns two content twigs anyway.
		stub.reply = JSON.stringify([
			twig("audio_topic_grief", 1),
			twig("music_topic_sadness", 2),
		]);
		const user = await asNewUser();
		const sessionId = await seedSession(user.root, user.profileId, {
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			supportNeed: "light",
		});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, sessionId);

		expect(await readPaths(user)).toEqual([]);
		const notifications = await user.root.run((ctx) =>
			ctx.db.query("notification_log").take(10)
		);
		expect(notifications).toEqual([]);
		expect(error).toHaveBeenCalledWith(
			"kindling: no-ship",
			expect.objectContaining({ reason: "fewer_than_min_twigs", surviving: 0 })
		);
	});

	it("flips the previous active kindling to replaced, keeping its row", async () => {
		const user = await asNewUser();
		const first = await seedQualifying(user);
		await generate(user, first);
		const second = await seedQualifying(user);

		await generate(user, second);

		const paths = await readPaths(user);
		expect(paths.map((p) => [p.sessionId, p.status])).toEqual(
			expect.arrayContaining([
				[first, "replaced"],
				[second, "active"],
			])
		);
		expect(paths.filter((p) => p.status === "active")).toHaveLength(1);
	});
});

const readNotifications = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("notification_log").take(10));

describe("the kindling_ready notification (#335)", () => {
	it("fires only after the kindling is written, deep-linking via type alone", async () => {
		const user = await asNotifiableUser();
		await generate(user, await seedQualifying(user));

		const [log] = await readNotifications(user);
		expect(log).toMatchObject({ delivered: true, type: "kindling_ready" });
		expect(sentPushes).toHaveLength(1);
		expect(sentPushes[0].notification.data).toMatchObject({
			type: "kindling_ready",
		});
	});

	it("sends nothing when generation no-ships", async () => {
		stub.reply = JSON.stringify([twig("breathing", 1)]);
		const user = await asNotifiableUser();
		vi.spyOn(console, "error").mockImplementation(() => {});

		await generate(user, await seedQualifying(user));

		expect(await readNotifications(user)).toEqual([]);
		expect(sentPushes).toEqual([]);
	});

	it("sends nothing when the user has notifications disabled", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		await setNotifications(user, false);

		await generate(user, sessionId);

		expect(await readNotifications(user)).toEqual([]);
		expect(sentPushes).toEqual([]);
	});

	it("suppresses for a user dormant 30+ days, logging the existing reason", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		await user.root.run(async (ctx) => {
			await ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
			});
		});

		await generate(user, sessionId);

		const [log] = await readNotifications(user);
		expect(log).toMatchObject({
			delivered: false,
			suppressedReason: "user_inactive",
			type: "kindling_ready",
		});
		expect(sentPushes).toEqual([]);
	});

	it("suppresses while an escalation-derived follow-up is active", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("follow_up_cards", {
				cardText: "still here",
				createdAt: Date.now(),
				emotionalProfileId: user.profileId,
				escalationDerived: true,
				sessionId,
				status: "ready",
				tier: "acute",
				workflowId: "wf1" as WorkflowId,
			});
		});

		await generate(user, sessionId);

		const [log] = await readNotifications(user);
		expect(log).toMatchObject({
			delivered: false,
			suppressedReason: "escalation_active",
			type: "kindling_ready",
		});
		expect(sentPushes).toEqual([]);
	});

	it("suppresses while a superseded escalation-derived follow-up is unresolved", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("follow_up_cards", {
				cardText: "still here",
				createdAt: Date.now(),
				emotionalProfileId: user.profileId,
				escalationDerived: true,
				sessionId,
				status: "superseded",
				tier: "acute",
				workflowId: "wf1" as WorkflowId,
			});
		});

		await generate(user, sessionId);

		const [log] = await readNotifications(user);
		expect(log).toMatchObject({
			delivered: false,
			suppressedReason: "escalation_active",
			type: "kindling_ready",
		});
		expect(sentPushes).toEqual([]);
	});

	it("is not starved by the shared notification bucket already being spent today", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		// Spend the shared `notification` bucket, as a gentle_return/pattern_nudge/
		// milestone push earlier the same day would.
		await user.root.mutation(internal.notifications.schedule, {
			content: "30 days",
			emotionalProfileId: user.profileId,
			scheduledFor: Date.now(),
			triggerReason: "test",
			type: "milestone",
		});
		sentPushes.length = 0;

		await generate(user, sessionId);

		const logs = await readNotifications(user);
		const kindlingLog = logs.find((l) => l.type === "kindling_ready");
		expect(kindlingLog).toMatchObject({ delivered: true });
		expect(sentPushes).toHaveLength(1);
	});

	it("does not suppress for a resolved (non-active) follow-up card", async () => {
		const user = await asNotifiableUser();
		const sessionId = await seedQualifying(user);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("follow_up_cards", {
				cardText: "still here",
				createdAt: Date.now(),
				emotionalProfileId: user.profileId,
				escalationDerived: true,
				resolvedAt: Date.now(),
				sessionId,
				status: "resolved",
				tier: "acute",
				workflowId: "wf2" as WorkflowId,
			});
		});

		await generate(user, sessionId);

		const [log] = await readNotifications(user);
		expect(log).toMatchObject({ delivered: true, type: "kindling_ready" });
	});
});

describe("the completion hook", () => {
	it("fires from completeSession", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await user.t.mutation(api.sessions.completeSession, { sessionId });

		const call = scheduled(
			await scheduledCalls(user.root),
			"ai/paths/generate:run"
		);
		expect(call?.args).toEqual({
			emotionalProfileId: user.profileId,
			sessionId,
		});
	});

	it("does not fire from completePath", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await user.t.mutation(api.sessions.completePath, {
			pathCompleted: true,
			sessionId,
		});

		const call = scheduled(
			await scheduledCalls(user.root),
			"ai/paths/generate:run"
		);
		expect(call).toBeUndefined();
	});
});

describe("requestKindling (free → Plus at session-end)", () => {
	const activate = (user: SeededUser) =>
		user.root.mutation(internal.premium.onEntitlementActivated, {
			appUserId: user.profileId,
			entitlementId: "xolace-plus",
			isSandbox: true,
			sourceEventType: "INITIAL_PURCHASE",
		});

	it("parks the session while free, re-queues once the webhook lands, and only once", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		stub.isPlus = false;

		await user.t.mutation(api.paths.requestKindling, { sessionId });
		expect(
			scheduled(await scheduledCalls(user.root), "ai/paths/generate:run")
		).toBeUndefined();

		stub.isPlus = true;
		await activate(user);
		await activate(user); // hook retry — idempotent
		const runs = (await scheduledCalls(user.root)).filter((c) =>
			c.name.endsWith("ai/paths/generate:run")
		);
		expect(runs.map((c) => c.args)).toEqual([
			{ emotionalProfileId: user.profileId, sessionId },
		]);
	});

	it("schedules immediately when Plus is already visible server-side", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);

		await user.t.mutation(api.paths.requestKindling, { sessionId });
		const call = scheduled(
			await scheduledCalls(user.root),
			"ai/paths/generate:run"
		);
		expect(call?.args).toEqual({
			emotionalProfileId: user.profileId,
			sessionId,
		});
	});
});

describe("cascade", () => {
	it("dataWipe deletes path_steps by path, then the paths row", async () => {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await generate(user, sessionId);
		const [path] = await readPaths(user);
		expect(await readSteps(user, path._id)).not.toEqual([]);

		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});

		expect(await readPaths(user)).toEqual([]);
		expect(await readSteps(user, path._id)).toEqual([]);
	});
});

describe("the active-kindling screen API (#333)", () => {
	/** A Plus user with one active kindling of [breathing, xolacer]. */
	async function withKindling() {
		const user = await asNewUser();
		const sessionId = await seedQualifying(user);
		await generate(user, sessionId);
		const active = await user.t.query(api.paths.getActive, {});
		if (!active) {
			throw new Error("expected an active kindling");
		}
		return { active, sessionId, user };
	}

	it("getActive returns the twigs in suggested order, and null when there is none", async () => {
		const user = await asNewUser();
		expect(await user.t.query(api.paths.getActive, {})).toBeNull();

		const sessionId = await seedQualifying(user);
		await generate(user, sessionId);

		const active = await user.t.query(api.paths.getActive, {});
		expect(active?.sessionId).toBe(sessionId);
		expect(active?.twigs.map((t) => [t.order, t.kind, t.state])).toEqual([
			[1, "breathing", "pending"],
			[2, "xolacer", "pending"],
			[3, "bridge", "pending"],
		]);
	});

	it("a try-this twig reaches only clients that ask for it, and both controls settle it (#567)", async () => {
		stub.reply = JSON.stringify([
			twig("try_brisk_walk", 1),
			twig("breathing", 2),
			twig("bridge", 3),
		]);
		const user = await asNewUser();
		await generate(user, await seedQualifying(user));

		const old = await user.t.query(api.paths.getActive, { withRead: true });
		expect(old?.twigs.map((t) => t.kind)).toEqual(["breathing", "bridge"]);

		const active = await user.t.query(api.paths.getActive, {
			withRead: true,
			withTry: true,
		});
		const tryThis = active!.twigs[0];
		expect(tryThis).toMatchObject({
			detail: "Go for a 15–20 minute brisk walk today.",
			kind: "try",
			title: "A brisk walk",
		});
		await user.t.mutation(api.paths.completeStep, { stepId: tryThis._id }); // "I did this"
		expect(
			(await user.t.query(api.paths.getActive, { withTry: true }))?.twigs[0]
				.state
		).toBe("done");

		await generate(user, await seedQualifying(user));
		const next = await user.t.query(api.paths.getActive, { withTry: true });
		await user.t.mutation(api.paths.skipStep, { stepId: next!.twigs[0]._id }); // "Not for me"
		expect(
			(await user.t.query(api.paths.getActive, { withTry: true }))?.twigs[0]
		).toMatchObject({
			kind: "try",
			state: "skipped",
		});
	});

	it("getActive is null for a free user even when a kindling row exists", async () => {
		const { user } = await withKindling();
		stub.isPlus = false;
		expect(await user.t.query(api.paths.getActive, {})).toBeNull();
	});

	it("resolves a bound track's title onto an audio/music twig", async () => {
		stub.reply = JSON.stringify([
			twig(CATALOGUE_TOPIC, 1),
			twig("breathing", 2),
			twig("bridge", 3),
		]);
		const user = await asNewUser();
		await seedCatalogue(user);
		await generate(user, await seedQualifying(user));

		const active = await user.t.query(api.paths.getActive, {});
		const audio = active?.twigs.find((t) => t.kind === CATALOGUE_KIND);
		expect(audio?.title).toBe(
			manifest.find((t) => t.slug === (audio?.params as { slug: string }).slug)
				?.title
		);
	});

	it("skipStep and completeStep are independent of order and close the kindling once nothing is pending", async () => {
		const { user, active } = await withKindling();
		const [breathing, xolacer, bridge] = active.twigs;

		await user.t.mutation(api.paths.skipStep, { stepId: xolacer._id });
		let now = await user.t.query(api.paths.getActive, {});
		expect(now?.twigs.map((t) => t.state)).toEqual([
			"pending",
			"skipped",
			"pending",
		]);

		await user.t.mutation(api.paths.completeStep, { stepId: bridge._id });
		await user.t.mutation(api.paths.completeStep, { stepId: breathing._id });
		now = await user.t.query(api.paths.getActive, {});
		expect(now).toBeNull();
		const [path] = await readPaths(user);
		expect(path.status).toBe("completed");
	});

	it("dismiss closes the kindling and leaves the twigs as they were", async () => {
		const { user, active } = await withKindling();
		await user.t.mutation(api.paths.dismiss, { pathId: active._id });

		expect(await user.t.query(api.paths.getActive, {})).toBeNull();
		const [path] = await readPaths(user);
		expect(path.status).toBe("dismissed");
		expect(
			(await readSteps(user, path._id)).every((s) => s.state === "pending")
		).toBe(true);
	});

	it("another user cannot touch my twigs", async () => {
		const { user, active } = await withKindling();
		const other = await asNewUser(2, user.root);

		await expect(
			other.t.mutation(api.paths.skipStep, { stepId: active.twigs[0]._id })
		).rejects.toThrow();
		await expect(
			other.t.mutation(api.paths.dismiss, { pathId: active._id })
		).rejects.toThrow();
	});
});

describe("stale kindling screens", () => {
	it("refuses twig writes once the kindling is dismissed", async () => {
		const user = await asNewUser();
		await generate(user, await seedQualifying(user));
		const active = await user.t.query(api.paths.getActive, {});
		if (!active) {
			throw new Error("expected an active kindling");
		}
		await user.t.mutation(api.paths.dismiss, { pathId: active._id });

		await expect(
			user.t.mutation(api.paths.skipStep, { stepId: active.twigs[0]._id })
		).rejects.toThrow();
	});
});

describe("a browse play beside a bound twig (§9.6, #341)", () => {
	it("leaves the twig's binding byte-identical, never tends it, and never moves profile stats", async () => {
		stub.reply = JSON.stringify([
			twig(CATALOGUE_TOPIC, 1),
			twig("breathing", 2),
			twig("bridge", 3),
		]);
		const user = await asNewUser();
		await seedCatalogue(user);
		await generate(user, await seedQualifying(user));

		const active = await user.t.query(api.paths.getActive, {});
		const audio = active?.twigs.find((t) => t.kind === CATALOGUE_KIND);
		if (!(active && audio)) {
			throw new Error("expected a bound twig");
		}
		const snapshot = async () => ({
			profile: await user.root.run((ctx) =>
				ctx.db.get("emotional_profiles", user.profileId)
			),
			step: await user.root.run((ctx) => ctx.db.get("path_steps", audio._id)),
		});
		const before = await snapshot();

		// Everything "Browse more like this" and the strip can reach: the topic
		// list, and the player's mint for a *different* track in that topic.
		const topic = await user.t.query(api.browse.getTopic, {
			slug: CATALOGUE_TOPIC.replace(/^(audio|music)_topic_/, ""),
		});
		const other =
			topic.find((t) => t.slug !== (audio.params as { slug: string }).slug) ??
			topic[0];
		expect(
			await user.t.query(api.paths.getBoundAudioTrack, { slug: other.slug })
		).not.toBeNull();

		expect(await snapshot()).toEqual(before);
		expect(before.step?.state).toBe("pending");
	});
});

describe("paths.getBoundAudioTrack (#334)", () => {
	const licence = {
		acquiredAt: 0,
		artist: "Artist",
		attributionRequired: true,
		attributionText: "Music by Artist — Pixabay",
		licenceName: "Pixabay",
		licenceUrl: "https://pixabay.com/service/license-summary/",
		source: "Pixabay",
		sourceUrl: "https://pixabay.com",
	};
	const row = (
		extra: Partial<Doc<"audio_tracks">>
	): Omit<Doc<"audio_tracks">, "_id" | "_creationTime"> => ({
		active: true,
		durationSec: 300,
		family: "support",
		key: "audio/s.m4a",
		sha256: "s",
		slug: "s",
		sourceTags: [],
		tags: [],
		thumbKey: "thumb/s.webp",
		thumbSha256: "s",
		title: "Track",
		topic: "audio_topic_anxiety",
		...extra,
	});
	const seedRow = (user: SeededUser, extra: Partial<Doc<"audio_tracks">>) =>
		user.root.run((ctx) =>
			ctx.db.insert("audio_tracks", row(extra) as Doc<"audio_tracks">)
		);

	it("returns the playable shape with per-request URLs for a Plus user", async () => {
		const user = await asNewUser();
		await seedRow(user, { narrators: ["Sage", "Wren"], slug: "voice" });
		const before = Date.now();

		const track = await user.t.query(api.paths.getBoundAudioTrack, {
			slug: "voice",
		});
		expect(track).toMatchObject({
			durationSec: 300,
			narrators: ["Sage", "Wren"],
			showCrisisLine: false,
			slug: "voice",
			thumbUrl: "https://r2.test/thumb/s.webp",
			title: "Track",
			url: "https://r2.test/audio/s.m4a",
		});
		expect(track?.attributionText).toBeUndefined();
		expect(track?.expiresAt).toBeGreaterThan(before);
	});

	it("carries verbatim attributionText only when the licence requires it", async () => {
		const user = await asNewUser();
		await seedRow(user, {
			family: "music",
			licence,
			slug: "m1",
			topic: "music_topic_calm",
		});
		await seedRow(user, {
			family: "music",
			licence: { ...licence, attributionRequired: false },
			slug: "m2",
			topic: "music_topic_calm",
		});

		expect(
			(await user.t.query(api.paths.getBoundAudioTrack, { slug: "m1" }))
				?.attributionText
		).toBe("Music by Artist — Pixabay");
		expect(
			(await user.t.query(api.paths.getBoundAudioTrack, { slug: "m2" }))
				?.attributionText
		).toBeUndefined();
	});

	it("derives showCrisisLine from tier 4 server-side", async () => {
		const user = await asNewUser();
		await seedRow(user, { safetyReviewedAt: 1, slug: "t4", tier: 4 });
		await seedRow(user, { safetyReviewedAt: 1, slug: "t3", tier: 3 });

		expect(
			(await user.t.query(api.paths.getBoundAudioTrack, { slug: "t4" }))
				?.showCrisisLine
		).toBe(true);
		expect(
			(await user.t.query(api.paths.getBoundAudioTrack, { slug: "t3" }))
				?.showCrisisLine
		).toBe(false);
	});

	it("is null for a retired or unknown slug", async () => {
		const user = await asNewUser();
		await seedRow(user, { active: false, slug: "gone" });
		expect(
			await user.t.query(api.paths.getBoundAudioTrack, { slug: "gone" })
		).toBeNull();
		expect(
			await user.t.query(api.paths.getBoundAudioTrack, { slug: "nope" })
		).toBeNull();
	});

	it("never hands a free user a URL", async () => {
		const user = await asNewUser();
		await seedRow(user, { slug: "voice" });
		stub.isPlus = false;
		await expect(
			user.t.query(api.paths.getBoundAudioTrack, { slug: "voice" })
		).rejects.toThrow(/Xolace\+/);
	});
});

describe("ai/paths/audioTracks.upsertTopic (#353)", () => {
	const topic = (
		slug: string,
		extra: Partial<{
			title: string;
			thumbKey: string;
			thumbSha256: string;
		}> = {}
	) => ({
		slug,
		thumbKey: "thumb/aaa.webp",
		thumbSha256: "aaa",
		...extra,
	});

	it("inserts a row for a catalogued slug and a title-only update keeps the key", async () => {
		const user = await asNewUser();
		const inserted = await user.root.mutation(
			internal.ai.paths.audioTracks.upsertTopic,
			{
				topic: topic("sadness", { title: "Sadness" }),
			}
		);
		expect(inserted.action).toBe("inserted");

		const updated = await user.root.mutation(
			internal.ai.paths.audioTracks.upsertTopic,
			{
				topic: topic("sadness", { title: "Feeling low" }),
			}
		);
		expect(updated).toEqual({ action: "updated", topicId: inserted.topicId });

		const rows = await user.root.run((ctx) => ctx.db.query("topics").collect());
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			slug: "sadness",
			thumbKey: "thumb/aaa.webp",
			title: "Feeling low",
		});
	});

	it("rejects a slug that is not a topic suffix in the catalogue", async () => {
		const user = await asNewUser();
		await expect(
			user.root.mutation(internal.ai.paths.audioTracks.upsertTopic, {
				topic: topic("sadnes"),
			})
		).rejects.toThrow(/not a catalogued topic/);
		expect(
			await user.root.run((ctx) => ctx.db.query("topics").collect())
		).toEqual([]);
	});
});

describe("ai/paths/audioTracks.discardUpload (#354)", () => {
	it("keeps a thumb blob referenced by a topics row, deletes an unreferenced one", async () => {
		// The mutation uses the module-local `r2`, untouched by the `vi.mock` above.
		const actual = await vi.importActual<
			typeof import("../ai/paths/audioTracks")
		>("../ai/paths/audioTracks");
		const deleteObject = vi
			.spyOn(actual.r2, "deleteObject")
			.mockResolvedValue(undefined);

		const user = await asNewUser();
		await user.root.mutation(internal.ai.paths.audioTracks.upsertTopic, {
			topic: {
				slug: "sadness",
				thumbKey: "thumb/shared.webp",
				thumbSha256: "shared",
			},
		});
		await user.root.mutation(internal.ai.paths.audioTracks.discardUpload, {
			thumbKey: "thumb/shared.webp",
		});
		expect(deleteObject).not.toHaveBeenCalled();

		await user.root.mutation(internal.ai.paths.audioTracks.discardUpload, {
			thumbKey: "thumb/orphan.webp",
		});
		expect(deleteObject).toHaveBeenCalledTimes(1);
		expect(deleteObject.mock.calls[0][1]).toBe("thumb/orphan.webp");
		deleteObject.mockRestore();
	});
});

/**
 * Compounding context (#521). Failure modes: an untouched (or merely linked)
 * compounding domain reaching the prompt; compounding context on an elevated,
 * crisis or burned session; a free user getting a model call at all.
 */
describe("compounding context for Kindling (#521)", () => {
	const DAY = 86_400_000;

	async function seedReading(
		user: SeededUser,
		daysAgo: number,
		tags: string[],
		intensity: number
	) {
		const sessionId = await seedSession(user.root, user.profileId, {
			confirmationState: "confirmed",
			createdAt: Date.now() - daysAgo * DAY,
			state: "completed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			intensity,
			thematicTags: tags,
		});
	}

	/** A settled work usual (intensity 4), a heavy last week, and its open stretch. */
	async function compoundingWork(user: SeededUser) {
		for (let i = 0; i < 50; i++) {
			await seedReading(user, 120 - i * 2, ["work"], 4);
		}
		for (let d = 1; d <= 7; d++) {
			await seedReading(user, d + 0.5, ["work"], 10);
		}
		await user.root.run((ctx) =>
			ctx.db.insert("compounding_stretches", {
				anchorBaseline: 67,
				domain: "work",
				emotionalProfileId: user.profileId,
				startedAt: Date.now() - 20 * DAY,
			})
		);
	}

	async function tonight(
		user: SeededUser,
		tags: string[],
		over: {
			kept?: boolean;
			safeguardLevel?: Doc<"emotional_metadata">["safeguardLevel"];
		} = {}
	) {
		const sessionId = await seedSession(user.root, user.profileId, {
			kept: over.kept ?? true,
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			supportNeed: "light",
			thematicTags: tags,
			...(over.safeguardLevel ? { safeguardLevel: over.safeguardLevel } : {}),
		});
		const before = stub.requests.length;
		await generate(user, sessionId);
		if (stub.requests.length === before) {
			return null;
		}
		return String(stub.requests.at(-1)!.messages[0].content);
	}

	it("names a compounding domain tonight's session touched, roughly dated", async () => {
		const user = await asNewUser();
		await compoundingWork(user);
		expect(await tonight(user, ["burnout"])).toContain(
			"- weighing on them lately: work for about 3 weeks"
		);
	});

	it("stays silent about a compounding domain tonight's session didn't touch", async () => {
		const user = await asNewUser();
		await compoundingWork(user);
		const prompt = await tonight(user, ["sleep"]);
		expect(prompt).toContain("## This session");
		expect(prompt).not.toContain("weighing on them");
	});

	it.each([
		["elevated", { safeguardLevel: "elevated" as const }],
		["crisis", { safeguardLevel: "crisis" as const }],
		["burned", { kept: false }],
	])("carries no compounding context on a %s session", async (_, over) => {
		const user = await asNewUser();
		await compoundingWork(user);
		const prompt = await tonight(user, ["burnout"], over);
		expect(prompt).toContain("## This session"); // the call still happened
		expect(prompt).not.toContain("weighing on them");
	});

	it("makes no call at all for a free user", async () => {
		stub.isPlus = false;
		const user = await asNewUser();
		await compoundingWork(user);
		expect(await tonight(user, ["burnout"])).toBeNull();
	});
});

describe("past outcomes shape the pick (#565)", () => {
	const DAY = 86_400_000;
	type Outcome = [
		actionType: string,
		state: Doc<"path_steps">["state"],
		params?: unknown,
	];

	/** A past kindling on its own session, generated `daysAgo`. */
	async function pastKindling(
		user: SeededUser,
		daysAgo: number,
		outcomes: Outcome[],
		over: { status?: Doc<"paths">["status"]; sessionId?: Id<"sessions"> } = {}
	): Promise<Id<"sessions">> {
		const sessionId =
			over.sessionId ??
			(await seedSession(user.root, user.profileId, { state: "completed" }));
		await user.root.run(async (ctx) => {
			const pathId = await ctx.db.insert("paths", {
				emotionalProfileId: user.profileId,
				generatedAt: Date.now() - daysAgo * DAY,
				model: "test",
				modelVersion: "test",
				sessionId,
				status: over.status ?? "replaced",
			});
			for (const [i, [actionType, state, params]] of outcomes.entries()) {
				await ctx.db.insert("path_steps", {
					actionType,
					order: i + 1,
					params: params ?? {},
					pathId,
					state,
					why: WHY,
				});
			}
		});
		return sessionId;
	}

	const captured = async (user: SeededUser, sessionId: Id<"sessions">) => {
		const { posthog } = await import("../posthog");
		const capture = vi.spyOn(posthog, "capture");
		await generate(user, sessionId);
		const prompt = String(stub.requests.at(-1)!.messages[0].content);
		const event = capture.mock.calls
			.map(([, e]) => e)
			.find((e) => e.event === "path_generated");
		return {
			prompt,
			props: event?.properties as {
				historyKinds: string[];
				withheld: string[];
			},
		};
	};

	it("cold start: no history block, empty historyKinds and withheld", async () => {
		const user = await asNewUser();
		const { prompt, props } = await captured(user, await seedQualifying(user));
		expect(prompt).not.toContain("past offers");
		expect(props).toMatchObject({ historyKinds: [], withheld: [] });
	});

	it("carries each kind's own rate; ignored and active-pending twigs add nothing", async () => {
		const user = await asNewUser();
		await pastKindling(user, 7, [["breathing", "pending"]], {
			status: "dismissed",
		}); // ignored: offered, not a skip
		await pastKindling(user, 5, [
			["breathing", "done"],
			["bridge", "skipped"],
			["xolacer", "pending"],
		]);
		await pastKindling(
			user,
			1,
			[
				["breathing", "done"],
				["xolacer", "pending"],
			],
			{ status: "active" }
		);
		await pastKindling(user, 100, [["bridge", "done"]]); // outside 90 days

		const { prompt, props } = await captured(user, await seedQualifying(user));
		expect(prompt).toContain("- breathing: tended 2 of 3 offered");
		expect(prompt).toContain("- bridge: passed on 1 of 1 offered");
		expect(prompt).not.toMatch(/- xolacer: (tended|passed)/);
		expect(props.historyKinds).toEqual(["breathing", "bridge"]);
	});

	it("says a tended read helped when the reader marked it so", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			const entryId = await ctx.db.insert("library_entries", {
				active: true,
				dek: "D",
				kind: "advice",
				lastReviewedAt: 1,
				primarySubject: "grief",
				readMin: 4,
				reuse: "adapted",
				searchText: "loss",
				slug: "on-loss",
				title: "T",
			} as Doc<"library_entries">);
			await ctx.db.insert("library_reads", {
				emotionalProfileId: user.profileId,
				entryId,
				helped: true,
				saved: false,
			});
			// Unfinished and on tonight's feeling, so a read twig can bind again.
			await ctx.db.insert("library_entry_facets", {
				axis: "emotion",
				entryId,
				slug: "anxiety",
			});
		});
		await pastKindling(user, 3, [["read", "done", { slug: "on-loss" }]]);
		const { prompt } = await captured(user, await seedQualifying(user));
		expect(prompt).toContain("- read: tended 1 of 1 offered, said it helped 1");
	});

	it("withholds a type skipped on its last 2 offers", async () => {
		stub.reply = JSON.stringify([
			twig("breathing", 1),
			twig("xolacer", 2),
			twig(CATALOGUE_TOPIC, 3),
		]);
		const user = await asNewUser();
		await seedCatalogue(user);
		await pastKindling(user, 4, [["bridge", "skipped"]]);
		await pastKindling(user, 2, [["bridge", "skipped"]]);
		const { prompt, props } = await captured(user, await seedQualifying(user));
		expect(prompt).not.toContain("- bridge:");
		expect(props.withheld).toEqual(["bridge"]);
	});

	it("a tend between the skips resets the rule", async () => {
		const user = await asNewUser();
		await seedCatalogue(user);
		await pastKindling(user, 6, [["bridge", "skipped"]]);
		await pastKindling(user, 4, [["bridge", "done"]]);
		await pastKindling(user, 2, [["bridge", "skipped"]]);
		const { props } = await captured(user, await seedQualifying(user));
		expect(props.withheld).toEqual([]);
	});

	it("never withholds below MAX_TWIGS bindable types", async () => {
		const user = await asNewUser(); // no catalogue: only breathing, bridge, xolacer bind
		await pastKindling(user, 4, [["bridge", "skipped"]]);
		await pastKindling(user, 2, [["bridge", "skipped"]]);
		const { prompt, props } = await captured(user, await seedQualifying(user));
		expect(prompt).toContain("- bridge: Draft");
		expect(props.withheld).toEqual([]);
	});

	async function matchedOld(user: SeededUser, personalMemoryEnabled: boolean) {
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			await ctx.db.patch("preferences", prefs!._id, { personalMemoryEnabled });
		});
		const matched = await pastKindling(user, 60, [["bridge", "done"]]);
		for (let i = 0; i < 10; i++) {
			await pastKindling(user, 10 - i * 0.5, [["breathing", "done"]]);
		}
		const sessionId = await seedSession(user.root, user.profileId, {
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			episodicMatchKeys: [matched],
			suggestedSpecialty: "burnout",
			supportNeed: "light",
		});
		return (await captured(user, sessionId)).prompt;
	}

	it("reads the episodic matches' kindlings beyond the recent ten", async () => {
		expect(await matchedOld(await asNewUser(), true)).toContain(
			"- bridge: tended 1 of 1 offered"
		);
	});

	it("reads only the recent kindlings with personal memory off", async () => {
		expect(await matchedOld(await asNewUser(), false)).not.toContain(
			"- bridge: tended"
		);
	});

	/** A settled work usual, a heavy last week, and a work stretch that ended and is back. */
	async function returningWork(user: SeededUser) {
		for (let i = 0; i < 50; i++) {
			const s = await seedSession(user.root, user.profileId, {
				confirmationState: "confirmed",
				createdAt: Date.now() - (120 - i * 2) * DAY,
				state: "completed",
			});
			await seedMetadata(user.root, s, user.profileId, {
				intensity: 4,
				thematicTags: ["work"],
			});
		}
		for (let d = 1; d <= 7; d++) {
			const s = await seedSession(user.root, user.profileId, {
				confirmationState: "confirmed",
				createdAt: Date.now() - (d + 0.5) * DAY,
				state: "completed",
			});
			await seedMetadata(user.root, s, user.profileId, {
				intensity: 10,
				thematicTags: ["work"],
			});
		}
		await user.root.run(async (ctx) => {
			const base = {
				anchorBaseline: 67,
				domain: "work" as const,
				emotionalProfileId: user.profileId,
			};
			await ctx.db.insert("compounding_stretches", {
				...base,
				endedAt: Date.now() - 30 * DAY,
				startedAt: Date.now() - 60 * DAY,
			});
			await ctx.db.insert("compounding_stretches", {
				...base,
				startedAt: Date.now() - 20 * DAY,
			});
		});
	}

	it("names what was tended during a returning stretch's previous run", async () => {
		const user = await asNewUser();
		await returningWork(user);
		const workSession = await seedSession(user.root, user.profileId, {
			state: "completed",
		});
		await seedMetadata(user.root, workSession, user.profileId, {
			thematicTags: ["work"],
		});
		await pastKindling(
			user,
			45,
			[
				["breathing", "done"],
				["bridge", "skipped"],
			],
			{ sessionId: workSession }
		);

		const sessionId = await seedSession(user.root, user.profileId, {
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			suggestedSpecialty: "burnout",
			supportNeed: "light",
			thematicTags: ["burnout"],
		});
		const { prompt } = await captured(user, sessionId);
		expect(prompt).toContain(
			"returning, tended when this weighed on them before: breathing"
		);
	});

	describe("the binder's pick (#566)", () => {
		/** Two unfinished entries tied on tonight's feeling, so only history can separate them. */
		async function tiedEntries(user: SeededUser) {
			await user.root.run(async (ctx) => {
				for (const slug of ["on-a", "on-b"]) {
					const entryId = await ctx.db.insert("library_entries", {
						active: true,
						dek: "D",
						kind: "advice",
						lastReviewedAt: 1,
						primarySubject: "anxiety",
						readMin: 4,
						reuse: "adapted",
						searchText: slug,
						slug,
						title: "T",
					} as Doc<"library_entries">);
					await ctx.db.insert("library_entry_facets", {
						axis: "emotion",
						entryId,
						slug: "anxiety",
					});
				}
			});
		}

		const boundRead = async (user: SeededUser, sessionId: Id<"sessions">) => {
			stub.reply = JSON.stringify([
				twig("read", 1),
				twig("breathing", 2),
				twig("xolacer", 3),
			]);
			await generate(user, sessionId);
			const active = (await readPaths(user)).find(
				(p) => p.status === "active"
			)!;
			const read = (await readSteps(user, active._id)).find(
				(t) => t.actionType === "read"
			)!;
			return (read.params as { slug: string }).slug;
		};

		const tonight = async (user: SeededUser, thematicTags: string[] = []) => {
			const sessionId = await seedSession(user.root, user.profileId, {
				state: "confirmed",
			});
			await seedMetadata(user.root, sessionId, user.profileId, {
				suggestedSpecialty: "burnout",
				supportNeed: "light",
				thematicTags,
			});
			return sessionId;
		};

		/** The seeded pick with no history, and the slug it beat. */
		async function coldPick(thematicTags?: string[]) {
			const user = await asNewUser();
			await tiedEntries(user);
			const seeded = await boundRead(user, await tonight(user, thematicTags));
			return { other: seeded === "on-a" ? "on-b" : "on-a", seeded };
		}

		it("a read skipped before loses its tie; one skipped as another type doesn't", async () => {
			const { seeded, other } = await coldPick();

			const skipped = await asNewUser();
			await tiedEntries(skipped);
			await pastKindling(skipped, 3, [["read", "skipped", { slug: seeded }]]);
			expect(await boundRead(skipped, await tonight(skipped))).toBe(other);

			const elsewhere = await asNewUser();
			await tiedEntries(elsewhere);
			await pastKindling(elsewhere, 3, [
				[CATALOGUE_TOPIC, "skipped", { slug: seeded }],
			]);
			expect(await boundRead(elsewhere, await tonight(elsewhere))).toBe(seeded);
		});

		it("a returning stretch re-offers the read tended during its previous run", async () => {
			const { other } = await coldPick(["burnout"]);
			const user = await asNewUser();
			await tiedEntries(user);
			await returningWork(user);
			const workSession = await seedSession(user.root, user.profileId, {
				state: "completed",
			});
			await seedMetadata(user.root, workSession, user.profileId, {
				thematicTags: ["work"],
			});
			await pastKindling(user, 45, [["read", "done", { slug: other }]], {
				sessionId: workSession,
			});
			expect(await boundRead(user, await tonight(user, ["burnout"]))).toBe(
				other
			);
		});
	});
});

describe("the read twig binds on meaning (#568)", () => {
	type Spec = {
		slug: string;
		facet?: boolean;
		active?: boolean;
		finished?: boolean;
	};
	/** Library entries by slug; `facet` shelves one under tonight's "anxiety". */
	const seedEntries = (user: SeededUser, specs: Spec[]) =>
		user.root.run(async (ctx) => {
			const ids: Record<string, Id<"library_entries">> = {};
			for (const { slug, facet, active = true, finished } of specs) {
				const entryId = await ctx.db.insert("library_entries", {
					active,
					dek: "D",
					kind: "advice",
					lastReviewedAt: 1,
					primarySubject: "anxiety",
					readMin: 4,
					reuse: "adapted",
					searchText: slug,
					slug,
					title: "T",
				} as Doc<"library_entries">);
				if (facet) {
					await ctx.db.insert("library_entry_facets", {
						axis: "emotion",
						entryId,
						slug: "anxiety",
					});
				}
				if (finished) {
					await ctx.db.insert("library_reads", {
						emotionalProfileId: user.profileId,
						entryId,
						finishedAt: 1,
						helped: false,
						saved: false,
					});
				}
				ids[slug] = entryId;
			}
			return ids;
		});

	const session = async (
		user: SeededUser,
		over: Partial<Doc<"emotional_metadata">> = {}
	) => {
		const sessionId = await seedSession(user.root, user.profileId, {
			rawInput: "a dread I can't name sits on my chest every morning",
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			suggestedSpecialty: "burnout",
			supportNeed: "light",
			...over,
		});
		return sessionId;
	};

	/** Generate with a read twig asked for; the bound read slug (null if dropped) and the logged event. */
	async function run(user: SeededUser, sessionId: Id<"sessions">) {
		stub.reply = JSON.stringify([
			twig("read", 1),
			twig("breathing", 2),
			twig("xolacer", 3),
			twig("bridge", 4),
		]);
		await generate(user, sessionId);
		const active = (await readPaths(user)).find((p) => p.status === "active")!;
		const read = (await readSteps(user, active._id)).find(
			(t) => t.actionType === "read"
		);
		const logged = stub.events.find(
			(e) => e.event === "path_generated"
		)!.properties;
		return {
			logged,
			slug: read ? (read.params as { slug: string }).slug : null,
		};
	}

	it("binds the closest entry by its best chunk, though it shares no facet; never a retired or finished one", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, [
			{ facet: true, slug: "on-facet" },
			{ slug: "on-dread" },
			{ active: false, slug: "retired" },
			{ finished: true, slug: "finished" },
		]);
		stub.libraryHits = [
			{ key: ids["retired"], scores: [0.95] },
			{ key: ids["finished"], scores: [0.9] },
			{ key: ids["on-dread"], scores: [0.2, 0.62] },
		];
		const { slug, logged } = await run(user, await session(user));
		expect(slug).toBe("on-dread");
		expect(logged).toMatchObject({
			readFallback: false,
			readSearch: "ran",
			readTopScore: 0.62,
		});
	});

	it("below the floor, binds on facets and logs the fallback", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, [
			{ facet: true, slug: "on-facet" },
			{ slug: "far" },
		]);
		stub.libraryHits = [{ key: ids["far"], scores: [0.05] }];
		const { slug, logged } = await run(user, await session(user));
		expect(slug).toBe("on-facet");
		expect(logged).toMatchObject({ readFallback: true, readTopScore: 0.05 });
	});

	it("an embed failure falls back to facets, is logged, and the kindling still ships", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, [
			{ facet: true, slug: "on-facet" },
			{ slug: "on-dread" },
		]);
		stub.libraryHits = [{ key: ids["on-dread"], scores: [0.9] }];
		stub.embedFails = true;
		const { slug, logged } = await run(user, await session(user));
		expect(slug).toBe("on-facet");
		expect(logged).toMatchObject({ readFallback: true, readSearch: "failed" });
		expect(logged.readTopScore).toBeUndefined();
	});

	it("an elevated session gets no read twig and never searches", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, [
			{ facet: true, slug: "on-facet" },
			{ slug: "on-dread" },
		]);
		stub.libraryHits = [{ key: ids["on-dread"], scores: [0.9] }];
		const { slug, logged } = await run(
			user,
			await session(user, { safeguardLevel: "elevated" })
		);
		expect(slug).toBeNull();
		expect(logged).toMatchObject({ readSearch: "skipped" });
		expect(stub.searched).not.toContain("library");
	});
});

describe("tracks bind on meaning inside the picked topic (#572)", () => {
	const TOPIC = "audio_topic_anxiety_relief";
	type Spec = Partial<Doc<"audio_tracks">> & { slug: string };
	const seedTracks = (user: SeededUser, specs: Spec[]) =>
		user.root.run(async (ctx) => {
			const ids: Record<string, Id<"audio_tracks">> = {};
			for (const spec of specs) {
				ids[spec.slug] = await ctx.db.insert("audio_tracks", {
					active: true,
					durationSec: 60,
					family: "support",
					key: "k",
					sha256: "s",
					sourceTags: [],
					tags: [],
					thumbKey: "t",
					thumbSha256: "ts",
					title: `Title ${spec.slug}`,
					topic: TOPIC,
					...spec,
				});
			}
			return ids;
		});

	const session = async (user: SeededUser) => {
		const sessionId = await seedSession(user.root, user.profileId, {
			rawInput: "a dread I can't name sits on my chest every morning",
			state: "confirmed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, {
			primaryEmotion: "anxiety",
			suggestedSpecialty: "burnout",
			supportNeed: "light",
			thematicTags: [],
		});
		return sessionId;
	};

	async function run(user: SeededUser) {
		stub.reply = JSON.stringify([
			twig(TOPIC, 1),
			twig("breathing", 2),
			twig("xolacer", 3),
			twig("bridge", 4),
		]);
		await generate(user, await session(user));
		const active = (await readPaths(user)).find((p) => p.status === "active")!;
		const step = (await readSteps(user, active._id)).find(
			(t) => t.actionType === TOPIC
		)!;
		const logged = stub.events.find(
			(e) => e.event === "path_generated"
		)!.properties;
		return { logged, slug: (step.params as { slug: string }).slug };
	}

	it("binds the closest track in the topic over tag overlap, never another topic's, and logs the score", async () => {
		const user = await asNewUser();
		await seedTracks(user, [
			{ slug: "tagged", tags: ["anxiety"] },
			{ slug: "on-dread" },
			{ slug: "elsewhere", topic: "audio_topic_grief" },
		]);
		stub.trackHits = {
			[`track:${TOPIC}`]: [
				{ key: "on-dread", scores: [0.2, 0.58] },
				{ key: "elsewhere", scores: [0.99] },
			],
		};
		const { slug, logged } = await run(user);
		expect(slug).toBe("on-dread");
		expect(logged.trackSearch).toEqual([
			{ actionType: TOPIC, fallback: false, search: "ran", topScore: 0.58 },
		]);
		expect(stub.searched.filter((n) => n.startsWith("track:"))).toEqual([
			`track:${TOPIC}`,
		]);
	});

	it("below the floor binds on tags and logs the fallback", async () => {
		const user = await asNewUser();
		await seedTracks(user, [
			{ slug: "tagged", tags: ["anxiety"] },
			{ slug: "far" },
		]);
		stub.trackHits = { [`track:${TOPIC}`]: [{ key: "far", scores: [0.1] }] };
		const { slug, logged } = await run(user);
		expect(slug).toBe("tagged");
		expect(logged.trackSearch).toEqual([
			{ actionType: TOPIC, fallback: true, search: "ran", topScore: 0.1 },
		]);
	});

	it("an embed failure binds on tags, is logged, and the kindling still ships", async () => {
		const user = await asNewUser();
		await seedTracks(user, [
			{ slug: "tagged", tags: ["anxiety"] },
			{ slug: "on-dread" },
		]);
		stub.trackHits = {
			[`track:${TOPIC}`]: [{ key: "on-dread", scores: [0.9] }],
		};
		stub.embedFails = true;
		const { slug, logged } = await run(user);
		expect(slug).toBe("tagged");
		expect(logged.trackSearch).toEqual([
			{ actionType: TOPIC, fallback: true, search: "failed" },
		]);
	});

	it("a search failure binds on tags, is logged, and the kindling still ships", async () => {
		const user = await asNewUser();
		await seedTracks(user, [
			{ slug: "tagged", tags: ["anxiety"] },
			{ slug: "on-dread" },
		]);
		stub.trackHits = {
			[`track:${TOPIC}`]: [{ key: "on-dread", scores: [0.9] }],
		};
		stub.searchFails = true;
		const { slug, logged } = await run(user);
		expect(slug).toBe("tagged");
		expect(logged.trackSearch).toEqual([
			{ actionType: TOPIC, fallback: true, search: "failed" },
		]);
	});

	it("embeds the session once per generation, shared by the read and track searches", async () => {
		const user = await asNewUser();
		await seedTracks(user, [{ slug: "on-dread" }]);
		stub.reply = JSON.stringify([
			twig("read", 1),
			twig(TOPIC, 2),
			twig("breathing", 3),
			twig("xolacer", 4),
		]);
		await generate(user, await session(user));
		expect(stub.searched).toEqual(
			expect.arrayContaining(["library", `track:${TOPIC}`])
		);
		expect(stub.embeds).toBe(1);
	});

	it("upsertTrack re-embeds only when what the index embeds changed", async () => {
		const actual = await vi.importActual<
			typeof import("../ai/paths/audioTracks")
		>("../ai/paths/audioTracks");
		const deleteObject = vi
			.spyOn(actual.r2, "deleteObject")
			.mockResolvedValue(undefined);
		const user = await asNewUser();
		const track = {
			durationSec: 60,
			family: "support" as const,
			key: "k1",
			sha256: "a",
			slug: "s1",
			sourceTags: [],
			tags: ["calm"],
			thumbKey: "t",
			thumbSha256: "ta",
			title: "Slow breath",
			topic: TOPIC,
		};
		const upsert = (over: Partial<typeof track>) =>
			user.root.mutation(internal.ai.paths.audioTracks.upsertTrack, {
				track: { ...track, ...over },
			});
		const reindexes = async () =>
			(await scheduledCalls(user.root)).filter(
				(j) => j.name === "ai/paths/trackSearch:indexTrack"
			).length;

		await upsert({});
		expect(await reindexes()).toBe(1);
		await upsert({ durationSec: 61, key: "k2" }); // same audio, a field the index never reads
		await upsert({ key: "k3", sha256: "b" }); // new audio, same index text
		expect(await reindexes()).toBe(1);
		await upsert({ key: "k4", title: "Slower breath" });
		expect(await reindexes()).toBe(2);
		deleteObject.mockRestore();
	});

	it("upsertTrack keeps a music track's secondary topic and rejects one that isn't another music topic", async () => {
		const actual = await vi.importActual<
			typeof import("../ai/paths/audioTracks")
		>("../ai/paths/audioTracks");
		const deleteObject = vi
			.spyOn(actual.r2, "deleteObject")
			.mockResolvedValue(undefined);
		const user = await asNewUser();
		const track = {
			durationSec: 60,
			family: "music" as const,
			key: "k1",
			licence: {
				acquiredAt: 0,
				artist: "Artist",
				attributionRequired: false,
				attributionText: "Music by Artist",
				licenceName: "Pixabay",
				licenceUrl: "https://pixabay.com/service/license-summary/",
				source: "Pixabay",
				sourceUrl: "https://pixabay.com",
			},
			sha256: "a",
			slug: "m1",
			sourceTags: [],
			tags: [],
			thumbKey: "t",
			thumbSha256: "ta",
			title: "Soft piano",
			topic: "music_topic_calm_peace",
		};
		const upsert = (secondaryTopic: string) =>
			user.root.mutation(internal.ai.paths.audioTracks.upsertTrack, {
				track: { ...track, secondaryTopic },
			});

		await upsert("music_topic_meditation");
		const row = await user.root.run((ctx) =>
			ctx.db.query("audio_tracks").first()
		);
		expect(row?.secondaryTopic).toBe("music_topic_meditation");
		await expect(upsert("audio_topic_grief")).rejects.toThrow(/secondaryTopic/);
		await expect(upsert("music_topic_calm_peace")).rejects.toThrow(
			/secondaryTopic/
		);
		deleteObject.mockRestore();
	});

	it("indexes each track's own text in its topic (and the reframe series); retiring one removes it", async () => {
		const user = await asNewUser();
		const ids = await seedTracks(user, [
			{ slug: "voiced", transcript: "Breathe out slower than you breathe in." },
			{
				family: "music",
				slug: "tune",
				tags: ["calm", "rest"],
				topic: "music_topic_calm",
				whatItsFor: "For a racing mind at night.",
			},
			{ slug: "bare", tags: ["anxiety"] },
			{
				series: "reality-not-false-hope",
				slug: "reframe",
				topic: "audio_topic_shame",
				transcript: "It is not your fault.",
			},
		]);
		for (const trackId of Object.values(ids)) {
			await user.root.action(internal.ai.paths.trackSearch.indexTrack, {
				trackId,
			});
		}
		expect(stub.indexed).toHaveLength(5);
		expect(stub.indexed).toEqual(
			expect.arrayContaining([
				{
					key: "voiced",
					namespace: `track:${TOPIC}`,
					text: "Breathe out slower than you breathe in.",
				},
				{
					key: "tune",
					namespace: "track:music_topic_calm",
					text: "Title tune\n\ncalm, rest\n\nFor a racing mind at night.",
				},
				{
					key: "bare",
					namespace: `track:${TOPIC}`,
					text: "Title bare\n\nanxiety",
				},
				{
					key: "reframe",
					namespace: "track:audio_topic_shame",
					text: "It is not your fault.",
				},
				{
					key: "reframe",
					namespace: "track:reality-not-false-hope",
					text: "It is not your fault.",
				},
			])
		);

		await user.root.mutation(internal.ai.paths.trackSearch.setTrackActive, {
			active: false,
			slug: "reframe",
		});
		expect(
			scheduled(
				await scheduledCalls(user.root),
				"ai/paths/trackSearch:indexTrack"
			)?.args
		).toEqual({ trackId: ids["reframe"] });
		// Run it here; the scheduled copy may land too, so compare as a set.
		await user.root.action(internal.ai.paths.trackSearch.indexTrack, {
			trackId: ids["reframe"],
		});
		expect(new Set(stub.unindexed)).toEqual(
			new Set([
				"track:audio_topic_shame/reframe",
				"track:reality-not-false-hope/reframe",
			])
		);
	});
});

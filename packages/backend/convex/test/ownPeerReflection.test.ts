// @vitest-environment edge-runtime
/**
 * A contributor is never shown their own peer reflection (issue #790,
 * ADR 0002), on any path that shows peer reflections: the free tag cascade,
 * Plus semantic matches and the `listRecent` fallback.
 *
 * Failure modes this guards:
 * - a contributor coming back with the same feeling is shown their own words
 * - semantic ids precomputed before the fix still carry the viewer's own
 * - an own reflection is used to fill the gap when fewer than four remain
 * - the author tag leaks to a client, so reflections could be grouped
 * - a missing REFLECTION_AUTHOR_KEY blocks sharing or matching
 * - reflections pooled before the tag existed stay visible to their author
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	moderationResult,
	seedMetadata,
	seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { actionCacheMock, aggregatesMock, ragMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({
	distilled: undefined as unknown,
	moderation: undefined as unknown,
	rag: { entries: [] as { entryId: string; key?: string; text: string }[] },
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock(stub.rag));
vi.mock("../ai/cached", () =>
	actionCacheMock(() => ({
		distilled: stub.distilled,
		moderation: stub.moderation,
	}))
);

// Fake timers keep scheduled jobs from firing on their own; each test runs
// the contribution job explicitly.
beforeEach(() => {
	vi.useFakeTimers();
	vi.stubEnv("REFLECTION_AUTHOR_KEY", "test-author-key");
	vi.spyOn(console, "error").mockImplementation(() => {});
	stub.moderation = moderationResult();
	stub.distilled = "a long walk helped more than I expected";
	stub.rag.entries = [];
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

/** A user's completed, kept session, shared to the pool, with its anonymizer run. */
async function shareSession(
	user: SeededUser,
	text: string,
	metadata: Parameters<typeof seedMetadata>[3] = {}
) {
	const sessionId = await seedSession(user.root, user.profileId, {
		distilledText: text,
		kept: true,
		mirrorText: `mirror of: ${text}`,
		state: "completed",
	});
	await seedMetadata(user.root, sessionId, user.profileId, metadata);
	await user.t.mutation(api.sessions.recordPostSessionFeedback, {
		contributedReflection: true,
		sessionId,
	});
	await user.root.action(internal.jobs.reflectionAnonymizer.anonymize, {
		sessionId,
	});
	return sessionId;
}

/** A fresh session with the same feeling, on the peers path. */
async function matchingSession(
	user: SeededUser,
	overrides: Parameters<typeof seedSession>[2] = {}
) {
	const sessionId = await seedSession(user.root, user.profileId, {
		mirrorText: "Carrying it again.",
		state: "completed",
		...overrides,
	});
	await seedMetadata(user.root, sessionId, user.profileId);
	return sessionId;
}

/** A follow-up answer on the user's resolved session, shared to the pool. */
async function shareFollowUp(user: SeededUser) {
	const sessionId = await seedSession(user.root, user.profileId, {
		mirrorText: "Being unseen while carrying it.",
		state: "completed",
	});
	await seedMetadata(user.root, sessionId, user.profileId);
	const cardId = await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "How's it sitting now?",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "resolved",
			tier: "standard",
			userResponse: "lighter",
			workflowId: "wf1" as WorkflowId,
		})
	);
	await user.t.mutation(api.followUpResponses.record, {
		cardId,
		reflectionText: "a long walk",
		shareRequested: true,
	});
	const response = await user.root.run((ctx) =>
		ctx.db
			.query("follow_up_responses")
			.withIndex("by_card", (q) => q.eq("cardId", cardId))
			.first()
	);
	await user.root.action(internal.jobs.followUpShare.share, {
		responseId: response!._id,
	});
}

/** The pool row holding `text`, as the RAG search would key it. */
const ragEntry = async (root: SeededUser["root"], text: string) => {
	const row = await root.run((ctx) =>
		ctx.db
			.query("reflections")
			.withIndex("by_seed_displayText", (q) =>
				q.eq("isSeed", false).eq("displayText", text)
			)
			.first()
	);
	return { entryId: `e-${row!._id}`, key: row!._id, text };
};

const shownTo = async (user: SeededUser, sessionId: Id<"sessions">) =>
	(await user.t.query(api.reflections.matchForSession, { sessionId })).map(
		(r) => r.displayText
	);

describe("matchForSession (free tag cascade)", () => {
	it("never shows a contributor their own session reflection; others still see it", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(a, "I kept waiting for the other shoe to drop");

		expect(await shownTo(a, await matchingSession(a))).toEqual([]);
		expect(await shownTo(b, await matchingSession(b))).toEqual([
			"I kept waiting for the other shoe to drop",
		]);
	});

	it("never shows a contributor the reflection they shared from a follow-up answer", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareFollowUp(a);

		expect(await shownTo(a, await matchingSession(a))).toEqual([]);
		expect(await shownTo(b, await matchingSession(b))).toEqual([
			"a long walk helped more than I expected",
		]);
	});
});

// A feeling the tag cascade never reaches from the default anxiety session,
// so only the semantic search can surface these rows.
const OTHER_FEELING = { granularLabel: "relief", primaryEmotion: "joy" };

describe("matchForSession (Xolace+ semantic)", () => {
	beforeEach(() => {
		vi.stubEnv("PREMIUM_DEV_OVERRIDE", "true");
	});

	it("skips the contributor's own top semantic match and keeps four others", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(a, "mine, the closest text in the pool");
		const others = ["other 1", "other 2", "other 3", "other 4"];
		for (const text of others) {
			await shareSession(b, text, OTHER_FEELING);
		}
		stub.rag.entries = [
			await ragEntry(a.root, "mine, the closest text in the pool"),
			...(await Promise.all(others.map((t) => ragEntry(a.root, t)))),
		];

		const sessionId = await matchingSession(a);
		await a.root.action(internal.reflectionsRag.computeSemanticMatches, {
			sessionId,
		});

		expect(await shownTo(a, sessionId)).toEqual(others);
	});

	it("tops up from the cascade, never with the viewer's own, when an own semantic match is dropped", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(a, "mine");
		await shareSession(b, "semantic 1", OTHER_FEELING);
		await shareSession(b, "semantic 2", OTHER_FEELING);
		await shareSession(b, "same feeling, theirs");
		stub.rag.entries = [
			await ragEntry(a.root, "mine"),
			await ragEntry(a.root, "semantic 1"),
			await ragEntry(a.root, "semantic 2"),
		];

		const sessionId = await matchingSession(a);
		await a.root.action(internal.reflectionsRag.computeSemanticMatches, {
			sessionId,
		});

		expect(await shownTo(a, sessionId)).toEqual([
			"semantic 1",
			"semantic 2",
			"same feeling, theirs",
		]);
	});

	it("drops the viewer's own reflection from semantic ids precomputed before the fix", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(a, "mine");
		await shareSession(b, "theirs", OTHER_FEELING);
		const own = await ragEntry(a.root, "mine");
		const theirs = await ragEntry(a.root, "theirs");

		const sessionId = await matchingSession(a, {
			semanticMatchIds: [own.key, theirs.key],
		});

		expect(await shownTo(a, sessionId)).toEqual(["theirs"]);
	});
});

describe("listRecent", () => {
	it("leaves out the viewer's newest own reflection; others still see it", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(b, "theirs");
		await shareSession(a, "mine, just shared");

		const recent = async (user: SeededUser) =>
			(await user.t.query(api.reflections.listRecent, { limit: 1 })).map(
				(r) => r.displayText
			);
		expect(await recent(a)).toEqual(["theirs"]);
		expect(await recent(b)).toEqual(["mine, just shared"]);
	});

	it("rejects a limit that isn't an integer", async () => {
		const a = await asNewUser(1);
		for (const limit of [Number.NaN, Number.POSITIVE_INFINITY, 2.5]) {
			await expect(
				a.t.query(api.reflections.listRecent, { limit })
			).rejects.toThrow("limit must be an integer");
		}
	});
});

describe("what the peers path returns", () => {
	it("shows fewer than four rather than the viewer's own", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		for (const text of ["mine 1", "mine 2", "mine 3"]) {
			await shareSession(a, text);
		}
		await shareSession(b, "theirs 1");
		await shareSession(b, "theirs 2");

		expect((await shownTo(a, await matchingSession(a))).sort()).toEqual([
			"theirs 1",
			"theirs 2",
		]);
		expect(
			(await a.t.query(api.reflections.listRecent, { limit: 4 }))
				.map((r) => r.displayText)
				.sort()
		).toEqual(["theirs 1", "theirs 2"]);
	});

	it("never carries the author tag", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await shareSession(a, "mine");

		const sessionId = await matchingSession(b);
		const matched = await b.t.query(api.reflections.matchForSession, {
			sessionId,
		});
		const recent = await b.t.query(api.reflections.listRecent, { limit: 4 });
		expect(matched).toHaveLength(1);
		expect(recent).toHaveLength(1);
		for (const r of [...matched, ...recent]) {
			expect(r).not.toHaveProperty("authorTag");
		}
	});

	it("fails open without REFLECTION_AUTHOR_KEY: sharing still pools, matching still returns", async () => {
		vi.stubEnv("REFLECTION_AUTHOR_KEY", "");
		const a = await asNewUser(1);
		await shareSession(a, "mine, shared with no key");

		expect(await shownTo(a, await matchingSession(a))).toEqual([
			"mine, shared with no key",
		]);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("REFLECTION_AUTHOR_KEY is not set")
		);
	});
});

describe("migrations:tagReflectionAuthors", () => {
	/** A session shared before #790: its pool row carries no author tag. */
	async function sharedBeforeTheFix(
		user: SeededUser,
		session: { distilledText?: string; mirrorText?: string }
	) {
		const sessionId = await matchingSession(user, {
			contributedReflection: true,
			kept: true,
			...session,
		});
		const text = session.distilledText ?? session.mirrorText ?? "";
		await user.root.run((ctx) =>
			ctx.db.insert("reflections", {
				addedAt: Date.now(),
				displayText: text,
				intensity: 8,
				isSeed: false,
				primaryEmotion: "anxiety",
				resonanceCount: 0,
				status: "active",
				thematicTags: ["work"],
			})
		);
		return sessionId;
	}

	/** Both passes in order, as `tagReflectionAuthorsAll` runs them. */
	const runBackfill = async (root: SeededUser["root"]) => {
		for (const pass of [
			internal.migrations.claimReflectionAuthors,
			internal.migrations.tagReflectionAuthors,
		]) {
			await root.mutation(pass, {
				batchSize: 100,
				cursor: null,
				dryRun: false,
				oneBatchOnly: true,
			});
		}
	};

	it("tags session reflections pooled before the fix, from distilled or mirror text", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await sharedBeforeTheFix(a, { distilledText: "distilled, mine" });
		await sharedBeforeTheFix(a, { mirrorText: "mirror, mine" });
		const sessionId = await matchingSession(a);
		expect(await shownTo(a, sessionId)).toHaveLength(2);

		await runBackfill(a.root);

		expect(await shownTo(a, sessionId)).toEqual([]);
		expect((await shownTo(b, await matchingSession(b))).sort()).toEqual([
			"distilled, mine",
			"mirror, mine",
		]);
	});

	it("tags every pooled copy past the first batch, on the first run and on a re-run", async () => {
		const a = await asNewUser(1);
		const text = "pooled many times by a re-run job";
		await sharedBeforeTheFix(a, { distilledText: text });
		const copies = async () =>
			await a.root.run((ctx) =>
				ctx.db
					.query("reflections")
					.withIndex("by_seed_displayText", (q) =>
						q.eq("isSeed", false).eq("displayText", text)
					)
					.collect()
			);
		const first = (await copies())[0]!;
		const { _id, _creationTime, ...row } = first;
		// More than one batch (10), so a single take() can't reach them all.
		const extra = 15;
		for (let i = 0; i < extra; i++) {
			await a.root.run((ctx) => ctx.db.insert("reflections", row));
		}

		await runBackfill(a.root);
		const tagged = await copies();
		expect(tagged).toHaveLength(extra + 1);
		const tags = new Set(tagged.map((r) => r.authorTag));
		expect(tags.size).toBe(1);
		expect([...tags][0]).toEqual(expect.any(String));

		// A copy pooled after the first run, behind already-tagged ones.
		await a.root.run((ctx) => ctx.db.insert("reflections", row));
		await runBackfill(a.root);
		expect((await copies()).filter((r) => r.authorTag === undefined)).toEqual(
			[]
		);
	});

	it("leaves text two profiles both wrote untagged, and still tags the rest", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		const shared = "I just needed someone to listen";
		await sharedBeforeTheFix(a, { distilledText: shared });
		await sharedBeforeTheFix(b, { distilledText: shared });
		await sharedBeforeTheFix(a, { distilledText: "only mine" });

		await runBackfill(a.root);

		const rows = await a.root.run((ctx) =>
			ctx.db
				.query("reflections")
				.withIndex("by_seed_displayText", (q) => q.eq("isSeed", false))
				.collect()
		);
		const tagsOf = (text: string) =>
			rows.filter((r) => r.displayText === text).map((r) => r.authorTag);
		expect(tagsOf(shared)).toEqual([undefined, undefined]);
		expect(tagsOf("only mine")).toEqual([expect.any(String)]);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("left untagged for manual review")
		);
		// Neither author's own exclusion was handed to the other.
		expect(await shownTo(b, await matchingSession(b))).toEqual([
			shared,
			shared,
			"only mine",
		]);
	});

	it("leaves a seed with the same text untagged", async () => {
		const a = await asNewUser(1);
		await a.root.mutation(internal.reflections.seed, {
			reflections: [
				{
					displayText: "a line everyone feels",
					intensity: 8,
					primaryEmotion: "anxiety",
					thematicTags: ["work"],
				},
			],
		});
		await matchingSession(a, {
			contributedReflection: true,
			distilledText: "a line everyone feels",
			kept: true,
		});

		await runBackfill(a.root);

		expect(await shownTo(a, await matchingSession(a))).toEqual([
			"a line everyone feels",
		]);
	});
});

// @vitest-environment edge-runtime
/**
 * Exercise routing on meaning (#569, ADR 0021), end to end: `generateMirror`
 * picks the session's exercise and `getSwapOptions` offers the next one. The
 * ladder's safety and emotion steps stay rules; only the catch-all ranks the
 * `exercises` namespace by the mirror's own session vector. Faked as in
 * mirrorPipeline.test.ts: components, providers, and scheduled callees.
 */

import { MockEmbeddingModelV3 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ExerciseTitle } from "../exercises/match";
import {
	classificationResult,
	moderationResult,
	seedMetadata,
	seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
	actionCacheMock,
	aggregatesMock,
	anthropicMock,
	noopJob,
	posthogMock,
	ragMock,
	rateLimiterMock,
	revenuecatMock,
} from "./mocks.helpers";

const RAW_TEXT = "I keep replaying what he said at dinner";
const TITLES: ExerciseTitle[] = [
	"let_it_land",
	"find_your_edges",
	"make_room",
	"speak_to_it",
	"soften_toward_it",
	"reset",
];

const stub = vi.hoisted(() => ({
	cache: {} as { moderation?: unknown; classification?: unknown },
	embedFails: false,
	exerciseHits: [] as { title: string; score: number }[],
	searched: [] as string[],
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../rag", () => {
	const base = ragMock();
	return {
		...base,
		rag: {
			...base.rag,
			options: {
				...base.rag.options,
				textEmbeddingModel: new MockEmbeddingModelV3({
					doEmbed: async ({ values }) => {
						if (stub.embedFails) {
							throw new Error("embeddings down");
						}
						return { embeddings: values.map(() => [0]), warnings: [] };
					},
				}),
			},
			search: async (_ctx: unknown, args: { namespace: string }) => {
				stub.searched.push(args.namespace);
				if (args.namespace !== "exercises") {
					return { entries: [], results: [] };
				}
				return {
					entries: stub.exerciseHits.map((h) => ({
						entryId: `e_${h.title}`,
						key: h.title,
						text: "",
					})),
					results: stub.exerciseHits.map((h) => ({
						entryId: `e_${h.title}`,
						score: h.score,
					})),
				};
			},
		},
	};
});
vi.mock("../ai/cached", () => actionCacheMock(() => stub.cache));
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(() => ({ ok: true })),
}));
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	...anthropicMock(() => "It isn't the words. It's that they keep arriving."),
}));
vi.mock("../ai/tts", async (orig) => ({
	...(await orig<typeof import("../ai/tts")>()),
	generateMirrorAudio: noopJob(),
}));
vi.mock("../episodicMemory", async (orig) => ({
	...(await orig<typeof import("../episodicMemory")>()),
	ingestSession: noopJob(),
}));
vi.mock("../jobs/reflectionDistiller", () => ({ distill: noopJob() }));

// A catch-all session: no distress emotion, no ladder language.
const CATCH_ALL = {
	primaryEmotion: "sadness",
	userLanguageTags: [] as string[],
};

beforeEach(() => {
	stub.cache = {
		classification: classificationResult(CATCH_ALL),
		moderation: moderationResult(),
	};
	stub.exerciseHits = [
		{ score: 0.62, title: "speak_to_it" },
		{ score: 0.4, title: "make_room" },
	];
	stub.embedFails = false;
	stub.searched = [];
});

async function seedExercises(
	user: SeededUser
): Promise<Map<Id<"exercises">, string>> {
	const now = Date.now();
	const byId = new Map<Id<"exercises">, string>();
	for (const title of TITLES) {
		const id = await user.root.run((ctx) =>
			ctx.db.insert("exercises", {
				active: true,
				createdAt: now,
				estimatedMinutes: 2,
				intensityRange: { max: 10, min: 0 },
				steps: [],
				targetEmotions: [],
				title,
				type: "grounding",
				updatedAt: now,
			})
		);
		byId.set(id, title);
	}
	return byId;
}

/** Runs the mirror and returns the matched title plus the swap sheet's next-best. */
async function mirror({ firstSession = false } = {}) {
	const user = await asNewUser();
	const titleOf = await seedExercises(user);
	if (!firstSession) {
		const prior = await seedSession(user.root, user.profileId, {
			mirrorText: "Before.",
			state: "completed",
		});
		await seedMetadata(user.root, prior, user.profileId);
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, { sessionCount: 1 })
		);
	}
	const sessionId = await seedSession(user.root, user.profileId, {
		rawInput: RAW_TEXT,
	});
	await user.root.action(internal.ai.process.generateMirror, {
		rawText: RAW_TEXT,
		sessionId,
	});

	const session = await user.root.run((ctx) =>
		ctx.db.get("sessions", sessionId)
	);
	const swap = await user.t.query(api.exercises.getSwapOptions, { sessionId });
	return {
		matched: titleOf.get(session!.matchedExerciseId!),
		nextBest: swap.nextBestId && titleOf.get(swap.nextBestId),
	};
}

describe("exercise routing on meaning", () => {
	it("a catch-all session gets the closest exercise first, and the swap follows", async () => {
		expect(await mirror()).toEqual({
			matched: "speak_to_it",
			nextBest: "make_room",
		});
		expect(stub.searched).toContain("exercises");
	});

	it("a safety step keeps today's order however close the meaning", async () => {
		stub.cache.classification = classificationResult({
			...CATCH_ALL,
			intensity: 9,
		});
		expect(await mirror()).toEqual({
			matched: "reset",
			nextBest: "let_it_land",
		});
	});

	it("an emotion step keeps today's order", async () => {
		stub.cache.classification = classificationResult({
			...CATCH_ALL,
			primaryEmotion: "shame",
		});
		expect(await mirror()).toEqual({
			matched: "soften_toward_it",
			nextBest: "let_it_land",
		});
	});

	it("nothing above the floor keeps today's order", async () => {
		stub.exerciseHits = [{ score: 0.2, title: "speak_to_it" }];
		expect(await mirror()).toEqual({
			matched: "let_it_land",
			nextBest: "make_room",
		});
	});

	it("a first session has no vector and keeps today's order", async () => {
		expect(await mirror({ firstSession: true })).toEqual({
			matched: "let_it_land",
			nextBest: "make_room",
		});
		expect(stub.searched).not.toContain("exercises");
	});

	it("a failed embed keeps today's order", async () => {
		stub.embedFails = true;
		expect(await mirror()).toEqual({
			matched: "let_it_land",
			nextBest: "make_room",
		});
	});
});

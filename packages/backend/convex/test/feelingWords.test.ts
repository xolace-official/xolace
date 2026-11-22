// @vitest-environment edge-runtime
/**
 * B10: the mirror reads the feeling words people pick. `submitInput` keeps
 * them apart from what they wrote (`textures`), and `generateMirror` hands
 * every AI reader both, labelled: the classifier (and so the safeguard's
 * risk read and exercise matching), moderation, and the mirror. A picked word
 * never reaches Sit's "You said" quote. Providers are faked as in
 * mirrorPipeline.test.ts; here they also record what they were given.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	expectCode,
	scheduled,
	scheduledCalls,
	seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
	aggregatesMock,
	noopJob,
	posthogMock,
	ragMock,
	rateLimiterMock,
	revenuecatMock,
} from "./mocks.helpers";

const MIRROR =
	"Heavy and restless at once: the week hasn't let you set it down.";
const WROTE = "work again, all week";
const WORDS = ["heavy", "restless"];

const stub = vi.hoisted(() => ({
	articulator: [] as { system?: string; user?: string }[],
	classifier: [] as { userPrompt: string }[],
	moderation: [] as { text: string }[],
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(() => ({ ok: true })),
}));
vi.mock("../ai/cached", async () => {
	const { classificationResult: classified, moderationResult: moderated } =
		await import("./fixtures.helpers");
	return {
		classifierCache: {
			fetch: async (_ctx: unknown, args: { userPrompt: string }) => {
				stub.classifier.push(args);
				// A catch-all feeling, so Let it land (and its quote) is matched.
				return classified({ primaryEmotion: "sadness", userLanguageTags: [] });
			},
		},
		distillerCache: { fetch: async () => null },
		moderationCache: {
			fetch: async (_ctx: unknown, args: { text: string }) => {
				stub.moderation.push(args);
				return moderated();
			},
		},
	};
});
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	getAnthropicClient: () => ({
		messages: {
			create: async (args: {
				system?: string;
				messages: { content: string }[];
			}) => {
				stub.articulator.push({
					system: args.system,
					user: args.messages[0]?.content,
				});
				return {
					content: [{ text: MIRROR, type: "text" }],
					usage: { input_tokens: 0, output_tokens: 0 },
				};
			},
		},
	}),
}));
vi.mock("../ai/tts", async (orig) => ({
	...(await orig<typeof import("../ai/tts")>()),
	generateMirrorAudio: noopJob(),
}));
vi.mock("../ai/slotFill", () => ({ fillSlots: noopJob() }));
vi.mock("../episodicMemory", async (orig) => ({
	...(await orig<typeof import("../episodicMemory")>()),
	ingestSession: noopJob(),
}));
vi.mock("../jobs/reflectionDistiller", () => ({ distill: noopJob() }));

beforeEach(() => {
	stub.articulator = [];
	stub.classifier = [];
	stub.moderation = [];
	// Hold scheduled work (the mirror a submit queues): asserted, never run.
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

const readSession = (user: SeededUser, sessionId: Id<"sessions">) =>
	user.root.run((ctx) => ctx.db.get("sessions", sessionId));

describe("submitInput: textures", () => {
	const submit = async (
		entryType: "word_cloud" | "guided_entry" | "open_prompt",
		rawInput: string,
		textures?: string[]
	) => {
		const user = await asNewUser();
		const sessionId = await seedSession(user.root, user.profileId, {
			entryType,
			state: "initiated",
		});
		const run = () =>
			user.t.mutation(api.sessions.submitInput, {
				freezeOccurred: false,
				rawInput,
				sessionId,
				...(textures && { textures }),
			});
		return { run, sessionId, user };
	};

	it("keeps the picked words apart from what they wrote", async () => {
		const { run, sessionId, user } = await submit("guided_entry", WROTE, [
			" heavy ",
			"restless",
			"heavy",
		]);
		await run();
		const session = await readSession(user, sessionId);
		expect(session?.rawInput).toBe(WROTE);
		expect(session?.textures).toEqual(WORDS);
		expect(session?.state).toBe("processing");
	});

	it("keeps a words-only entry's joined words as its input", async () => {
		const { run, sessionId, user } = await submit(
			"word_cloud",
			"heavy, restless",
			WORDS
		);
		await run();
		const session = await readSession(user, sessionId);
		expect(session?.rawInput).toBe("heavy, restless");
		expect(session?.textures).toEqual(WORDS);
	});

	it("stores nothing new for an older build that sends no words", async () => {
		const { run, sessionId, user } = await submit("open_prompt", WROTE);
		await run();
		const session = await readSession(user, sessionId);
		expect(session?.textures).toBeUndefined();
		expect(session?.rawInput).toBe(WROTE);
		// The mirror is queued with the same args as before.
		const job = scheduled(await scheduledCalls(user.root), "generateMirror");
		expect(job?.args).toEqual({ rawText: WROTE, sessionId });
	});

	it("stores no field for an empty or blank pick", async () => {
		const { run, sessionId, user } = await submit("guided_entry", WROTE, [
			"  ",
		]);
		await run();
		expect((await readSession(user, sessionId))?.textures).toBeUndefined();
	});

	it("refuses more than four words, or a word too long to be one", async () => {
		const many = await submit("word_cloud", "a, b, c, d, e", [
			"a",
			"b",
			"c",
			"d",
			"e",
		]);
		await expectCode(many.run, "invalid_textures");
		const long = await submit("word_cloud", "x", ["x".repeat(33)]);
		await expectCode(long.run, "invalid_textures");
		// Refused before anything changed.
		expect((await readSession(many.user, many.sessionId))?.state).toBe(
			"initiated"
		);
	});
});

describe("generateMirror: feeling words", () => {
	/** A first session (no recall, no embedding) carrying Let it land's quote. */
	const mirror = async (
		entryType: "word_cloud" | "guided_entry" | "open_prompt",
		rawText: string,
		textures?: string[]
	) => {
		const user = await asNewUser();
		const now = Date.now();
		await user.root.run((ctx) =>
			ctx.db.insert("exercises", {
				active: true,
				createdAt: now,
				estimatedMinutes: 1.5,
				intensityRange: { max: 10, min: 0 },
				steps: [
					{
						content: "You said: “{{user_phrase}}.”",
						defaultContent: "You named something hard.",
						durationSeconds: 4,
						order: 1,
						slotKeys: ["user_phrase"],
						type: "text" as const,
					},
				],
				targetEmotions: [],
				title: "let_it_land",
				type: "grounding",
				updatedAt: now,
			})
		);
		const sessionId = await seedSession(user.root, user.profileId, {
			entryType,
			rawInput: rawText,
			...(textures && { textures }),
		});
		await user.root.action(internal.ai.process.generateMirror, {
			rawText,
			sessionId,
		});
		const slotFill = scheduled(await scheduledCalls(user.root), "fillSlots");
		return { session: await readSession(user, sessionId), slotFill };
	};

	it("typed only: every reader gets their text, as before B10", async () => {
		const { session, slotFill } = await mirror("open_prompt", WROTE);
		expect(session?.mirrorText).toBe(MIRROR);
		expect(stub.moderation[0]?.text).toBe(WROTE);
		expect(stub.classifier[0]?.userPrompt).toContain(`---\n${WROTE}\n---`);
		expect(stub.articulator[0]?.user).toBe(WROTE);
		expect(stub.articulator[0]?.system).not.toContain("## Feeling Words");
		expect(slotFill?.args.userText).toBe(WROTE);
	});

	it("words only: labelled as picked, and never quotable", async () => {
		const { slotFill } = await mirror("word_cloud", "heavy, restless", WORDS);
		const labelled = "Feeling words they picked: heavy, restless";
		expect(stub.moderation[0]?.text).toContain(labelled);
		expect(stub.classifier[0]?.userPrompt).toContain(labelled);
		expect(stub.classifier[0]?.userPrompt).toContain(
			"they only picked feeling words"
		);
		expect(stub.articulator[0]?.user).toContain(labelled);
		expect(stub.articulator[0]?.system).toContain("## Feeling Words");
		// "You said" can't quote a tapped word: the fill gets no text of theirs.
		expect(slotFill?.args.userText).toBe("");
	});

	it("words only from an older build: still never quotable", async () => {
		const { slotFill } = await mirror("word_cloud", "heavy, restless");
		expect(stub.articulator[0]?.user).toBe("heavy, restless");
		expect(slotFill?.args.userText).toBe("");
	});

	it("both: two labelled parts for every reader; only the writing is quotable", async () => {
		const { slotFill } = await mirror("guided_entry", WROTE, WORDS);
		const both = `What they wrote:\n${WROTE}\n\nFeeling words they picked: heavy, restless`;
		expect(stub.moderation[0]?.text).toBe(both);
		expect(stub.classifier[0]?.userPrompt).toContain(both);
		expect(stub.classifier[0]?.userPrompt).toContain(
			"Feeling words were also picked alongside it"
		);
		expect(stub.articulator[0]?.user).toBe(both);
		expect(stub.articulator[0]?.system).toContain("describe the same moment");
		expect(slotFill?.args.userText).toBe(WROTE);
	});
});

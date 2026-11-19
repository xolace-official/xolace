// @vitest-environment edge-runtime
/**
 * The letters contract, slice 2 (spec: docs/plan/letters.md): send and its
 * gates and caps, the Sent and received reads, opt-in and the push switch.
 * The check's model calls are stubbed; its decisions are `decide.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { WordsVerdict } from "../ai/intake/read";
import type { LetterVerdict } from "../ai/letters/check";
import { letterPhrasePeak } from "../ai/letters/floor";
import { expectCode } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, rateLimiterMock } from "../test/mocks.helpers";
import { FIXABLE_LINES } from "./lines";
import { DAY_MS, SENT_LIST_MAX, SENT_LIST_READ_MAX } from "./rules";

type Captured = { event: string; properties: Record<string, unknown> };

const stub = vi.hoisted(() => ({
	classify: 0,
	events: [] as Captured[],
	limitOk: true,
	safety: {
		level: "none",
		resources: [],
		unavailable: false,
	} as WordsVerdict,
	verdict: {
		crisisMention: "none",
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
	...rateLimiterMock(() => ({ ok: stub.limitOk })),
}));
vi.mock("../ai/letters/run", () => ({
	classifyLetter: async () => null,
	letterCheckDeps: {
		classify: async () => {
			stub.classify++;
			return stub.verdict;
		},
		safety: async () => stub.safety,
	},
}));

// 2026-11-19 12:00 UTC.
const NOW = Date.UTC(2026, 10, 19, 12);

const KIND_LETTER =
	"I don't know what you're carrying tonight, but the night ends. Be gentle with yourself.";
const OTHER_LETTER =
	"Some days are long and some are short. You don't have to be strong for all of them.";
const THIRD_LETTER =
	"Small things count. A glass of water, a window open, a song you love. You're doing it.";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	stub.classify = 0;
	stub.events = [];
	stub.limitOk = true;
	stub.safety = { level: "none", resources: [], unavailable: false };
	stub.verdict = {
		crisisMention: "none",
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

/** An adult who has finished a session: someone who may write. */
async function writer(n = 1, root = asUnauthed()): Promise<SeededUser> {
	const user = await asNewUser(n, root);
	await declareAge(user);
	await user.root.run((ctx) =>
		ctx.db.patch("emotional_profiles", user.profileId, { sessionCount: 1 })
	);
	return user;
}

const send = (user: SeededUser, text = KIND_LETTER) =>
	user.t.action(api.letters.send.send, { text });

const lettersOf = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("letters")
			.withIndex("by_sender_created", (q) =>
				q.eq("senderProfileId", user.profileId)
			)
			.collect()
	);

const nextDay = () => vi.setSystemTime(Date.now() + DAY_MS);

const sentEvents = () =>
	stub.events.filter((e) => e.event === "letter_sent").map((e) => e.properties);

const HOSTILE: LetterVerdict = {
	crisisMention: "none",
	fixable: null,
	hostile: true,
	language: "en",
};

/** Places `letterId` with `recipient`, as matching will (slice 3). */
const place = (
	root: SeededUser["root"],
	letterId: Id<"letters">,
	recipient: SeededUser
) =>
	root.run((ctx) =>
		ctx.db.patch("letters", letterId, {
			receivedAt: Date.now(),
			recipientProfileId: recipient.profileId,
			status: "received",
		})
	);

describe("letters.send gates", () => {
	it("refuses a caller who isn't signed in", async () => {
		await expectCode(
			() => asUnauthed().action(api.letters.send.send, { text: KIND_LETTER }),
			"not_authenticated"
		);
	});

	it("asks for an age first, and refuses a minor", async () => {
		const unknown = await asNewUser(1);
		await expectCode(() => send(unknown), "age_required");

		const teen = await asNewUser(2, unknown.root);
		await declareAge(teen, "2010-05-01");
		await expectCode(() => send(teen), "age_restricted");
	});

	it("opens only after a finished session", async () => {
		const user = await asNewUser();
		await declareAge(user);
		await expectCode(() => send(user), "no_session");
	});

	it("refuses a letter under 40 or over 500 characters, trimmed", async () => {
		const user = await writer();
		await expectCode(
			() => send(user, `   ${"a".repeat(39)}   `),
			"invalid_letter"
		);
		await expectCode(() => send(user, "a".repeat(501)), "invalid_letter");
		expect(stub.classify).toBe(0);
	});

	it("throws rate_limited past the day's checks, before any model call", async () => {
		const user = await writer();
		stub.limitOk = false;
		await expectCode(() => send(user), "rate_limited");
		expect(stub.classify).toBe(0);
		expect(await lettersOf(user)).toHaveLength(0);
	});
});

describe("letters.send outcomes", () => {
	it("stores a passing letter as waiting, trimmed", async () => {
		const user = await writer();
		expect(await send(user, `  ${KIND_LETTER}\n`)).toEqual({ kind: "pass" });
		expect(await lettersOf(user)).toMatchObject([
			{ checkedAt: NOW, status: "waiting", text: KIND_LETTER },
		]);
	});

	it("keeps the sender's aim on the letter", async () => {
		const user = await writer();
		await user.t.action(api.letters.send.send, {
			aim: "grief",
			text: KIND_LETTER,
		});
		expect((await lettersOf(user))[0]?.aim).toBe("grief");
	});

	it("returns a fixable letter with its fixed line and stores nothing", async () => {
		const user = await writer();
		stub.verdict = {
			crisisMention: "none",
			fixable: "medical",
			hostile: false,
			language: "en",
		};
		expect(await send(user)).toEqual({
			kind: "fixable",
			line: FIXABLE_LINES.medical,
		});
		expect(await lettersOf(user)).toHaveLength(0);
	});

	it("returns contact details the classifier missed, storing nothing", async () => {
		const user = await writer();
		expect(
			await send(user, `${KIND_LETTER} Text me on 0244 123 4567 any time.`)
		).toEqual({ kind: "fixable", line: FIXABLE_LINES.contact });
		expect(stub.classify).toBe(1);
		expect(await lettersOf(user)).toHaveLength(0);
	});

	it("returns a letter in another language and stores nothing", async () => {
		const user = await writer();
		stub.verdict = {
			crisisMention: "none",
			fixable: null,
			hostile: false,
			language: "fr",
		};
		expect(await send(user)).toEqual({ kind: "lang" });
		expect(await lettersOf(user)).toHaveLength(0);
	});

	it("at risk: one letter escalation with no text, nothing stored", async () => {
		const user = await writer();
		stub.safety = {
			level: "crisis",
			peak: {
				level: "crisis",
				triggerConfidence: 0.95,
				triggerEvidence: "explicit crisis phrase",
				triggerType: "explicit_crisis_language",
			},
			resources: [],
			unavailable: false,
		};
		expect(await send(user)).toEqual({ kind: "risk" });
		expect(await lettersOf(user)).toHaveLength(0);

		const events = await user.root.run((ctx) =>
			ctx.db
				.query("escalation_events")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			actionTaken: "crisis_line_presented",
			source: "letter",
			triggerEvidence: "explicit crisis phrase",
			triggerType: "explicit_crisis_language",
		});
		expect(events[0]?.sessionId).toBeUndefined();
		expect(JSON.stringify(events[0])).not.toContain("carrying");
	});

	// Review of #857: a floor cut must never lower crisis to elevated. The
	// safety half is what the engine gives these with moderation clean and the
	// safeguard down: the letters floor's elevated on what's left after the cut.
	it.each([
		"I survived today wanting to kill myself. I want to die.",
		"I tried to kill myself and I want to die.",
		"I tried to take my life back but I want to die.",
	])("presents the crisis line beside a cut mention: %s", async (text) => {
		const peak = letterPhrasePeak(text);
		expect(peak?.level).toBe("elevated");
		const kind: LetterVerdict = {
			crisisMention: "past_or_others",
			fixable: null,
			hostile: false,
			language: "en",
		};
		for (const verdict of [
			kind,
			{ ...kind, crisisMention: "current" as const },
			null,
		]) {
			const user = await writer();
			stub.safety = {
				level: "elevated",
				...(peak && { peak }),
				resources: [],
				unavailable: true,
			};
			stub.verdict = verdict;
			expect(await send(user, text)).toEqual({ kind: "risk" });
			expect(await lettersOf(user)).toHaveLength(0);
			const events = await user.root.run((ctx) =>
				ctx.db
					.query("escalation_events")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.collect()
			);
			expect(events).toMatchObject([
				{
					actionTaken: "crisis_line_presented",
					source: "letter",
					triggerType: "crisis_keywords",
				},
			]);
		}
	});

	it("holds a hostile letter for review with a strike, never in Sent", async () => {
		const user = await writer();
		stub.verdict = {
			crisisMention: "none",
			fixable: null,
			hostile: true,
			language: "en",
		};
		expect(await send(user)).toEqual({ kind: "held" });

		const [letter] = await lettersOf(user);
		expect(letter).toMatchObject({ status: "held" });
		expect(letter?.textHash).toMatch(/^[0-9a-f]{64}$/);
		const { reviews, strikes } = await user.root.run(async (ctx) => ({
			reviews: await ctx.db.query("letter_reviews").collect(),
			strikes: await ctx.db.query("letter_strikes").collect(),
		}));
		expect(reviews).toMatchObject([{ kind: "held", state: "open" }]);
		expect(strikes).toMatchObject([
			{ cause: "held", senderProfileId: user.profileId },
		]);
		expect(await user.t.query(api.letters.sent.list, {})).toEqual([]);
	});

	it("refuses the same held words again with no model call and no second strike", async () => {
		const user = await writer();
		stub.verdict = {
			crisisMention: "none",
			fixable: null,
			hostile: true,
			language: "en",
		};
		await send(user);
		stub.classify = 0;

		nextDay();
		expect(await send(user, `  ${KIND_LETTER}  `)).toEqual({ kind: "held" });
		expect(stub.classify).toBe(0);
		const strikes = await user.root.run((ctx) =>
			ctx.db.query("letter_strikes").collect()
		);
		expect(strikes).toHaveLength(1);
		// The repeat isn't a new held in analytics either.
		expect(sentEvents()).toEqual([{ outcome: "held" }]);
	});

	it("the same held words stored twice at once are one row and one strike", async () => {
		const user = await writer();
		const storeHeld = () =>
			user.root.mutation(internal.letters.send.store, {
				language: "en",
				profileId: user.profileId,
				status: "held",
				text: KIND_LETTER,
				textHash: "same-words",
			});
		await Promise.all([storeHeld(), storeHeld()]);
		const { letters, reviews, row, strikes } = await user.root.run(
			async (ctx) => ({
				letters: await ctx.db.query("letters").collect(),
				reviews: await ctx.db.query("letter_reviews").collect(),
				row: await ctx.db
					.query("letter_profiles")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.unique(),
				strikes: await ctx.db.query("letter_strikes").collect(),
			})
		);
		expect(letters).toHaveLength(1);
		expect(reviews).toHaveLength(1);
		expect(strikes).toHaveLength(1);
		expect(row?.pausedUntil).toBeUndefined();
	});

	it("stores an unchecked letter when a half couldn't finish; it reads as waiting", async () => {
		const user = await writer();
		stub.verdict = null;
		expect(await send(user)).toEqual({ kind: "unavailable" });
		expect(await lettersOf(user)).toMatchObject([{ status: "unchecked" }]);
		expect((await lettersOf(user))[0]?.checkedAt).toBeUndefined();
		expect(await user.t.query(api.letters.sent.list, {})).toMatchObject([
			{ status: "waiting" },
		]);
	});
});

describe("letters caps", () => {
	it("one a day on the sender's local day; a withdraw doesn't give it back", async () => {
		const user = await writer();
		await send(user);
		expect(await send(user, OTHER_LETTER)).toEqual({
			kind: "limit",
			reason: "today",
		});

		const [letter] = await lettersOf(user);
		if (!letter) {
			throw new Error("no letter");
		}
		await user.t.mutation(api.letters.sent.withdraw, { id: letter._id });
		expect(await send(user, OTHER_LETTER)).toEqual({
			kind: "limit",
			reason: "today",
		});

		nextDay();
		expect(await send(user, OTHER_LETTER)).toEqual({ kind: "pass" });
	});

	it("three waiting, unchecked ones included", async () => {
		const user = await writer();
		await send(user);
		nextDay();
		stub.verdict = null;
		await send(user, OTHER_LETTER);
		stub.verdict = {
			crisisMention: "none",
			fixable: null,
			hostile: false,
			language: "en",
		};
		nextDay();
		await send(user, THIRD_LETTER);
		nextDay();

		expect(await send(user, `${KIND_LETTER} Again.`)).toEqual({
			kind: "limit",
			reason: "three",
		});
		expect((await user.t.query(api.letters.status.get, {})).writeLimit).toBe(
			"three"
		);
	});

	it("of two stores for the last slot, the second answers limit and stores nothing", async () => {
		const user = await writer();
		const store = () =>
			user.root.mutation(internal.letters.send.store, {
				language: "en",
				profileId: user.profileId,
				status: "waiting",
				text: KIND_LETTER,
				textHash: "x",
			});
		expect(await store()).toBeNull();
		expect(await store()).toBe("today");
		expect(await lettersOf(user)).toHaveLength(1);
	});

	it("a held letter uses the day, so one held letter a day at most reaches review", async () => {
		const user = await writer();
		stub.verdict = HOSTILE;
		await send(user);
		expect(await send(user, OTHER_LETTER)).toEqual({
			kind: "limit",
			reason: "today",
		});
		expect(stub.classify).toBe(1);
		const reviews = await user.root.run((ctx) =>
			ctx.db.query("letter_reviews").collect()
		);
		expect(reviews).toHaveLength(1);
		// A held letter doesn't hold a waiting slot.
		nextDay();
		stub.verdict = { ...HOSTILE, hostile: false };
		expect(await send(user, OTHER_LETTER)).toEqual({ kind: "pass" });
	});

	it("of two different held letters stored at once, the second answers today", async () => {
		const user = await writer();
		const storeHeld = (textHash: string) =>
			user.root.mutation(internal.letters.send.store, {
				language: "en",
				profileId: user.profileId,
				status: "held",
				text: KIND_LETTER,
				textHash,
			});
		expect(await storeHeld("first")).toBeNull();
		expect(await storeHeld("second")).toBe("today");
		const reviews = await user.root.run((ctx) =>
			ctx.db.query("letter_reviews").collect()
		);
		expect(reviews).toHaveLength(1);
		expect(await lettersOf(user)).toHaveLength(1);
	});

	it("a paused sender meets the same limit as anyone, and nothing else", async () => {
		const user = await writer();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("letter_profiles", {
				emotionalProfileId: user.profileId,
				lastReceivedAt: 0,
				pausedBy: "strikes",
				pausedUntil: Date.now() + 30 * DAY_MS,
				pool: "out",
				tiebreak: 0.5,
			});
		});
		expect(await send(user)).toEqual({ kind: "pass" });
		expect(await send(user, OTHER_LETTER)).toEqual({
			kind: "limit",
			reason: "today",
		});
	});

	it("counts a limit in analytics, with its reason", async () => {
		const user = await writer();
		await send(user);
		await send(user, OTHER_LETTER);
		expect(sentEvents()).toEqual([
			{ outcome: "pass" },
			{ outcome: "limit", reason: "today" },
		]);
	});

	it("status reports the last day sent, for the client to lift today at midnight", async () => {
		const user = await writer();
		expect(
			(await user.t.query(api.letters.status.get, {})).lastSentDay
		).toBeNull();
		await send(user);
		const status = await user.t.query(api.letters.status.get, {});
		expect(status).toMatchObject({
			lastSentDay: "2026-11-19",
			writeLimit: "today",
		});
	});
});

describe("letters strikes", () => {
	const holdTwo = async (user: SeededUser, gapDays: number) => {
		stub.verdict = HOSTILE;
		await send(user);
		vi.setSystemTime(Date.now() + gapDays * DAY_MS);
		await send(user, OTHER_LETTER);
		return await user.root.run((ctx) =>
			ctx.db
				.query("letter_profiles")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique()
		);
	};

	it("two in 90 days pause the sender for 30, silently", async () => {
		const user = await writer();
		const row = await holdTwo(user, 10);
		expect(row).toMatchObject({
			pausedBy: "strikes",
			pausedUntil: Date.now() + 30 * DAY_MS,
		});
		nextDay();
		expect((await user.t.query(api.letters.status.get, {})).writeLimit).toBe(
			null
		);
	});

	it("two further apart than 90 days don't", async () => {
		const user = await writer();
		const row = await holdTwo(user, 91);
		expect(row?.pausedUntil).toBeUndefined();
	});
});

describe("letters.sent", () => {
	it("reads a bounded number of rows past held ones", async () => {
		const user = await writer();
		await user.root.run(async (ctx) => {
			const at = Date.now();
			await ctx.db.insert("letters", {
				checkedAt: at,
				createdAt: at - DAY_MS,
				language: "en",
				senderProfileId: user.profileId,
				status: "waiting",
				text: KIND_LETTER,
			});
			for (let i = 0; i < SENT_LIST_READ_MAX; i++) {
				await ctx.db.insert("letters", {
					createdAt: at + i,
					language: "en",
					senderProfileId: user.profileId,
					status: "held",
					text: KIND_LETTER,
					textHash: `held-${i}`,
				});
			}
		});
		expect(await user.t.query(api.letters.sent.list, {})).toEqual([]);
		expect(SENT_LIST_READ_MAX).toBeGreaterThan(SENT_LIST_MAX);
	});

	it("lists the caller's letters newest first with a cut line, never the whole text", async () => {
		const user = await writer();
		await send(user);
		const [row] = await user.t.query(api.letters.sent.list, {});
		expect(row).toMatchObject({ seen: true, status: "waiting" });
		expect(row?.line.length).toBeLessThanOrEqual(46);
		expect(row?.line.endsWith("…")).toBe(true);
		expect(Object.keys(row ?? {}).sort()).toEqual([
			"id",
			"line",
			"seen",
			"status",
		]);
	});

	it("shows received, acknowledged and returned, unseen until marked", async () => {
		const sender = await writer();
		const recipient = await asNewUser(2, sender.root);
		await send(sender);
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		await place(sender.root, letter._id, recipient);
		expect(await sender.t.query(api.letters.sent.list, {})).toMatchObject([
			{ seen: false, status: "received" },
		]);

		await sender.t.mutation(api.letters.sent.markSeen, { ids: [letter._id] });
		expect(await sender.t.query(api.letters.sent.list, {})).toMatchObject([
			{ seen: true, status: "received" },
		]);

		await sender.root.run((ctx) =>
			ctx.db.patch("letters", letter._id, { acknowledgedAt: Date.now() })
		);
		expect(await sender.t.query(api.letters.sent.list, {})).toMatchObject([
			{ seen: false, status: "acknowledged" },
		]);
	});

	it("shows another user nothing, and their changes do nothing", async () => {
		const sender = await writer();
		const other = await writer(2, sender.root);
		await send(sender);
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		expect(await other.t.query(api.letters.sent.list, {})).toEqual([]);
		expect(
			await other.t.mutation(api.letters.sent.withdraw, { id: letter._id })
		).toBe("ok");
		await other.t.mutation(api.letters.sent.dismiss, { id: letter._id });
		await place(sender.root, letter._id, other);
		await other.t.mutation(api.letters.sent.markSeen, { ids: [letter._id] });
		const [after] = await lettersOf(sender);
		expect(after?.senderSeen).toBeUndefined();
		expect(after?._id).toBe(letter._id);
	});

	it("withdraws until received", async () => {
		const sender = await writer();
		const recipient = await asNewUser(2, sender.root);
		await send(sender);
		nextDay();
		await send(sender, OTHER_LETTER);
		const [first, second] = await lettersOf(sender);
		if (!(first && second)) {
			throw new Error("no letters");
		}

		expect(
			await sender.t.mutation(api.letters.sent.withdraw, { id: first._id })
		).toBe("ok");
		await place(sender.root, second._id, recipient);
		expect(
			await sender.t.mutation(api.letters.sent.withdraw, { id: second._id })
		).toBe("received");
		expect((await lettersOf(sender)).map((l) => l._id)).toEqual([second._id]);
		// Gone already reads ok.
		expect(
			await sender.t.mutation(api.letters.sent.withdraw, { id: first._id })
		).toBe("ok");
	});

	it("dismisses a returned letter and nothing else", async () => {
		const sender = await writer();
		await send(sender);
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		await sender.t.mutation(api.letters.sent.dismiss, { id: letter._id });
		expect(await lettersOf(sender)).toHaveLength(1);

		await sender.root.run((ctx) =>
			ctx.db.patch("letters", letter._id, { status: "returned" })
		);
		expect(await sender.t.query(api.letters.sent.list, {})).toMatchObject([
			{ seen: false, status: "returned" },
		]);
		await sender.t.mutation(api.letters.sent.dismiss, { id: letter._id });
		expect(await lettersOf(sender)).toHaveLength(0);
	});
});

describe("letters.received", () => {
	it("returns only the words and the caller's marks, never who or why", async () => {
		const sender = await writer();
		const recipient = await asNewUser(2, sender.root);
		await sender.t.action(api.letters.send.send, {
			aim: "grief",
			text: KIND_LETTER,
		});
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		await place(sender.root, letter._id, recipient);

		const expected = {
			acknowledged: false,
			hidden: false,
			id: letter._id,
			opened: false,
			text: KIND_LETTER,
		};
		expect(await recipient.t.query(api.letters.received.list, {})).toEqual([
			expected,
		]);
		expect(
			await recipient.t.query(api.letters.received.get, { id: letter._id })
		).toEqual(expected);
	});

	it("is null for another user's letter, a bad id, and a reported letter", async () => {
		const sender = await writer();
		const recipient = await asNewUser(2, sender.root);
		const other = await asNewUser(3, sender.root);
		await send(sender);
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		await place(sender.root, letter._id, recipient);

		expect(
			await other.t.query(api.letters.received.get, { id: letter._id })
		).toBeNull();
		expect(await other.t.query(api.letters.received.list, {})).toEqual([]);
		expect(
			await sender.t.query(api.letters.received.get, { id: letter._id })
		).toBeNull();
		expect(
			await recipient.t.query(api.letters.received.get, { id: "not-an-id" })
		).toBeNull();

		await sender.root.run((ctx) =>
			ctx.db.patch("letters", letter._id, { reportedAt: Date.now() })
		);
		expect(await recipient.t.query(api.letters.received.list, {})).toEqual([]);
		expect(
			await recipient.t.query(api.letters.received.get, { id: letter._id })
		).toBeNull();
	});

	it("refuses a caller who isn't signed in", async () => {
		await expectCode(
			() => asUnauthed().query(api.letters.received.list, {}),
			"not_authenticated"
		);
	});
});

describe("letters.optIn", () => {
	const optIn = (user: SeededUser, choice: "yes" | "no") =>
		user.t.mutation(api.letters.optIn.set, {
			choice,
			locale: "en-GB",
			promptVersion: "letters_offer.v1",
		});

	const consents = (user: SeededUser) =>
		user.root.run((ctx) =>
			ctx.db
				.query("consent_records")
				.withIndex("by_profile_type", (q) =>
					q
						.eq("emotionalProfileId", user.profileId)
						.eq("consentType", "letters_receive")
				)
				.collect()
		);

	it("is unset until answered", async () => {
		const user = await asNewUser();
		expect(await user.t.query(api.letters.status.get, {})).toEqual({
			invite: true,
			lastSentDay: null,
			lateRisk: null,
			optIn: "unset",
			unopenedId: null,
			writeLimit: null,
		});
	});

	it("a first No consents to nothing, so it records nothing", async () => {
		const user = await asNewUser();
		await optIn(user, "no");
		expect(await consents(user)).toEqual([]);
	});

	it("generic consent.grant and consent.revoke refuse letters_receive", async () => {
		// Only `optIn.set` writes it: `consentTypeValidator` leaves it out, so
		// a revoke can't record a withdrawal while optIn stays yes.
		const user = await writer();
		await expect(
			user.t.mutation(api.consent.grant, {
				consentLanguageVersion: "1.0",
				// @ts-expect-error: the generic mutations don't take letters_receive.
				consentType: "letters_receive",
			})
		).rejects.toThrow(/Validator error/);
		await optIn(user, "yes");
		await expect(
			user.t.mutation(api.consent.revoke, {
				// @ts-expect-error: the generic mutations don't take letters_receive.
				consentType: "letters_receive",
			})
		).rejects.toThrow(/Validator error/);
		expect((await consents(user)).map((c) => c.status)).toEqual(["granted"]);
		expect((await user.t.query(api.letters.status.get, {})).optIn).toBe("yes");
	});

	it("Yes needs an adult; No doesn't", async () => {
		const user = await asNewUser();
		await expectCode(() => optIn(user, "yes"), "age_required");
		await optIn(user, "no");
		expect((await user.t.query(api.letters.status.get, {})).optIn).toBe("no");
	});

	it("records consent once per change, with the offer's version", async () => {
		const user = await writer();
		await optIn(user, "yes");
		await optIn(user, "yes");
		expect(await consents(user)).toMatchObject([
			{ consentLanguageVersion: "letters_offer.v1", status: "granted" },
		]);
		await optIn(user, "no");
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
	});

	it("takes the language from the locale, and No clears what matching copied", async () => {
		const user = await writer();
		await optIn(user, "yes");
		await user.root.run(async (ctx) => {
			const row = await ctx.db
				.query("letter_profiles")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (!row) {
				throw new Error("no row");
			}
			expect(row).toMatchObject({ language: "en", locale: "en-GB" });
			await ctx.db.patch("letter_profiles", row._id, {
				aim: "grief",
				band: "heavier",
				metadataAt: Date.now(),
				pool: "ready",
			});
		});

		await optIn(user, "no");
		const row = await user.root.run((ctx) =>
			ctx.db
				.query("letter_profiles")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique()
		);
		expect(row).toMatchObject({ optIn: "no", pool: "out" });
		expect(row?.aim).toBeUndefined();
		expect(row?.band).toBeUndefined();
		expect(row?.metadataAt).toBeUndefined();
	});

	it("shows the unopened letter only while receiving is on", async () => {
		const user = await writer();
		await optIn(user, "yes");
		const sender = await writer(2, user.root);
		await send(sender);
		const [letter] = await lettersOf(sender);
		if (!letter) {
			throw new Error("no letter");
		}
		await user.root.run(async (ctx) => {
			const row = await ctx.db
				.query("letter_profiles")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (row) {
				await ctx.db.patch("letter_profiles", row._id, {
					unopenedLetterId: letter._id,
				});
			}
		});
		expect((await user.t.query(api.letters.status.get, {})).unopenedId).toBe(
			letter._id
		);
		await optIn(user, "no");
		expect(
			(await user.t.query(api.letters.status.get, {})).unopenedId
		).toBeNull();
	});
});

describe("letters.settings", () => {
	it("the push switch is on until turned off", async () => {
		const user = await asNewUser();
		expect(await user.t.query(api.letters.settings.getPush, {})).toBe(true);
		await user.t.mutation(api.letters.settings.setPush, { on: false });
		expect(await user.t.query(api.letters.settings.getPush, {})).toBe(false);
		await user.t.mutation(api.letters.settings.setPush, { on: true });
		expect(await user.t.query(api.letters.settings.getPush, {})).toBe(true);
	});

	it("the push switch says so when the account has no preferences row", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			const row = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (row) {
				await ctx.db.delete("preferences", row._id);
			}
		});
		await expectCode(
			() => user.t.mutation(api.letters.settings.setPush, { on: false }),
			"preferences_not_found"
		);
	});
});

describe("letters functions refuse a caller who isn't signed in", () => {
	const anon = asUnauthed;
	const letterId = async () => {
		const user = await writer(9);
		await send(user);
		const [letter] = await lettersOf(user);
		if (!letter) {
			throw new Error("no letter");
		}
		return letter._id;
	};

	it.each([
		["status.get", () => anon().query(api.letters.status.get, {})],
		["sent.list", () => anon().query(api.letters.sent.list, {})],
		["settings.getPush", () => anon().query(api.letters.settings.getPush, {})],
		[
			"settings.setPush",
			() => anon().mutation(api.letters.settings.setPush, { on: false }),
		],
		[
			"optIn.set",
			() =>
				anon().mutation(api.letters.optIn.set, {
					choice: "no",
					promptVersion: "letters_offer.v1",
				}),
		],
	])("%s", async (_name, call) => {
		await expectCode(call, "not_authenticated");
	});

	it.each([
		["sent.withdraw", api.letters.sent.withdraw],
		["sent.dismiss", api.letters.sent.dismiss],
	] as const)("%s", async (_name, fn) => {
		const id = await letterId();
		await expectCode(() => anon().mutation(fn, { id }), "not_authenticated");
	});

	it("sent.markSeen", async () => {
		const id = await letterId();
		await expectCode(
			() => anon().mutation(api.letters.sent.markSeen, { ids: [id] }),
			"not_authenticated"
		);
	});
});

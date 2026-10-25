import { describe, expect, it } from "vitest";
import {
	buildQuotePrompt,
	parseQuoteResponse,
	type QuoteReply,
	type QuoteSession,
	REPLY_CONTEXT_COUNT,
	REPLY_CONTEXT_MAX_CHARS,
	REPLY_CONTEXT_WINDOW_DAYS,
	selectReplyContext,
} from "./quotesPrompt";
import { validateTitle } from "./quotesQuality";

const now = new Date("2026-07-07T00:00:00Z").getTime();

const oneSession: QuoteSession[] = [
	{
		granularLabel: "weighed down",
		intensity: 6,
		primaryEmotion: "heavy",
		sessionCreatedAt: now - 24 * 60 * 60 * 1000,
		sessionId: "s1",
		thematicTags: ["work", "sleep"],
	},
];

const baseParams = {
	angleSeed: "stillness",
	now,
	preferredThemes: [] as string[],
	recentQuoteTexts: [] as string[],
	recentQuoteTitles: [] as string[],
	sessions: oneSession,
};

describe("buildQuotePrompt", () => {
	describe("cold-start fallback (no semantic profile)", () => {
		it("uses the recency-only summary and omits the profile section", () => {
			const { userPrompt } = buildQuotePrompt({
				...baseParams,
				renderedProfile: null,
			});

			expect(userPrompt).toContain("Recent emotional themes:");
			expect(userPrompt).not.toContain("Longitudinal emotional profile:");
			expect(userPrompt).not.toContain("Recent signal (last few days):");
			expect(userPrompt).toContain(
				"weighed down, intensity 6/10 (work, sleep) — 1 day ago"
			);
		});
	});

	describe("profile-present (Cognition Layer)", () => {
		it("leads with the rendered profile and folds the summary in as a recency signal", () => {
			const renderedProfile =
				"Recurring themes: overwork, self-doubt\nRecent trajectory: gradually lighter";
			const { userPrompt } = buildQuotePrompt({
				...baseParams,
				renderedProfile,
			});

			expect(userPrompt).toContain(
				"Longitudinal emotional profile:\n" + renderedProfile
			);
			expect(userPrompt).toContain("Recent signal (last few days):");
			expect(userPrompt).not.toContain("Recent emotional themes:");
			expect(
				userPrompt.indexOf("Longitudinal emotional profile:")
			).toBeLessThan(userPrompt.indexOf("Recent signal (last few days):"));
		});
	});

	it("appends the preferred-themes line only when themes are given", () => {
		const withThemes = buildQuotePrompt({
			...baseParams,
			preferredThemes: ["impermanence", "grace"],
			renderedProfile: null,
		});
		const withoutThemes = buildQuotePrompt({
			...baseParams,
			renderedProfile: null,
		});

		expect(withThemes.userPrompt).toContain(
			"Preferred themes (align naturally with one if fitting): impermanence, grace"
		);
		expect(withoutThemes.userPrompt).not.toContain("Preferred themes");
	});

	it("appends the avoid-list only when recent quotes are given, in both branches", () => {
		const recentQuoteTexts = [
			"You are not the storm.",
			"Stillness is not surrender.",
		];

		const withProfile = buildQuotePrompt({
			...baseParams,
			recentQuoteTexts,
			renderedProfile: "Recurring themes: X",
		});
		const withoutProfile = buildQuotePrompt({
			...baseParams,
			recentQuoteTexts,
			renderedProfile: null,
		});
		const noAvoid = buildQuotePrompt({ ...baseParams, renderedProfile: null });

		for (const { userPrompt } of [withProfile, withoutProfile]) {
			expect(userPrompt).toContain("Recent quotes already shown");
			expect(userPrompt).toContain('- "You are not the storm."');
			expect(userPrompt).toContain('- "Stillness is not surrender."');
		}
		expect(noAvoid.userPrompt).not.toContain("Recent quotes already shown");
	});

	it("handles multiple sessions and empty session lists without throwing", () => {
		const multi = buildQuotePrompt({
			...baseParams,
			renderedProfile: null,
			sessions: [
				...oneSession,
				{
					intensity: 3,
					primaryEmotion: "numb",
					sessionCreatedAt: now - 3 * 24 * 60 * 60 * 1000,
					sessionId: "s2",
					thematicTags: [],
				},
			],
		});
		expect(multi.userPrompt).toContain(
			"weighed down, intensity 6/10 (work, sleep) — 1 day ago"
		);
		expect(multi.userPrompt).toContain("numb, intensity 3/10 — 3 days ago");

		const empty = buildQuotePrompt({
			...baseParams,
			renderedProfile: null,
			sessions: [],
		});
		expect(empty.userPrompt).toContain("Recent emotional themes:\n");
	});

	it("asks for seed-title-quote JSON output in one call", () => {
		const { systemPrompt } = buildQuotePrompt({
			...baseParams,
			renderedProfile: null,
		});
		expect(systemPrompt).toContain(
			'{"seeds": ["...", "..."], "title": "...", "quote": "..."}'
		);
		expect(systemPrompt).toContain("The title:");
		expect(systemPrompt).toContain("NEVER narrate the reader's progress");
		// one envelope, one call — no second instruction block asking for a title
		expect(systemPrompt.match(/Output ONLY this JSON/g)).toHaveLength(1);
	});

	it("appends recent titles to the avoid block only when given", () => {
		const withTitles = buildQuotePrompt({
			...baseParams,
			recentQuoteTitles: ["The crack", "Soft animal"],
			renderedProfile: null,
		});
		const without = buildQuotePrompt({ ...baseParams, renderedProfile: null });

		expect(withTitles.userPrompt).toContain("Recent titles already used");
		expect(withTitles.userPrompt).toContain('- "The crack"');
		expect(without.userPrompt).not.toContain("Recent titles already used");
	});
});

describe("reply context (#314)", () => {
	const day = 24 * 60 * 60 * 1000;
	const reply = (over: Partial<QuoteReply>): QuoteReply => ({
		flagged: false,
		repliedAt: now - day,
		text: "today felt lighter than it has in weeks",
		...over,
	});

	describe("selectReplyContext", () => {
		it("returns the newest replies first, at most REPLY_CONTEXT_COUNT", () => {
			const selected = selectReplyContext(
				[
					reply({ repliedAt: now - 3 * day, text: "third" }),
					reply({ repliedAt: now - 1 * day, text: "first" }),
					reply({ repliedAt: now - 4 * day, text: "fourth" }),
					reply({ repliedAt: now - 2 * day, text: "second" }),
				],
				now
			);

			expect(REPLY_CONTEXT_COUNT).toBe(3);
			expect(selected.map((r) => r.text)).toEqual(["first", "second", "third"]);
		});

		it("drops replies older than the 7-day window, keeping one on the edge", () => {
			const selected = selectReplyContext(
				[
					reply({ repliedAt: now - 6 * day, text: "inside" }),
					reply({
						repliedAt: now - REPLY_CONTEXT_WINDOW_DAYS * day,
						text: "on the edge",
					}),
					reply({ repliedAt: now - 8 * day, text: "outside" }),
				],
				now
			);

			expect(selected.map((r) => r.text)).toEqual(["inside", "on the edge"]);
		});

		it("excludes flagged replies", () => {
			const selected = selectReplyContext(
				[
					reply({ flagged: true, repliedAt: now - day, text: "flagged" }),
					reply({ repliedAt: now - 2 * day, text: "clean" }),
				],
				now
			);

			expect(selected.map((r) => r.text)).toEqual(["clean"]);
		});

		it("truncates each reply to REPLY_CONTEXT_MAX_CHARS with an ellipsis", () => {
			const long = "word ".repeat(200).trim();
			const [selected] = selectReplyContext([reply({ text: long })], now);

			expect(selected.text.length).toBeLessThanOrEqual(
				REPLY_CONTEXT_MAX_CHARS + 1
			);
			expect(selected.text.endsWith("…")).toBe(true);

			const short = selectReplyContext([reply({ text: "  short one  " })], now);
			expect(short[0].text).toBe("short one");
		});

		it("drops blank replies", () => {
			expect(selectReplyContext([reply({ text: "   " })], now)).toEqual([]);
		});
	});

	describe("buildQuotePrompt", () => {
		it("renders the reply block newest first with recency labels, only when replies exist", () => {
			const { userPrompt } = buildQuotePrompt({
				...baseParams,
				renderedProfile: null,
				replies: [
					{ repliedAt: now - day, text: "today felt lighter" },
					{ repliedAt: now - 3 * day, text: "still tired of pretending" },
				],
			});

			expect(userPrompt).toContain("What they wrote back to recent quotes");
			expect(userPrompt).toContain('- "today felt lighter" — 1 day ago');
			expect(userPrompt).toContain(
				'- "still tired of pretending" — 3 days ago'
			);
			expect(userPrompt.indexOf("today felt lighter")).toBeLessThan(
				userPrompt.indexOf("still tired of pretending")
			);

			const none = buildQuotePrompt({ ...baseParams, renderedProfile: null });
			expect(none.userPrompt).not.toContain(
				"What they wrote back to recent quotes"
			);
		});

		it("carries the NEVER line that keeps the register and drops the content", () => {
			const { systemPrompt } = buildQuotePrompt({
				...baseParams,
				renderedProfile: null,
			});
			expect(systemPrompt).toContain("take its register, not its content");
		});
	});
});

describe("parseQuoteResponse", () => {
	it("reads a bare JSON object", () => {
		const parsed = parseQuoteResponse(
			'{"seeds":["a","b"],"quote":"  You are not the storm.  "}'
		);
		expect(parsed).toEqual({
			quote: "You are not the storm.",
			seeds: ["a", "b"],
		});
	});

	it("tolerates fences and surrounding prose", () => {
		const raw =
			'Here you go:\n```json\n{"seeds":["a"],"quote":"Stillness is not surrender."}\n```';
		expect(parseQuoteResponse(raw)?.quote).toBe("Stillness is not surrender.");
	});

	it("defaults seeds to an empty array when missing or malformed", () => {
		expect(parseQuoteResponse('{"quote":"A line."}')?.seeds).toEqual([]);
		expect(
			parseQuoteResponse('{"seeds":[1,"a"],"quote":"A line."}')?.seeds
		).toEqual(["a"]);
	});

	it("reads the title from the widened envelope", () => {
		const parsed = parseQuoteResponse(
			'{"seeds":["a"],"title":"  Soft animal  ","quote":"A line."}'
		);
		expect(parsed).toEqual({
			quote: "A line.",
			seeds: ["a"],
			title: "Soft animal",
		});
	});

	it("keeps the quote when the title is missing, empty, or not a string", () => {
		expect(
			parseQuoteResponse('{"seeds":["a"],"quote":"A line."}')?.title
		).toBeUndefined();
		expect(
			parseQuoteResponse('{"title":"","quote":"A line."}')?.title
		).toBeUndefined();
		expect(parseQuoteResponse('{"title":7,"quote":"A line."}')?.quote).toBe(
			"A line."
		);
	});

	it("returns null for unusable responses", () => {
		expect(parseQuoteResponse("You are not the storm.")).toBeNull();
		expect(parseQuoteResponse('{"seeds":["a"],"quote":""}')).toBeNull();
		expect(parseQuoteResponse('{"seeds":["a"], quote:}')).toBeNull();
	});
});

describe("validateTitle", () => {
	const quote = "The wound is the place where the light enters you.";

	it("accepts a plate-shaped title", () => {
		expect(validateTitle("Where light enters", quote)).toEqual({ ok: true });
		expect(validateTitle("Soft animal", quote).ok).toBe(true);
	});

	it("rejects titles outside 3-20 characters", () => {
		expect(validateTitle("Hi", quote)).toEqual({
			ok: false,
			reason: "too short",
		});
		expect(validateTitle("A b", quote).ok).toBe(true); // exactly 3
		expect(validateTitle("Twenty characters ok", quote).ok).toBe(true); // exactly 20
		expect(validateTitle("Twenty one characters", quote)).toEqual({
			ok: false,
			reason: "too long",
		});
	});

	it("rejects medical and clinical terms", () => {
		expect(validateTitle("The diagnosis", quote)).toEqual({
			ok: false,
			reason: "blocked term: diagnosis",
		});
		expect(validateTitle("After therapy", quote).ok).toBe(false);
	});

	it("rejects terminal punctuation only", () => {
		expect(validateTitle("Still here.", quote)).toEqual({
			ok: false,
			reason: "terminal punctuation",
		});
		expect(validateTitle("Still here?", quote).ok).toBe(false);
		expect(validateTitle("Still here!", quote).ok).toBe(false);
		expect(validateTitle("Held, briefly", quote).ok).toBe(true);
	});

	it("rejects a verbatim prefix of the quote, case-insensitively", () => {
		expect(validateTitle("The wound is", quote)).toEqual({
			ok: false,
			reason: "verbatim prefix of the quote",
		});
		expect(validateTitle("THE WOUND", quote).ok).toBe(false);
		expect(validateTitle("The place", quote).ok).toBe(true); // mid-quote is fine
	});

	it("does not check proper nouns", () => {
		expect(validateTitle("Tuesday In June", quote).ok).toBe(true);
	});
});

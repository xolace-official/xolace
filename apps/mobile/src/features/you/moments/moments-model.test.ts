import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
	cardOf,
	dateOf,
	feelingOf,
	isMissingMoment,
	itemsOf,
	type MomentRow,
	momentOf,
	pathOf,
	reflectSeed,
	timeOf,
	toneOf,
	whenOf,
	wordsOf,
} from "@/features/you/moments/moments-model";

const NOW = new Date(2026, 10, 18, 16, 0);
const at = (day: number, h = 21, m = 12, year = 2026, month = 10) =>
	new Date(year, month, day, h, m).getTime();

const row = (over: Partial<MomentRow> = {}): MomentRow => ({
	_id: "s1",
	createdAt: at(18),
	entryType: "open_prompt",
	granularLabel: "overwhelm",
	mirrorText: "You're not behind — you're tired.",
	pathChosen: "solo",
	primaryEmotion: "stress",
	toneUsed: "poetic",
	...over,
});

describe("whenOf", () => {
	it.each([
		[at(18, 1), "Today"],
		[at(17), "Yesterday"],
		[at(17, 0, 1), "Yesterday"],
		[at(16), "Monday"],
		[at(12), "Thursday"],
		[at(11), "11 November"],
		[at(30, 9, 0, 2025, 11), "30 December 2025"],
	])("labels %s as %s", (t, label) => {
		expect(whenOf(t, NOW)).toBe(label);
	});
});

describe("dateOf and timeOf", () => {
	it("gives the header's date and time", () => {
		expect(dateOf(at(18), NOW)).toBe("Today");
		expect(dateOf(at(17), NOW)).toBe("Yesterday");
		expect(dateOf(at(10), NOW)).toBe("Tuesday, 10 November");
		expect(timeOf(at(10, 21, 12))).toBe("9:12 pm");
		expect(timeOf(at(10, 0, 5))).toBe("12:05 am");
		expect(timeOf(at(10, 12, 0))).toBe("12:00 pm");
	});
});

describe("the line", () => {
	it("leads with the finer feeling and names the path", () => {
		expect(cardOf(row()).line).toBe("Overwhelm · sat with this");
		expect(feelingOf(null, "self-doubt")).toBe("Self doubt");
	});

	it("calls a talk a talk, whatever path it has", () => {
		expect(pathOf("solo", "talk")).toBe("talk");
	});

	it("still reads with no feeling or path (what the server can send)", () => {
		const card = cardOf(
			row({ granularLabel: null, pathChosen: null, primaryEmotion: null })
		);
		expect(card.line).toBe("Reflection");
	});

	it("never shows an em dash", () => {
		expect(cardOf(row()).quote).toBe("You're not behind, you're tired.");
	});
});

describe("toneOf", () => {
	it("chips the named tones only", () => {
		expect(toneOf("gentle")).toBe("gentle");
		expect(toneOf("witnessed")).toBe("witnessed");
		expect(toneOf("adaptive")).toBeNull();
		expect(toneOf(null)).toBeNull();
	});
});

describe("itemsOf", () => {
	it("puts a day's label before each run, and counts cards only", () => {
		const items = itemsOf(
			[
				row({ _id: "a", createdAt: at(18) }),
				row({ _id: "b", createdAt: at(18, 9) }),
				row({ _id: "c", createdAt: at(16) }),
			],
			NOW
		);
		expect(items.map((i) => i.id)).toEqual([
			"when-Today",
			"a",
			"b",
			"when-Monday",
			"c",
		]);
		expect(
			items.flatMap((i) => (i.kind === "moment" ? [i.index] : []))
		).toEqual([0, 1, 2]);
	});

	it("is empty for no sessions", () => {
		expect(itemsOf([], NOW)).toEqual([]);
	});
});

describe("momentOf", () => {
	it("keeps what you said and the feeling words, finer first", () => {
		const m = momentOf(
			{ ...row({ createdAt: at(10) }), rawInput: "  Everyone keeps moving. " },
			NOW
		);
		expect(m).toMatchObject({
			date: "Tuesday, 10 November",
			meta: "9:12 pm · sat with this",
			said: "Everyone keeps moving.",
			talk: false,
			tone: "poetic",
			words: ["overwhelm", "stress"],
		});
	});

	it("hides what you said on a talk, whose thread shows instead", () => {
		const m = momentOf(
			{ ...row({ entryType: "talk" }), rawInput: "hello" },
			NOW
		);
		expect(m.said).toBeNull();
		expect(m.meta).toBe("9:12 pm · talk");
	});

	it("copes with a session that has no mirror, input or feeling", () => {
		const m = momentOf(
			{
				...row({ granularLabel: null, pathChosen: null, primaryEmotion: null }),
				mirrorText: null,
				rawInput: null,
				toneUsed: null,
			},
			NOW
		);
		expect(m).toMatchObject({
			meta: "9:12 pm",
			mirror: null,
			said: null,
			tone: null,
			words: ["reflection"],
		});
	});

	it("drops a repeated feeling word", () => {
		expect(wordsOf("stress", "stress")).toEqual(["stress"]);
	});
});

describe("reflectSeed", () => {
	it("keeps the first sentence of what you wrote", () => {
		expect(
			reflectSeed("I feel so stuck at work. Nobody notices. I'm tired.")
		).toBe("I feel so stuck at work.");
		expect(reflectSeed("Why does this keep happening? Again.")).toBe(
			"Why does this keep happening?"
		);
	});

	it("keeps it all with no sentence break", () => {
		expect(reflectSeed("  replaying the meeting  ")).toBe(
			"replaying the meeting"
		);
	});

	it("doesn't cut at an abbreviation: the first line instead", () => {
		expect(reflectSeed("Dr. Mensah said I should rest.\nI can't.")).toBe(
			"Dr. Mensah said I should rest."
		);
		expect(reflectSeed("Ok. Not really.")).toBe("Ok. Not really.");
	});

	it("keeps a short sentence that is a sentence", () => {
		expect(reflectSeed("I miss her so. Every day.")).toBe("I miss her so.");
	});

	it("has nothing to seed from a talk or an empty moment", () => {
		expect(reflectSeed(null)).toBeNull();
		expect(reflectSeed("   ")).toBeNull();
	});
});

describe("isMissingMoment", () => {
	it("is gone when the session was deleted or isn't yours", () => {
		expect(
			isMissingMoment(new ConvexError({ code: "session_not_found" }))
		).toBe(true);
		expect(
			isMissingMoment(new ConvexError({ code: "session_forbidden" }))
		).toBe(true);
	});

	it("is gone when the link's id isn't a session's", () => {
		expect(
			isMissingMoment(
				new Error(
					"[CONVEX Q(sessions:getSessionDetails)] ArgumentValidationError: Value does not match validator."
				)
			)
		).toBe(true);
	});

	it("rethrows anything else", () => {
		expect(isMissingMoment(new ConvexError({ code: "unauthenticated" }))).toBe(
			false
		);
		expect(isMissingMoment(new Error("Server Error"))).toBe(false);
		expect(isMissingMoment("boom")).toBe(false);
	});
});

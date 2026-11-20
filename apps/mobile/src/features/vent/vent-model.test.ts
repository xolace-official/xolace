import { describe, expect, it } from "vitest";
import { ANSWERS } from "@/features/vent/dev/fixtures";
import {
	afterBurn,
	ceilingMs,
	ceilingPlan,
	displayWords,
	LIT_MS,
	PER_WORD_MS,
	replyPace,
	replyWords,
	SOON_MS,
	underMic,
} from "@/features/vent/vent-model";

const server = (
	over: Partial<Exclude<Parameters<typeof afterBurn>[0], "error">>
) => ({
	audioUrl: null,
	capReached: false,
	isCrisis: false,
	words: null,
	...over,
});

describe("ceilingMs", () => {
	it("lets a free vent go at 120 s and a Plus one at 150 s", () => {
		expect(ceilingMs("free")).toBe(120_000);
		expect(ceilingMs("plus")).toBe(150_000);
		expect(ceilingMs("loading")).toBe(150_000);
	});
});

describe("displayWords", () => {
	it("strips the voice's audio tags and the space they leave", () => {
		expect(displayWords("[sighs] That was a lot. [softly] Rest now.")).toBe(
			"That was a lot. Rest now."
		);
	});

	it("is nothing when only tags or nothing came back", () => {
		expect(displayWords("[sighs]")).toBeNull();
		expect(displayWords(null)).toBeNull();
	});
});

describe("afterBurn", () => {
	it("gives the reply's words, with its voice", () => {
		expect(afterBurn(server({ audioUrl: "u", words: "Rest now." }))).toEqual({
			audioUrl: "u",
			crisis: false,
			stage: "heard",
			words: "Rest now.",
		});
	});

	it("keeps crisis as a reply, so its line stays", () => {
		const crisis = ANSWERS.crisis.reply?.words ?? "";
		expect(afterBurn(server({ isCrisis: true, words: crisis }))).toMatchObject({
			crisis: true,
			stage: "heard",
		});
	});

	it("goes to Gone. on the daily cap, and says so", () => {
		expect(afterBurn(server({ capReached: true }))).toEqual({
			capReached: true,
			stage: "gone",
		});
	});

	it("burns anyway on a failure or a near-silent take", () => {
		expect(afterBurn("error")).toEqual({ capReached: false, stage: "gone" });
		expect(afterBurn(server({}))).toEqual({ capReached: false, stage: "gone" });
		expect(afterBurn(server({ words: "[sighs]" }))).toEqual({
			capReached: false,
			stage: "gone",
		});
	});
});

describe("replyPace", () => {
	const words = replyWords(ANSWERS.reply.reply?.words ?? "");

	it("lights a word every 240 ms with no voice, and burns at words × 240 + 1300", () => {
		const pace = replyPace(words, null);
		expect(pace.starts).toEqual(words.map((_, i) => i * PER_WORD_MS));
		expect(pace.ashAt).toBe(words.length * PER_WORD_MS + 1300);
	});

	it("follows the voice: each word when the voice reaches it, by its length", () => {
		const pace = replyPace(["a", "bbb"], 600);
		expect(pace.starts).toEqual([0, 200]);
	});

	it("burns 600 ms after a long voice ends", () => {
		expect(replyPace(["a", "bbb"], 4000).ashAt).toBe(4600);
	});

	it("never burns before the last word has cooled, however short the voice", () => {
		const pace = replyPace(["a", "bbb"], 100);
		expect(pace.ashAt).toBe((pace.starts.at(-1) ?? 0) + LIT_MS + 640);
	});
});

describe("ceilingPlan", () => {
	it("changes the line 10 s before the ceiling, then lets go at it", () => {
		expect(ceilingPlan(120_000, 30_000)).toEqual({
			releaseIn: 90_000,
			soonIn: 80_000,
			soonNow: false,
		});
	});

	it("is already in the last 10 s when a take starts near the end", () => {
		expect(ceilingPlan(120_000, 115_000)).toEqual({
			releaseIn: 5000,
			soonIn: null,
			soonNow: true,
		});
	});

	it("lets go at once past the ceiling (Plus lapsed mid-take)", () => {
		expect(ceilingPlan(120_000, 130_000).releaseIn).toBe(0);
		expect(ceilingPlan(120_000, 120_000 - SOON_MS).soonNow).toBe(true);
	});
});

describe("underMic", () => {
	it("says tap to let it go while it listens, amber in the last 10 s", () => {
		expect(underMic("rec", false, false)).toEqual({
			amber: false,
			text: "recording",
		});
		expect(underMic("rec", true, false)).toEqual({ amber: true, text: "soon" });
	});

	it("says the replies are used before a vent, only when they are", () => {
		expect(underMic("idle", false, true)).toEqual({
			amber: false,
			text: "capBefore",
		});
		expect(underMic("idle", false, false)).toBeNull();
	});

	it("says nothing once it has let go", () => {
		expect(underMic("other", true, true)).toBeNull();
	});
});

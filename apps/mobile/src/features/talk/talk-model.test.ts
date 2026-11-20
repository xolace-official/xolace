import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
	CAST,
	castVoice,
	clockOf,
	footnoteLead,
	heardCount,
	isLate,
	isLow,
	keptTimeLine,
	labelIn,
	menuTitle,
	phaseOf,
	pillLine,
	resourceUrl,
	streams,
	type TalkStatus,
	talkErrorMessage,
	traitOf,
	weekFact,
} from "./talk-model";
import type { Turn } from "./use-thread";

const idle: TalkStatus = {
	connected: false,
	presence: "Connecting…",
	started: false,
	wasLive: false,
};

describe("phaseOf", () => {
	it("is the start screen until Start is pressed", () => {
		expect(phaseOf(idle, false)).toBe("start");
	});

	it("connects once Start is pressed, then talks", () => {
		expect(phaseOf({ ...idle, started: true }, false)).toBe("connecting");
		expect(
			phaseOf(
				{ ...idle, connected: true, presence: "Listening", started: true },
				false
			)
		).toBe("talk");
	});

	it("goes straight in when Say more reopened the talk", () => {
		expect(phaseOf(idle, true)).toBe("connecting");
	});

	it("comes back to the start screen when a reopened talk can't start", () => {
		expect(phaseOf({ ...idle, error: "Talk time resets Monday" }, true)).toBe(
			"start"
		);
	});

	it("is ending once the talk is ending, even with the line still up", () => {
		expect(
			phaseOf(
				{ connected: true, presence: "Ending…", started: true, wasLive: true },
				false
			)
		).toBe("ending");
	});

	it("comes back to the start screen when a talk fails before it connects", () => {
		expect(phaseOf({ ...idle, presence: "Connecting…" }, false)).toBe("start");
	});
});

describe("talk time", () => {
	it("is low only under three minutes, never while unknown", () => {
		expect(isLow(179)).toBe(true);
		expect(isLow(180)).toBe(false);
		expect(isLow(undefined)).toBe(false);
		expect(isLow(null)).toBe(false);
	});

	it("says the short fact for a full, part and empty week", () => {
		expect(weekFact(900)).toBe("Up to 15 minutes. End whenever you like.");
		expect(weekFact(undefined)).toBe(
			"Up to 15 minutes. End whenever you like."
		);
		expect(weekFact(12 * 60 + 40)).toBe(
			"About 12 minutes left this week. End whenever you like."
		);
		expect(weekFact(120)).toBe(
			"Not enough talk time left this week. More on Monday."
		);
	});

	it("keeps production's long line in What's kept", () => {
		expect(keptTimeLine(900)).toBe("A talk lasts up to 15 minutes.");
		expect(keptTimeLine(undefined)).toBe("A talk lasts up to 15 minutes.");
		expect(keptTimeLine(600)).toBe(
			"About 10 minutes of talking left this week. More on Monday."
		);
		expect(keptTimeLine(60)).toBe(
			"Not enough talk time left for a talk this week. More on Monday."
		);
	});
});

describe("footnoteLead", () => {
	it("asks about the microphone only on the first talk", () => {
		expect(footnoteLead(900, true)).toBe(
			"We’ll ask for the microphone once · "
		);
		expect(footnoteLead(900, false)).toBe("");
	});

	it("says a reflection is still there when time is low", () => {
		expect(footnoteLead(60, true)).toBe(
			"You can still write a reflection any time · "
		);
	});
});

describe("the clock", () => {
	it("formats minutes and seconds", () => {
		expect(clockOf(108)).toBe("1:48");
		expect(clockOf(5)).toBe("0:05");
	});

	it("shows only from the wrap-up cue", () => {
		expect(isLate(121, 120)).toBe(false);
		expect(isLate(120, 120)).toBe(true);
		expect(isLate(null, 120)).toBe(false);
		expect(pillLine("Listening", 300, 120)).toBe("Listening");
		expect(pillLine("Listening", 108, 120)).toBe("Listening · 1:48 left");
		expect(pillLine("Speaking", null, 120)).toBe("Speaking");
	});

	it("titles the menu with the minutes left, or Talk options before the talk", () => {
		expect(menuTitle(11)).toBe("11 min left in this talk");
		expect(menuTitle(null)).toBe("Talk options");
	});
});

const turn = (t: Partial<Turn>): Turn => ({
	id: 0,
	speaker: "companion",
	text: "Hi.",
	via: "voice",
	...t,
});

describe("turns", () => {
	it("counts the person's lines", () => {
		expect(
			heardCount([
				turn({}),
				turn({ speaker: "person" }),
				turn({ speaker: "person", via: "text" }),
			])
		).toBe(2);
	});

	it("streams speech, not typed lines or a reopened thread", () => {
		expect(streams(turn({ live: true }))).toBe(true);
		expect(streams(turn({ live: false }))).toBe(false);
		expect(streams(turn({ speaker: "person" }))).toBe(true);
		expect(streams(turn({ speaker: "person", via: "text" }))).toBe(false);
	});
});

describe("the cast", () => {
	it("is Sage, Wren, Vesper, Ash with their first sentence", () => {
		expect(CAST.map((v) => v.name)).toEqual(["Sage", "Wren", "Vesper", "Ash"]);
		expect(castVoice("wren").trait).toBe("Soft-spoken, with a gentle lilt");
		expect(castVoice("vesper").trait).toBe("Calm and steady");
	});

	it("takes the first sentence without its stop", () => {
		expect(traitOf("Calm and steady. Holds the ground.")).toBe(
			"Calm and steady"
		);
		expect(traitOf("One line.")).toBe("One line");
	});

	it("labels a choice by its id", () => {
		const options = [{ id: "balanced", label: "In between" }];
		expect(labelIn(options, "balanced")).toBe("In between");
		expect(labelIn(options, "other")).toBe("other");
	});
});

describe("resourceUrl", () => {
	const resource = {
		label: "Line",
		priority: 1,
		source: "crisis_line",
		value: "112",
	} as const;

	it("calls a number, opens a page, writes a mail", () => {
		expect(resourceUrl({ ...resource, type: "phone" })).toBe("tel:112");
		expect(
			resourceUrl({ ...resource, type: "url", value: "https://x.org" })
		).toBe("https://x.org");
		expect(resourceUrl({ ...resource, type: "email", value: "a@b.c" })).toBe(
			"mailto:a@b.c"
		);
	});

	it("only shows a text line", () => {
		expect(resourceUrl({ ...resource, type: "text" })).toBeNull();
	});
});

describe("talkErrorMessage", () => {
	const FALLBACK = "The talk couldn't start. Try again in a moment.";

	it("names the refusals the server codes", () => {
		expect(
			talkErrorMessage(new ConvexError({ code: "talk_time_used" }), FALLBACK)
		).toMatch(/^There isn't enough talk time left this week\./);
		expect(
			talkErrorMessage(new ConvexError({ code: "not_reopenable" }), FALLBACK)
		).toBe(
			"This talk can't be picked up again right now. Its mirror is in Moments."
		);
	});

	it("never shows production's scrubbed message", () => {
		expect(
			talkErrorMessage(
				new Error(
					"[CONVEX A(talk/live:start)] [Request ID: abc123] Server Error"
				),
				FALLBACK
			)
		).toBe(FALLBACK);
		expect(
			talkErrorMessage(new ConvexError({ code: "plus_required" }), FALLBACK)
		).toBe(FALLBACK);
		expect(talkErrorMessage("offline", FALLBACK)).toBe(FALLBACK);
	});
});

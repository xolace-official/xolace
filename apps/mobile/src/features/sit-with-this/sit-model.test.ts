import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { toExercise } from "./catalogue";
import {
	LET_IT_LAND,
	MAKE_ROOM,
	REFLECT_SLOTS,
	RESET,
	SOFTEN_TOWARD_IT,
	SPEAK_TO_IT,
} from "./dev/fixtures";
import {
	arcSize,
	canSwap,
	closeLabel,
	isStandalone,
	isSwapRefused,
	sitFrom,
	sitResult,
	sitSource,
	swapChoices,
} from "./sit-model";

describe("the screen around the beats", () => {
	it("sizes the arcs by beat", () => {
		expect(arcSize("pre", "breath")).toBe("small");
		expect(arcSize("play", "mirror")).toBe("small");
		expect(arcSize("play", "sync")).toBe("full");
		expect(arcSize("play", "haptic")).toBe("mid");
		expect(arcSize("play", "prompt")).toBe("gone");
		expect(arcSize("close", "prompt")).toBe("full");
	});

	it("labels close by where Sit came from", () => {
		expect(closeLabel("kindling", "pre")).toBe("Back to your kindling");
		expect(closeLabel("kindling", "play")).toBe("Leave Sit with this");
		expect(closeLabel("reflect", "pre")).toBe("Leave Sit with this");
		expect(closeLabel("today", "pre")).toBe("Back to Today");
		expect(closeLabel("today", "close")).toBe("Leave Sit with this");
		expect(closeLabel("letter", "pre")).toBe("Back to your letter");
		expect(closeLabel("letter", "play")).toBe("Leave Sit with this");
	});

	it("reads where it was opened, and runs on its own outside a reflection", () => {
		expect(sitFrom("today")).toBe("today");
		expect(sitFrom("letter")).toBe("letter");
		expect(sitFrom("kindling")).toBe("kindling");
		expect(sitFrom(undefined)).toBe("reflect");
		expect(sitFrom("anything")).toBe("reflect");
		expect(isStandalone("today")).toBe(true);
		expect(isStandalone("kindling")).toBe(true);
		expect(isStandalone("reflect")).toBe(false);
	});

	it("offers “Something different” only within a reflection, twice at most", () => {
		const base = {
			from: "reflect",
			kind: "text",
			linkOn: true,
			sheetOpen: false,
			stage: "play",
			swaps: 0,
		} as const;
		expect(canSwap(base)).toBe(true);
		expect(canSwap({ ...base, linkOn: false })).toBe(false);
		expect(canSwap({ ...base, linkOn: false, stage: "pre" })).toBe(true);
		expect(canSwap({ ...base, from: "kindling" })).toBe(false);
		expect(canSwap({ ...base, from: "today" })).toBe(false);
		expect(canSwap({ ...base, swaps: 2 })).toBe(false);
		expect(canSwap({ ...base, kind: "prompt" })).toBe(false);
		expect(canSwap({ ...base, sheetOpen: true })).toBe(false);
		expect(canSwap({ ...base, stage: "close" })).toBe(false);
	});

	it("hides “Try something simpler” while Three breaths is playing", () => {
		const reset = toExercise(RESET, {});
		const room = toExercise(MAKE_ROOM, {});
		expect(
			swapChoices({ nextBest: room, reset }, "let_it_land").map((c) => c.title)
		).toEqual(["Try something simpler", "Try something else"]);
		expect(swapChoices({ nextBest: room, reset }, "reset")).toEqual([
			{
				id: room.key,
				sub: "Make room · about a minute",
				title: "Try something else",
			},
		]);
		expect(swapChoices({ nextBest: null, reset: null }, "x")).toEqual([]);
	});
});

describe("where Sit reads its exercise", () => {
	const ids = { path: "path-session", route: "twig-session" };

	it("reads a reflection's path session", () => {
		expect(sitSource("reflect", ids)).toEqual({
			sessionId: "path-session",
			standalone: null,
		});
	});

	it("reads a kindling twig's session from the route, or none", () => {
		expect(sitSource("kindling", ids)).toEqual({
			sessionId: "twig-session",
			standalone: null,
		});
		expect(
			sitSource("kindling", { path: "path-session", route: undefined })
		).toEqual({
			sessionId: null,
			standalone: null,
		});
	});

	it("plays Three breaths from Today, with no session", () => {
		expect(sitSource("today", ids)).toEqual({
			sessionId: null,
			standalone: "reset",
		});
	});

	it("plays Three breaths from a letter's care, with no session", () => {
		expect(sitSource("letter", ids)).toEqual({
			sessionId: null,
			standalone: "reset",
		});
		expect(sitResult("letter", null, "alone")).toEqual({
			exercise: "alone",
			slots: {},
		});
	});

	it("composes the result from the read its source uses", () => {
		const forSession = { exercise: "matched", slots: { mirror_line: "Mine." } };
		expect(sitResult("reflect", forSession, "alone")).toBe(forSession);
		expect(sitResult("today", forSession, "alone")).toEqual({
			exercise: "alone",
			slots: {},
		});
		expect(sitResult("today", undefined, undefined)).toBeUndefined();
		expect(sitResult("today", undefined, null)).toBeNull();
	});
});

const PRODUCTION_MESSAGE =
	"[CONVEX M(exercises:recordSwap)] [Request ID: abc123] Server Error";

describe("a swap the server refuses", () => {
	it("reads the code when production scrubs the message", () => {
		const limit = new ConvexError({ code: "swap_limit_reached" });
		limit.message = PRODUCTION_MESSAGE;
		const notAllowed = new ConvexError({ code: "swap_not_allowed" });
		notAllowed.message = PRODUCTION_MESSAGE;
		expect(isSwapRefused(limit)).toBe(true);
		expect(isSwapRefused(notAllowed)).toBe(true);
	});

	it("still reads a server from before the codes", () => {
		expect(
			isSwapRefused(new Error("Uncaught Error: Maximum swaps reached"))
		).toBe(true);
		expect(
			isSwapRefused(new Error("Exercise not allowed for this session"))
		).toBe(true);
	});

	it("leaves any other failure to the failed toast", () => {
		expect(isSwapRefused(new Error(PRODUCTION_MESSAGE))).toBe(false);
		expect(isSwapRefused(new ConvexError({ code: "session_not_found" }))).toBe(
			false
		);
		expect(isSwapRefused("offline")).toBe(false);
	});
});

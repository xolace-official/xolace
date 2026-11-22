import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import { LIMIT_MESSAGE, MIRROR_TEXT, RESOURCES, SAMPLE } from "./dev/fixtures";
import {
	canSend,
	holdsArrivals,
	type MirrorLines,
	mirrorSentences,
	pairPhrases,
	plainLines,
	promptFor,
	resourceRows,
	stageOf,
	takeCountdown,
	timeline,
	WRITE_IN,
	waitError,
	waitStageOf,
} from "./reflect-model";

describe("stageOf", () => {
	it("writes on the compose screens", () => {
		for (const s of ["idle", "typing", "typing-nudge"] as const) {
			expect(stageOf(s)).toBe("write");
		}
	});
	it("waits while processing, and on an error (the words are kept there)", () => {
		expect(stageOf("processing")).toBe("wait");
		expect(stageOf("error")).toBe("wait");
	});
	it("keeps a refinement on the mirror", () => {
		expect(stageOf("processing", { refining: true })).toBe("mirror");
	});
	it("shows the mirror for every mirror sub-screen, after the circle closes", () => {
		for (const s of ["mirror", "escalation", "clarify", "gave-up"] as const) {
			expect(stageOf(s)).toBe("mirror");
			expect(stageOf(s, { landing: true })).toBe("land");
		}
	});
	it("goes to Where next on path selection, and holds Heard over the reset", () => {
		expect(stageOf("path-selection")).toBe("next");
		expect(stageOf("idle", { heard: true })).toBe("heard");
	});
});

describe("waitStageOf", () => {
	it("follows the server's processing stage", () => {
		expect(waitStageOf(undefined)).toBe(0);
		expect(waitStageOf("connecting")).toBe(1);
		expect(waitStageOf("writing")).toBe(2);
	});
});

describe("mirrorSentences", () => {
	it("cuts the mirror into lines, one sentence each", () => {
		expect(mirrorSentences(MIRROR_TEXT)).toHaveLength(3);
		expect(mirrorSentences("One. Two? Three!")).toEqual([
			"One.",
			"Two?",
			"Three!",
		]);
	});
	it("keeps a last line without a full stop, and drops em dashes", () => {
		expect(mirrorSentences("Heavy — and quiet")).toEqual(["Heavy, and quiet"]);
	});
});

describe("pairPhrases", () => {
	const lines = mirrorSentences(MIRROR_TEXT);
	const { words, mirror } = pairPhrases(SAMPLE, lines);

	it("finds the phrases the mirror kept word for word", () => {
		const borrowed = words.filter(([, p]) => p >= 0).map(([t]) => t);
		expect(borrowed).toEqual([
			"replaying the meeting",
			"should have said",
			"Everyone else seemed fine",
			"of always feeling one step behind",
		]);
	});
	it("rebuilds your words exactly from the segments", () => {
		expect(words.map(([t]) => t).join("")).toBe(SAMPLE);
	});
	it("pairs each mirror phrase with its source", () => {
		const pairsOf = (segs: readonly (readonly [string, number])[]) =>
			segs.filter(([, p]) => p >= 0).map(([t, p]) => [t.toLowerCase(), p]);
		const source = Object.fromEntries(
			words.filter(([, p]) => p >= 0).map(([t, p]) => [p, t.toLowerCase()])
		);
		for (const line of mirror) {
			for (const [t, p] of pairsOf(line)) {
				expect(source[p as number]).toBe(t);
			}
		}
	});
	it("rebuilds each mirror line exactly from its segments", () => {
		expect(mirror.map((line) => line.map(([t]) => t).join(""))).toEqual(lines);
	});
	it("leaves short or small runs plain", () => {
		const r = pairPhrases("and I just was", ["and I just was there"]);
		expect(r.mirror[0]).toEqual([["and I just was there", -1]]);
	});
	it("pairs nothing when the mirror paraphrases", () => {
		const r = pairPhrases(SAMPLE, ["The day is still with you."]);
		expect(r.words).toEqual([[SAMPLE, -1]]);
	});
});

describe("timeline", () => {
	const lines = pairPhrases(SAMPLE, mirrorSentences(MIRROR_TEXT)).mirror;

	it("lights the borrowed phrases after the last word, .3 s apart", () => {
		const tl = timeline(lines, false);
		expect(tl.lights).toBe(true);
		expect(tl.litAt(1) - tl.litAt(0)).toBeCloseTo(WRITE_IN.lightStagger);
		expect(tl.litAt(0)).toBeCloseTo(tl.writeEnd + WRITE_IN.lightAfter);
		expect(tl.settle).toBeGreaterThan(tl.lastLit);
	});
	it("writes a heavy mirror slowly and lights nothing", () => {
		const tl = timeline(lines, true);
		expect(tl.lights).toBe(false);
		expect(tl.stagger).toBe(WRITE_IN.heavyStagger);
		expect(tl.actionsAt).toBeCloseTo(tl.writeEnd + 0.2);
	});
	it("keeps the full stop after a borrowed phrase on its last word", () => {
		const words = timeline(lines, false).lines.flatMap((l) =>
			l.words.map((w) => w.text)
		);
		expect(words).toContain("said.");
		expect(words).not.toContain(".");
		expect(words.slice(0, 4)).toEqual(["It", "sounds", "like", "replaying"]);
	});
	it("lights a quoted phrase's first word with its opening quote", () => {
		const quoted: MirrorLines = [
			[
				["You said “", -1],
				["I feel so stuck at work", 0],
				["” and that matters.", -1],
			],
		];
		const words = timeline(quoted, false).lines[0]?.words ?? [];
		expect(words.map((w) => [w.text, w.pair])).toEqual([
			["You", -1],
			["said", -1],
			["“I", 0],
			["feel", 0],
			["so", 0],
			["stuck", 0],
			["at", 0],
			["work”", 0],
			["and", -1],
			["that", -1],
			["matters.", -1],
		]);
	});
	it("lights nothing on a mirror with nothing borrowed", () => {
		expect(timeline(plainLines(["A quiet line."]), false).lights).toBe(false);
	});
});

describe("promptFor", () => {
	it("asks the evening question, or the late one", () => {
		expect(promptFor({ late: false })).toBe(COPY.write.prompt.evening);
		expect(promptFor({ late: true })).toBe(COPY.write.prompt.late);
	});
	it("clips a reply seed between graphemes, never inside one", () => {
		const family = "👨‍👩‍👧";
		const seed = `${"x".repeat(87)}${family}tail`;
		expect(promptFor({ late: false, replySeed: seed })).toBe(
			COPY.write.replySeed(`${"x".repeat(87)}${family}…`)
		);
	});
	it("puts a reply seed first, clipped, and a month's prompt after late", () => {
		const long = "x".repeat(120);
		expect(promptFor({ late: true, replySeed: long })).toBe(
			COPY.write.replySeed(`${"x".repeat(88)}…`)
		);
		expect(promptFor({ eventPrompt: "Who held you?", late: false })).toBe(
			"Who held you?"
		);
		expect(promptFor({ eventPrompt: "Who held you?", late: true })).toBe(
			COPY.write.prompt.late
		);
	});
});

describe("canSend", () => {
	it("takes words or a picked feeling", () => {
		expect(canSend("  ", [])).toBe(false);
		expect(canSend("", ["heavy"])).toBe(true);
		expect(canSend("tired", [])).toBe(true);
	});
});

describe("resourceRows", () => {
	it("puts the lowest priority first and opens each by its kind", () => {
		const rows = resourceRows(RESOURCES);
		expect(rows.map((r) => r.name)[0]).toBe("Xolace support");
		expect(rows[0].href).toBe("mailto:support@xolaceinc.com");
		expect(rows[1].href).toBe("tel:0800678678");
		expect(rows[1].sub).toBe("0800 678 678 · free, 24/7");
		expect(rows.at(-1)?.href).toBe("https://findahelpline.com");
	});
	it("reads an old plain-text resource as a row with nothing to open", () => {
		expect(resourceRows(["Call a friend"])).toEqual([
			{
				a11y: "Call a friend",
				href: null,
				key: "text-0",
				kind: "text",
				name: "Call a friend",
				sub: "",
			},
		]);
		expect(resourceRows(null)).toEqual([]);
	});
});

describe("waitError", () => {
	it("offers support, not a retry, when the safeguard said no", () => {
		expect(waitError("content_policy_violation", "plus")).toEqual({
			body: COPY.wait.rejected,
			kind: "rejected",
		});
	});

	it("opens Plus for a free account at the hourly cap", () => {
		expect(waitError(LIMIT_MESSAGE, "free")).toEqual({
			body: `${LIMIT_MESSAGE} ${COPY.wait.limitMore}`,
			kind: "limit",
		});
	});

	it("keeps Try again at the cap for Plus or while Xolace+ loads, and for other failures", () => {
		expect(waitError(LIMIT_MESSAGE, "plus").kind).toBe("failed");
		expect(waitError(LIMIT_MESSAGE, "loading").kind).toBe("failed");
		expect(waitError("Network down", "free")).toEqual({
			body: "Network down",
			kind: "failed",
		});
	});

	it("falls back to production's message when the server gave none", () => {
		expect(waitError("", "free").body).toBe(COPY.wait.failed);
	});

	it("reads the session's error code before its message", () => {
		expect(
			waitError("Rephrased refusal", "plus", "content_policy_violation")
		).toEqual({
			body: COPY.wait.rejected,
			kind: "rejected",
		});
		expect(
			waitError("Slow down a little.", "free", "reflection_rate_limited")
		).toEqual({
			body: `Slow down a little. ${COPY.wait.limitMore}`,
			kind: "limit",
		});
		expect(
			waitError("Slow down a little.", "plus", "reflection_rate_limited").kind
		).toBe("failed");
	});
});

describe("holdsArrivals", () => {
	it("holds a badge on an empty field: someone came here to write", () => {
		expect(holdsArrivals(stageOf("idle"))).toBe(true);
	});

	it("holds a badge over Heard, after the machine resets to idle", () => {
		expect(holdsArrivals(stageOf("idle", { heard: true }))).toBe(true);
	});

	it("holds through the session's stages", () => {
		for (const screen of ["processing", "mirror", "path-selection"] as const) {
			expect(holdsArrivals(stageOf(screen))).toBe(true);
		}
	});
});

describe("takeCountdown", () => {
	it("counts a Plus take's last 30 seconds down", () => {
		expect(takeCountdown(30_000)).toBe("0:30");
		expect(takeCountdown(8400)).toBe("0:09");
		expect(takeCountdown(0)).toBe("0:00");
	});

	it("stays quiet before then, and with no take", () => {
		expect(takeCountdown(30_001)).toBeNull();
		expect(takeCountdown(null)).toBeNull();
	});
});

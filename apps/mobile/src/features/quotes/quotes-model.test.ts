import { describe, expect, it } from "vitest";
import { QUOTE_COPY } from "./copy";
import {
	type CatalogueRow,
	keptBackground,
	keptCard,
	keptDay,
	LARGE_TEXT_STEP,
	loopState,
	POSTER,
	plainQuote,
	quoteType,
	reasonLine,
	reflectSeed,
	resolveBackgrounds,
	shownBackground,
	soundPlays,
	tileTap,
} from "./quotes-model";

const ROWS: CatalogueRow[] = [
	{ ink: "dark", key: "poster", kind: "still", name: "Poster", plus: false },
	{
		ink: "light",
		key: "first-light",
		kind: "still",
		name: "First light",
		plus: false,
	},
	{ ink: "light", key: "night", kind: "still", name: "Night", plus: false },
	{ ink: "light", key: "dunes", kind: "still", name: "Dunes", plus: true },
	{
		ink: "light",
		key: "newer-still",
		kind: "still",
		name: "Newer",
		plus: true,
	},
	{
		audioUrl: "https://x/rain.m4a",
		ink: "light",
		key: "rain-window",
		kind: "loop",
		name: "Rain window",
		plus: false,
		posterUrl: "https://x/rain.webp",
		videoUrl: "https://x/rain.mp4",
	},
	{ ink: "light", key: "unhosted", kind: "loop", name: "Unhosted", plus: true },
	{
		ink: "light",
		key: "hearth",
		kind: "loop",
		name: "Hearth",
		plus: true,
		videoUrl: "https://x/hearth.mp4",
	},
];
const STILLS = { dunes: 2, "first-light": 1 };

describe("resolveBackgrounds", () => {
	const list = resolveBackgrounds(ROWS, STILLS);

	it("keeps catalogue order and drops what this build can't draw", () => {
		expect(list.map((b) => b.key)).toEqual([
			"poster",
			"first-light",
			"night",
			"dunes",
			"rain-window",
			"hearth",
		]);
	});

	it("draws Poster and Night in code, stills from the bundle, loops from hosting", () => {
		expect(list[0].drawn).toBe("poster");
		expect(list[2].drawn).toBe("night");
		expect(list[1]).toMatchObject({ focus: { x: 0.4, y: 0.5 }, image: 1 });
		expect(list[4]).toMatchObject({
			audioUrl: "https://x/rain.m4a",
			image: { uri: "https://x/rain.webp" },
			videoUrl: "https://x/rain.mp4",
		});
		expect(list[5].image).toBeUndefined();
		expect(list[5].focus).toEqual({ x: 0.5, y: 1 });
	});

	it("takes the catalogue's name and tier for the drawn two", () => {
		const renamed = resolveBackgrounds(
			[
				{
					ink: "dark",
					key: "poster",
					kind: "still",
					name: "Paper",
					plus: true,
				},
			],
			{}
		);
		expect(renamed[0]).toMatchObject({
			drawn: "poster",
			name: "Paper",
			plus: true,
		});
	});

	it("is Poster then Night before the catalogue answers", () => {
		expect(resolveBackgrounds(undefined, STILLS).map((b) => b.key)).toEqual([
			"poster",
			"night",
		]);
	});
});

describe("shownBackground", () => {
	const list = resolveBackgrounds(ROWS, STILLS);

	it("shows the saved choice", () => {
		expect(shownBackground("dunes", list, true).key).toBe("dunes");
		expect(shownBackground("first-light", list, false).key).toBe("first-light");
	});

	it("falls back to Poster when Xolace+ lapsed", () => {
		expect(shownBackground("dunes", list, false).key).toBe("poster");
	});

	it("falls back to Poster for a key it doesn't have", () => {
		expect(shownBackground("gone", list, true).key).toBe("poster");
		expect(shownBackground(undefined, list, true).key).toBe("poster");
		expect(shownBackground("gone", [], true)).toBe(POSTER);
	});
});

describe("keptBackground", () => {
	const list = resolveBackgrounds(ROWS, STILLS);

	it("is the one it was kept with, never gated", () => {
		expect(keptBackground("dunes", list).key).toBe("dunes");
	});

	it("is Poster when that one is gone or there was none", () => {
		expect(keptBackground("gone", list).key).toBe("poster");
		expect(keptBackground(undefined, []).key).toBe("poster");
	});
});

describe("tileTap", () => {
	const list = resolveBackgrounds(ROWS, STILLS);
	const dunes = list[3];
	const first = list[1];

	it("does nothing on the current one", () => {
		expect(tileTap(dunes, "dunes", false)).toBe("none");
	});

	it("opens Xolace+ for a free account on a Plus tile, without applying it", () => {
		expect(tileTap(dunes, "poster", false)).toBe("plus");
	});

	it("applies a free tile, or any tile with Xolace+", () => {
		expect(tileTap(first, "poster", false)).toBe("apply");
		expect(tileTap(dunes, "poster", true)).toBe("apply");
	});
});

describe("loopState", () => {
	const base = {
		active: true,
		kind: "loop" as const,
		lowPower: false,
		paused: false,
		reduced: false,
		sharing: false,
	};

	it("plays a loop", () => {
		expect(loopState(base)).toEqual({ moving: true, playing: true });
	});

	it("never moves a still", () => {
		expect(loopState({ ...base, kind: "still" })).toEqual({
			moving: false,
			playing: false,
		});
	});

	it("rests with Reduce Motion or Low Power Mode", () => {
		expect(loopState({ ...base, reduced: true }).moving).toBe(false);
		expect(loopState({ ...base, lowPower: true }).moving).toBe(false);
	});

	it("stops while paused, put away or sharing, but still moves", () => {
		for (const patch of [
			{ paused: true },
			{ active: false },
			{ sharing: true },
		]) {
			expect(loopState({ ...base, ...patch })).toEqual({
				moving: true,
				playing: false,
			});
		}
	});
});

describe("soundPlays", () => {
	it("plays only when on, with a track, while the loop plays", () => {
		expect(soundPlays({ hasAudio: true, playing: true, soundOn: true })).toBe(
			true
		);
		expect(soundPlays({ hasAudio: true, playing: true, soundOn: false })).toBe(
			false
		);
		expect(soundPlays({ hasAudio: false, playing: true, soundOn: true })).toBe(
			false
		);
		expect(soundPlays({ hasAudio: true, playing: false, soundOn: true })).toBe(
			false
		);
	});
});

describe("quoteType", () => {
	it("sizes by length: 46, 34, 23", () => {
		expect(quoteType("x".repeat(40), 1)).toEqual({
			lineHeight: 1.05,
			size: 46,
		});
		expect(quoteType("x".repeat(41), 1)).toEqual({
			lineHeight: 1.12,
			size: 34,
		});
		expect(quoteType("x".repeat(120), 1).size).toBe(34);
		expect(quoteType("x".repeat(121), 1)).toEqual({
			lineHeight: 1.32,
			size: 23,
		});
	});

	it("steps up with Large Text", () => {
		expect(quoteType("short", 1.2).size).toBe(Math.round(46 * LARGE_TEXT_STEP));
	});
});

describe("plainQuote", () => {
	it("reads an em dash as a comma", () => {
		expect(plainQuote("Rest — then begin.")).toBe("Rest, then begin.");
		expect(plainQuote("  Rest—then  ")).toBe("Rest, then");
	});
});

describe("reasonLine", () => {
	it("shows the gate to a free account who would have had their own", () => {
		expect(
			reasonLine({
				hasSessionToday: true,
				sessionLocked: true,
				type: "curated",
			})
		).toEqual({ gate: true, text: QUOTE_COPY.reason.locked });
	});

	it("names a session quote", () => {
		expect(
			reasonLine({
				hasSessionToday: true,
				sessionLocked: false,
				type: "session",
			})
		).toEqual({ gate: false, text: QUOTE_COPY.reason.session });
	});

	it("invites a reflection, or says it was chosen", () => {
		expect(
			reasonLine({
				hasSessionToday: false,
				sessionLocked: false,
				type: "curated",
			}).text
		).toBe(QUOTE_COPY.reason.reflectToday);
		expect(
			reasonLine({
				hasSessionToday: true,
				sessionLocked: false,
				type: "curated",
			}).text
		).toBe(QUOTE_COPY.reason.curated);
	});
});

describe("keptDay", () => {
	it("is the card's chip", () => {
		expect(keptDay("2026-11-08")).toBe("Sunday 8 Nov");
	});

	it("passes through a date it can't read", () => {
		expect(keptDay("someday")).toBe("someday");
	});
});

describe("reflectSeed", () => {
	it("seeds Reflect with the reply", () => {
		expect(
			reflectSeed({
				flagged: false,
				reply: " Slower today. ",
				sessionActive: false,
			})
		).toBe("Slower today.");
	});

	it("never seeds a flagged reply, over a live session, or nothing", () => {
		expect(
			reflectSeed({ flagged: true, reply: "x", sessionActive: false })
		).toBeNull();
		expect(
			reflectSeed({ flagged: false, reply: "x", sessionActive: true })
		).toBeNull();
		expect(
			reflectSeed({ flagged: false, reply: "  ", sessionActive: false })
		).toBeNull();
		expect(reflectSeed({ flagged: false, sessionActive: false })).toBeNull();
	});
});

describe("keptCard", () => {
	it("draws a saved row", () => {
		expect(
			keptCard({
				_id: "q1",
				date: "2026-11-06",
				keptBackground: "night",
				reply: " Needed this. ",
				replyModeration: { flagged: false },
				text: "Rest — part of the work.",
			})
		).toEqual({
			background: "night",
			day: "Friday 6 Nov",
			flagged: false,
			id: "q1",
			reply: "Needed this.",
			text: "Rest, part of the work.",
		});
	});

	it("keeps a flagged reply's flag and drops an empty one", () => {
		const card = keptCard({
			_id: "q2",
			date: "2026-11-03",
			reply: " ",
			replyModeration: { flagged: true },
			text: "Small steps.",
		});
		expect(card.flagged).toBe(true);
		expect(card.reply).toBeUndefined();
		expect(card.background).toBeUndefined();
	});
});

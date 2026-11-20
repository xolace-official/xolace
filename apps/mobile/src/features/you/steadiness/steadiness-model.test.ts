import { describe, expect, it } from "vitest";
import {
	fixtureSteadiness,
	fixtureUnlit,
	ST_NOW,
} from "@/features/you/steadiness/dev/steadiness-fixtures";
import {
	dialOf,
	litTicks,
	openLine,
	partsOf,
	selectedPart,
	tapOf,
	trendSay,
	trendText,
} from "@/features/you/steadiness/steadiness-model";

const plus = partsOf(fixtureSteadiness({ plus: true }), true, ST_NOW);
const free = partsOf(fixtureSteadiness({ plus: false }), false, ST_NOW);
const byDomain = (parts: typeof plus, d: string) =>
	parts.find((p) => p.domain === d);

describe("dialOf", () => {
	it("lights Xolace+'s dial with the change and what Xolace noticed", () => {
		const dial = dialOf(fixtureSteadiness({ plus: true }), true, ST_NOW);
		expect(dial).toMatchObject({
			label: "Overall steadiness, 68 out of 100. Up 4 since last week.",
			lit: true,
			score: 68,
			trend: { delta: 4, since: null },
		});
		expect(dial.lit && dial.noticed).toEqual([
			{
				date: "Noticed 6 Nov",
				eyebrow: "Where relief came from",
				text: "Talking it through, more than anything else, has been what eases your weeks lately.",
			},
		]);
	});

	it("shows free users the number, never the change", () => {
		const dial = dialOf(fixtureSteadiness({ plus: false }), false, ST_NOW);
		expect(dial).toMatchObject({
			label: "Overall steadiness, 68 out of 100.",
			noticed: [],
			trend: null,
		});
	});

	it("waits until two parts are known, counting the one so far", () => {
		expect(dialOf(fixtureUnlit(), false, ST_NOW)).toEqual({
			known: 1,
			label: "Not lit yet",
			lit: false,
		});
	});
});

describe("partsOf, Xolace+", () => {
	it("reads a heavier part against its usual, in amber", () => {
		expect(byDomain(plus, "work")).toMatchObject({
			emberSub: true,
			gridSub: "Heavier lately",
			kindling: true,
			label:
				"Work & Studies, heavier than your usual, 58 out of 100, usually 66, down 8 since last week",
			sub: "Heavier than your usual",
			tone: "ember",
			usual: 66,
			value: 58,
		});
		expect(byDomain(plus, "work")?.noticed[0]?.eyebrow).toBe("One thread");
	});

	it("mutes a quiet part and says when it was last seen", () => {
		expect(byDomain(plus, "belonging")).toMatchObject({
			gridSub: "last seen 18 Sep",
			sub: "Not recently · last seen 18 Sep",
			tone: "muted",
			trend: null,
			word: "Not recently",
		});
	});

	it("leaves a warming part without a number", () => {
		expect(byDomain(plus, "self")).toMatchObject({
			label: "Self, warming",
			value: null,
			warming: true,
			word: "warming",
		});
	});
});

describe("partsOf, free", () => {
	it("shows no number, only the stage word, and amber only for the upsell's part", () => {
		expect(free.every((p) => p.value === null && p.trend === null)).toBe(true);
		expect(byDomain(free, "health")).toMatchObject({
			kindling: false,
			label: "Health & Rest, known well",
			noticed: [],
			tone: "accent",
			word: "Known well",
		});
		expect(byDomain(free, "work")).toMatchObject({
			peek: "Xolace+ shows how far Work & Studies has moved from your usual, which way it's heading, and what Xolace noticed about it.",
			sub: "Heavier than your usual",
			tone: "ember",
		});
		expect(byDomain(free, "love")?.peek).toBe(
			"Xolace+ shows how steady Love & Friendship has been, your usual for it, and the change since last week."
		);
	});
});

describe("trends", () => {
	it("writes the chip, short and long, never with a red word", () => {
		expect(trendText({ delta: 4, since: null }, ST_NOW)).toBe(
			"+4 vs last week"
		);
		expect(trendText({ delta: -6, since: null }, ST_NOW)).toBe(
			"−6 vs last week"
		);
		expect(trendText({ delta: 0, since: null }, ST_NOW)).toBe(
			"same as last week"
		);
		expect(trendText({ delta: -8, since: null }, ST_NOW, true)).toBe("−8");
		expect(trendText({ delta: 0, since: null }, ST_NOW, true)).toBe("same");
	});

	it("runs from a quiet part's last reading", () => {
		const april = new Date(2026, 3, 9).getTime();
		const lastYear = new Date(2025, 3, 9).getTime();
		expect(trendText({ delta: 5, since: april }, ST_NOW)).toBe(
			"+5 since April"
		);
		expect(trendSay({ delta: 0, since: april }, ST_NOW)).toBe(
			"same since April"
		);
		expect(trendSay({ delta: -3, since: lastYear }, ST_NOW)).toBe(
			"down 3 since April 2025"
		);
	});
});

describe("picking parts", () => {
	it("defaults the detail card to the first part with a number", () => {
		expect(selectedPart(plus, null)?.domain).toBe("work");
		expect(selectedPart(plus, "health")?.domain).toBe("health");
		expect(selectedPart(plus, "self")?.domain).toBe("work");
		expect(selectedPart(free, null)).toBeNull();
	});

	it("selects in the grid, opens in the list, peeks for free, skips warming", () => {
		const work = byDomain(plus, "work");
		const self = byDomain(plus, "self");
		const freeLove = byDomain(free, "love");
		const freeWork = byDomain(free, "work");
		if (!(work && self && freeLove && freeWork)) {
			throw new Error("fixture changed");
		}
		expect(tapOf(work, true, "grid")).toBe("select");
		expect(tapOf(work, true, "list")).toBe("toggle-open");
		expect(tapOf(self, true, "grid")).toBe("none");
		expect(tapOf(freeLove, false, "grid")).toBe("toggle-peek");
		expect(tapOf(freeLove, false, "list")).toBe("none");
		expect(tapOf(freeWork, false, "list")).toBe("toggle-peek");
	});

	it("opens no locked card while a new purchase reaches the server", () => {
		const freeWork = byDomain(free, "work");
		if (!freeWork) {
			throw new Error("fixture changed");
		}
		expect(tapOf(freeWork, false, "grid", false)).toBe("none");
		expect(tapOf(freeWork, false, "list", false)).toBe("none");
	});
});

describe("openLine", () => {
	it("joins the usual and the change, and only what's there", () => {
		const work = byDomain(plus, "work");
		const family = byDomain(plus, "family");
		const belonging = byDomain(plus, "belonging");
		if (!(work && family && belonging)) {
			throw new Error("fixture changed");
		}
		expect(openLine(work, ST_NOW)).toBe("Usually 66 · down 8 since last week");
		expect(family.usual).toBeNull();
		expect(openLine(family, ST_NOW)).toBe("Same as last week");
		expect(openLine({ ...family, trend: null }, ST_NOW)).toBeNull();
		expect(openLine(belonging, ST_NOW)).toBe("Usually 55");
	});
});

describe("litTicks", () => {
	it("lights floor(score / 100 × 56)", () => {
		expect(litTicks(68)).toBe(38);
		expect(litTicks(30)).toBe(16);
		expect(litTicks(100)).toBe(56);
		expect(litTicks(0)).toBe(0);
	});
});

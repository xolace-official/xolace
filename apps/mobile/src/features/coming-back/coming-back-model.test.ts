import { describe, expect, it } from "vitest";
import {
	awayOf,
	cardFromParams,
	checkInRow,
	copyOf,
	dayLabel,
	episodeKey,
	isCareful,
	NO_ITEMS,
	NO_OUTCOMES,
	nodOf,
	picksFor,
	pillLabelOf,
	promptRow,
	questionOf,
	rowsOf,
	shouldGreet,
	waitingOf,
} from "./coming-back-model";
import { AWAY, CHECK_IN, WELCOME_BACK } from "./copy";
import {
	FIXTURE_EVENT,
	fixtureCard,
	fixtureItems,
	LIGHTER_DONE,
} from "./dev/fixtures";

const DAY = 24 * 60 * 60 * 1000;
/** A Thursday at noon, local. */
const NOW = new Date(2026, 10, 19, 12).getTime();
const daysAgo = (n: number) => NOW - n * DAY;

describe("awayOf", () => {
	it("is the next day without a last session or under two local days", () => {
		expect(awayOf({}, NOW)).toBe("next");
		expect(awayOf({ lastSessionAt: daysAgo(1) }, NOW)).toBe("next");
	});
	it("tiers by the gap", () => {
		expect(awayOf({ lastSessionAt: daysAgo(3) }, NOW)).toBe("recent");
		expect(awayOf({ lastSessionAt: daysAgo(14) }, NOW)).toBe("away-14-30");
		expect(awayOf({ lastSessionAt: daysAgo(45) }, NOW)).toBe("away-30-90");
		expect(awayOf({ lastSessionAt: daysAgo(120) }, NOW)).toBe("away-90-plus");
	});
	it("greets the anniversary only when away", () => {
		const firstSessionAt = daysAgo(365);
		expect(awayOf({ firstSessionAt, lastSessionAt: daysAgo(5) }, NOW)).toBe(
			"anniversary"
		);
		expect(awayOf({ firstSessionAt, lastSessionAt: daysAgo(1) }, NOW)).toBe(
			"next"
		);
	});
});

describe("dayLabel", () => {
	it("says today, yesterday, a weekday, then a date", () => {
		expect(dayLabel(NOW, NOW)).toBe("today");
		expect(dayLabel(daysAgo(1), NOW)).toBe("yesterday");
		expect(dayLabel(daysAgo(2), NOW)).toBe("Tuesday");
		expect(dayLabel(daysAgo(10), NOW)).toBe("Nov 9");
	});
});

describe("episodeKey", () => {
	it("is one per return when away, one per waiting set the next day", () => {
		const waiting = { card: fixtureCard(), event: FIXTURE_EVENT };
		expect(episodeKey("recent", 5, waiting)).toBe("away:5");
		expect(episodeKey("next", 5, waiting)).toBe(
			"next:fixture_card:fixture_event"
		);
		expect(episodeKey("next", 5, { card: null, event: null })).toBe("next::");
	});
});

describe("shouldGreet", () => {
	it("always greets an away tier", () => {
		expect(shouldGreet("away-30-90", NO_ITEMS)).toBe(true);
	});
	it("greets the next day only when something waits", () => {
		expect(shouldGreet("next", NO_ITEMS)).toBe(false);
		expect(shouldGreet("next", { ...NO_ITEMS, card: fixtureCard() })).toBe(
			true
		);
		expect(shouldGreet("next", { ...NO_ITEMS, event: FIXTURE_EVENT })).toBe(
			true
		);
		expect(
			shouldGreet("next", { ...NO_ITEMS, freeze: { days: 1, streak: 3 } })
		).toBe(true);
	});
});

describe("rowsOf", () => {
	it("lists freeze, check-in, prompt", () => {
		expect(rowsOf(fixtureItems(), "greet")).toEqual(["fz", "ck", "pm"]);
	});
	it("puts an acute check-in first", () => {
		expect(rowsOf(fixtureItems({ tier: "acute" }), "greet")).toEqual([
			"ck",
			"fz",
			"pm",
		]);
	});
	it("drops the freeze in Still here", () => {
		expect(rowsOf(fixtureItems(), "left")).toEqual(["ck", "pm"]);
	});
	it("lists nothing when nothing waits", () => {
		expect(rowsOf(NO_ITEMS, "greet")).toEqual([]);
	});
});

describe("waitingOf and copyOf", () => {
	it("counts an answered check-in and a touched prompt as no longer waiting", () => {
		const items = fixtureItems();
		expect(waitingOf(items, NO_OUTCOMES)).toEqual({ ck: true, pm: true });
		expect(waitingOf(items, { ...LIGHTER_DONE, prompt: "read" })).toEqual({
			ck: false,
			pm: false,
		});
	});
	it("uses the tier's hello when away", () => {
		expect(
			copyOf("away-30-90", "greet", fixtureItems(), NO_OUTCOMES, "Ama")
		).toBe(AWAY["away-30-90"]);
	});
	it("says Hi again with one or two things the next day", () => {
		const one = copyOf(
			"next",
			"greet",
			fixtureItems({ event: null }),
			NO_OUTCOMES,
			"Ama"
		);
		expect(one.title).toBe("Hi again, Ama.");
		expect(one.body).toBe("One thing from Tuesday, if you want it.");
		const prompt = copyOf(
			"next",
			"greet",
			fixtureItems({ card: null }),
			NO_OUTCOMES,
			null
		);
		expect(prompt.title).toBe("Hi again.");
		expect(prompt.body).toBe("One thing for this month, if you want it.");
		expect(
			copyOf("next", "greet", fixtureItems(), NO_OUTCOMES, null).body
		).toBe(WELCOME_BACK.next.two);
	});
	it("says Not now in Still here while something waits, Done once nothing does", () => {
		const s = WELCOME_BACK.stillHere;
		expect(
			copyOf("recent", "left", fixtureItems(), NO_OUTCOMES, null).cta
		).toBe(s.waiting);
		expect(
			copyOf(
				"recent",
				"left",
				fixtureItems(),
				{ ...LIGHTER_DONE, prompt: "passed" },
				null
			).cta
		).toBe(s.done);
	});
});

describe("pillLabelOf", () => {
	it("names what still waits", () => {
		const p = WELCOME_BACK.pill;
		expect(pillLabelOf({ ck: true, pm: true }, "Tuesday")).toBe(p.both);
		expect(pillLabelOf({ ck: true, pm: false }, "yesterday")).toBe(
			"Yesterday’s check-in is still here"
		);
		expect(pillLabelOf({ ck: false, pm: true }, "Tuesday")).toBe(p.prompt);
		expect(pillLabelOf({ ck: false, pm: false }, "Tuesday")).toBeNull();
	});
});

describe("the check-in", () => {
	it("offers two answers when acute, four otherwise", () => {
		expect(picksFor("acute")).toEqual(["still_here", "lighter"]);
		expect(picksFor("standard")).toHaveLength(4);
	});
	it("is careful when acute or from an escalation", () => {
		expect(isCareful(fixtureCard("acute"))).toBe(true);
		expect(isCareful({ ...fixtureCard(), escalationDerived: true })).toBe(true);
		expect(isCareful(fixtureCard("elevated"))).toBe(false);
	});
	it("asks the card's own sentence, or the fallback", () => {
		expect(questionOf(fixtureCard())).toBe(fixtureCard().cardText);
		expect(questionOf({ cardText: "  " })).toBe(CHECK_IN.fallbackQuestion);
		expect(questionOf(null)).toBe(CHECK_IN.fallbackQuestion);
	});
});

describe("rows' words", () => {
	it("ticks the check-in once answered and gone", () => {
		expect(checkInRow("Tuesday", NO_OUTCOMES).done).toBe(false);
		// Answered but the check-in still open: the row waits.
		expect(
			checkInRow("Tuesday", { ...NO_OUTCOMES, answer: "lighter" }).done
		).toBe(false);
		const done = checkInRow("Tuesday", LIGHTER_DONE);
		expect(done.done).toBe(true);
		expect(done.sub).toBe("Answered · Feeling lighter");
	});
	it("says read and passed apart", () => {
		expect(promptRow("waiting").done).toBe(false);
		expect(promptRow("read").sub).toBe(WELCOME_BACK.prompt.read);
		expect(promptRow("written").sub).toBe(WELCOME_BACK.prompt.read);
		expect(promptRow("passed").sub).toBe(WELCOME_BACK.prompt.passed);
	});
});

describe("cardFromParams", () => {
	it("builds the card from You's params", () => {
		expect(
			cardFromParams({
				cardId: "c1",
				cardText: "How is it?",
				escalation: "1",
				tier: "elevated",
			})
		).toEqual({
			_id: "c1",
			cardText: "How is it?",
			escalationDerived: true,
			shown: true,
			tier: "elevated",
		});
	});
	it("is null without an id or with an unknown tier", () => {
		expect(cardFromParams({})).toBeNull();
		expect(cardFromParams({ cardId: "c1" })).toBeNull();
		// A link can carry anything.
		expect(
			cardFromParams({ cardId: "c1", tier: "loud" as unknown as "acute" })
		).toBeNull();
	});
});

describe("nodOf", () => {
	it("says nothing without a streak", () => {
		expect(nodOf(0)).toBeNull();
	});
	it("says something with one", () => {
		expect(nodOf(12)).toEqual(expect.any(String));
	});
});

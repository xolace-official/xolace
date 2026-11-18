import { describe, expect, it } from "vitest";
import { LETTER_MAX, LETTERS } from "./copy";
import {
	answerOf,
	canSend,
	cardStatus,
	countLine,
	END_CARD_FRESH,
	endCardOffer,
	endCardPassed,
	endCardShown,
	endCardTaken,
	forYouRows,
	type LettersStatus,
	openingLine,
	type ReceivedLetter,
	receivedRowSub,
	withStarter,
} from "./letters-model";

const OPEN: LettersStatus = {
	optIn: "yes",
	unopenedId: null,
	writeLimit: null,
};
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const FORTY = "x".repeat(40);

const letter = (patch: Partial<ReceivedLetter>): ReceivedLetter => ({
	acknowledged: false,
	hidden: false,
	id: "r",
	opened: true,
	text: "Hello",
	...patch,
});

describe("answerOf: the check's six outcomes", () => {
	it("rises on a pass, and on a check that couldn't finish", () => {
		expect(answerOf({ kind: "pass" })).toEqual({ next: "rise" });
		expect(answerOf({ kind: "unavailable" })).toEqual({ next: "rise" });
	});
	it("comes back with the check's line when fixable", () => {
		expect(answerOf({ kind: "fixable", line: "Take out the handle." })).toEqual(
			{
				held: false,
				line: "Take out the handle.",
				next: "back",
			}
		);
	});
	it("comes back held, so Send stays off until the words change", () => {
		expect(answerOf({ kind: "held" })).toEqual({
			held: true,
			line: LETTERS.check.held,
			next: "back",
		});
	});
	it("comes back with the English line when not English", () => {
		expect(answerOf({ kind: "lang" })).toEqual({
			held: false,
			line: LETTERS.check.lang,
			next: "back",
		});
	});
	it("rests for care at risk, with no line", () => {
		expect(answerOf({ kind: "risk" })).toEqual({ next: "care" });
	});
	it("says the limit another device used first", () => {
		expect(answerOf({ kind: "limit", reason: "three" })).toEqual({
			next: "limit",
			reason: "three",
		});
	});
});

describe("cardStatus", () => {
	it("puts a waiting letter first", () => {
		expect(cardStatus({ ...OPEN, unopenedId: "a", writeLimit: "today" })).toBe(
			LETTERS.card.waitingForYou
		);
	});
	it("says why Write is off, today before three", () => {
		expect(cardStatus({ ...OPEN, writeLimit: "today" })).toBe(
			LETTERS.card.wroteToday
		);
		expect(cardStatus({ ...OPEN, writeLimit: "three" })).toBe(
			LETTERS.card.threeWaiting
		);
	});
	it("invites otherwise", () => {
		expect(cardStatus(OPEN)).toBe(LETTERS.card.invite);
	});
});

describe("openingLine", () => {
	it("keeps a short first paragraph whole", () => {
		expect(openingLine("You are not alone.\nSecond")).toBe(
			"You are not alone."
		);
	});
	it("cuts a long one at a word, with an ellipsis", () => {
		const line = openingLine(
			"I don't know what you're carrying today, but I hope it gets lighter"
		);
		expect(line.endsWith("…")).toBe(true);
		expect(line.length).toBeLessThanOrEqual(45);
		expect(line).not.toMatch(/\s…$/);
	});
});

describe("countLine and canSend", () => {
	it("says nothing for an empty letter", () => {
		expect(countLine("   ")).toBe("");
	});
	it("says what's missing under 40", () => {
		expect(countLine("x".repeat(30))).toBe(LETTERS.write.countUnder(10));
	});
	it("says nothing in the middle, and what's left past 400", () => {
		expect(countLine("x".repeat(200))).toBe("");
		expect(countLine("x".repeat(450))).toBe(LETTERS.write.countLeft(50));
	});
	it("needs 40 characters after trimming", () => {
		expect(canSend(` ${"x".repeat(39)} `, "")).toBe(false);
		expect(canSend(FORTY, "")).toBe(true);
	});
	it("keeps Send off for a held letter's words until they change", () => {
		expect(canSend(FORTY, FORTY)).toBe(false);
		expect(canSend(`${FORTY}.`, FORTY)).toBe(true);
	});
});

describe("withStarter", () => {
	it("starts an empty letter with the starter", () => {
		expect(withStarter("", "You’re allowed to")).toBe("You’re allowed to ");
	});
	it("adds it after one space", () => {
		expect(withStarter("Hi.  ", "You’re allowed to")).toBe(
			"Hi. You’re allowed to "
		);
	});
	it("never passes the limit", () => {
		expect(withStarter("x".repeat(LETTER_MAX), "More")).toHaveLength(
			LETTER_MAX
		);
	});
});

describe("forYouRows and receivedRowSub", () => {
	it("splits opened letters from hidden ones and leaves the unopened out", () => {
		const rows = forYouRows([
			letter({ id: "a" }),
			letter({ hidden: true, id: "b" }),
			letter({ id: "c", opened: false }),
		]);
		expect(rows.reread.map((l) => l.id)).toEqual(["a"]);
		expect(rows.hidden.map((l) => l.id)).toEqual(["b"]);
	});
	it("says hidden, acknowledged or received", () => {
		expect(receivedRowSub(letter({ acknowledged: true, hidden: true }))).toBe(
			LETTERS.read.rowHidden
		);
		expect(receivedRowSub(letter({ acknowledged: true }))).toBe(
			LETTERS.read.rowAcknowledged
		);
		expect(receivedRowSub(letter({}))).toBe(LETTERS.read.rowReceived);
	});
});

describe("the session-end cards", () => {
	it("offers the waiting letter whenever one is waiting", () => {
		expect(
			endCardOffer({ ...OPEN, unopenedId: "a" }, END_CARD_FRESH, true, NOW)
				.waiting
		).toBe(true);
	});
	it("offers the write card only without a safeguard and with Write on", () => {
		expect(endCardOffer(OPEN, END_CARD_FRESH, false, NOW).write).toBe(true);
		expect(endCardOffer(OPEN, END_CARD_FRESH, true, NOW).write).toBe(false);
		expect(
			endCardOffer({ ...OPEN, writeLimit: "today" }, END_CARD_FRESH, false, NOW)
				.write
		).toBe(false);
	});
	it("rests the write card 7 days after it shows", () => {
		const shown = endCardShown(END_CARD_FRESH, NOW);
		expect(endCardOffer(OPEN, shown, false, NOW + 6 * DAY).write).toBe(false);
		expect(endCardOffer(OPEN, shown, false, NOW + 7 * DAY).write).toBe(true);
	});
	it("rests it 30 days after three passes running", () => {
		let m = END_CARD_FRESH;
		m = endCardPassed(m, NOW);
		m = endCardPassed(m, NOW);
		expect(endCardOffer(OPEN, m, false, NOW).write).toBe(true);
		m = endCardPassed(m, NOW);
		expect(m.passes).toBe(0);
		expect(endCardOffer(OPEN, m, false, NOW + 29 * DAY).write).toBe(false);
		expect(endCardOffer(OPEN, m, false, NOW + 30 * DAY).write).toBe(true);
	});
	it("starts the passes over when taken", () => {
		const m = endCardTaken(
			endCardPassed(endCardPassed(END_CARD_FRESH, NOW), NOW)
		);
		expect(endCardPassed(m, NOW).passes).toBe(1);
	});
});

import { LETTER_MAX_CHARS, letterOpeningLine } from "@xolace/backend/shared";
import { describe, expect, it, vi } from "vitest";
import { LETTERS } from "./copy";
import { LETTER_MOTION } from "./letter-motion";
import {
	afterAnswer,
	answerOf,
	canSend,
	cardStatus,
	countLine,
	draftAfter,
	END_CARD_FRESH,
	endCardOffer,
	endCardPassed,
	endCardShown,
	endCardTaken,
	foldMoves,
	forYouRows,
	heldAgain,
	type LettersStatus,
	lateMoves,
	PHASE_OF,
	type ReceivedLetter,
	readerAcknowledged,
	readerActions,
	readerExit,
	readerGoneLine,
	readerHidden,
	readerSealed,
	readTarget,
	receivedRowSub,
	type SentLetter,
	sentDismissable,
	sentLit,
	sentShown,
	waitLeft,
	withStarter,
} from "./letters-model";

vi.mock(
	"react-native-reanimated",
	() => import("@/design/testing/reanimated-stub")
);

const OPEN: LettersStatus = {
	invite: true,
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

describe("letterOpeningLine", () => {
	it("keeps a short first paragraph whole", () => {
		expect(letterOpeningLine("You are not alone.\nSecond")).toBe(
			"You are not alone."
		);
	});
	it("cuts a long one at a word, with an ellipsis", () => {
		const line = letterOpeningLine(
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
	it("counts one length for both limits and what's left: the trimmed words", () => {
		expect(countLine(`${"x".repeat(450)} `)).toBe(LETTERS.write.countLeft(50));
		expect(countLine(` ${"x".repeat(39)} `)).toBe(LETTERS.write.countUnder(1));
	});
	it("needs 40 characters after trimming", () => {
		expect(canSend(` ${"x".repeat(39)} `, "")).toBe(false);
		expect(canSend(FORTY, "")).toBe(true);
	});
	it("keeps Send off past the limit", () => {
		expect(canSend("x".repeat(LETTER_MAX_CHARS), "")).toBe(true);
		expect(canSend("x".repeat(LETTER_MAX_CHARS + 1), "")).toBe(false);
		expect(canSend(` ${"x".repeat(LETTER_MAX_CHARS)} `, "")).toBe(true);
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
		expect(withStarter("x".repeat(LETTER_MAX_CHARS), "More")).toHaveLength(
			LETTER_MAX_CHARS
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
	it("stops asking for letters while Xolace isn't inviting them (decision C)", () => {
		const backlog = { ...OPEN, invite: false };
		expect(endCardOffer(backlog, END_CARD_FRESH, false, NOW).write).toBe(false);
		expect(
			endCardOffer({ ...backlog, unopenedId: "a" }, END_CARD_FRESH, false, NOW)
				.waiting
		).toBe(true);
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

describe("heldAgain and canSend: a held letter, compared trimmed (W4)", () => {
	it("keeps Send off for the held words with a space added", () => {
		expect(canSend(`${FORTY} `, FORTY)).toBe(false);
		expect(canSend(FORTY, `${FORTY} `)).toBe(false);
		expect(heldAgain(` ${FORTY}\n`, FORTY)).toBe(true);
	});
	it("lets a changed letter go, and anything when nothing is held", () => {
		expect(canSend(`${FORTY}y`, FORTY)).toBe(true);
		expect(heldAgain(FORTY, "")).toBe(false);
		expect(heldAgain(FORTY, "   ")).toBe(false);
	});
});

describe("sent statuses", () => {
	it("lights the mark only once received", () => {
		expect(sentLit("waiting")).toBe(false);
		expect(sentLit("received")).toBe(true);
		expect(sentLit("acknowledged")).toBe(true);
		expect(sentLit("returned")).toBe(false);
		expect(sentLit("held")).toBe(false);
	});

	it("lets only a returned or late-held letter be dismissed", () => {
		expect(sentDismissable("returned")).toBe(true);
		expect(sentDismissable("held")).toBe(true);
		expect(sentDismissable("waiting")).toBe(false);
		expect(sentDismissable("received")).toBe(false);
	});
});

describe("sentShown", () => {
	const sent = (patch: Partial<SentLetter>): SentLetter => ({
		id: "s",
		line: "Hello",
		seen: true,
		status: "received",
		...patch,
	});
	it("holds a new status as waiting until the screen is in front", () => {
		expect(sentShown(sent({ seen: false }), false)).toBe("waiting");
		expect(sentShown(sent({ seen: false }), true)).toBe("received");
	});
	it("shows a seen status wherever it is", () => {
		expect(sentShown(sent({ status: "acknowledged" }), false)).toBe(
			"acknowledged"
		);
	});
});

describe("the reader", () => {
	it("is sealed until opened on the server or here (R2)", () => {
		expect(readerSealed(letter({ opened: false }), false)).toBe(true);
		expect(readerSealed(letter({ opened: false }), true)).toBe(false);
		expect(readerSealed(letter({ opened: true }), false)).toBe(false);
	});

	it("stays acknowledged from here on, while Undo runs or once it passed (R2)", () => {
		const fresh = letter({});
		expect(readerAcknowledged(fresh, false, null)).toBe(false);
		expect(readerAcknowledged(fresh, false, "ack")).toBe(true);
		expect(readerAcknowledged(fresh, true, null)).toBe(true);
		expect(
			readerAcknowledged(letter({ acknowledged: true }), false, null)
		).toBe(true);
		expect(readerAcknowledged(undefined, false, "hide")).toBe(false);
	});

	it("isn't hidden while it's being hidden: it drifts instead", () => {
		expect(readerHidden(letter({ hidden: true }), null)).toBe(true);
		expect(readerHidden(letter({ hidden: true }), "hide")).toBe(false);
		expect(readerHidden(letter({}), null)).toBe(false);
		expect(readerHidden(null, null)).toBe(false);
	});

	it("gives VoiceOver nothing while sealed (Open is its button), Undo while one runs, else the acts", () => {
		const r = { acknowledged: false, hidden: false, sealed: false, undo: null };
		expect(readerActions({ ...r, sealed: true })).toEqual([]);
		expect(readerActions({ ...r, sealed: true, undo: "ack" })).toEqual([]);
		expect(readerActions({ ...r, undo: "hide" })).toEqual(["undo"]);
		expect(readerActions(r)).toEqual(["acknowledge", "hide", "report"]);
		expect(readerActions({ ...r, acknowledged: true, hidden: true })).toEqual([
			"unhide",
			"report",
		]);
	});

	it("says reported only for a letter it had, else that it isn't there (R3)", () => {
		expect(readerGoneLine(true)).toBe(LETTERS.read.gone);
		expect(readerGoneLine(false)).toBe(LETTERS.read.notThere);
	});

	it("leaves a gone letter for Letters after a push, even with Today under it", () => {
		expect(readerExit(true, true)).toBe("letters");
		expect(readerExit(true, false)).toBe("letters");
		expect(readerExit(false, false)).toBe("letters");
		expect(readerExit(false, true)).toBe("back");
	});
});

describe("readTarget (the session end's waiting-letter card)", () => {
	const mine = [{ id: "a" }, { id: "b" }];

	it("opens the letter kept with the card, opened since or not", () => {
		expect(readTarget("a", mine)).toBe("a");
		expect(readTarget("a", undefined)).toBe("a");
	});

	it("opens Letters instead once that letter is gone, or there was none", () => {
		expect(readTarget("gone", mine)).toBeNull();
		expect(readTarget(null, mine)).toBeNull();
	});
});

describe("writing: the letter's moves", () => {
	it("maps each stage to the letter's phase", () => {
		expect(PHASE_OF.sent).toBe("gone");
		expect(PHASE_OF.wait).toBe("wait");
	});

	it("folds and ignites while the check runs; reduced, stays flat with a still glow", () => {
		expect(foldMoves("wait", false)).toEqual({
			bands: "fold",
			glow: "ignite",
			reset: true,
			rise: false,
		});
		expect(foldMoves("wait", true)).toEqual({
			bands: "flat",
			glow: "still",
			reset: true,
			rise: false,
		});
	});

	it("lies flat with no glow to write; drains to rest; rises unless reduced", () => {
		expect(foldMoves("edit", false)).toMatchObject({
			bands: "flat",
			glow: "off",
			reset: true,
		});
		expect(foldMoves("rest", false)).toMatchObject({
			bands: "stay",
			glow: "drain",
			rise: false,
		});
		expect(foldMoves("rise", false).rise).toBe(true);
		expect(foldMoves("rise", true).rise).toBe(false);
		expect(foldMoves("gone", false)).toMatchObject({
			bands: "stay",
			glow: "stay",
		});
	});

	it("unfolds to come back; reduced, it lies flat at once", () => {
		expect(foldMoves("back", false).bands).toBe("unfold");
		expect(foldMoves("back", true).bands).toBe("flat");
	});
});

describe("writing: after the check answers (W5)", () => {
	const M = LETTER_MOTION;

	it("never ends the wait before its floor", () => {
		expect(waitLeft(0, false)).toBe(1400);
		expect(waitLeft(900, false)).toBe(500);
		expect(waitLeft(5000, false)).toBe(0);
		expect(waitLeft(100, true)).toBe(300);
	});

	it("rises, presses, then says it's on its way at +2 s", () => {
		expect(afterAnswer({ next: "rise" }, false, M)).toEqual({
			announce: LETTERS.sent.title,
			hapticMs: M.send.rise.delayMs,
			limit: null,
			next: { care: false, line: null, ms: M.send.lineAtMs, stage: "sent" },
			stage: "rise",
		});
		const reduced = afterAnswer({ next: "rise" }, true, M);
		expect(reduced.hapticMs).toBe(0);
		expect(reduced.next?.ms).toBe(M.reducedMs);
	});

	it("rests the letter and raises the care sheet", () => {
		expect(afterAnswer({ next: "care" }, false, M)).toMatchObject({
			announce: null,
			next: { care: true, ms: M.risk.sheetAtMs, stage: "rest" },
			stage: "rest",
		});
	});

	it("goes back to writing with the limit said", () => {
		expect(afterAnswer({ next: "limit", reason: "today" }, false, M)).toEqual({
			announce: LETTERS.limit.today,
			hapticMs: null,
			limit: "today",
			next: null,
			stage: "edit",
		});
	});

	it("unfolds, then shows and says its line; nothing to say without one", () => {
		const back = afterAnswer(
			{ held: true, line: "Held.", next: "back" },
			false,
			M
		);
		expect(back).toMatchObject({
			announce: "Held.",
			next: { care: false, line: "Held.", ms: M.back.editAtMs, stage: "edit" },
			stage: "back",
		});
		const failed = afterAnswer(
			{ held: false, line: "", next: "back" },
			true,
			M
		);
		expect(failed.announce).toBeNull();
		expect(failed.next).toMatchObject({ line: null, ms: M.reducedMs });
	});
});

describe("draftAfter (W5, W6)", () => {
	it("clears a passed letter's draft", () => {
		expect(draftAfter({ next: "rise" }, FORTY, FORTY)).toEqual({ clear: true });
		expect(draftAfter({ next: "rise" }, ` ${FORTY}`, `${FORTY} `)).toEqual({
			clear: true,
		});
	});
	it("leaves a draft that changed since it was sent (a late pass)", () => {
		expect(draftAfter({ next: "rise" }, FORTY, `${FORTY} more`)).toBeNull();
	});
	it("keeps a held letter's words, remembered trimmed", () => {
		expect(
			draftAfter({ held: true, line: "Held.", next: "back" }, `${FORTY} `, "")
		).toEqual({ held: FORTY });
	});
	it("keeps everything after a fixable line, care, a limit, or a failed send", () => {
		expect(
			draftAfter({ held: false, line: "Fix.", next: "back" }, FORTY, FORTY)
		).toBeNull();
		expect(draftAfter({ next: "care" }, FORTY, FORTY)).toBeNull();
		expect(
			draftAfter({ next: "limit", reason: "three" }, FORTY, FORTY)
		).toBeNull();
		expect(draftAfter(null, FORTY, FORTY)).toBeNull();
	});
});

describe("lateMoves", () => {
	it("rests the letter and raises care for an at-risk answer a reopened Write missed", () => {
		expect(lateMoves(answerOf({ kind: "risk" }))).toEqual({
			announce: null,
			care: true,
			line: null,
			stage: "rest",
		});
	});

	it("shows a held or fixable line over the words, and says it", () => {
		expect(lateMoves(answerOf({ kind: "held" }))).toEqual({
			announce: LETTERS.check.held,
			care: false,
			line: LETTERS.check.held,
			stage: "edit",
		});
		expect(
			lateMoves(answerOf({ kind: "fixable", line: "Softer." }))?.line
		).toBe("Softer.");
	});

	it("leaves a pass and a limit to the draft and the status", () => {
		expect(lateMoves(answerOf({ kind: "pass" }))).toBeNull();
		expect(lateMoves(answerOf({ kind: "limit", reason: "today" }))).toBeNull();
	});
});

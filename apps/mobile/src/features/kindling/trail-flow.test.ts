import { describe, expect, it } from "vitest";
import {
	effectiveStates,
	type TrailView,
	type TwigState,
} from "./kindling-model";
import {
	catchesInPlace,
	chosen,
	commitStep,
	holdFor,
	letGo,
	moveOnLands,
	NO_CHOICES,
	NO_HOLD,
	NO_LOCAL,
	NOT_HELD,
	putOutStep,
	skipFailed,
	skipStep,
	tendFailed,
	tendPlays,
	tendRun,
	tendStep,
	undoStep,
} from "./trail-flow";

const ids = ["a", "b", "c", "d"];
const view = {
	id: "k",
	states: ["done", "wait", "wait", "wait"],
	twigs: ids.map((id) => ({ id })),
} as unknown as TrailView;

describe("Not for me and its Undo (§8)", () => {
	it("shows the twig passed with Undo, and sends nothing yet", () => {
		const s = skipStep(NO_LOCAL, "b");
		expect(s.skip).toBeUndefined();
		expect(effectiveStates(view, s.local)[1]).toBe("undo");
	});

	it("Undo puts it back, and nothing is sent", () => {
		const s = undoStep(skipStep(NO_LOCAL, "b").local);
		expect(commitStep(s.local, "closed").skip).toBeUndefined();
		expect(effectiveStates(view, s.local)[1]).toBe("wait");
	});

	it("when the window runs out, sends the skip and moves the card on", () => {
		const s = commitStep(skipStep(NO_LOCAL, "b").local, "closed");
		expect(s.skip).toBe("b");
		expect(s.moveOn).toBe(true);
		expect(effectiveStates(view, s.local)[1]).toBe("passed");
	});

	it("opening another stop sends the skip but leaves the card where they put it", () => {
		const s = commitStep(skipStep(NO_LOCAL, "b").local, "chose");
		expect(s.skip).toBe("b");
		expect(s.moveOn).toBe(false);
	});

	it("leaving (blur, unmount, background) still sends the skip", () => {
		const s = commitStep(skipStep(NO_LOCAL, "b").local, "left");
		expect(s.skip).toBe("b");
		expect(s.moveOn).toBe(false);
	});

	it("sends a skip once: a second close finds nothing open", () => {
		const first = commitStep(skipStep(NO_LOCAL, "b").local, "closed");
		expect(commitStep(first.local, "left").skip).toBeUndefined();
	});

	it("a second Not for me sends the first skip and opens the new window", () => {
		const s = skipStep(skipStep(NO_LOCAL, "b").local, "c");
		expect(s.skip).toBe("b");
		expect(s.moveOn).toBe(false);
		expect(effectiveStates(view, s.local).slice(1, 3)).toEqual([
			"passed",
			"undo",
		]);
	});

	it("a refused skip puts the twig back", () => {
		const sent = commitStep(skipStep(NO_LOCAL, "b").local, "closed");
		expect(effectiveStates(view, skipFailed(sent.local, "b").local)[1]).toBe(
			"wait"
		);
	});

	it("a new kindling starts from nothing: the old skip is never sent", () => {
		expect(commitStep(NO_LOCAL, "left").skip).toBeUndefined();
	});
});

describe("I did this", () => {
	it("tends and sends at once", () => {
		const s = tendStep(NO_LOCAL, "c", false);
		expect(s.tend).toBe("c");
		expect(effectiveStates(view, s.local)[2]).toBe("done");
	});

	it("a second tap sends nothing", () => {
		const once = tendStep(NO_LOCAL, "c", false);
		expect(tendStep(once.local, "c", false).tend).toBeUndefined();
	});

	it("sends nothing for a twig the server already has done", () => {
		expect(tendStep(NO_LOCAL, "a", true).tend).toBeUndefined();
	});

	it("a refused tend puts the twig back", () => {
		const s = tendFailed(tendStep(NO_LOCAL, "c", false).local, "c");
		expect(effectiveStates(view, s.local)[2]).toBe("wait");
	});
});

describe("Put it out while an Undo shows (§11.1)", () => {
	it("drops the pending skip: nothing is sent, and nothing is left to send", () => {
		const s = putOutStep(skipStep(NO_LOCAL, "b").local);
		expect(s.skip).toBeUndefined();
		expect(commitStep(s.local, "left").skip).toBeUndefined();
	});
});

describe("a move-on never takes a chosen card (§6)", () => {
	it("lands when nothing was chosen since it was scheduled", () => {
		expect(moveOnLands(NO_CHOICES, NO_CHOICES)).toBe(true);
	});

	it("Undo runs out (move-on scheduled), then they tap stop 3 before it lands: it doesn't", () => {
		const scheduled = NO_CHOICES;
		const tappedStop = chosen(scheduled);
		expect(moveOnLands(scheduled, tappedStop)).toBe(false);
	});

	it("a tend's move-on, with a stop tapped while it's on its way: it doesn't land", () => {
		const pressed = chosen(NO_CHOICES);
		const tendMoveOn = pressed;
		expect(moveOnLands(tendMoveOn, chosen(pressed))).toBe(false);
	});

	it("a move-on scheduled after their last choice still lands", () => {
		const tapped = chosen(chosen(NO_CHOICES));
		expect(moveOnLands(tapped, tapped)).toBe(true);
	});
});

describe("where a tend runs (§4, §5)", () => {
	it("runs to the next stop, held dim until the spark lands", () => {
		const r = tendRun(["done", "wait", "wait", "wait"], 1, true);
		expect(r.toFire).toBe(false);
		expect(r.hold).toBe(2);
	});

	it("holds nothing when the card goes elsewhere (the next stop is already done)", () => {
		expect(tendRun(["wait", "wait", "done", "wait"], 1, true).hold).toBe(
			NO_HOLD
		);
	});

	it("the last waiting twig runs on into the fire", () => {
		const r = tendRun(["done", "passed", "done", "wait"], 3, true);
		expect(r.toFire).toBe(true);
		expect(r.hold).toBe(NO_HOLD);
	});

	it("only the last of a batch runs into the fire", () => {
		expect(tendRun(["done", "passed", "done", "wait"], 3, false).toFire).toBe(
			false
		);
	});

	it("doesn't run into the fire while an Undo still shows", () => {
		expect(tendRun(["done", "undo", "done", "wait"], 3, true).toFire).toBe(
			false
		);
	});
});

describe("a skip that leaves nothing waiting (§5)", () => {
	const last = {
		...view,
		states: ["done", "passed", "passed", "wait"],
	} as unknown as TrailView;
	const sent = (cause: "closed" | "chose" | "left") =>
		commitStep(skipStep(NO_LOCAL, "d").local, cause);

	it("catches the fire where it is when the window closes", () => {
		expect(catchesInPlace(last, sent("closed"), "closed")).toBe(true);
	});

	it("catches when they open another stop, too", () => {
		expect(catchesInPlace(last, sent("chose"), "chose")).toBe(true);
	});

	it("doesn't play the catch while they're leaving", () => {
		expect(catchesInPlace(last, sent("left"), "left")).toBe(false);
	});

	it("nothing tended: everything passed, so nothing catches", () => {
		const none = {
			...view,
			states: ["passed", "passed", "passed", "wait"],
		} as unknown as TrailView;
		expect(catchesInPlace(none, sent("closed"), "closed")).toBe(false);
	});

	it("a twig still waiting elsewhere: nothing catches yet", () => {
		expect(catchesInPlace(view, sent("closed"), "closed")).toBe(false);
	});
});

describe("a chosen stop after a tend (§4, §6)", () => {
	it("the tend's move-on is ticketed when it plays: a stop tapped during the ~2.4 s burn keeps the card", () => {
		const atPlay = chosen(NO_CHOICES);
		const tappedStop3 = chosen(atPlay);
		expect(moveOnLands(atPlay, tappedStop3)).toBe(false);
	});

	it("with nothing chosen while it burns, the card moves on when the spark lands", () => {
		const atPlay = chosen(NO_CHOICES);
		expect(moveOnLands(atPlay, atPlay)).toBe(true);
	});
});

describe("what a tend holds (§4, §5)", () => {
	const toNext = tendRun(["done", "wait", "wait", "wait"], 1, true);
	const toFire = tendRun(["done", "passed", "done", "wait"], 3, true);

	it("holds the next stop dim, then lets go when the spark lands", () => {
		const h = holdFor(NOT_HELD, 1, toNext);
		expect(h).toEqual({ heading: NO_HOLD, hold: 2 });
		expect(letGo(h, 1)).toEqual(NOT_HELD);
	});

	it("heads into the fire (not caught yet), then lets go", () => {
		const h = holdFor(NOT_HELD, 3, toFire);
		expect(h).toEqual({ heading: 3, hold: NO_HOLD });
		expect(letGo(h, 3)).toEqual(NOT_HELD);
	});

	it("another tend landing leaves this one's hold", () => {
		const h = holdFor(NOT_HELD, 1, toNext);
		expect(letGo(h, 0)).toEqual(h);
	});
});

describe("a refused tend (I did this)", () => {
	const before: TwigState[] = ["done", "wait", "wait", "wait"];

	it("refused before it played: it has gone back to waiting, and nothing plays", () => {
		const refused = effectiveStates(
			view,
			tendFailed(tendStep(NO_LOCAL, "b", false).local, "b").local
		);
		expect(tendPlays(before, refused, 1)).toBe(false);
	});

	it("still done: it plays once, and not again once shown", () => {
		const now: TwigState[] = ["done", "done", "wait", "wait"];
		expect(tendPlays(before, now, 1)).toBe(true);
		expect(tendPlays(now, now, 1)).toBe(false);
	});

	it("refused mid-burn: the stop it held dim and the fire it was heading into let go", () => {
		const dim = holdFor(NOT_HELD, 1, tendRun(before, 1, true));
		expect(letGo(dim, 1).hold).toBe(NO_HOLD);
		const heading = holdFor(
			NOT_HELD,
			3,
			tendRun(["done", "passed", "done", "wait"], 3, true)
		);
		expect(letGo(heading, 3).heading).toBe(NO_HOLD);
	});
});

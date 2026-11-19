import { describe, expect, it } from "vitest";
import { effectiveStates, type TrailView } from "./kindling-model";
import {
	commitStep,
	NO_LOCAL,
	skipFailed,
	skipStep,
	tendFailed,
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

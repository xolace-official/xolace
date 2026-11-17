import { describe, expect, it } from "vitest";
import { breathFelt, runReducer, startRun } from "./sit-run";

describe("the run", () => {
	it("starts on the first screen, or on beat 0 after a swap", () => {
		expect(startRun({ preRoll: true, total: 3 }).stage).toBe("pre");
		expect(startRun({ preRoll: false, total: 3 })).toMatchObject({
			beat: 0,
			stage: "play",
		});
		expect(startRun({ preRoll: false, total: 0 }).stage).toBe("close");
	});

	it("begins, plays each beat, then closes", () => {
		let s = startRun({ preRoll: true, total: 2 });
		s = runReducer(s, { total: 2, type: "begin" });
		expect(s).toMatchObject({ beat: 0, playRun: 1, serial: 1, stage: "play" });
		s = runReducer(s, { serial: 1, total: 2, type: "advance" });
		expect(s).toMatchObject({ beat: 1, serial: 2 });
		s = runReducer(s, { serial: 2, total: 2, type: "advance" });
		expect(s).toMatchObject({ doneOn: false, serial: 3, stage: "close" });
	});

	it("ignores a stale beat's end", () => {
		const s = runReducer(startRun({ preRoll: false, total: 3 }), {
			serial: 0,
			total: 3,
			type: "advance",
		});
		expect(runReducer(s, { serial: 0, total: 3, type: "advance" })).toBe(s);
	});

	it("pauses only while playing, and a new beat plays", () => {
		const pre = startRun({ preRoll: true, total: 2 });
		expect(runReducer(pre, { paused: true, type: "pause" })).toBe(pre);
		let s = runReducer(startRun({ preRoll: false, total: 2 }), {
			paused: true,
			type: "pause",
		});
		expect(s.paused).toBe(true);
		s = runReducer(s, { serial: 0, total: 2, type: "advance" });
		expect(s.paused).toBe(false);
	});

	it("shows “Something different” once ready, and enables Done after its drain", () => {
		let s = runReducer(startRun({ preRoll: false, total: 1 }), {
			type: "linkReady",
		});
		expect(s.linkOn).toBe(true);
		s = runReducer(s, { serial: 0, total: 1, type: "advance" });
		expect(s.linkOn).toBe(false);
		expect(runReducer(s, { serial: 0, type: "doneReady" }).doneOn).toBe(false);
		expect(runReducer(s, { serial: s.serial, type: "doneReady" }).doneOn).toBe(
			true
		);
	});
});

describe("the breath, felt", () => {
	it("plays only in front, running and with full motion", () => {
		expect(breathFelt({ frozen: false, inFront: true, reduced: false })).toBe(
			true
		);
		expect(breathFelt({ frozen: true, inFront: true, reduced: false })).toBe(
			false
		);
		expect(breathFelt({ frozen: false, inFront: false, reduced: false })).toBe(
			false
		);
		expect(breathFelt({ frozen: false, inFront: true, reduced: true })).toBe(
			false
		);
	});
});

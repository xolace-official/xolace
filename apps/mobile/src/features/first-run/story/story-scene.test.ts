import { describe, expect, it } from "vitest";
import {
	AUTH,
	ageAuth,
	ageSpin,
	authOk,
	authReset,
	beginAuth,
	closeSeat,
	DUR,
	EV,
	freshStory,
	goBeat,
	NB,
	openSeat,
	PROV,
	type SEng,
	seatOpen,
	stepStory,
} from "./story-scene";

const FRAME = 16;

/** A story with its clock started at `now`. */
function story(now = 1000, seat = false): SEng {
	const e = freshStory(false, 0, -1, seat);
	e.now = now;
	e.t0 = now;
	e.tb = now;
	if (seat) {
		e.seatAt = now;
	}
	return e;
}

/** Runs frames for `ms`, collecting every event bit raised. */
function run(e: SEng, ms: number) {
	let ev = 0;
	for (let t = 0; t < ms; t += FRAME) {
		e.now += FRAME;
		stepStory(e, FRAME);
		ev |= e.ev;
		e.ev = 0;
	}
	return ev;
}

describe("the beats", () => {
	it("move on by themselves when a beat's bar fills", () => {
		const e = story();
		const ev = run(e, DUR[0] + FRAME * 2);
		expect(e.beat).toBe(1);
		expect(ev & EV.beat).toBeTruthy();
	});

	it("stay put under VoiceOver", () => {
		const e = story();
		e.sr = true;
		run(e, DUR[0] * 2);
		expect(e.beat).toBe(0);
	});

	it("restart the first beat when you go back from it", () => {
		const e = story();
		run(e, 1000);
		goBeat(e, -1);
		expect(e.beat).toBe(0);
		expect(e.bar).toBe(0);
	});

	it("open the seat past the last beat", () => {
		const e = story();
		goBeat(e, NB - 1);
		goBeat(e, NB);
		expect(e.seatAt).toBe(e.now);
		expect(e.ev & EV.seat).toBeTruthy();
	});
});

describe("the seat", () => {
	it("opens and closes", () => {
		const e = story();
		openSeat(e);
		e.now += 600;
		expect(seatOpen(e)).toBe(1);
		closeSeat(e);
		expect(e.seatAt).toBe(-1);
		expect(e.ev & EV.closed).toBeTruthy();
	});

	it("can't be closed while signing in", () => {
		const e = story(1000, true);
		beginAuth(e, PROV.apple);
		closeSeat(e);
		expect(e.seatAt).toBe(1000);
	});
});

describe("signing in", () => {
	it("waits short of the sheet's return until the account is back", () => {
		const e = story(1000, true);
		beginAuth(e, PROV.google);
		expect(e.authProv).toBe(PROV.google);
		const ev = run(e, 20_000);
		expect(ageAuth(e)).toBe(AUTH.back - 1);
		// The spinner keeps turning from the tap.
		expect(ageSpin(e)).toBeGreaterThan(19_000);
		expect(ev & (EV.seated | EV.intake)).toBe(0);
	});

	it("seats you 700 ms after the account is back, and lets go at the end", () => {
		const e = story(1000, true);
		beginAuth(e, PROV.apple);
		run(e, 5000);
		authOk(e);
		expect(ageAuth(e)).toBe(AUTH.back);
		let ev = run(e, AUTH.seated - AUTH.back + FRAME);
		expect(ev & EV.seated).toBeTruthy();
		expect(ev & EV.intake).toBe(0);
		ev = run(e, AUTH.done - AUTH.seated);
		expect(ev & EV.intake).toBeTruthy();
	});

	it("fires the seated moment and the hand-on once each", () => {
		const e = story(1000, true);
		beginAuth(e, PROV.apple);
		authOk(e);
		let count = 0;
		for (let t = 0; t < AUTH.done * 2; t += FRAME) {
			e.now += FRAME;
			stepStory(e, FRAME);
			if (e.ev & EV.intake) {
				count++;
			}
			e.ev = 0;
		}
		expect(count).toBe(1);
	});

	it("starts over cleanly after a cancel", () => {
		const e = story(1000, true);
		beginAuth(e, PROV.apple);
		run(e, 400);
		authReset(e);
		expect(ageAuth(e)).toBe(-1);
		expect(e.authProv).toBe(PROV.none);
		beginAuth(e, PROV.google);
		expect(e.authProv).toBe(PROV.google);
		expect(ageAuth(e)).toBe(0);
	});

	it("ignores a second tap, and a success with no tap", () => {
		const e = story(1000, true);
		authOk(e);
		expect(e.okAt).toBe(-1);
		beginAuth(e, PROV.apple);
		e.now += 300;
		beginAuth(e, PROV.google);
		expect(e.authProv).toBe(PROV.apple);
		expect(ageSpin(e)).toBe(300);
	});

	it("needs the seat open", () => {
		const e = story();
		beginAuth(e, PROV.apple);
		expect(e.authAt).toBe(-1);
	});

	it("holds still at a dev state's age", () => {
		const e = story(1000, true);
		e.authProv = PROV.apple;
		e.authAt = 0;
		e.aHold = AUTH.seated;
		const ev = run(e, 10_000);
		expect(ageAuth(e)).toBe(AUTH.seated);
		expect(ev & (EV.seated | EV.intake)).toBe(0);
	});
});

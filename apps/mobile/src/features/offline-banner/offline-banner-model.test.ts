import { describe, expect, it } from "vitest";
import {
	type BannerInput,
	type BannerStep,
	bannerStart,
	nextBanner,
} from "./offline-banner-model";

const ONLINE: BannerInput = {
	active: true,
	claimed: false,
	covered: false,
	listening: true,
	offline: false,
};
const OFFLINE: BannerInput = { ...ONLINE, offline: true };

/** Feeds the inputs in order and returns each step's visible flag and announcement. */
function run(inputs: readonly BannerInput[]) {
	let state = bannerStart;
	const steps: Omit<BannerStep, "state">[] = [];
	for (const input of inputs) {
		const { state: next, ...step } = nextBanner(state, input);
		state = next;
		steps.push(step);
	}
	return steps;
}

describe("the offline banner", () => {
	it("shows and announces once when the device goes offline", () => {
		expect(run([ONLINE, OFFLINE, OFFLINE])).toEqual([
			{ announce: null, visible: false },
			{ announce: "offline", visible: true },
			{ announce: null, visible: true },
		]);
	});

	it("announces back online once when it clears, and nothing after", () => {
		expect(run([OFFLINE, ONLINE, ONLINE])).toEqual([
			{ announce: "offline", visible: true },
			{ announce: "back_online", visible: false },
			{ announce: null, visible: false },
		]);
	});

	it("hides while a focused screen claims the message, without announcing", () => {
		const claimed = { ...OFFLINE, claimed: true };
		expect(run([OFFLINE, claimed, OFFLINE])).toEqual([
			{ announce: "offline", visible: true },
			{ announce: null, visible: false },
			{ announce: null, visible: true },
		]);
	});

	it("hides under a form sheet or modal", () => {
		expect(run([{ ...OFFLINE, covered: true }])).toEqual([
			{ announce: null, visible: false },
		]);
	});

	it("says nothing on reconnect if the banner never showed", () => {
		const claimed = { ...OFFLINE, claimed: true };
		expect(run([claimed, claimed, ONLINE])).toEqual([
			{ announce: null, visible: false },
			{ announce: null, visible: false },
			{ announce: null, visible: false },
		]);
	});

	it("announces offline once more on a later drop", () => {
		expect(run([OFFLINE, ONLINE, OFFLINE]).map((s) => s.announce)).toEqual([
			"offline",
			"back_online",
			"offline",
		]);
	});

	it("says nothing when the app comes back mid-outage and the flag restarts its grace", () => {
		const away = { ...OFFLINE, active: false };
		// Back in the foreground, the model restarts the 3 s grace, so offline reads false a moment.
		const graceAfterReturn = ONLINE;
		expect(
			run([OFFLINE, away, graceAfterReturn, OFFLINE]).map((s) => s.announce)
		).toEqual(["offline", null, null, "offline"]);
	});

	it("doesn't count the offline line as heard while no screen reader is on", () => {
		const unheard = { ...OFFLINE, listening: false };
		expect(run([unheard, ONLINE]).map((s) => s.announce)).toEqual([null, null]);
	});

	it("announces offline when a screen reader turns on with the banner up", () => {
		const unheard = { ...OFFLINE, listening: false };
		expect(run([unheard, OFFLINE, ONLINE]).map((s) => s.announce)).toEqual([
			null,
			"offline",
			"back_online",
		]);
	});
});

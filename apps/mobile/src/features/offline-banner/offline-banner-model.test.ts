import { describe, expect, it } from "vitest";
import {
	type BannerInput,
	type BannerStep,
	bannerStart,
	nextBanner,
} from "./offline-banner-model";

const ONLINE: BannerInput = { claimed: false, covered: false, offline: false };
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
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { type BreathComposers, breathPlayer } from "./breath";

/** Every call the breath player makes, by composer. */
const calls: string[] = [];

vi.mock("react-native-pulsar", () => ({
	Settings: {
		stopHaptics: () => {
			calls.push("stopHaptics");
		},
	},
	usePatternComposer: () => ({ play: () => undefined, stop: () => undefined }),
}));

const composer = (name: string) => ({
	play: () => {
		calls.push(`play ${name}`);
	},
	stop: () => {
		calls.push(`stop ${name}`);
	},
});
const COMPOSERS: BreathComposers = {
	inLong: composer("in-4000"),
	inShort: composer("in-3000"),
	outLong: composer("out-8000"),
	outShort: composer("out-6000"),
	top: composer("top"),
};
const player = () => breathPlayer(() => COMPOSERS);

describe("the breath player", () => {
	beforeEach(() => {
		calls.length = 0;
	});

	it("plays each phase on the composer as long as it lasts", () => {
		const breath = player();
		breath.play("in", 4000);
		breath.play("in", 3000);
		breath.play("top", 1000);
		breath.play("out", 8000);
		breath.play("out", 6000);
		expect(calls).toEqual([
			"play in-4000",
			"play in-3000",
			"play top",
			"play out-8000",
			"play out-6000",
		]);
	});

	it("stops every continuous composer and Pulsar's own queue", () => {
		player().stop();
		expect(calls).toEqual([
			"stop in-4000",
			"stop in-3000",
			"stop out-8000",
			"stop out-6000",
			"stopHaptics",
		]);
	});
});

it("keeps going quietly if Pulsar throws", () => {
	const broken = breathPlayer(() => ({
		...COMPOSERS,
		inLong: {
			play: () => {
				throw new Error("no engine");
			},
			stop: () => undefined,
		},
	}));
	expect(() => broken.play("in", 4000)).not.toThrow();
});

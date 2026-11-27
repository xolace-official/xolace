import { describe, expect, it } from "vitest";
import {
	type CantLoadSpeech,
	cantLoadStart,
	cantLoadStep,
} from "./loading-model";

/** Runs readings in order and lists the steps that spoke. */
function speaks(readings: { stalled: boolean; focused: boolean }[]): number[] {
	let speech: CantLoadSpeech = cantLoadStart;
	const spoke: number[] = [];
	readings.forEach((reading, i) => {
		const step = cantLoadStep(speech, reading);
		speech = step.next;
		if (step.announce) {
			spoke.push(i);
		}
	});
	return spoke;
}

const placeholder = { focused: true, stalled: false };
const message = { focused: true, stalled: true };

describe("cantLoadStep", () => {
	it("speaks when the message replaces the placeholder on the screen in front", () => {
		expect(speaks([placeholder, message])).toEqual([1]);
	});

	it("speaks once, however often the connection drops before the data lands", () => {
		expect(
			speaks([placeholder, message, placeholder, message, placeholder, message])
		).toEqual([1]);
	});

	it("stays quiet when the screen opens already unable to load: nothing was replaced", () => {
		expect(speaks([message, placeholder, message])).toEqual([2]);
		expect(speaks([message])).toEqual([]);
	});

	it("stays quiet for a screen behind the one in front, even once it comes forward", () => {
		expect(
			speaks([
				{ focused: false, stalled: false },
				{ focused: false, stalled: true },
				{ focused: true, stalled: true },
			])
		).toEqual([]);
	});
});

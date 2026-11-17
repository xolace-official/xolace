import { describe, expect, it } from "vitest";
import { COPY } from "../copy";
import { outcomeOf, settleIn } from "./report-outcome";

describe("outcomeOf", () => {
	it("folds a new report and counts it", () => {
		expect(outcomeOf({})).toEqual({
			fold: true,
			toast: COPY.toast.reported,
			track: true,
		});
	});

	it("folds one already reported, without counting it again", () => {
		expect(outcomeOf({ alreadyReported: true })).toEqual({
			fold: true,
			toast: COPY.toast.alreadyReported,
			track: false,
		});
	});

	it("leaves the card when rate-limited: nothing was sent", () => {
		expect(outcomeOf({ rateLimited: true })).toEqual({
			fold: false,
			toast: COPY.toast.reportLimited,
			track: false,
		});
	});

	it("leaves the card when the call fails", () => {
		expect(outcomeOf("failed")).toEqual({
			fold: false,
			toast: COPY.toast.failed,
			track: false,
		});
	});
});

describe("settleIn (never sooner than 380 ms after the pick)", () => {
	it("waits out the rest of the 380 ms", () => {
		expect(settleIn(1000, 1100)).toBe(280);
	});

	it("settles at once when the answer took longer", () => {
		expect(settleIn(1000, 1500)).toBe(0);
	});

	it("waits the whole 380 ms for an instant answer", () => {
		expect(settleIn(1000, 1000)).toBe(380);
	});
});

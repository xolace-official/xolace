import { describe, expect, it } from "vitest";
import {
	findingAnswer,
	findingCardDue,
	findingStep,
} from "@/features/discovery/finding-card";

// Intake done mid-afternoon on Mon 2 Nov, local time.
const INTAKE = new Date(2026, 10, 2, 15, 0).getTime();
const DAY_3 = new Date(2026, 10, 4, 9, 0);

describe("findingCardDue", () => {
	it("shows while how they found Xolace is still missing", () => {
		expect(
			findingCardDue({
				completedAt: INTAKE,
				dismissed: false,
				missing: ["acquisitionSource", "copingStyle"],
				now: DAY_3,
			})
		).toBe(true);
	});

	it("never shows once it's answered, as for a v1 user", () => {
		expect(
			findingCardDue({
				completedAt: INTAKE,
				dismissed: false,
				missing: ["copingStyle"],
				now: DAY_3,
			})
		).toBe(false);
	});

	it("waits for their third local day, counting the intake day as the first", () => {
		const due = (now: Date) =>
			findingCardDue({
				completedAt: INTAKE,
				dismissed: false,
				missing: ["acquisitionSource"],
				now,
			});
		// Day 2, though more than 24 hours on.
		expect(due(new Date(2026, 10, 3, 23, 59))).toBe(false);
		// Day 3, though less than 48 hours on.
		expect(due(new Date(2026, 10, 4, 0, 1))).toBe(true);
		expect(due(new Date(2026, 10, 20, 12, 0))).toBe(true);
	});

	it("stays gone after Not now", () => {
		expect(
			findingCardDue({
				completedAt: INTAKE,
				dismissed: true,
				missing: ["acquisitionSource"],
				now: DAY_3,
			})
		).toBe(false);
	});
});

describe("findingAnswer", () => {
	it("is complete on one tap for any arrival but short video", () => {
		expect(findingAnswer({ acquisitionSource: "friend_family" })).toEqual({
			acquisitionSource: "friend_family",
			question: "acquisitionSource",
		});
	});

	it("asks both series follow-ups after short video before it saves", () => {
		expect(findingAnswer({ acquisitionSource: "short_form_video" })).toBeNull();
		expect(
			findingAnswer({
				acquisitionSource: "short_form_video",
				seriesSeen: "loved_it",
			})
		).toBeNull();
		expect(
			findingAnswer({
				acquisitionSource: "short_form_video",
				seriesSeen: "not_seen",
				seriesWantInApp: false,
			})
		).toEqual({
			acquisitionSource: "short_form_video",
			question: "acquisitionSource",
			seriesSeen: "not_seen",
			seriesWantInApp: false,
		});
	});
});

describe("findingStep", () => {
	it("walks one card from the source to the series pair after short video", () => {
		const source = findingStep({});
		expect(source.question).toBe("How did you find Xolace?");

		const afterSource = source.pick({}, "short_form_video");
		const seen = findingStep(afterSource);
		expect(seen.question).toBe("Have you seen the series?");

		const afterSeen = seen.pick(afterSource, "loved_it");
		const want = findingStep(afterSeen);
		expect(want.question).toBe("Want the series in Xolace?");

		expect(findingAnswer(want.pick(afterSeen, "true"))).toEqual({
			acquisitionSource: "short_form_video",
			question: "acquisitionSource",
			seriesSeen: "loved_it",
			seriesWantInApp: true,
		});
	});

	it("puts the card away only from the source question, so a follow-up never loses it", () => {
		const afterSource = findingStep({}).pick({}, "short_form_video");
		expect(findingStep({}).dismissible).toBe(true);
		expect(findingStep(afterSource).dismissible).toBe(false);
	});

	it("ignores a value that isn't one of the step's answers", () => {
		expect(findingStep({}).pick({}, "tiktok")).toEqual({});
	});
});

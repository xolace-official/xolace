import { describe, expect, it } from "vitest";

import {
	declinedCount,
	intakePersonProperties,
	questionAnsweredProps,
} from "@/src/features/intake/analytics";

describe("questionAnsweredProps", () => {
	it("omits selection_count for a single-select", () => {
		expect(questionAnsweredProps("intent", "feel_less_alone")).toEqual({
			declined: false,
			is_multi: false,
			question_index: 2,
			question_key: "intent",
			value: "feel_less_alone",
		});
	});

	it("counts a multi-select and flags a decline in it", () => {
		expect(
			questionAnsweredProps("weighing_on", ["work", "prefer_not_to_say"])
		).toMatchObject({
			declined: true,
			is_multi: true,
			selection_count: 2,
		});
	});

	it("flags a single-select decline", () => {
		expect(
			questionAnsweredProps("age_bracket", "prefer_not_to_say").declined
		).toBe(true);
	});
});

describe("declinedCount", () => {
	it("counts single and multi declines once each", () => {
		expect(
			declinedCount({
				ageBracket: "25_34",
				copingStyle: ["distract"],
				intent: "prefer_not_to_say",
				weighingOn: ["work", "prefer_not_to_say"],
			})
		).toBe(2);
	});
});

describe("intakePersonProperties", () => {
	it("splits immutable facts into $set_once and drops absent series answers", () => {
		const props = intakePersonProperties({
			acquisitionSource: "friend_family",
			intent: "just_looking",
			weighingOn: ["work"],
		});

		expect(props.$set_once).toEqual({ acquisition_source: "friend_family" });
		expect(props.$set).toMatchObject({
			intent: "just_looking",
			weighing_on: ["work"],
		});
		expect(props.$set.intake_version).toBe(1);
		// displayName is never a person property (T7 §3).
		expect(JSON.stringify(props)).not.toContain("displayName");
	});

	it("keeps the series answers immutable when the branch ran", () => {
		const props = intakePersonProperties({
			acquisitionSource: "short_form_video",
			seriesSeen: "loved_it",
			seriesWantInApp: true,
		});

		expect(props.$set_once).toEqual({
			acquisition_source: "short_form_video",
			series_seen: "loved_it",
			series_want_in_app: true,
		});
	});
});

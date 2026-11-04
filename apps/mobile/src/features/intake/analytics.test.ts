import type { PostHog } from "posthog-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	declinedCount,
	intakeOutcomeOf,
	intakePersonProperties,
	questionAnsweredProps,
} from "@/features/intake/analytics";
import {
	initialIntakeV2State,
	type PlusOutcome,
} from "@/features/intake/v2/machine";

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

describe("intake v2 arms (#704)", () => {
	// Intake analytics keeps its clock and latches per process; each test gets a fresh module.
	let analytics: typeof import("@/features/intake/analytics");
	let capture: ReturnType<typeof vi.fn>;
	let posthog: PostHog;

	beforeEach(async () => {
		vi.resetModules();
		vi.useFakeTimers();
		analytics = await import("@/features/intake/analytics");
		capture = vi.fn();
		posthog = { capture } as unknown as PostHog;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const captured = (event: string) =>
		capture.mock.calls
			.filter(([name]) => name === event)
			.map(([, props]) => props);

	describe("per-arm intake events", () => {
		it("stamps intake_completed with the arm", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackIntakeCompleted(posthog, "no_offer", {});
			expect(captured("intake_arm_assigned")).toEqual([{ intake_arm: "v2" }]);
			expect(captured("intake_completed")[0]).toMatchObject({
				intake_arm: "v2",
				outcome: "no_offer",
			});
		});

		it("sends how the answer came in and its length, never the words", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackAnswerGiven(posthog, "typed", "I'm not sleeping");
			expect(captured("intake_answer_given")).toEqual([
				{ answer_length: 16, answer_mode: "typed", intake_arm: "v2" },
			]);
		});

		it("counts the chips tapped off and on", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackHeardConfirmed(posthog, "pick_list", {
				added: 2,
				kept: 0,
				removed: 0,
			});
			expect(captured("intake_heard_confirmed")).toEqual([
				{
					chips_added: 2,
					chips_kept: 0,
					chips_removed: 0,
					intake_arm: "v2",
					read: "pick_list",
				},
			]);
		});
	});

	describe("reading the first answer (#708)", () => {
		it("records the follow-up's field, never its question or the reply", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackFollowUpShown(posthog, "weighingOn");
			expect(captured("intake_follow_up_shown")).toEqual([
				{ field: "weighingOn", intake_arm: "v2" },
			]);
		});

		it("records the safety route with its level", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackSafetyRouted(posthog, "crisis");
			expect(captured("intake_safety_routed")).toEqual([
				{ intake_arm: "v2", safeguard_level: "crisis" },
			]);
		});

		it("records a late safety verdict and where it found the person", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackSafetyLate(posthog, "elevated", "plus");
			expect(captured("intake_safety_late")).toEqual([
				{ intake_arm: "v2", safeguard_level: "elevated", step: "plus" },
			]);
		});

		it("records why the pick-list stood in for a reading", () => {
			analytics.trackIntakeArmAssigned(posthog, "v2");
			analytics.trackReadFallback(posthog, "timeout");
			expect(captured("intake_read_fallback")).toEqual([
				{ intake_arm: "v2", reason: "timeout" },
			]);
		});
	});

	describe("trackFirstReflection", () => {
		it("times the first reflection from intake start, once", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackIntakeArmAssigned(posthog, "control");
			vi.advanceTimersByTime(90_000);
			analytics.trackFirstReflection(posthog);
			analytics.trackFirstReflection(posthog);
			expect(captured("intake_first_reflection")).toEqual([
				{ intake_arm: "control", ms_since_intake_started: 90_000 },
			]);
		});

		it("stays quiet when no intake ran in this session", () => {
			analytics.trackFirstReflection(posthog);
			expect(captured("intake_first_reflection")).toEqual([]);
		});
	});
});

describe("intakeOutcomeOf (#713)", () => {
	const endedWith = (plusOutcome: PlusOutcome | null) => ({
		...initialIntakeV2State("Camper 4127"),
		plusOutcome,
	});

	it("names each way the Xolace+ step can end", () => {
		expect(intakeOutcomeOf(endedWith("purchased"))).toBe("purchased");
		expect(intakeOutcomeOf(endedWith("dismissed"))).toBe("dismissed_paywall");
		expect(intakeOutcomeOf(endedWith("entitled"))).toBe("skipped_paywall");
	});

	it("counts an intake with no Xolace+ step as nothing offered", () => {
		expect(intakeOutcomeOf(endedWith(null))).toBe("no_offer");
	});
});

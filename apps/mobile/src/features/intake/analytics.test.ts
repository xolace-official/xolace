import type { PostHog } from "posthog-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { intakeOutcomeOf } from "@/features/intake/analytics";
import {
	initialIntakeV2State,
	type PlusOutcome,
} from "@/features/intake/v2/machine";

describe("intake events (#704)", () => {
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

	describe("every intake is v2 (S18)", () => {
		it("stamps intake_completed with v2, and assigns no arm", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackIntakeCompleted(posthog, "no_offer", {});
			expect(captured("intake_arm_assigned")).toEqual([]);
			expect(captured("intake_completed")[0]).toMatchObject({
				intake_arm: "v2",
				outcome: "no_offer",
			});
		});

		it("sends how the answer came in and its length, never the words", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackAnswerGiven(posthog, "typed", "I'm not sleeping");
			expect(captured("intake_answer_given")).toEqual([
				{ answer_length: 16, answer_mode: "typed", intake_arm: "v2" },
			]);
		});

		it("counts the chips tapped off and on, and the suggestions taken", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackHeardConfirmed(
				posthog,
				"suggested",
				{ added: 2, kept: 0, removed: 0 },
				{ shown: 3, taken: 1 }
			);
			expect(captured("intake_heard_confirmed")).toEqual([
				{
					chips_added: 2,
					chips_kept: 0,
					chips_removed: 0,
					chips_suggested: 3,
					intake_arm: "v2",
					read: "suggested",
					suggestions_taken: 1,
				},
			]);
		});
	});

	describe("reading the first answer (#708)", () => {
		it("records the follow-up's field, never its question or the reply", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackFollowUpShown(posthog, "weighingOn");
			expect(captured("intake_follow_up_shown")).toEqual([
				{ field: "weighingOn", intake_arm: "v2" },
			]);
		});

		it("records the safety route with its level", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackSafetyRouted(posthog, "crisis");
			expect(captured("intake_safety_routed")).toEqual([
				{ intake_arm: "v2", safeguard_level: "crisis" },
			]);
		});

		it("records a late safety verdict and where it found the person", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackSafetyLate(posthog, "elevated", "plus");
			expect(captured("intake_safety_late")).toEqual([
				{ intake_arm: "v2", safeguard_level: "elevated", step: "plus" },
			]);
		});

		it("records why the pick-list stood in for a reading", () => {
			analytics.trackIntakeStarted(posthog, 0);
			analytics.trackReadFallback(posthog, "timeout");
			expect(captured("intake_read_fallback")).toEqual([
				{ intake_arm: "v2", reason: "timeout" },
			]);
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

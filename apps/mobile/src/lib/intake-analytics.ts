// Intake funnel instrumentation that outlives intake (T7, #267; arms, #704): the funnel's
// clock and arm, which every intake event reads, the first reflection after an intake, and
// the person-property dual-write. Intake's own events stay in `features/intake/analytics.ts`.

import { INTAKE_VERSION } from "@xolace/backend/convex/lib/validators";
import type { PostHog } from "posthog-react-native";
import type { IntakeAnswers } from "@/store/intake-slice";

/** Which intake a new user gets (#704). */
export type IntakeArm = "control" | "v2";

/** The props whose values are set: PostHog keeps an `undefined` as a null. */
export const prune = <T extends Record<string, unknown>>(
	props: T
): Partial<T> =>
	Object.fromEntries(
		Object.entries(props).filter(([, value]) => value !== undefined)
	) as Partial<T>;

/** Start of the clock behind `duration_ms`. Module-level: intake restarts at the founder
 * message after a cold kill. */
let startedAt = 0;

/** The `intake-v2` arm (#704), once read. Every event after it carries it. */
let arm: IntakeArm | undefined;

let firstReflectionFired = false;

/** Intake started: the funnel clock starts, and the next reflection may be its first. */
export function startIntakeClock() {
	startedAt = Date.now();
	firstReflectionFired = false;
}

/** Milliseconds since intake started in this process; 0 when it didn't. */
export const intakeDurationMs = () =>
	startedAt === 0 ? 0 : Date.now() - startedAt;

/** The arm this process's intake events carry, assigned or kept from before. */
export function setIntakeArm(next: IntakeArm) {
	arm = next;
}

/** `intake_arm` for an event, when an arm is known. */
export const intakeArmProps = () => prune({ intake_arm: arm });

/**
 * The first reflection sent after an intake in this session, timed from intake start, for
 * either arm. A cold kill in between loses it: the clock is per process.
 */
export function trackFirstReflection(posthog: PostHog) {
	if (startedAt === 0 || firstReflectionFired) {
		return;
	}
	firstReflectionFired = true;
	posthog.capture("intake_first_reflection", {
		...intakeArmProps(),
		ms_since_intake_started: intakeDurationMs(),
	});
}

/** How they found Xolace: facts a re-onboard must not overwrite, so `$set_once`. The series
 * pair only when the branch ran. */
export const findingUsOnce = (
	answers: Pick<
		IntakeAnswers,
		"acquisitionSource" | "seriesSeen" | "seriesWantInApp"
	>
) =>
	prune({
		acquisition_source: answers.acquisitionSource,
		series_seen: answers.seriesSeen,
		series_want_in_app: answers.seriesWantInApp,
	});

/** The person-property dual-write (T7 §3). `$set_once` holds facts a re-onboard must not
 * overwrite; `displayName` stays out. */
export function intakePersonProperties(
	answers: IntakeAnswers,
	version = INTAKE_VERSION
) {
	return {
		$set: prune({
			age_bracket: answers.ageBracket,
			coping_style: answers.copingStyle,
			disclosure_style: answers.disclosureStyle,
			emotion_awareness: answers.emotionAwareness,
			intake_version: version,
			intent: answers.intent,
			support_frequency: answers.supportFrequency,
			weighing_on: answers.weighingOn,
		}),
		$set_once: findingUsOnce(answers),
	};
}

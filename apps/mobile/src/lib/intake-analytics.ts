import { INTAKE_VERSION } from "@xolace/backend/convex/lib/validators";
import type { PostHog } from "posthog-react-native";
import type { IntakeAnswers } from "@/store/intake-slice";

export type IntakeArm = "control" | "v2";

export const prune = <T extends Record<string, unknown>>(
	props: T
): Partial<T> =>
	Object.fromEntries(
		Object.entries(props).filter(([, value]) => value !== undefined)
	) as Partial<T>;

let startedAt = 0;

let arm: IntakeArm | undefined;

let firstReflectionFired = false;

export function startIntakeClock() {
	startedAt = Date.now();
	firstReflectionFired = false;
}

export const intakeDurationMs = () =>
	startedAt === 0 ? 0 : Date.now() - startedAt;

export function setIntakeArm(next: IntakeArm) {
	arm = next;
}

export const intakeArmProps = () => prune({ intake_arm: arm });

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

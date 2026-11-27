import type { PostHog } from "posthog-react-native";
import type { FollowUp, Reading } from "@/features/intake/v2/heard";
import type {
	AnswerMode,
	HeardSource,
	IntakeV2State,
	IntakeV2Step,
	PlusOutcome,
} from "@/features/intake/v2/machine";
import { SERIES_BRANCH_VALUE } from "@/lib/intake/questions";
import {
	intakeArmProps,
	intakeDurationMs,
	setIntakeArm,
	startIntakeClock,
} from "@/lib/intake-analytics";
import type { IntakeAnswers } from "@/store/intake-slice";

type StepType = "founder" | "question" | "interstitial" | "paywall";
type Section = "you" | "how_you_carry_it" | "finding_us" | null;

const STEPS = [
	{ key: "founder", section: null, type: "founder" },
	{ key: "username", section: "you", type: "question" },
	{ key: "intent", section: "you", type: "question" },
	{ key: "weighing_on", section: "you", type: "question" },
	{ key: "interstitial_privacy", section: null, type: "interstitial" },
	{ key: "emotion_awareness", section: "how_you_carry_it", type: "question" },
	{ key: "disclosure_style", section: "how_you_carry_it", type: "question" },
	{ key: "coping_style", section: "how_you_carry_it", type: "question" },
	{ key: "support_frequency", section: "how_you_carry_it", type: "question" },
	{
		key: "interstitial_feedback_awareness",
		section: null,
		type: "interstitial",
	},
	{ key: "age_bracket", section: "finding_us", type: "question" },
	{ key: "acquisition_source", section: "finding_us", type: "question" },
	{ key: "series_seen", section: "finding_us", type: "question" },
	{ key: "series_want_in_app", section: "finding_us", type: "question" },
	{ key: "paywall", section: null, type: "paywall" },
] as const satisfies readonly {
	key: string;
	type: StepType;
	section: Section;
}[];

export type IntakeStepKey = (typeof STEPS)[number]["key"];

const indexOf = (key: IntakeStepKey) =>
	STEPS.findIndex((step) => step.key === key);

function stepViewedProps(stepKey: IntakeStepKey) {
	const index = indexOf(stepKey);
	const step = STEPS[index]!;
	return {
		section: step.section,
		step_index: index,
		step_key: step.key,
		step_type: step.type,
	};
}

let returningUser = false;

let completedFired = false;

export function trackIntakeStarted(posthog: PostHog, sessionCount: number) {
	startIntakeClock();
	setIntakeArm("v2");
	returningUser = sessionCount > 0;
	completedFired = false;
	posthog.capture("intake_started", {
		is_returning_user: sessionCount > 0,
		session_count: sessionCount,
	});
	trackStepViewed(posthog, "founder");
}

export function trackStepViewed(posthog: PostHog, stepKey: IntakeStepKey) {
	posthog.capture("intake_step_viewed", stepViewedProps(stepKey));
}

const branchedSeries = (answers: IntakeAnswers) =>
	answers.acquisitionSource === SERIES_BRANCH_VALUE;

export type IntakeOutcome =
	| "purchased"
	| "dismissed_paywall"
	| "skipped_paywall"
	| "no_offer";

export function trackIntakeCompleted(
	posthog: PostHog,
	outcome: IntakeOutcome,
	answers: IntakeAnswers
) {
	if (completedFired) {
		return;
	}
	completedFired = true;
	posthog.capture("intake_completed", {
		branched_series: branchedSeries(answers),
		duration_ms: intakeDurationMs(),
		...intakeArmProps(),
		is_returning_user: returningUser,
		outcome,
	});
}

export function trackAnswerGiven(
	posthog: PostHog,
	mode: AnswerMode,
	answer: string
) {
	posthog.capture("intake_answer_given", {
		answer_length: answer.length,
		answer_mode: mode,
		...intakeArmProps(),
	});
}

export function trackHeardConfirmed(
	posthog: PostHog,
	read: HeardSource,
	changes: { added: number; kept: number; removed: number },
	suggestions: { shown: number; taken: number }
) {
	posthog.capture("intake_heard_confirmed", {
		chips_added: changes.added,
		chips_kept: changes.kept,
		chips_removed: changes.removed,
		chips_suggested: suggestions.shown,
		...intakeArmProps(),
		read,
		suggestions_taken: suggestions.taken,
	});
}

export function trackFollowUpShown(posthog: PostHog, field: FollowUp["field"]) {
	posthog.capture("intake_follow_up_shown", {
		field,
		...intakeArmProps(),
	});
}

export function trackSafetyRouted(
	posthog: PostHog,
	level: Reading["safeguardLevel"]
) {
	posthog.capture("intake_safety_routed", {
		...intakeArmProps(),
		safeguard_level: level,
	});
}

export function trackSafetyLate(
	posthog: PostHog,
	level: Reading["safeguardLevel"],
	step: IntakeV2Step
) {
	posthog.capture("intake_safety_late", {
		...intakeArmProps(),
		safeguard_level: level,
		step,
	});
}

export type ReadFallbackReason = "error" | "timeout";

export function trackReadFallback(
	posthog: PostHog,
	reason: ReadFallbackReason
) {
	posthog.capture("intake_read_fallback", {
		...intakeArmProps(),
		reason,
	});
}

const OUTCOME_OF_PLUS = {
	dismissed: "dismissed_paywall",
	entitled: "skipped_paywall",
	purchased: "purchased",
} as const satisfies Record<PlusOutcome, IntakeOutcome>;

export const intakeOutcomeOf = (state: IntakeV2State): IntakeOutcome =>
	state.plusOutcome === null ? "no_offer" : OUTCOME_OF_PLUS[state.plusOutcome];

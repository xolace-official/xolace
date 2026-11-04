// Intake funnel instrumentation (T7, issue #267), all client-side. The step taxonomy
// is T7 §2.3 verbatim and the single source of `step_key` and `step_index`.
// `username` records only whether the suggested handle was kept, never the handle.

import { INTAKE_VERSION } from "@xolace/backend/convex/lib/validators";
import type { PostHog } from "posthog-react-native";
import { SERIES_BRANCH_VALUE } from "@/features/intake/questions";
import type { IntakeArm } from "@/features/intake/v2/arm";
import type { FollowUp, Reading } from "@/features/intake/v2/heard";
import type {
	AnswerMode,
	HeardSource,
	IntakeV2State,
	PlusOutcome,
	PlusSide,
} from "@/features/intake/v2/machine";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import type { IntakeAnswers } from "@/store/intake-slice";

type StepType = "founder" | "question" | "interstitial" | "paywall";
type Section = "you" | "how_you_carry_it" | "finding_us" | null;

/** T7 §2.3, the canonical ordered flow. Position in here is `step_index`. */
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

/** Answer-slice key to `step_key`. Q1's answer key is `displayName`. */
export const STEP_KEY_BY_ANSWER = {
	acquisitionSource: "acquisition_source",
	ageBracket: "age_bracket",
	copingStyle: "coping_style",
	disclosureStyle: "disclosure_style",
	displayName: "username",
	emotionAwareness: "emotion_awareness",
	intent: "intent",
	seriesSeen: "series_seen",
	seriesWantInApp: "series_want_in_app",
	supportFrequency: "support_frequency",
	weighingOn: "weighing_on",
} as const satisfies Record<string, IntakeStepKey>;

/** The `step_key` for an answer key, or nothing if it names no tracked step. */
export const stepKeyOfAnswer = (name: string): IntakeStepKey | undefined =>
	STEP_KEY_BY_ANSWER[name as keyof typeof STEP_KEY_BY_ANSWER];

const DECLINED_VALUE = "prefer_not_to_say";

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

const isDeclined = (value: unknown) =>
	Array.isArray(value)
		? value.includes(DECLINED_VALUE)
		: value === DECLINED_VALUE;

export function questionAnsweredProps(
	questionKey: IntakeStepKey,
	value: string | string[]
) {
	const multi = Array.isArray(value);
	return {
		is_multi: multi,
		question_index: indexOf(questionKey),
		question_key: questionKey,
		value,
		// Omitted for single-selects per T7 §2.1 rather than sent as 1.
		...(multi ? { selection_count: value.length } : {}),
		declined: isDeclined(value),
	};
}

/** Questions answered "I'd rather not say" across the whole set. */
export function declinedCount(answers: IntakeAnswers): number {
	return Object.values(answers).filter(isDeclined).length;
}

const prune = <T extends Record<string, unknown>>(props: T): Partial<T> =>
	Object.fromEntries(
		Object.entries(props).filter(([, value]) => value !== undefined)
	) as Partial<T>;

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
		$set_once: prune({
			acquisition_source: answers.acquisitionSource,
			series_seen: answers.seriesSeen,
			series_want_in_app: answers.seriesWantInApp,
		}),
	};
}

/** Start of the clock behind `duration_ms`. Module-level: intake restarts at the founder
 * message after a cold kill. */
let startedAt = 0;

/** Carried from `intake_started` onto `intake_completed`; only the first event sees the session
 * count. */
let returningUser = false;

// Intake ends once. The offer deck is still mounted under `(intake)/plans` when a
// purchase completes, so teardown could otherwise emit a second `intake_completed`.
let completedFired = false;

const durationMs = () => (startedAt === 0 ? 0 : Date.now() - startedAt);

/** The `intake-v2` arm (#704), once read. Every event after it carries it. */
let arm: IntakeArm | undefined;

let firstReflectionFired = false;

export function trackIntakeStarted(posthog: PostHog, sessionCount: number) {
	startedAt = Date.now();
	returningUser = sessionCount > 0;
	completedFired = false;
	firstReflectionFired = false;
	posthog.capture("intake_started", {
		is_returning_user: sessionCount > 0,
		session_count: sessionCount,
	});
	trackStepViewed(posthog, "founder");
}

export function trackStepViewed(posthog: PostHog, stepKey: IntakeStepKey) {
	posthog.capture("intake_step_viewed", stepViewedProps(stepKey));
}

export function trackQuestionAnswered(
	posthog: PostHog,
	questionKey: IntakeStepKey,
	value: string | string[],
	/** Extra props for a question that needs one, e.g. `username`. */
	extra?: Record<string, unknown>
) {
	posthog.capture("intake_question_answered", {
		...questionAnsweredProps(questionKey, value),
		...extra,
	});
}

const branchedSeries = (answers: IntakeAnswers) =>
	answers.acquisitionSource === SERIES_BRANCH_VALUE;

/** Last §3 question answered. Carries the person-property dual-write. */
export function trackQuestionnaireCompleted(
	posthog: PostHog,
	answers: IntakeAnswers
) {
	posthog.capture("intake_questionnaire_completed", {
		branched_series: branchedSeries(answers),
		declined_count: declinedCount(answers),
		duration_ms: durationMs(),
		...intakePersonProperties(answers),
	});
}

export function trackPaywallSkipped(posthog: PostHog) {
	posthog.capture("intake_paywall_skipped", { reason: "active_entitlement" });
}

export type IntakeOutcome =
	| "purchased"
	| "dismissed_paywall"
	| "skipped_paywall"
	/** v2 on the safety path: nothing was offered. */
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
		duration_ms: durationMs(),
		...prune({ intake_arm: arm }),
		is_returning_user: returningUser,
		outcome,
	});
}

/**
 * Fired once, when the founder letter's CTA freezes the arm: `intake_started` comes before
 * the flag is read, so this is each arm's start.
 */
export function trackIntakeArmAssigned(posthog: PostHog, assigned: IntakeArm) {
	arm = assigned;
	posthog.capture("intake_arm_assigned", { intake_arm: assigned });
}

/** v2's one answer: how it came in and how long, never the words. */
export function trackAnswerGiven(
	posthog: PostHog,
	mode: AnswerMode,
	answer: string
) {
	posthog.capture("intake_answer_given", {
		answer_length: answer.length,
		answer_mode: mode,
		...prune({ intake_arm: arm }),
	});
}

/** "That's me" on v2's chips: counts against what the answer was read as. */
export function trackHeardConfirmed(
	posthog: PostHog,
	read: HeardSource,
	changes: { added: number; kept: number; removed: number }
) {
	posthog.capture("intake_heard_confirmed", {
		chips_added: changes.added,
		chips_kept: changes.kept,
		chips_removed: changes.removed,
		...prune({ intake_arm: arm }),
		read,
	});
}

/** Flux asked its one follow-up (#708): which field it was for, never the words. */
export function trackFollowUpShown(posthog: PostHog, field: FollowUp["field"]) {
	posthog.capture("intake_follow_up_shown", {
		field,
		...prune({ intake_arm: arm }),
	});
}

/** The safeguard sent the answer to crisis support instead of chips (#708). */
export function trackSafetyRouted(
	posthog: PostHog,
	level: Reading["safeguardLevel"]
) {
	posthog.capture("intake_safety_routed", {
		...prune({ intake_arm: arm }),
		safeguard_level: level,
	});
}

/** Why the answer couldn't be read; the pick-list stands in (#708). */
export type ReadFallbackReason = "error" | "timeout";

export function trackReadFallback(
	posthog: PostHog,
	reason: ReadFallbackReason
) {
	posthog.capture("intake_read_fallback", {
		...prune({ intake_arm: arm }),
		reason,
	});
}

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
		...prune({ intake_arm: arm }),
		ms_since_intake_started: durationMs(),
	});
}

/** A question v2 deferred, answered where it's needed (#712). The answer also lands as the
 * same person property the intake would have set. */
export function trackDeferredAnswered(
	posthog: PostHog,
	question: "coping_style" | "support_frequency",
	value: string | string[],
	surface: "session_end" | "notification_nudge"
) {
	posthog.capture("intake_deferred_answered", {
		$set: { [question]: value },
		question,
		surface,
	});
}

const OUTCOME_OF_PLUS = {
	dismissed: "dismissed_paywall",
	entitled: "skipped_paywall",
	purchased: "purchased",
} as const satisfies Record<PlusOutcome, IntakeOutcome>;

/** How a v2 intake ended, for `intake_completed`: nothing offered when there was no Xolace+
 * step (the safety path). */
export const intakeOutcomeOf = (state: IntakeV2State): IntakeOutcome =>
	state.plusOutcome === null ? "no_offer" : OUTCOME_OF_PLUS[state.plusOutcome];

/** v2's Xolace+ step, "Same week, two ways" (#713), as the paywall surfaces know it. */
export const INTAKE_PLUS_SURFACE =
	"intake_same_week" as const satisfies PaywallSurface;

const plusProps = (props: Record<string, unknown>) => ({
	...props,
	...prune({ intake_arm: arm }),
	surface: INTAKE_PLUS_SURFACE,
});

/** v2's Xolace+ step on screen, once; the paywall's own `paywall_opened` rides along, so the
 * surface counts beside every other paywall. Session 0, as intake always is. */
export function trackPlusShown(posthog: PostHog) {
	posthog.capture("intake_plus_shown", plusProps({}));
	posthog.capture("paywall_opened", {
		session_count: 0,
		surface: INTAKE_PLUS_SURFACE,
	});
}

export function trackPlusSwitched(posthog: PostHog, side: PlusSide) {
	posthog.capture("intake_plus_switched", plusProps({ side }));
}

export function trackPlusPlanPicked(posthog: PostHog, plan: PlanId) {
	posthog.capture("intake_plus_plan_picked", plusProps({ plan }));
}

/** A purchase from the step; `intake_plus_trial_started` when it began the free week. */
export function trackPlusPurchased(
	posthog: PostHog,
	plan: PlanId,
	trial: boolean
) {
	posthog.capture(
		trial ? "intake_plus_trial_started" : "intake_plus_purchased",
		plusProps({ plan })
	);
}

/** "Continue free", from whichever side it was tapped. */
export function trackPlusContinuedFree(posthog: PostHog, side: PlusSide) {
	posthog.capture("intake_plus_continued_free", plusProps({ side }));
}

/**
 * Intake funnel instrumentation (T7, issue #267).
 *
 * Every event here is client-side, fired from the `(intake)` screens off the
 * non-persisted `intake` slice — `intake.complete` stays analytics-free. The
 * step taxonomy below is T7 §2.3 verbatim and is the single source of both
 * `step_key` and `step_index`; nothing else may name a step.
 *
 * `username` is the one question whose answer never leaves the device: it
 * records whether the suggested handle was kept, never the handle itself.
 */
import type { PostHog } from 'posthog-react-native';

import { INTAKE_VERSION } from '@/convex/lib/validators';
import { SERIES_BRANCH_VALUE } from '@/src/features/intake/questions';
import type { IntakeAnswers } from '@/src/store/intake-slice';

type StepType = 'founder' | 'question' | 'interstitial' | 'paywall';
type Section = 'you' | 'how_you_carry_it' | 'finding_us' | null;

/** T7 §2.3 — the canonical ordered flow. Position in here is `step_index`. */
const STEPS = [
  { key: 'founder', type: 'founder', section: null },
  { key: 'username', type: 'question', section: 'you' },
  { key: 'intent', type: 'question', section: 'you' },
  { key: 'weighing_on', type: 'question', section: 'you' },
  { key: 'interstitial_privacy', type: 'interstitial', section: null },
  { key: 'emotion_awareness', type: 'question', section: 'how_you_carry_it' },
  { key: 'disclosure_style', type: 'question', section: 'how_you_carry_it' },
  { key: 'coping_style', type: 'question', section: 'how_you_carry_it' },
  { key: 'support_frequency', type: 'question', section: 'how_you_carry_it' },
  { key: 'interstitial_feedback_awareness', type: 'interstitial', section: null },
  { key: 'age_bracket', type: 'question', section: 'finding_us' },
  { key: 'acquisition_source', type: 'question', section: 'finding_us' },
  { key: 'series_seen', type: 'question', section: 'finding_us' },
  { key: 'series_want_in_app', type: 'question', section: 'finding_us' },
  { key: 'paywall', type: 'paywall', section: null },
] as const satisfies readonly { key: string; type: StepType; section: Section }[];

export type IntakeStepKey = (typeof STEPS)[number]['key'];

/** Answer-slice key → `step_key`. Q1's answer key is `displayName`. */
export const STEP_KEY_BY_ANSWER = {
  displayName: 'username',
  intent: 'intent',
  weighingOn: 'weighing_on',
  emotionAwareness: 'emotion_awareness',
  disclosureStyle: 'disclosure_style',
  copingStyle: 'coping_style',
  supportFrequency: 'support_frequency',
  ageBracket: 'age_bracket',
  acquisitionSource: 'acquisition_source',
  seriesSeen: 'series_seen',
  seriesWantInApp: 'series_want_in_app',
} as const satisfies Record<string, IntakeStepKey>;

/** The `step_key` for an answer key, or nothing if it names no tracked step. */
export const stepKeyOfAnswer = (name: string): IntakeStepKey | undefined =>
  STEP_KEY_BY_ANSWER[name as keyof typeof STEP_KEY_BY_ANSWER];

export const DECLINED_VALUE = 'prefer_not_to_say';

const indexOf = (key: IntakeStepKey) => STEPS.findIndex((step) => step.key === key);

function stepViewedProps(stepKey: IntakeStepKey) {
  const index = indexOf(stepKey);
  const step = STEPS[index]!;
  return {
    step_key: step.key,
    step_index: index,
    step_type: step.type,
    section: step.section,
  };
}

const isDeclined = (value: unknown) =>
  Array.isArray(value) ? value.includes(DECLINED_VALUE) : value === DECLINED_VALUE;

export function questionAnsweredProps(questionKey: IntakeStepKey, value: string | string[]) {
  const multi = Array.isArray(value);
  return {
    question_key: questionKey,
    question_index: indexOf(questionKey),
    value,
    is_multi: multi,
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

/**
 * The person-property dual-write (T7 §3), written at questionnaire submit and
 * again as a backfill from `getFullContext` on next app open.
 *
 * `$set_once` is for the immutable historical facts — a re-onboard must never
 * overwrite how someone originally found us. `displayName` is deliberately not
 * here: it is not segmentation signal.
 */
export function intakePersonProperties(answers: IntakeAnswers, version = INTAKE_VERSION) {
  return {
    $set: prune({
      intent: answers.intent,
      weighing_on: answers.weighingOn,
      emotion_awareness: answers.emotionAwareness,
      disclosure_style: answers.disclosureStyle,
      coping_style: answers.copingStyle,
      support_frequency: answers.supportFrequency,
      age_bracket: answers.ageBracket,
      intake_version: version,
    }),
    $set_once: prune({
      acquisition_source: answers.acquisitionSource,
      series_seen: answers.seriesSeen,
      series_want_in_app: answers.seriesWantInApp,
    }),
  };
}

/**
 * Start of the clock behind every `duration_ms`. Module-level rather than in
 * the slice: intake restarts at the founder message after a cold kill, which
 * is exactly where this is reset.
 */
let startedAt = 0;

/**
 * Carried forward from `intake_started` onto `intake_completed`: the
 * time-to-complete tile breaks down by it, and only the first event of the
 * flow can see the session count.
 */
let returningUser = false;

/**
 * Intake ends once, however many screens race to end it. The offer deck is
 * still mounted under `(intake)/plans` when a purchase completes there, so a
 * single frame of focus during teardown would otherwise emit a second
 * `intake_completed` — with the opposite outcome. Module-level, because the
 * racing calls come from two different components' copies of the hook.
 */
let completedFired = false;

const durationMs = () => (startedAt === 0 ? 0 : Date.now() - startedAt);

export function trackIntakeStarted(posthog: PostHog, sessionCount: number) {
  startedAt = Date.now();
  returningUser = sessionCount > 0;
  completedFired = false;
  posthog.capture('intake_started', {
    session_count: sessionCount,
    is_returning_user: sessionCount > 0,
  });
  trackStepViewed(posthog, 'founder');
}

export function trackStepViewed(posthog: PostHog, stepKey: IntakeStepKey) {
  posthog.capture('intake_step_viewed', stepViewedProps(stepKey));
}

export function trackQuestionAnswered(
  posthog: PostHog,
  questionKey: IntakeStepKey,
  value: string | string[],
  /** Extra props for a question that needs one — see `username` below. */
  extra?: Record<string, unknown>
) {
  posthog.capture('intake_question_answered', {
    ...questionAnsweredProps(questionKey, value),
    ...extra,
  });
}

const branchedSeries = (answers: IntakeAnswers) =>
  answers.acquisitionSource === SERIES_BRANCH_VALUE;

/**
 * Last §3 question answered. Carries the person-property dual-write, so the
 * paywall funnel is channel-attributed without a second call.
 */
export function trackQuestionnaireCompleted(posthog: PostHog, answers: IntakeAnswers) {
  posthog.capture('intake_questionnaire_completed', {
    duration_ms: durationMs(),
    declined_count: declinedCount(answers),
    branched_series: branchedSeries(answers),
    ...intakePersonProperties(answers),
  });
}

export function trackPaywallSkipped(posthog: PostHog) {
  posthog.capture('intake_paywall_skipped', { reason: 'active_entitlement' });
}

export type IntakeOutcome = 'purchased' | 'dismissed_paywall' | 'skipped_paywall';

export function trackIntakeCompleted(
  posthog: PostHog,
  outcome: IntakeOutcome,
  answers: IntakeAnswers
) {
  if (completedFired) return;
  completedFired = true;
  posthog.capture('intake_completed', {
    outcome,
    duration_ms: durationMs(),
    branched_series: branchedSeries(answers),
    is_returning_user: returningUser,
  });
}

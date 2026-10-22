/**
 * The intake questionnaire, as data (T1, issue #232 · T2, issue #233).
 *
 * Question text, option labels and enum values are the T1 resolution table
 * verbatim — this file is the single place they live, so the screen renders
 * them and never restates them. The two interstitials are not here — they
 * carry no answer and no enum, so their copy lives with the screen that says
 * it (`questionnaire/interstitials.tsx`). Values are the
 * `intakeAnswerValidators` enums
 * (`convex/lib/validators.ts`), which is what lets an answer go to
 * `intake.complete` untranslated.
 *
 * "I'd rather not say" is a real last option with the same tap target, and it
 * appears only where T1 says it does — Q2, Q3, Q4, Q6, Q8. Q5 and Q7 already
 * carry a native neutral ("depends on the day", "Not sure") and get no second
 * escape hatch.
 */
import { Platform } from 'react-native';
import type { IntakeAnswers } from '@/src/store/intake-slice';

/** Cap on a multi-select question, mirrored server-side in `intake.complete`. */
export const MAX_SELECTIONS = 3;

/** The one answer that opens the series branch (Q10 → Q11). */
export const SERIES_BRANCH_VALUE = 'short_form_video';

export interface IntakeChoice {
  /** The enum value recorded. */
  value: string;
  label: string;
}

export interface IntakeQuestion {
  /** Answer key. Matches an `intake.complete` arg, so no mapping is needed. */
  name: keyof IntakeAnswers;
  question: string;
  /** A line under the question, where the question needs one. */
  description?: string;
  choices: readonly IntakeChoice[];
  /** Accepts up to `MAX_SELECTIONS` answers. */
  multiple?: boolean;
  /** Two-up answers. Only where every label is short enough to hold a half. */
  twoUp?: boolean;
}

const PREFER_NOT_TO_SAY: IntakeChoice = {
  value: 'prefer_not_to_say',
  label: "I'd rather not say",
};

/** §1 — You. Q1 (username) is its own screen; these are Q2 and Q3. */
export const SECTION_YOU: readonly IntakeQuestion[] = [
  {
    name: 'intent',
    question: 'What brought you to Xolace?',
    choices: [
      { value: 'understand_feelings', label: "Understand what I'm feeling" },
      { value: 'get_through_hard_moment', label: 'Get through a hard moment' },
      { value: 'feel_less_alone', label: 'Feel less alone' },
      { value: 'make_it_regular', label: 'Make this a regular part of my life' },
      { value: 'just_looking', label: 'Just looking around' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    name: 'weighingOn',
    question: "What's weighing on you lately?",
    description: `Pick up to ${MAX_SELECTIONS}.`,
    multiple: true,
    twoUp: true,
    choices: [
      { value: 'work', label: 'Work' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'family', label: 'Family' },
      { value: 'identity', label: 'Identity' },
      { value: 'health', label: 'Health' },
      { value: 'money', label: 'Money' },
      { value: 'purpose', label: 'Purpose' },
      { value: 'a_loss', label: 'A loss' },
      { value: 'big_change', label: 'A big change' },
      { value: 'cant_name_yet', label: "Can't name" },
      PREFER_NOT_TO_SAY,
    ],
  },
];

/** §2 — How you carry it. Q4 → Q7. */
export const SECTION_CARRY: readonly IntakeQuestion[] = [
  {
    name: 'emotionAwareness',
    question: 'How aware are you of what you feel?',
    choices: [
      { value: 'know_and_can_say', label: 'I usually know what I feel and can say it' },
      { value: 'know_but_no_words', label: "I know what I feel but can't put words to it" },
      { value: 'something_off_unclear', label: "I can tell something's off but not what" },
      { value: 'numb_or_cant_tell', label: "I mostly go numb or can't tell" },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    name: 'disclosureStyle',
    question: "When something's bothering you, you usually…",
    choices: [
      { value: 'all_at_once', label: 'Let it all out at once' },
      { value: 'bit_at_a_time', label: 'Share a bit at a time' },
      { value: 'keep_it_brief', label: 'Keep it brief' },
      { value: 'depends', label: 'Depends on the day' },
    ],
  },
  {
    name: 'copingStyle',
    question: "How do you usually cope when you're struggling?",
    description: `Pick up to ${MAX_SELECTIONS}.`,
    multiple: true,
    choices: [
      { value: 'dont_know_how', label: "I don't really know how" },
      {
        value: 'calming_creative',
        label: 'I use calming or creative outlets (breathing, journaling, music, art, meditation)',
      },
      { value: 'distract', label: 'I distract myself' },
      { value: 'let_it_out', label: 'I let it out (vent, cry, write it all down)' },
      { value: 'lean_on_people', label: 'I lean on people around me' },
      { value: 'outside_things', label: 'I rely on outside things (substances, meds, other)' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    name: 'supportFrequency',
    question: 'How often do you feel you need support?',
    twoUp: true,
    choices: [
      { value: 'occasionally', label: 'Occasionally' },
      { value: 'frequently', label: 'Frequently' },
      { value: 'every_day', label: 'Every day' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
];

/** §3 — Finding us. Q8 → Q9, then the series branch. */
export const SECTION_FINDING: readonly IntakeQuestion[] = [
  {
    name: 'ageBracket',
    question: 'How old are you?',
    twoUp: true,
    choices: [
      { value: 'under_18', label: 'Under 18' },
      { value: '18_24', label: '18–24' },
      { value: '25_34', label: '25–34' },
      { value: '35_44', label: '35–44' },
      { value: '45_plus', label: '45+' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    name: 'acquisitionSource',
    // No "prefer not to say": `other` is the out (T2, issue #233).
    question: 'How did you find Xolace?',
    choices: [
      { value: 'friend_family', label: 'A friend or family member' },
      { value: 'professional', label: 'A therapist, counsellor, or support worker' },
      {
        value: SERIES_BRANCH_VALUE,
        label:
          'Our video series, or other short-form video; TikTok, LinkedIn, Instagram',
      },
      { value: 'social', label: 'A social media post or account' },
      { value: 'ad', label: 'An online ad' },
      // App Review 2.3.10 rejects any mention of Google Play in the iOS binary.
      {
        value: 'store_search',
        label: Platform.OS === 'ios' ? 'App Store search' : 'Google Play search',
      },
      { value: 'editorial', label: 'An article, podcast, or newsletter' },
      { value: 'other', label: 'Somewhere else' },
    ],
  },
];

/**
 * Q10 — the series question, reached only from `short_form_video`.
 *
 * "Yes" is not an answer on its own: it reveals the rating sub-tap inline, and
 * the rating is what gets recorded. So the three ratings and `not_seen` are the
 * four values `seriesSeen` accepts, and the Yes/No above them is presentation.
 */
export const SERIES_SEEN_RATINGS: readonly IntakeChoice[] = [
  { value: 'loved_it', label: 'Loved it' },
  { value: 'it_was_okay', label: 'It was okay' },
  { value: 'not_for_me', label: 'Not for me' },
];

export const SERIES_NOT_SEEN = 'not_seen';

/** Q11 — always asked if the branch fired. */
export const SERIES_WANT_QUESTION = 'Want the series in Xolace?';
export const SERIES_WANT_CHOICES: readonly IntakeChoice[] = [
  { value: 'true', label: 'Yes, put the series and new episodes here' },
  { value: 'false', label: 'No' },
];

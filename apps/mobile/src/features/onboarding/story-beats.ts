/**
 * The six beats of the onboarding tale, in order. Form locked by #198 (a
 * six-beat tale, no card, ember-led chapter marks), content by #200.
 *
 * Copy rule inherited from the product: NOTHING here may be a number or a
 * quote we cannot defend. The cohort figure on the `proof` beat is the real
 * shipped mechanic (>= 3 matches or no number at all), never a decorative
 * stat.
 */
import type { SymbolViewProps } from 'expo-symbols';

export type StoryBeat = {
  id: string;
  /** Chapter marker — absent on the opening beat, which sells nothing. */
  label?: string;
  /** The narration. Second person, present tense, continues from the last beat. */
  beat: string;
  /** What it actually is, once the sentence has landed. */
  aside: string;
  symbol: SymbolViewProps['name'];
  /** ms this beat holds before auto-advancing. */
  duration: number;
  /**
   * Every beat owns a bespoke composition — there is no generic fallback kind.
   * 'proof'          = the count drawn rather than stated: one ember per
   *                    person, with one of them carrying a real review
   *                    (see `proof-beat.tsx`).
   * 'cover'          = the opening title card. Not a slide in the deck's
   *                    rhythm — the front of the book, so it breaks the grid
   *                    on purpose (see `cover-beat.tsx`).
   * 'mirror'         = owns its own composition too: figure over a waterline
   *                    with its own reflection (see `mirror-beat.tsx`).
   * 'vent'           = the mirror's inversion: figure on the other side of the
   *                    axis, breath rising instead of a reflection falling
   *                    (see `vent-beat.tsx`).
   * 'xolacers'       = the only beat with someone else in it: figure on the
   *                    axis, another person's ember across the dark
   *                    (see `xolacers-beat.tsx`).
   * 'plus'           = the offer, shown rather than argued: the free window
   *                    lit and the past relighting behind it
   *                    (see `plus-beat.tsx`).
   */
  kind: 'proof' | 'cover' | 'mirror' | 'vent' | 'xolacers' | 'plus';
  /** Ember-cased footnote under the aside. Only Xolace+ carries one. */
  tag?: string;
};

export const STORY_BEATS: StoryBeat[] = [
  {
    id: 'dusk',
    kind: 'cover',
    // The gateway into the brand, so it is the one beat that must NAME the
    // thing: the wordmark, the word "campfire", and in plain language what
    // actually happens here. Every later beat may lean on the metaphor
    // because this one paid for it. Nothing poetic gets to go first.
    beat: 'A campfire for\nwhat you can’t\nsay out loud.',
    aside: 'Low light, not a spotlight. Voices before faces. A fire nobody owns.',
    symbol: { ios: 'flame', android: 'local_fire_department', web: 'local_fire_department' },
    duration: 3400,
  },
  // Mirror and Vent are a MATCHED PAIR, not two steps of one flow. They are
  // alternatives — different reasons to open the app on a given day — so the
  // two beats are written in identical grammatical shape ("Some days… /
  // Other days…"). Same form reads as a choice; different form would read as
  // a sequence, which is the thing we must not imply. Neither beat may open
  // with a joining word ("So…", "And…"), and neither may reference the other
  // as a next step. The `tag` on the second closes the pair.
  //
  // Deliberately "days", not "nights" — the fire/campfire metaphor is a
  // visual register (dusk lighting, embers), not a claim that Xolace is only
  // for nighttime use. Copy that names a time of day must stay time-neutral.
  //
  // Mirror leads because the cover already sold the act of saying it out loud;
  // opening the deck proper with Vent would restate the cover instead of
  // adding the thing a stranger has not yet been told.
  {
    id: 'mirror',
    kind: 'mirror',
    label: 'The Mirror',
    beat: "Some days you\nneed to know what\nyou're feeling.",
    aside:
      'Type it or say it. The Mirror reads it back - the feeling, named, in your own words. Not advice, not a diagnosis.',
    symbol: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
    duration: 3800,
  },
  {
    id: 'vent',
    kind: 'vent',
    label: 'Vent',
    beat: 'Other days you\njust need to\nget it out.',
    aside:
      'Sit with the fire alone and say it. Nothing is stored, nothing answers back. It goes when you close it.',
    tag: 'Either one · any time',
    symbol: { ios: 'mic', android: 'mic', web: 'mic' },
    duration: 3600,
  },
  {
    id: 'proof',
    label: 'This week',
    kind: 'proof',
    beat: "You're not the\nonly one out here.",
    // "Real sessions" was ours, not theirs — nobody outside the codebase knows
    // what a session is, and a caption whose whole point is that the number is
    // checkable cannot be the line that needs decoding. One light on the slide
    // per person, said plainly.
    aside: 'One light for each of them. A real count - never a number we made up.',
    symbol: { ios: 'flame', android: 'local_fire_department', web: 'local_fire_department' },
    // Far and away the longest beat to read — a whole three-sentence review on
    // top of the field and the caption — and the choreography alone runs past
    // 2.4s before a word can be read. Read time, not taste. Auto-advancing off
    // someone's review mid-sentence is the one place in the deck where the
    // timer would actively undercut what the slide is saying.
    duration: 8000,
  },
  {
    id: 'xolacers',
    kind: 'xolacers',
    label: 'Xolacers',
    // The only beat where the product is another human, so it is the one place
    // ambiguity actually costs us something: a stranger deciding whether to
    // trust this needs to know who they'd be talking to and what happens to
    // their own identity, in the sentence itself. "They have a name. You don't"
    // is the whole arrangement — theirs is on their profile, yours never
    // exists. Do not soften it into "private" or "safe"; the asymmetry IS the
    // reassurance, and naming it plainly is what makes it believable.
    beat: 'Talk to a real\nperson. They have\na name. You don’t.',
    aside:
      'Real volunteers with names, faces, and a thing they’re good at listening to. You choose who. You stay anonymous.',
    // Not decoration and not a disclaimer bolted on: it is the single fact that
    // keeps every promise above it honest. It stays.
    tag: 'Trained peers · not therapists',
    symbol: { ios: 'person.2', android: 'group', web: 'group' },
    duration: 3800,
  },
  {
    id: 'plus',
    kind: 'plus',
    label: 'Xolace+',
    // The last beat before the ask, and the only one with a commercial job.
    //
    // It sells ONE idea. Plus contains a longer history, themes, avatars and
    // more drafts, and every one of those is an add-on that belongs in a pill
    // — not because they are worthless but because none of them answers "why
    // would this help me". The insight does, and it is the only part of the
    // product a person genuinely cannot do for themselves.
    //
    // The headline is a fact about being a person, not a fact about us: true
    // before Xolace existed, true for a reader who never pays. That is what
    // makes the feature read as an answer rather than an ask. Deliberately no
    // "unlock", no "upgrade", no "premium", and no time-of-day word — people
    // do not only carry things after dark.
    beat: "You can't see\nyour own pattern\nfrom inside it.",
    aside:
      // Sized to the measure, not just to taste: at this width the aside sets
      // ~43 characters a line, so anything over ~129 spills a single word onto
      // a fourth line and the block ends on an orphan.
      'Xolace+ reads across everything you’ve written - the words you keep leaning on, what keeps circling back, what’s easing.',
    // The `tag` slot, spent on the positioning instead of a price. No hard
    // paywall is the most valuable true thing we can say here, and it is only
    // sayable because of where the real gates are: the Mirror and Vent are
    // free, a bridge draft a day is free, and what Plus gates is the looking
    // back (see `use-insight-gate.ts`). The reason travels with the promise —
    // a policy without its why reads as a boast.
    tag: 'Saying it stays free. Nobody should meet a paywall on a bad day; what Xolace+ buys you is the looking back across it.',
    symbol: { ios: 'flame.circle', android: 'local_fire_department', web: 'local_fire_department' },
    duration: 3400,
  },
];

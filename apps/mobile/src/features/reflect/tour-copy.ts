/**
 * Bump when the tour is re-cut for a screen that has changed enough that the
 * old walkthrough describes the wrong thing. A device stores the version it
 * last finished; anything lower sees the current tour once.
 */
export const REFLECT_TOUR_VERSION = 1;

/** Whether the tour should run for a device that last finished `version`. */
export const shouldShowReflectTour = (version: number) =>
  version < REFLECT_TOUR_VERSION;

// Indexed by a step's `order`. Four steps since the rewrite (#259): the card,
// the mic, the chips, the menu — nothing a user would have found on their own.
export const TOUR_STEPS = [
  // The prompt does shift with 3am Mode and long absences, but a first-run
  // user has seen neither, so the step points at what the card is for instead.
  { title: 'Start here.', description: 'Tap the card and write whatever is on your mind.' },
  { title: 'Speak instead.', description: 'Tap this button to record your voice.' },
  { title: 'Can\'t write? Tap words that fit.', description: 'Select any that match how you feel right now.' },
  { title: 'The rest lives here.', description: 'Discovery, Vent and Settings.' },
] as const;

export type TourStep = (typeof TOUR_STEPS)[number];

/**
 * Rows in a week — the default, and what the calendar helper and the weekday
 * labels assume. The grid itself takes a `rows` prop, so a grid whose bins are
 * hours rather than days is the same component with a different number.
 */
export const DAYS_IN_WEEK = 7;

/** Opacity of the base colour at each activity level. Index 0 is "nothing". */
export const LEVEL_OPACITY = [1, 0.28, 0.5, 0.74, 1] as const;

/**
 * A theme token rather than a colour. Tokens are named, not written, so the
 * leading `--` tells the two apart without the caller having to say which
 * kind they passed.
 */
export function isToken(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith('--');
}

/** Room left for the weekday labels when the y-axis does not ask for its own. */
export const DEFAULT_AXIS_WIDTH = 26;

/**
 * Height assumed for the readout when placing it above a cell. It is a single
 * line of `xs` text in a padded box, so it does not vary — and measuring it
 * would put the tooltip a frame behind the finger.
 */
export const TOOLTIP_HEIGHT = 26;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a swipe scrolls the chart instead of reading it, short
 * enough that a deliberate press does not feel like it was ignored.
 */
export const DEFAULT_HOLD = 180;

/** Weekday names, indexed from Sunday, as the `Date` API numbers them. */
export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Default rows per column, assumed by the calendar helper and weekday labels. */
export const DAYS_IN_WEEK = 7;

/** Opacity of the base colour at each activity level. Index 0 is "nothing". */
export const LEVEL_OPACITY = [1, 0.28, 0.5, 0.74, 1] as const;

/** A theme token rather than a colour: tokens are named with a leading `--`. */
export function isToken(value: string | undefined): value is string {
	return typeof value === "string" && value.startsWith("--");
}

/** Room left for the weekday labels when the y-axis does not ask for its own. */
export const DEFAULT_AXIS_WIDTH = 26;

/** Readout height: one line of `xs` text in a padded box. Measuring would lag the finger a
 * frame. */
export const TOOLTIP_HEIGHT = 26;

/** Hold before the readout claims the touch: long enough that a swipe scrolls, short enough to
 * feel prompt. */
export const DEFAULT_HOLD = 180;

/** Weekday names, indexed from Sunday, as the `Date` API numbers them. */
export const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

export const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

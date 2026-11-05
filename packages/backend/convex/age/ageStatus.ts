import { type Infer, v } from "convex/values";

/**
 * Effective age (#716): one status per user, worked out from a date of birth
 * on the user's own calendar day. Every age gate reads this, never the v1
 * intake `ageBracket`.
 */
export const ageStatusValidator = v.union(
	v.literal("unknown"),
	v.literal("under_13"),
	v.literal("13_17"),
	v.literal("adult")
);
export type AgeStatus = Infer<typeof ageStatusValidator>;

const ADULT_AGE = 18;
const MIN_AGE = 13;
/** Further back than this is a slip of the picker, not a birth year. */
const MAX_AGE = 120;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `value` is a "YYYY-MM-DD" date that exists on the calendar, no later
 * than `localDay` and no more than 120 years before it.
 */
export function isDateOfBirth(value: string, localDay: string): boolean {
	if (!CALENDAR_DATE.test(value)) {
		return false;
	}
	const [year, month, day] = value.split("-").map(Number);
	// Date.UTC rolls 30 February over into March; a real date round-trips.
	const roundTrip = new Date(Date.UTC(year, month - 1, day))
		.toISOString()
		.slice(0, "YYYY-MM-DD".length);
	if (roundTrip !== value || value > localDay) {
		return false;
	}
	return yearsBetween(value, localDay) <= MAX_AGE;
}

/** Whole years between two "YYYY-MM-DD" calendar dates. */
function yearsBetween(dateOfBirth: string, localDay: string): number {
	const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
	const [year, month, day] = localDay.split("-").map(Number);
	const hadBirthday =
		month > birthMonth || (month === birthMonth && day >= birthDay);
	return year - birthYear - (hadBirthday ? 0 : 1);
}

/** The age status of someone born on `dateOfBirth`, on `localDay`. */
export function ageStatusOn(
	dateOfBirth: string | undefined,
	localDay: string
): AgeStatus {
	if (dateOfBirth === undefined) {
		return "unknown";
	}
	const age = yearsBetween(dateOfBirth, localDay);
	if (age >= ADULT_AGE) {
		return "adult";
	}
	return age >= MIN_AGE ? "13_17" : "under_13";
}

import type { Doc } from "../_generated/dataModel";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type Notifications = Doc<"preferences">["notifications"];

/** Local hour and minute in an IANA zone, or null for an unknown zone. */
function localTime(
	timezone: string,
	at: number
): { hour: number; minute: number } | null {
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			hour12: false,
			minute: "numeric",
			timeZone: timezone,
		}).formatToParts(new Date(at));
		const hour = Number(parts.find((p) => p.type === "hour")?.value);
		const minute = Number(parts.find((p) => p.type === "minute")?.value);
		if (Number.isNaN(hour) || Number.isNaN(minute)) {
			return null;
		}
		return { hour: hour % 24, minute };
	} catch {
		return null;
	}
}

/**
 * When the person's quiet window ends, if `at` is inside it; otherwise null.
 * Same rule as `isInQuietWindow`: quiet before `dontReachBefore` or after
 * `dontReachAfter`, local time. The window ends on the hour `dontReachBefore`.
 */
export function quietWindowEndsAt(
	notifications: Notifications | undefined,
	at: number
): number | null {
	const window = notifications?.quietWindow;
	const timezone = notifications?.timezone;
	if (!(window && timezone)) {
		return null;
	}
	const local = localTime(timezone, at);
	if (!local) {
		return null;
	}
	const { dontReachAfter, dontReachBefore } = window;
	if (local.hour >= dontReachBefore && local.hour <= dontReachAfter) {
		return null;
	}
	const hoursToGo = (dontReachBefore - local.hour + 24) % 24;
	const startOfHour = at - (at % MINUTE) - local.minute * MINUTE;
	return onLocalHour(timezone, startOfHour + hoursToGo * HOUR, dontReachBefore);
}

/** Hours either way a clock change can shift a guess. */
const MAX_CLOCK_CORRECTIONS = 3;

/**
 * Elapsed hours drift from local hours across a clock change, so nudge the
 * guess until it lands on `hour:00` local time. A local hour that a spring
 * forward skips has no exact match; the last guess is the nearest one.
 */
function onLocalHour(timezone: string, guess: number, hour: number): number {
	let t = guess;
	for (let i = 0; i < MAX_CLOCK_CORRECTIONS; i++) {
		const local = localTime(timezone, t);
		if (!local) {
			return t;
		}
		const hoursOff = ((hour - local.hour + 36) % 24) - 12;
		if (hoursOff === 0 && local.minute === 0) {
			return t;
		}
		t += hoursOff * HOUR - local.minute * MINUTE;
	}
	return t;
}

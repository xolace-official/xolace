/** Clock-driven copy for the discovery masthead. Pure; the screen re-renders on focus. */

export type DayPart = "morning" | "afternoon" | "evening" | "late";

function getDayPart(now = new Date()): DayPart {
	const hour = now.getHours();
	if (hour < 5) {
		return "late";
	}
	if (hour < 12) {
		return "morning";
	}
	if (hour < 17) {
		return "afternoon";
	}
	if (hour < 22) {
		return "evening";
	}
	return "late";
}

/** Eyebrow datestamp, e.g. "Tuesday · evening". */
export function getDateStamp(now = new Date()): string {
	const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
	return `${weekday} · ${getDayPart(now)}`;
}

/** Non-time-worded so it does not echo the eyebrow. Takes the preferences displayName, not
 * Clerk's. */
export function getGreeting(displayName?: string | null): string {
	return displayName ? `Welcome back, ${displayName}` : "Welcome back";
}

// Split lead/tail so the tail can drop to a lighter weight. Copy only, no
// navigation: Xolacer setup is gated on `isXolacer`.
const DISPLAY_LINES = [
	{ lead: "Be the support someone needs.", tail: "Become a Xolacer." },
	{ lead: "Listen. Connect. Support.", tail: "Become a Xolacer." },
	{ lead: "Your story, your empathy, your impact.", tail: "Become a Xolacer." },
	{ lead: "Make space for someone to be heard.", tail: "Become a Xolacer." },
	{ lead: "Someone needs a safe space.", tail: "You could help create it." },
] as const;

const ACTIVE_LINE = 3;

export const DISPLAY_LEAD = DISPLAY_LINES[ACTIVE_LINE].lead;
export const DISPLAY_TAIL = DISPLAY_LINES[ACTIVE_LINE].tail;

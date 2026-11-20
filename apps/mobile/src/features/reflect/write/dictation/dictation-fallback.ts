import { startOfTodayUTC } from "@xolace/backend/convex/lib/timeOfDay";
import { ConvexError } from "convex/values";

const NOTE_CAPPED = "Sharper dictation is back tomorrow.";
const NOTE_UNAVAILABLE = "Sharper dictation isn't available right now.";
const NOTE_TAKE_FAILED = "That one didn't come through. Try again.";

export function fallbackNote({
	cappedOn,
	scribeFailed,
	offline,
}: {
	cappedOn: number | null;
	scribeFailed: boolean;
	offline: boolean;
}): string | null {
	if (cappedOn !== null && cappedOn >= startOfTodayUTC()) {
		return NOTE_CAPPED;
	}
	if (scribeFailed || offline) {
		return NOTE_UNAVAILABLE;
	}
	return null;
}

export function takeFailedNote(err: unknown, reachedScribe: boolean) {
	const capped =
		err instanceof ConvexError &&
		(err.data as { code?: string } | undefined)?.code ===
			"dictation_cap_reached";
	return { note: NOTE_TAKE_FAILED, scribeDown: reachedScribe && !capped };
}

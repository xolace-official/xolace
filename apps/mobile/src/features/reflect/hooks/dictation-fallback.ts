import { startOfTodayUTC } from "@xolace/backend/convex/lib/timeOfDay";
import { ConvexError } from "convex/values";

// Why the mic is on the phone's own dictation, or that a take was lost (#558).
// Each must fit one line of the composer strip on the narrowest phone.
const NOTE_CAPPED = "Sharper dictation is back tomorrow.";
const NOTE_UNAVAILABLE = "Sharper dictation isn't available right now.";
const NOTE_TAKE_FAILED = "That one didn't come through. Try again.";

/** The note for a mic tap that should go on device instead, or null to use Plus. */
export function fallbackNote({
	cappedOn,
	scribeFailed,
	offline,
}: {
	/** From `dictation.status`: the UTC day the budget was spent, if any. */
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

/** A lost take's note, and whether later takes go on device (only a failure at Scribe counts). */
export function takeFailedNote(err: unknown, reachedScribe: boolean) {
	const capped =
		err instanceof ConvexError &&
		(err.data as { code?: string } | undefined)?.code ===
			"dictation_cap_reached";
	return { note: NOTE_TAKE_FAILED, scribeDown: reachedScribe && !capped };
}

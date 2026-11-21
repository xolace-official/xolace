/**
 * Letters' server-side analytics (spec decision D). Never the text, a letter
 * id, or anything that links a sender's event to a recipient's; a failed
 * capture never fails the write.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { posthog } from "../posthog";
import { DAY_MS } from "./rules";

const HOUR_MS = 60 * 60 * 1000;

type LetterEvent =
	| { event: "letter_placed"; properties: { waitBucket: WaitBucket } }
	| {
			event: "letter_returned";
			properties: { why: "unplaced" | "unchecked" | "recheck" };
	  }
	| { event: "letter_opened" | "letter_acknowledged" | "letter_hidden" }
	| {
			event: "letter_reported";
			properties: { reason: "unkind" | "selling" | "private" | "other" };
	  };

type WaitBucket = "under_1h" | "1h_1d" | "1d_3d" | "3d_7d" | "over_7d";

/** How long a letter waited from passing to placement, coarsely. */
export function waitBucketOf(waitedMs: number): WaitBucket {
	if (waitedMs < HOUR_MS) {
		return "under_1h";
	}
	if (waitedMs < DAY_MS) {
		return "1h_1d";
	}
	if (waitedMs < 3 * DAY_MS) {
		return "1d_3d";
	}
	return waitedMs < 7 * DAY_MS ? "3d_7d" : "over_7d";
}

export async function captureLetterEvent(
	ctx: MutationCtx,
	distinctId: Id<"emotional_profiles">,
	event: LetterEvent
): Promise<void> {
	try {
		await posthog.capture(ctx, { distinctId, ...event });
	} catch (error) {
		console.error(`${event.event} capture failed`, error);
	}
}

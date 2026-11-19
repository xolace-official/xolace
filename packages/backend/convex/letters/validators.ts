/**
 * The letters contract's shapes (spec: docs/plan/letters.md), shared by the
 * schema and the functions. Pure: `convex/values` only, so the schema can
 * import it.
 */
import { type Infer, v } from "convex/values";

/**
 * What a sender's "For" steers matching towards. Absent means anyone. Never
 * returned to a recipient.
 */
export const letterAimValidator = v.union(
	v.literal("anxiety"),
	v.literal("loneliness"),
	v.literal("grief"),
	v.literal("sleep"),
	v.literal("low")
);
export type LetterAim = Infer<typeof letterAimValidator>;

/**
 * - `unchecked`: the check couldn't finish; a background re-check is pending.
 * - `waiting`: passed, not placed yet.
 * - `received`: placed with its recipient.
 * - `held`: hostile, kept for review, never placed.
 * - `returned`: not placed in time, or a late re-check failed.
 */
export const letterStatusValidator = v.union(
	v.literal("unchecked"),
	v.literal("waiting"),
	v.literal("received"),
	v.literal("held"),
	v.literal("returned")
);
export type LetterStatus = Infer<typeof letterStatusValidator>;

/** What a sender's Sent row says. `unchecked` reads as `waiting`. */
export const sentStatusValidator = v.union(
	v.literal("waiting"),
	v.literal("received"),
	v.literal("acknowledged"),
	v.literal("returned")
);
export type SentStatus = Infer<typeof sentStatusValidator>;

/** The latest Sent status a sender has seen (never `waiting`). */
export const senderSeenValidator = v.union(
	v.literal("received"),
	v.literal("acknowledged"),
	v.literal("returned")
);

export const optInValidator = v.union(v.literal("yes"), v.literal("no"));

export const poolValidator = v.union(v.literal("ready"), v.literal("out"));

/** Lighter or heavier, from the latest session's intensity. */
export const bandValidator = v.union(
	v.literal("lighter"),
	v.literal("heavier")
);

/** A report's reason; required (open question 30). */
export const reportReasonValidator = v.union(
	v.literal("unkind"),
	v.literal("selling"),
	v.literal("private"),
	v.literal("other")
);

/** What answering Send gives back: S20's `SendOutcome`. */
export const sendOutcomeValidator = v.union(
	v.object({ kind: v.literal("pass") }),
	v.object({ kind: v.literal("unavailable") }),
	v.object({ kind: v.literal("fixable"), line: v.string() }),
	v.object({ kind: v.literal("risk") }),
	v.object({ kind: v.literal("held") }),
	v.object({ kind: v.literal("lang") }),
	v.object({
		kind: v.literal("limit"),
		reason: v.union(v.literal("today"), v.literal("three")),
	})
);
export type SendOutcome = Infer<typeof sendOutcomeValidator>;

/** A letter as its recipient sees it: the words, and nothing about who or why. */
export const receivedLetterValidator = v.object({
	acknowledged: v.boolean(),
	hidden: v.boolean(),
	id: v.id("letters"),
	opened: v.boolean(),
	text: v.string(),
});

/** A letter as its sender sees it in Sent: never the whole text. */
export const sentLetterValidator = v.object({
	id: v.id("letters"),
	line: v.string(),
	seen: v.boolean(),
	status: sentStatusValidator,
});

/**
 * Letters' three pushes (spec §6). The one place that knows how a letter
 * push goes out: if letters move onto outreach later, only this body changes
 * (owner decision E). Not outreach today: a person wrote the letter, Xolace
 * didn't reach out.
 *
 * Ids only, never text. Each push re-reads the letter when it runs and drops
 * itself if it no longer applies, and waits out the recipient's quiet window
 * (open question 31: quiet hours decide).
 */
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { NUDGE_NOTIFICATION_SOUND } from "../lib/notificationSounds";
import { sendPushToProfile } from "../lib/pushNotifications";
import { quietWindowEndsAt } from "../outreach/quietWindow";

export const letterPushTypeValidator = v.union(
	v.literal("letter_for_you"),
	v.literal("letter_received"),
	v.literal("letter_acknowledged")
);
type LetterPushType = Infer<typeof letterPushTypeValidator>;

/** `LETTERS.push` (open question 28). */
const COPY: Record<LetterPushType, { title: string; body?: string }> = {
	letter_acknowledged: {
		body: "They acknowledged it.",
		title: "Your letter reached someone",
	},
	letter_for_you: { title: "Someone wrote you a letter" },
	letter_received: {
		body: "Xolace placed it with someone it fits.",
		title: "One of your letters was received",
	},
};

/** Whether the push still says something true when it runs. */
function stillApplies(
	letter: Doc<"letters"> | null,
	type: LetterPushType,
	to: Id<"emotional_profiles">
): boolean {
	if (!letter || letter.status !== "received" || letter.reportedAt) {
		return false;
	}
	switch (type) {
		case "letter_for_you":
			return letter.recipientProfileId === to && letter.openedAt === undefined;
		case "letter_received":
			return letter.senderProfileId === to;
		case "letter_acknowledged":
			return (
				letter.senderProfileId === to && letter.acknowledgedAt !== undefined
			);
		default:
			return false;
	}
}

async function activeAccount(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	return user?.accountStatus === "active";
}

/** Scheduled with `runAfter(0)`: a push that fails never rolls back its cause. */
export const send = internalMutation({
	args: {
		letterId: v.id("letters"),
		to: v.id("emotional_profiles"),
		type: letterPushTypeValidator,
	},
	handler: async (ctx, args) => {
		const letter = await ctx.db.get("letters", args.letterId);
		if (
			!(
				stillApplies(letter, args.type, args.to) &&
				(await activeAccount(ctx, args.to))
			)
		) {
			return null;
		}
		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", args.to))
			.unique();
		const notifications = preferences?.notifications;
		if (!notifications?.enabled || notifications.letters === false) {
			return null;
		}
		const now = Date.now();
		const quietUntil = quietWindowEndsAt(notifications, now);
		if (quietUntil !== null) {
			await ctx.scheduler.runAt(quietUntil, internal.letters.push.send, args);
			return null;
		}

		const data =
			args.type === "letter_for_you"
				? { letterId: args.letterId, type: args.type }
				: { type: args.type };
		await sendPushToProfile(ctx, {
			emotionalProfileId: args.to,
			notification: { ...COPY[args.type], ...NUDGE_NOTIFICATION_SOUND, data },
		});
		return null;
	},
	returns: v.null(),
});

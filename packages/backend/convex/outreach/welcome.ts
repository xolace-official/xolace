import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { WELCOME_SUBJECT, welcomeText } from "./email/welcomeCopy";

/**
 * The welcome (#915): the one outreach every new user gets, about half an
 * hour after signing up, so it lands after onboarding rather than in the
 * middle of it. Only `users.getOrCreate`'s new-user branch schedules it, so
 * signing in again, on another device, or as someone who signed up before
 * it existed never does. `enqueue` decides at send time, so a deleted
 * account or a channel switched off is recorded there, not here.
 */

const WELCOME_DELAY_MS = 30 * 60_000;

/** Schedule the welcome for a profile created just now. */
export async function scheduleWelcome(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<void> {
	await ctx.scheduler.runAfter(
		WELCOME_DELAY_MS,
		internal.outreach.welcome.sendWelcome,
		{ emotionalProfileId }
	);
}

export const sendWelcome = internalMutation({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, { emotionalProfileId }) => {
		await ctx.runMutation(internal.outreach.enqueue.enqueue, {
			content: { body: welcomeText(), title: WELCOME_SUBJECT },
			dedupeKey: `welcome:${emotionalProfileId}`,
			emotionalProfileId,
			intent: "welcome",
			provenance: { triggerReason: "signed_up" },
		});
		return null;
	},
	returns: v.null(),
});

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

/**
 * One-off, run by hand from the dashboard: welcome the people whose welcome
 * crashed before it was recorded. Until the adapter import cycle was fixed,
 * every `sendWelcome` threw in routing and wrote no outreach row, so its
 * dedupe key is unspent and `sendWelcome` can simply run again.
 *
 * Takes users created at or after `since` (when email was switched on, so
 * nobody from before the welcome existed gets one) and more than the welcome
 * delay ago (anyone newer still has theirs scheduled), with no welcome
 * recorded. `dryRun` (the default) only counts them. A deleted account is
 * left to `enqueue`, which records it as suppressed. Delete once prod has
 * run it.
 */
export const resendMissedWelcomes = internalMutation({
	args: { dryRun: v.optional(v.boolean()), since: v.number() },
	handler: async (ctx, { dryRun = true, since }) => {
		const before = Date.now() - WELCOME_DELAY_MS;
		const users = await ctx.db
			.query("users")
			.withIndex("by_creation_time", (q) =>
				q.gte("_creationTime", since).lt("_creationTime", before)
			)
			.collect();
		const missed = new Set<Id<"emotional_profiles">>();
		let alreadyWelcomed = 0;
		for (const { emotionalProfileId } of users) {
			if (missed.has(emotionalProfileId)) {
				continue;
			}
			const welcome = await ctx.db
				.query("outreach")
				.withIndex("by_dedupe", (q) =>
					q.eq("dedupeKey", `welcome:${emotionalProfileId}`)
				)
				.first();
			if (welcome) {
				alreadyWelcomed += 1;
				continue;
			}
			missed.add(emotionalProfileId);
		}
		if (!dryRun) {
			for (const emotionalProfileId of missed) {
				await ctx.scheduler.runAfter(0, internal.outreach.welcome.sendWelcome, {
					emotionalProfileId,
				});
			}
		}
		return {
			alreadyWelcomed,
			dryRun,
			missed: [...missed],
			usersChecked: users.length,
		};
	},
	returns: v.object({
		alreadyWelcomed: v.number(),
		dryRun: v.boolean(),
		missed: v.array(v.id("emotional_profiles")),
		usersChecked: v.number(),
	}),
});

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

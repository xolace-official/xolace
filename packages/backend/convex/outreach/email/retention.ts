import { v } from "convex/values";
import { components } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

/**
 * How long the Resend component keeps an email, address and all (#917,
 * ADR 0004). Run daily from `crons.ts`, so a finished email stays at most
 * about 8 days. Not hourly: volume is low, so more runs only cost calls.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** A finished email (sent, bounced, cancelled…) goes after this. */
const FINISHED_EMAIL_MS = 7 * DAY_MS;
/** One never finished goes after this; usually a bug, so kept longer. */
const ABANDONED_EMAIL_MS = 28 * DAY_MS;

export const cleanup = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Scheduled, not called: each runs and pages in its own transaction.
		await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
			olderThan: FINISHED_EMAIL_MS,
		});
		await ctx.scheduler.runAfter(
			0,
			components.resend.lib.cleanupAbandonedEmails,
			{ olderThan: ABANDONED_EMAIL_MS }
		);
		return null;
	},
	returns: v.null(),
});

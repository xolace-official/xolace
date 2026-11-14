import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { suppressionFor } from "../outreach/router";

const GENTLE_RETURN_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours
/**
 * Profiles per page. Each candidate is asked `suppressionFor`, about ten
 * index reads; this keeps a page well inside a transaction's read limits.
 */
const PAGE_SIZE = 200;

/**
 * Scan profiles and send gentle_return notifications to users who haven't
 * had a session in 48+ hours. The outreach layer suppresses the dormant
 * (30+ days) and defers through the quiet window.
 *
 * Runs on a cron schedule. Processes in batches to stay within
 * transaction limits.
 */
export const checkGentleReturn = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const gentleReturnCutoff = now - GENTLE_RETURN_WINDOW_MS;

		const {
			page: profiles,
			isDone,
			continueCursor,
		} = await ctx.db
			.query("emotional_profiles")
			.paginate({ cursor: args.cursor ?? null, numItems: PAGE_SIZE });

		for (const profile of profiles) {
			if (!profile.lastSessionAt) {
				continue;
			}
			if (profile.lastSessionAt > gentleReturnCutoff) {
				continue;
			}
			// The layer decides (#764): the toggle, dormancy, escalation and
			// channel are its gates, and it defers through the quiet window.
			// Asked first, so no copy is written for an outreach it would drop.
			if (
				await suppressionFor(
					ctx,
					{ emotionalProfileId: profile._id, intent: "gentle_return" },
					now
				)
			) {
				continue;
			}

			const hoursSince = Math.round(
				(now - profile.lastSessionAt) / (60 * 60 * 1000)
			);

			await ctx.scheduler.runAfter(
				0,
				internal.ai.generateNotification.generate,
				{
					emotionalProfileId: profile._id,
					notificationType: "gentle_return",
					scheduledFor: now,
					triggerReason: `No session in ${hoursSince}h`,
				}
			);
		}

		if (!isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.jobs.notificationTriggers.checkGentleReturn,
				{ cursor: continueCursor }
			);
		}
	},
});

/**
 * Send pattern_nudge notifications to users at their typical usage time.
 * Matches profiles whose typicalUsagePattern aligns with the current
 * day/hour (UTC).
 *
 * Runs hourly on a cron schedule.
 */
export const checkPatternNudge = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const currentDate = new Date(now);
		const currentDay = currentDate.getUTCDay(); // 0-6
		const currentHour = currentDate.getUTCHours(); // 0-23

		const {
			page: profiles,
			isDone,
			continueCursor,
		} = await ctx.db
			.query("emotional_profiles")
			.paginate({ cursor: args.cursor ?? null, numItems: PAGE_SIZE });

		for (const profile of profiles) {
			if (!profile.typicalUsagePattern) {
				continue;
			}
			if (profile.typicalUsagePattern.dayOfWeek !== currentDay) {
				continue;
			}
			if (profile.typicalUsagePattern.hourOfDay !== currentHour) {
				continue;
			}

			if (
				profile.lastSessionAt &&
				now - profile.lastSessionAt < 12 * 60 * 60 * 1000
			) {
				continue;
			}

			// The layer decides; see checkGentleReturn.
			if (
				await suppressionFor(
					ctx,
					{ emotionalProfileId: profile._id, intent: "pattern_nudge" },
					now
				)
			) {
				continue;
			}

			await ctx.scheduler.runAfter(
				0,
				internal.ai.generateNotification.generate,
				{
					emotionalProfileId: profile._id,
					notificationType: "pattern_nudge",
					scheduledFor: now,
					triggerReason: `Pattern match: day=${currentDay} hour=${currentHour}`,
				}
			);
		}

		if (!isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.jobs.notificationTriggers.checkPatternNudge,
				{ cursor: continueCursor }
			);
		}
	},
});

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
	inQuietWindow,
	missedPushAt,
	QUIET_RETRIES,
	QUIET_RETRY_MS,
} from "../lib/missedBeat";
import { type Achievement, findAchievement } from "./catalog";

/**
 * Badge pushes (#681, #700), which replace the streak-milestone push. A badge
 * the unlock moment showed never pushes. One that went unseen gets one
 * missed-beat check per profile the next day in the person's usual hour, and
 * everything still unseen then goes out as one push, at most one a day.
 * Backfill rows never push. Badge names and copy are lock-screen safe (#683);
 * sparks never reach the lock screen.
 */

/** Far more than land between two checks; any past it still show in-app. */
const PUSH_LIMIT = 50;

/**
 * May we push a badge? `achievement` is absent on rows written before it
 * existed, and no Settings toggle writes it yet; absent follows the gentle
 * reminders' `milestone` flag.
 */
export function achievementPushAllowed(
	notifications: Doc<"preferences">["notifications"] | undefined
): boolean {
	if (!notifications?.enabled) {
		return false;
	}
	return notifications.achievement ?? notifications.milestone;
}

/** One badge is named; several are counted. */
function badgePushCopy(badges: Achievement[]): {
	content: string;
	title?: string;
} {
	const [only] = badges;
	if (only && badges.length === 1) {
		return { content: only.copy, title: only.title };
	}
	return { content: `You earned ${badges.length} badges.` };
}

/**
 * Schedule the profile's missed-beat check unless one is already waiting.
 * Called by `awardAchievement` alongside every live insert; `profile` is the
 * row as read before that award.
 */
export async function scheduleMissedBadgeCheck(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">
): Promise<void> {
	if (profile.achievementPushCheck) {
		const check = await ctx.db.system.get(
			"_scheduled_functions",
			profile.achievementPushCheck
		);
		if (check?.state.kind === "pending") {
			return;
		}
	}
	const checkId = await ctx.scheduler.runAt(
		missedPushAt(Date.now(), profile.typicalUsagePattern?.hourOfDay),
		internal.achievements.push.sendMissedPush,
		{ emotionalProfileId: profile._id }
	);
	await ctx.db.patch("emotional_profiles", profile._id, {
		achievementPushCheck: checkId,
	});
}

/**
 * The missed-beat check: every live badge still unseen and unpushed, as one
 * push. Stamps `pushedAt` even when the daily cap suppresses it, so a badge
 * over the cap waits for the unlock sheet rather than a later push.
 */
export const sendMissedPush = internalMutation({
	args: {
		emotionalProfileId: v.id("emotional_profiles"),
		quietRetries: v.optional(v.number()),
	},
	handler: async (ctx, { emotionalProfileId, quietRetries = 0 }) => {
		const rows = await ctx.db
			.query("user_achievements")
			.withIndex(
				"by_emotionalProfileId_and_source_and_seenAt_and_pushedAt",
				(q) =>
					q
						.eq("emotionalProfileId", emotionalProfileId)
						.eq("source", "live")
						.eq("seenAt", undefined)
						.eq("pushedAt", undefined)
			)
			.take(PUSH_LIMIT);
		// Oldest first, so a single badge's copy is the one the user earned first.
		rows.sort((a, b) => a.earnedAt - b.earnedAt);
		const badges = rows.flatMap(
			(row) => findAchievement(row.achievementId) ?? []
		);
		if (badges.length === 0) {
			return null;
		}

		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId)
			)
			.unique();
		const notifications = prefs?.notifications;
		if (!(notifications && achievementPushAllowed(notifications))) {
			return null;
		}
		if (inQuietWindow(notifications)) {
			// Deferred, not dropped: try again once the window opens.
			if (quietRetries < QUIET_RETRIES) {
				const checkId = await ctx.scheduler.runAfter(
					QUIET_RETRY_MS,
					internal.achievements.push.sendMissedPush,
					{ emotionalProfileId, quietRetries: quietRetries + 1 }
				);
				await ctx.db.patch("emotional_profiles", emotionalProfileId, {
					achievementPushCheck: checkId,
				});
			}
			return null;
		}

		const now = Date.now();
		for (const row of rows) {
			await ctx.db.patch("user_achievements", row._id, { pushedAt: now });
		}
		await ctx.scheduler.runAfter(0, internal.notifications.schedule, {
			...badgePushCopy(badges),
			emotionalProfileId,
			scheduledFor: now,
			triggerReason: `Unseen badges: ${badges.map((b) => b.achievementId).join(", ")}`,
			type: "achievement",
		});
		return null;
	},
	returns: v.null(),
});

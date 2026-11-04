import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
	inQuietWindow,
	missedPushAt,
	QUIET_RETRIES,
	QUIET_RETRY_MS,
} from "../lib/missedBeat";
import { isPresent } from "../presence";
import { type Achievement, findAchievement } from "./catalog";

/**
 * Badge pushes (#681, #700), which replace the streak-milestone push. A badge
 * the unlock moment showed never pushes. One that went unseen gets one
 * missed-beat check per profile the next day in the person's usual hour, and
 * everything still unseen then goes out as one push, at most one a day. A
 * badge earned just before the check is left out: its unlock moment may only
 * be held by the session it was earned in, so it gets a check of its own. The
 * push also waits while the user is in the app, where the moment can still
 * show what went unseen. A badge whose own check came and went without a push
 * isn't picked up by a later one; it waits for the moment or the summary.
 * Backfill rows never push. Badge names and copy are lock-screen safe (#683);
 * sparks never reach the lock screen.
 */

/** Far more than land between two checks; any past it still show in-app. */
const PUSH_LIMIT = 50;

/**
 * A check can land moments after an award, because the one waiting was
 * scheduled by an earlier badge. Younger than this, the badge hasn't been
 * missed: the user may still be in the session holding its unlock moment.
 */
const MISSED_AFTER_MS = 3_600_000;

/**
 * Older than this, a badge's own check has come and gone: under an hour to the
 * check that passes it over, up to 36h to its own, then a day of retries. It
 * went unpushed because notifications were off or the retries ran out, and a
 * later badge's push shouldn't announce it days on.
 */
const PUSHABLE_FOR_MS = 3 * 24 * 3_600_000;

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
 * Make this the profile's one waiting check. `retry` carries a held check on:
 * when it first ran, so a badge earned near it stays recent through the retries.
 */
async function armCheck(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	at: number,
	retry?: { checkedAt: number; quietRetries: number }
): Promise<void> {
	const checkId = await ctx.scheduler.runAt(
		at,
		internal.achievements.push.sendMissedPush,
		{ emotionalProfileId, ...retry }
	);
	await ctx.db.patch("emotional_profiles", emotionalProfileId, {
		achievementPushCheck: checkId,
	});
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
	await armCheck(
		ctx,
		profile._id,
		missedPushAt(Date.now(), profile.typicalUsagePattern?.hourOfDay)
	);
}

/**
 * The missed-beat check: every live badge still unseen and unpushed, as one
 * push, except those earned too recently to call missed, which wait for a
 * check the next day, and those past `PUSHABLE_FOR_MS`. Holds off through the
 * quiet window and while the user is in the app; "too recently" stays measured
 * from the check's first run, so a retry an hour on doesn't push a badge earned
 * just before it, and one earned during the retries still gets its own next-day
 * check when they end. Stamps `pushedAt` even when
 * the daily cap suppresses it, so a badge over the cap waits for the unlock
 * sheet rather than a later push.
 */
export const sendMissedPush = internalMutation({
	args: {
		/** When a held check first ran; absent on its first run. */
		checkedAt: v.optional(v.number()),
		emotionalProfileId: v.id("emotional_profiles"),
		quietRetries: v.optional(v.number()),
	},
	handler: async (ctx, { checkedAt, emotionalProfileId, quietRetries = 0 }) => {
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
		const now = Date.now();
		const firstRun = checkedAt ?? now;
		const missed = rows
			.filter(
				(row) =>
					row.earnedAt <= firstRun - MISSED_AFTER_MS &&
					row.earnedAt > now - PUSHABLE_FOR_MS
			)
			// Oldest first, so a single badge's copy is the one the user earned first.
			.sort((a, b) => a.earnedAt - b.earnedAt);
		const hasRecent = rows.some(
			(row) => row.earnedAt > firstRun - MISSED_AFTER_MS
		);
		const badges = missed.flatMap(
			(row) => findAchievement(row.achievementId) ?? []
		);
		if (badges.length === 0 && !hasRecent) {
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
		const held =
			badges.length > 0 &&
			(inQuietWindow(notifications) ||
				(await isPresent(ctx, emotionalProfileId)));
		if (held && quietRetries < QUIET_RETRIES) {
			// Deferred, not dropped: try again once the window opens or they've left.
			await armCheck(ctx, emotionalProfileId, now + QUIET_RETRY_MS, {
				checkedAt: firstRun,
				quietRetries: quietRetries + 1,
			});
			return null;
		}

		if (hasRecent) {
			// Directly: this check is ending, so there's no other for them to wait on.
			const profile = await ctx.db.get(
				"emotional_profiles",
				emotionalProfileId
			);
			await armCheck(
				ctx,
				emotionalProfileId,
				missedPushAt(now, profile?.typicalUsagePattern?.hourOfDay)
			);
		}
		if (held || badges.length === 0) {
			return null;
		}

		for (const row of missed) {
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

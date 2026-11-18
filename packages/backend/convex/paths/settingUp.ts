import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { rateLimiter } from "../lib/rateLimits";
import { type Understanding, understandingOf } from "../understanding";

/**
 * "Setting up" for Today's kindling card (B13; handoff kindling.md §11.1): a
 * kindling is being made for this member, and from which session.
 *
 * Kindling generation leaves nothing behind until it succeeds: a `paths` row
 * lands only from `generateDb.write`. Every other outcome (no Understanding
 * worth one, the day's slot spent, too few twigs, a provider error) is silent.
 * So the session carries `kindlingSettingUpAt` while its run is in flight:
 *
 * - **Set** by `queueKindling`, the one place generation is queued, only when
 *   the run is going to try: a Plus member, a qualifying Understanding and the
 *   day's slot still open. Those are `generate.run`'s own gates, so a second
 *   qualifying session on the same day never flashes "setting up". The mark
 *   is best-effort: if checking for it throws, session completion goes on
 *   without one.
 * - **Cleared** on every outcome: by `generateDb.write` in the transaction
 *   that inserts the kindling (so `getActive` and `get` flip together), by
 *   `generate.run` on any exit that made none, and by a backstop scheduled
 *   `SETTING_UP_MAX_MS` after the set, in case the run dies.
 *
 * Each clear names the session and the value it set, and removes the field
 * only while it still holds that value: a late clear from an earlier queueing
 * never wipes a newer one.
 */

const MINUTE_MS = 60_000;

/**
 * Convex stops any action at 10 minutes, so by then `generate.run` has ended
 * one way or another. A normal run takes seconds: one Haiku call capped at
 * 512 output tokens, at most one embedding, and indexed reads. The extra
 * minute covers the scheduler starting the run late under load.
 */
const ACTION_LIMIT_MS = 10 * MINUTE_MS;
const SCHEDULER_SLACK_MS = MINUTE_MS;

/** How long a session can show "setting up" if its run never reports back. */
export const SETTING_UP_MAX_MS = ACTION_LIMIT_MS + SCHEDULER_SLACK_MS;

/**
 * The session's `supportNeed` is light or active: the trigger moment
 * `generate.run` gates on (docs/paths-v1.md §1). Absent or none never
 * qualifies, so a session classified before the field existed doesn't either.
 */
export const qualifiesForKindling = (understanding: Understanding | null) =>
	understanding?.supportNeed === "light" ||
	understanding?.supportNeed === "active";

/**
 * The rate limiter's key for a profile's one kindling a day (`pathsGenerate`):
 * consumed by `generateDb.write`, checked by `kindlingSlotOpen`.
 */
export const kindlingSlot = (profileId: Id<"emotional_profiles">) => ({
	key: profileId,
});

/**
 * Whether today's kindling slot is still free. Read-only: only a kindling that
 * actually lands spends it. `generate.run` checks it before the model call and
 * `queueKindling` before saying "setting up", so the two never disagree.
 */
export async function kindlingSlotOpen(
	ctx: Parameters<typeof rateLimiter.check>[0],
	profileId: Id<"emotional_profiles">
): Promise<boolean> {
	return (
		await rateLimiter.check(ctx, "pathsGenerate", kindlingSlot(profileId))
	).ok;
}

/**
 * Queue kindling generation for a session (every caller goes through here),
 * and mark the session as setting up when the run is going to try. The run
 * itself is queued exactly as before, whatever the mark: the gates still live
 * in `generate.run`, and a free member's run is still a silent no-op.
 */
export async function queueKindling(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	sessionId: Id<"sessions">
): Promise<void> {
	const settingUpAt = await markSettingUp(ctx, profileId, sessionId);
	await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
		emotionalProfileId: profileId,
		sessionId,
		...(settingUpAt === undefined ? {} : { settingUpAt }),
	});
}

/**
 * Mark the session as setting up if the run will try; the mark's value, or
 * undefined without one. Best-effort: it runs inside session completion, and
 * a hint for Today's card must never fail that. Any throw (the entitlement or
 * the rate limiter unavailable, say) leaves no mark and the run is queued
 * as before. The backstop goes on the scheduler before the patch, so if the
 * patch is what throws, nothing is left without one.
 */
async function markSettingUp(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	sessionId: Id<"sessions">
): Promise<number | undefined> {
	try {
		if (!(await willTry(ctx, profileId, sessionId))) {
			return undefined;
		}
		const settingUpAt = Date.now();
		await ctx.scheduler.runAfter(
			SETTING_UP_MAX_MS,
			internal.paths.settingUp.clear,
			{ sessionId, settingUpAt }
		);
		await ctx.db.patch("sessions", sessionId, {
			kindlingSettingUpAt: settingUpAt,
		});
		return settingUpAt;
	} catch (error) {
		console.error("kindling: setting-up mark skipped", {
			message: error instanceof Error ? error.message : String(error),
			sessionId,
		});
		return undefined;
	}
}

/** `generate.run`'s gates, cheapest first; the run checks them again itself. */
async function willTry(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	sessionId: Id<"sessions">
): Promise<boolean> {
	if (!qualifiesForKindling(await understandingOf(ctx, sessionId))) {
		return false;
	}
	const profile = await ctx.db.get("emotional_profiles", profileId);
	if (!(profile && (await hasPremium(ctx, profile)))) {
		return false;
	}
	return await kindlingSlotOpen(ctx, profileId);
}

/**
 * End this session's "setting up", if it is still the one `settingUpAt`
 * started. Removes the field (so the index's `.gt(0)` skips the row) and
 * never touches another session.
 */
export async function clearSettingUp(
	ctx: MutationCtx,
	sessionId: Id<"sessions">,
	settingUpAt: number
): Promise<void> {
	const session = await ctx.db.get("sessions", sessionId);
	if (session?.kindlingSettingUpAt !== settingUpAt) {
		return;
	}
	await ctx.db.patch("sessions", sessionId, {
		kindlingSettingUpAt: undefined,
	});
}

/** `clearSettingUp` for `generate.run`'s exits that made no kindling, and the backstop. */
export const clear = internalMutation({
	args: { sessionId: v.id("sessions"), settingUpAt: v.number() },
	handler: async (ctx, args) => {
		await clearSettingUp(ctx, args.sessionId, args.settingUpAt);
		return null;
	},
	returns: v.null(),
});

/**
 * Whether a kindling is being set up for you right now, and from which
 * session; null when none is. Today's card shows "setting up" while this
 * returns a session, and nothing else decides it: no client timer. A live
 * kindling always wins, so this is null whenever `paths.getActive` has one,
 * and Plus-gated like it, so the two can never disagree.
 *
 * Three reads at most, all bounded: the entitlement, the one active kindling,
 * and the newest flagged session on its own index.
 */
export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		if (!(await hasPremium(ctx, profile))) {
			return null;
		}
		const live = await ctx.db
			.query("paths")
			.withIndex("by_profile_and_status", (q) =>
				q.eq("emotionalProfileId", profile._id).eq("status", "active")
			)
			.first();
		if (live) {
			return null;
		}
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_emotionalProfileId_and_kindlingSettingUpAt", (q) =>
				q.eq("emotionalProfileId", profile._id).gt("kindlingSettingUpAt", 0)
			)
			.order("desc")
			.first();
		if (session?.kindlingSettingUpAt === undefined) {
			return null;
		}
		return { sessionId: session._id, startedAt: session.kindlingSettingUpAt };
	},
	returns: v.union(
		v.null(),
		v.object({
			sessionId: v.id("sessions"),
			/** When generation was queued; display only. */
			startedAt: v.number(),
		})
	),
});

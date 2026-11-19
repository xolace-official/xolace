import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { purgeLettersPastCutoff } from "../letters/retention";
import { purgeSessions } from "../lib/sessionCascade";
import {
	RETENTION_TIERS,
	type RetentionTier,
	retentionCutoff,
	sessionsBefore,
} from "../privacy/retentionCutoff";

const tierValidator = v.union(v.literal("6_months"), v.literal("1_year"));

const BATCH_SIZE = 50;
const PREFS_PAGE_SIZE = 100;

function nextTier(tier: RetentionTier): RetentionTier | null {
	const idx = RETENTION_TIERS.indexOf(tier);
	return idx >= 0 && idx < RETENTION_TIERS.length - 1
		? RETENTION_TIERS[idx + 1]
		: null;
}

/**
 * One bounded pass of everything retention deletes for one profile, at
 * `cutoff`: sessions (with their cascade), old semantic-profile versions,
 * closed stretches, steadiness insights, feedback and letters. At most
 * `BATCH_SIZE` rows of each (letters: their own batch).
 *
 * Shared by this job and the purge Settings runs when someone shortens
 * retention (`privacy/retention.applyRetentionNow`), so the two can't drift.
 *
 * @returns `moreSessions`: the session batch was full, so sessions may
 * remain. `more`: any sweep was full, so another pass may delete more.
 */
export async function purgeProfilePastCutoff(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	cutoff: number
): Promise<{ more: boolean; moreSessions: boolean }> {
	const oldSessions = await sessionsBefore(
		ctx.db,
		emotionalProfileId,
		cutoff
	).take(BATCH_SIZE);

	await purgeSessions(ctx, emotionalProfileId, oldSessions);
	if (oldSessions.length > 0) {
		await ctx.scheduler.runAfter(
			0,
			internal.compounding.unlocks.dropColdUnlocks,
			{
				profileId: emotionalProfileId,
			}
		);
	}

	// Sweep old semantic profile VERSIONS past the cutoff. The current
	// version is always kept — retention shortens history, it doesn't
	// lobotomize the live profile. Full deletion happens in dataWipe.
	const profileRow = await ctx.db.get("emotional_profiles", emotionalProfileId);
	const oldProfileVersions = await ctx.db
		.query("semantic_profiles")
		.withIndex("by_profile_version", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.take(BATCH_SIZE);
	let deletedVersions = 0;
	for (const version of oldProfileVersions) {
		if (
			version.createdAt < cutoff &&
			version._id !== profileRow?.currentSemanticProfileId
		) {
			await ctx.db.delete("semantic_profiles", version._id);
			deletedVersions += 1;
		}
	}

	// Closed compounding stretches that ended before the cutoff. The lower
	// bound skips open rows (endedAt absent sorts first): retention never
	// ends a stretch, and an open one keeps its stored anchor (ADR 0020).
	const oldStretches = await ctx.db
		.query("compounding_stretches")
		.withIndex("by_emotionalProfileId_and_endedAt", (q) =>
			q
				.eq("emotionalProfileId", emotionalProfileId)
				.gte("endedAt", 0)
				.lt("endedAt", cutoff)
		)
		.take(BATCH_SIZE);
	for (const stretch of oldStretches) {
		await ctx.db.delete("compounding_stretches", stretch._id);
	}

	// Steadiness insights citing a session past the cutoff go with it (#525).
	const oldInsights = await ctx.db
		.query("steadiness_insights")
		.withIndex("by_emotionalProfileId_and_oldestCitedAt", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).lt("oldestCitedAt", cutoff)
		)
		.take(BATCH_SIZE);
	for (const insight of oldInsights) {
		await ctx.db.delete("steadiness_insights", insight._id);
	}

	// Delete feedback records for this profile older than the retention cutoff
	const feedbackRecords = await ctx.db
		.query("feedback")
		.withIndex("by_profile_and_created", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).lt("createdAt", cutoff)
		)
		.take(BATCH_SIZE);
	for (const record of feedbackRecords) {
		await ctx.db.delete("feedback", record._id);
	}

	// Letters: what they sent and what they received, each side on its own.
	const moreLetters = await purgeLettersPastCutoff(
		ctx,
		emotionalProfileId,
		cutoff,
		Date.now()
	);

	const moreSessions = oldSessions.length === BATCH_SIZE;
	return {
		// Versions are read oldest first, so a batch with any kept version
		// (current, or inside the cutoff) has nothing past the cutoff after it.
		more:
			moreSessions ||
			deletedVersions === BATCH_SIZE ||
			oldStretches.length === BATCH_SIZE ||
			oldInsights.length === BATCH_SIZE ||
			feedbackRecords.length === BATCH_SIZE ||
			moreLetters,
		moreSessions,
	};
}

/**
 * Purge session data older than the user's retention preference.
 * Processes one retention tier per invocation (Convex allows only one
 * paginated query per mutation) and self-reschedules to continue.
 */
export const enforce = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
		sessionWorkPending: v.optional(v.boolean()),
		tier: v.optional(tierValidator),
	},
	handler: async (ctx, args) => {
		const tier: RetentionTier = args.tier ?? RETENTION_TIERS[0];
		const cursor = args.cursor ?? null;
		const priorPending = args.sessionWorkPending ?? false;

		const {
			page: prefs,
			isDone,
			continueCursor,
		} = await ctx.db
			.query("preferences")
			.withIndex("by_retention", (q) => q.eq("dataRetentionPreference", tier))
			.paginate({ cursor, numItems: PREFS_PAGE_SIZE });

		// Shared with privacy/retention's count and confirmed purge.
		const cutoff = retentionCutoff(tier, Date.now());
		let moreSessionWork = priorPending;

		for (const pref of prefs) {
			const { moreSessions } = await purgeProfilePastCutoff(
				ctx,
				pref.emotionalProfileId,
				cutoff
			);
			if (moreSessions) {
				moreSessionWork = true;
			}
		}

		if (!isDone) {
			await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
				cursor: continueCursor,
				sessionWorkPending: moreSessionWork,
				tier,
			});
			return;
		}

		if (moreSessionWork) {
			// Restart this tier's pref scan on the next run so stalled deletions resume.
			await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
				cursor: null,
				tier,
			});
			return;
		}

		const next = nextTier(tier);
		if (next) {
			await ctx.scheduler.runAfter(0, internal.jobs.dataRetention.enforce, {
				cursor: null,
				tier: next,
			});
		}
	},
});

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { rankDelete } from "../lib/aggregates";
import { deleteConversationRow } from "../lib/conversationErasure";
import {
	deletePushDevice,
	profilePushDevices,
	pushNotifications,
} from "../lib/pushNotifications";

export const BATCH_SIZE = 100;

type ProfileId = Id<"emotional_profiles">;

/** Returns true when this step's batch was full (caller should reschedule). */
export type DrainStep = (
	ctx: MutationCtx,
	profileId: ProfileId
) => Promise<boolean>;

/**
 * Both sides of every xolacer_conversations pair. Stream-side message
 * content is removed by the purgeStreamUser action in the final batch.
 */
export const drainConversations: DrainStep = async (ctx, profileId) => {
	// A conversation whose verdicts overflowed one batch stays for the next pass.
	let deferred = false;
	const asUser = await ctx.db
		.query("xolacer_conversations")
		.withIndex("by_user_and_status", (q) => q.eq("userProfileId", profileId))
		.take(BATCH_SIZE);
	for (const conversation of asUser) {
		if (!(await deleteConversationRow(ctx, conversation._id))) {
			deferred = true;
		}
	}

	const asXolacer = await ctx.db
		.query("xolacer_conversations")
		.withIndex("by_xolacer_and_status", (q) =>
			q.eq("xolacerProfileId", profileId)
		)
		.take(BATCH_SIZE);
	for (const conversation of asXolacer) {
		if (!(await deleteConversationRow(ctx, conversation._id))) {
			deferred = true;
		}
	}

	return (
		deferred || asUser.length === BATCH_SIZE || asXolacer.length === BATCH_SIZE
	);
};

/**
 * Ratings this user gave. The xolacer's denormalized counters have to come
 * down with the row, or a deleted account keeps voting.
 */
export const drainRatingsGiven: DrainStep = async (ctx, profileId) => {
	const ratings = await ctx.db
		.query("conversation_ratings")
		.withIndex("by_rater", (q) => q.eq("raterProfileId", profileId))
		.take(BATCH_SIZE);
	for (const rating of ratings) {
		const rated = await ctx.db
			.query("xolacer_profiles")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", rating.xolacerProfileId)
			)
			.unique();
		if (rated) {
			await ctx.db.patch("xolacer_profiles", rated._id, {
				ratingCount: Math.max(0, (rated.ratingCount ?? 0) - 1),
				ratingSum: Math.max(0, (rated.ratingSum ?? 0) - rating.rating),
				updatedAt: Date.now(),
			});
		}
		await ctx.db.delete("conversation_ratings", rating._id);
	}
	return ratings.length === BATCH_SIZE;
};

/**
 * Ratings this user received as a xolacer. No counter fixup: the
 * xolacer_profiles row they point at is deleted in the final batch.
 */
export const drainRatingsReceived: DrainStep = async (ctx, profileId) => {
	const ratings = await ctx.db
		.query("conversation_ratings")
		.withIndex("by_xolacer", (q) => q.eq("xolacerProfileId", profileId))
		.take(BATCH_SIZE);
	for (const rating of ratings) {
		await ctx.db.delete("conversation_ratings", rating._id);
	}
	return ratings.length === BATCH_SIZE;
};

export const drainSemanticVersions: DrainStep = async (ctx, profileId) => {
	const versions = await ctx.db
		.query("semantic_profiles")
		.withIndex("by_profile_version", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(BATCH_SIZE);
	for (const version of versions) {
		await ctx.db.delete("semantic_profiles", version._id);
	}
	return versions.length === BATCH_SIZE;
};

/**
 * One push device per pass — not bounded like the rest of the batches,
 * because `deletePushDevice` also clears the component's stored notification
 * bodies for that device, up to 1000 row deletes on its own. One device per
 * pass keeps that inside one transaction.
 */
export const drainPushDevices: DrainStep = async (ctx, profileId) => {
	const devices = await profilePushDevices(ctx, profileId);
	if (devices[0]) {
		await deletePushDevice(ctx, devices[0]._id);
	}
	return devices.length > 1;
};

/**
 * Everything that happens exactly once, after every drain step above came
 * back under its batch size. Deletes the profile and user rows last.
 */
export async function finalizePurge(
	ctx: MutationCtx,
	profileId: ProfileId,
	userId: Id<"users">
): Promise<void> {
	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
	if (preferences) {
		await ctx.db.delete("preferences", preferences._id);
	}

	// Intake answers — one row per profile, so no drain step needed.
	const intake = await ctx.db
		.query("intake_responses")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
	if (intake) {
		await ctx.db.delete("intake_responses", intake._id);
	}

	// A deleted user must never receive a follow-up nudge. Scheduled because
	// it cancels component workflows and is independently bounded.
	await ctx.scheduler.runAfter(0, internal.followUps.purgeForProfile, {
		emotionalProfileId: profileId,
	});

	const xolacerProfile = await ctx.db
		.query("xolacer_profiles")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
	if (xolacerProfile) {
		await ctx.db.delete("xolacer_profiles", xolacerProfile._id);
		// Their bio leaves the meaning index too (#570): no row → removed.
		await ctx.scheduler.runAfter(0, internal.ai.xolacers.embed.indexXolacer, {
			emotionalProfileId: profileId,
		});
	}

	// Stream-hosted chat content is external — the row deletes above don't
	// reach it. Fail-open action: logs and continues on Stream outage so a
	// third party can never block a deletion request.
	await ctx.scheduler.runAfter(0, internal.xolacerChat.purgeStreamUser, {
		profileId,
	});

	// Every device is gone by now (drained above, one per pass). What is left
	// is the pre-migration profile-keyed recipient, for anyone who never
	// re-registered — deleting the profile row does not reach it.
	await pushNotifications.removeToken(ctx, { userId: profileId });

	// Must run before the row is gone — the aggregate needs the doc to locate
	// its key. Skipping this leaves a phantom in the percentile denominator.
	await rankDelete(ctx, profileId);

	await ctx.db.delete("emotional_profiles", profileId);
	await ctx.db.delete("users", userId);
}

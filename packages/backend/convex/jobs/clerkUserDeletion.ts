import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { deleteClerkUser } from "../integrations/clerk";

/**
 * The last step of account deletion: removing the person from Clerk, where
 * their email, name and linked sign-ins live.
 *
 * The purge deletes the `users` row, so a queue row written in that same
 * transaction is the only remaining record of who to delete. It stays until
 * Clerk confirms, with no give-up: an outage or a missing key delays the
 * deletion, and never loses it.
 */

// Long enough that the sweep leaves a just-queued row to its first attempt.
const RETRY_AFTER_MS = 30 * 60 * 1000;
const SWEEP_BATCH = 100;

/**
 * The Clerk user id from `iss|sub`. Not `users.authProviderAccountId`: rows
 * from before that field was server-set can hold a client placeholder.
 */
function clerkUserIdOf(tokenIdentifier: string): string | null {
	const subject = tokenIdentifier.slice(tokenIdentifier.lastIndexOf("|") + 1);
	return subject.startsWith("user_") ? subject : null;
}

/** Call from the transaction that deletes the `users` row. */
export async function queueClerkUserDeletion(
	ctx: MutationCtx,
	tokenIdentifier: string
): Promise<void> {
	const deletionId = await ctx.db.insert("clerk_user_deletions", {
		lastAttemptAt: Date.now(),
		tokenIdentifier,
	});
	await ctx.scheduler.runAfter(0, internal.jobs.clerkUserDeletion.attempt, {
		deletionId,
	});
}

export const getPending = internalQuery({
	args: { deletionId: v.id("clerk_user_deletions") },
	handler: async (ctx, { deletionId }) => {
		const pending = await ctx.db.get("clerk_user_deletions", deletionId);
		if (!pending) {
			return null;
		}
		const { tokenIdentifier } = pending;
		const account = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
			.first();
		return { hasAccount: account !== null, tokenIdentifier };
	},
	returns: v.union(
		v.null(),
		v.object({ hasAccount: v.boolean(), tokenIdentifier: v.string() })
	),
});

export const settle = internalMutation({
	args: { deletionId: v.id("clerk_user_deletions") },
	handler: async (ctx, { deletionId }) => {
		if (await ctx.db.get("clerk_user_deletions", deletionId)) {
			await ctx.db.delete("clerk_user_deletions", deletionId);
		}
		return null;
	},
	returns: v.null(),
});

export const attempt = internalAction({
	args: { deletionId: v.id("clerk_user_deletions") },
	handler: async (ctx, { deletionId }) => {
		const pending = await ctx.runQuery(
			internal.jobs.clerkUserDeletion.getPending,
			{ deletionId }
		);
		if (!pending) {
			return null;
		}
		// They signed in again while this waited, which made a new account on the
		// same Clerk user. Deleting it would lock them out of that account; if
		// they delete that one too, its purge queues its own row.
		if (pending.hasAccount) {
			await ctx.runMutation(internal.jobs.clerkUserDeletion.settle, {
				deletionId,
			});
			return null;
		}
		const clerkUserId = clerkUserIdOf(pending.tokenIdentifier);
		if (!clerkUserId) {
			console.error(`[clerk] not a Clerk user id, dropping ${deletionId}`);
		}
		if (!clerkUserId || (await deleteClerkUser(clerkUserId))) {
			await ctx.runMutation(internal.jobs.clerkUserDeletion.settle, {
				deletionId,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Cron: retry what hasn't been confirmed, least recently tried first, so rows
 * that keep failing can't crowd out newer ones.
 */
export const sweep = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const due = await ctx.db
			.query("clerk_user_deletions")
			.withIndex("by_last_attempt", (q) =>
				q.lt("lastAttemptAt", now - RETRY_AFTER_MS)
			)
			.take(SWEEP_BATCH);
		for (const pending of due) {
			await ctx.db.patch("clerk_user_deletions", pending._id, {
				lastAttemptAt: now,
			});
			await ctx.scheduler.runAfter(0, internal.jobs.clerkUserDeletion.attempt, {
				deletionId: pending._id,
			});
		}
		return null;
	},
	returns: v.null(),
});

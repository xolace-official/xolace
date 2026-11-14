import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	type ActionCtx,
	internalAction,
	type MutationCtx,
} from "../../_generated/server";
import {
	botApi,
	FORBIDDEN,
	SECOND_MS,
	TelegramApiError,
	TOO_MANY_REQUESTS,
} from "./botApi";
import { collapse, openCheckInsOf, retire } from "./checkIn";
import { DELETABLE_FOR_MS, identitiesOf, isLive } from "./lifecycle";
import { sendLines } from "./lines";

/**
 * Clearing a user's Telegram chats (#773), the first step of both account
 * deletion and a data wipe: every message the bot sent in the last 48 h is
 * deleted (Telegram allows no older), any live check-in older than that
 * collapses to its neutral line, and, on deletion only, a linked chat gets
 * one last note saying so. The person's own messages stay: a bot may not
 * delete them. Decided in the job's mutation, sent by `eraseChats` after it
 * commits.
 */

/** Telegram's limit on ids per `deleteMessages` call. */
const DELETE_BATCH = 100;
/** Tries at a batch Telegram failed for a passing reason (5xx, network). */
const TRANSIENT_ATTEMPTS = 3;
/** The wait before the next try, times the tries so far. */
const TRANSIENT_BACKOFF_MS = 2 * SECOND_MS;
/** Telegram's own server errors start here. */
const SERVER_ERROR = 500;

const chatValidator = v.object({
	chatId: v.string(),
	messageIds: v.array(v.string()),
	/** Send the account-deleted note once the messages are gone. */
	note: v.boolean(),
});
type Chat = Infer<typeof chatValidator>;

/** What deletion or a wipe does to one chat's row. */
function cleared(
	identity: Doc<"channel_identities">,
	accountDeleted: boolean
): Partial<Doc<"channel_identities">> {
	const history = {
		awaitingReflection: undefined,
		// A reply already being written may not send or keep what was cleared.
		historyClearedAt: Date.now(),
		pendingBurst: undefined,
		recentTurns: undefined,
		sentMessages: undefined,
	};
	// Deletion ends the link here, so nothing more is sent or answered while
	// the drain runs. No consent row: the drain deletes them all next.
	return accountDeleted && isLive(identity)
		? {
				...history,
				revokedAt: Date.now(),
				revokedReason: "account_deleted",
				status: "revoked",
			}
		: history;
}

/**
 * Clear every Telegram chat of this profile's, live or revoked, and schedule
 * the deletes. Safe to run on every batch of a job: a cleared chat has
 * nothing left to delete, collapse or say.
 */
export async function eraseTelegramChats(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	{ accountDeleted }: { accountDeleted: boolean }
): Promise<void> {
	const cutoff = Date.now() - DELETABLE_FOR_MS;
	const chats: Chat[] = [];
	for (const identity of await identitiesOf(
		ctx,
		emotionalProfileId,
		"telegram"
	)) {
		const chatId = identity.externalId;
		const messageIds = (identity.sentMessages ?? [])
			.filter((m) => m.at > cutoff)
			.map((m) => m.id);
		const deleting = new Set(messageIds);
		const open = await openCheckInsOf(ctx, chatId);
		const isDeleted = (d: Doc<"outreach_deliveries">) =>
			d.providerMessageId !== undefined && deleting.has(d.providerMessageId);
		// A check-in about to be deleted needs no edit, only to stop being live.
		await retire(ctx, open.filter(isDeleted));
		await collapse(
			ctx,
			open.filter((d) => !isDeleted(d))
		);
		const note = accountDeleted && isLive(identity);
		await ctx.db.patch(
			"channel_identities",
			identity._id,
			cleared(identity, accountDeleted)
		);
		if (messageIds.length > 0 || note) {
			chats.push({ chatId, messageIds, note });
		}
	}
	if (chats.length > 0) {
		await ctx.scheduler.runAfter(
			0,
			internal.outreach.telegram.erase.eraseChats,
			{
				chats,
			}
		);
	}
}

type Outcome =
	| "done"
	| "gone"
	/** Wait, then go on from `left`; `transient` counts against the tries. */
	| { retryAfterMs: number; transient: boolean };

/** A failure that may pass: Telegram's own server error, or no answer. */
const isTransient = (error: unknown) =>
	!(error instanceof TelegramApiError) ||
	error.errorCode === undefined ||
	error.errorCode >= SERVER_ERROR;

/**
 * Delete one chat's messages, a batch per call. A batch that failed for a
 * passing reason is kept for another try while `canRetry`.
 */
async function deleteFrom(
	chat: Chat,
	canRetry: boolean
): Promise<{
	left: string[];
	outcome: Outcome;
}> {
	let left = chat.messageIds;
	while (left.length > 0) {
		const batch = left.slice(0, DELETE_BATCH);
		try {
			await botApi.deleteMessages({
				chat_id: chat.chatId,
				message_ids: batch.map(Number),
			});
		} catch (error) {
			if (error instanceof TelegramApiError) {
				if (error.errorCode === TOO_MANY_REQUESTS) {
					return {
						left,
						outcome: {
							retryAfterMs: (error.retryAfter ?? 1) * SECOND_MS,
							transient: false,
						},
					};
				}
				// Blocked, or the chat is gone: nothing here to delete or tell.
				if (error.errorCode === FORBIDDEN) {
					return { left: [], outcome: "gone" };
				}
			}
			if (canRetry && isTransient(error)) {
				return {
					left,
					outcome: { retryAfterMs: TRANSIENT_BACKOFF_MS, transient: true },
				};
			}
			// Too old or already gone: Telegram skips what it can't delete, so
			// anything else (or a passing failure out of tries) is logged and the
			// next batch still goes.
			console.error("Telegram deleteMessages failed", error);
		}
		left = left.slice(DELETE_BATCH);
	}
	return { left, outcome: "done" };
}

async function erase(
	ctx: ActionCtx,
	chats: readonly Chat[],
	attempt: number
): Promise<void> {
	for (const [index, chat] of chats.entries()) {
		const { left, outcome } = await deleteFrom(
			chat,
			attempt < TRANSIENT_ATTEMPTS
		);
		if (typeof outcome === "object") {
			// A passing failure counts against the tries; a rate limit doesn't.
			const next = outcome.transient ? attempt + 1 : attempt;
			await ctx.scheduler.runAfter(
				outcome.retryAfterMs * (outcome.transient ? attempt : 1),
				internal.outreach.telegram.erase.eraseChats,
				{
					attempt: next,
					chats: [{ ...chat, messageIds: left }, ...chats.slice(index + 1)],
				}
			);
			return;
		}
		// Last, so no delete can take the note with it.
		if (chat.note && outcome === "done") {
			await sendLines(ctx, [{ chatId: chat.chatId, kind: "account_deleted" }]);
		}
	}
}

export const eraseChats = internalAction({
	args: {
		/** Tries so far at a batch that failed for a passing reason; 1 first. */
		attempt: v.optional(v.number()),
		chats: v.array(chatValidator),
	},
	handler: async (ctx, { attempt, chats }) => {
		await erase(ctx, chats, attempt ?? 1);
		return null;
	},
	returns: v.null(),
});

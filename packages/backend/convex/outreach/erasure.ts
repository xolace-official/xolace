import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { eraseTelegramChats } from "./telegram/erase";

/**
 * What account deletion and a data wipe do to outreach (#773). Each drain
 * removes one bounded batch and says whether it was full, the shape the jobs
 * in `convex/jobs` call every step in. Deletion: `eraseForDeletion` first,
 * then every drain. A wipe keeps the link and its consent: `eraseForWipe`,
 * `drainOutreach`, `drainInbound` and `drainUnusedLinkTokens`.
 */

type ProfileId = Id<"emotional_profiles">;

const BATCH = 100;
/**
 * Chats a wipe reaches in one pass. A wipe keeps the rows, so it can't page
 * by deleting them; this is far above what one account links in 30 days.
 */
const MAX_WIPED_CHATS = 1000;
/** Updates one pass deletes at most, across chats, to stay within a transaction. */
const DELETES_PER_PASS = 500;

/** Delete our recent chat messages, collapse the rest, say a last goodbye. */
export async function eraseForDeletion(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	await eraseTelegramChats(ctx, profileId, { accountDeleted: true });
	return false;
}

/** The same deletes and collapse, with no note and the link kept. */
export async function eraseForWipe(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<void> {
	await eraseTelegramChats(ctx, profileId, { accountDeleted: false });
}

/** Every outreach row, with its deliveries. */
export async function drainOutreach(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const rows = await ctx.db
		.query("outreach")
		.withIndex("by_profile_created", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(BATCH);
	let more = rows.length === BATCH;
	for (const row of rows) {
		const deliveries = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", row._id))
			.take(BATCH);
		for (const delivery of deliveries) {
			await ctx.db.delete("outreach_deliveries", delivery._id);
		}
		if (deliveries.length === BATCH) {
			// Its deliveries come first; the row waits for the next batch.
			more = true;
		} else {
			await ctx.db.delete("outreach", row._id);
		}
	}
	return more;
}

/**
 * Each linked chat's inbound updates; with `andLinks`, the chat's row too,
 * once its updates are gone (the row is how they're found).
 */
async function drainChats(
	ctx: MutationCtx,
	profileId: ProfileId,
	andLinks: boolean
): Promise<boolean> {
	// Deletion removes each row once its updates are gone, so the next pass
	// starts past it. A wipe keeps the rows: it reads them all every pass,
	// and is done once no chat has updates left.
	const identities = await ctx.db
		.query("channel_identities")
		.withIndex("by_profile_channel", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(andLinks ? BATCH : MAX_WIPED_CHATS);
	if (!andLinks && identities.length === MAX_WIPED_CHATS) {
		// Never seen in practice: past this, a wipe leaves later chats' updates.
		console.error(`[erasure] wipe reached its ${MAX_WIPED_CHATS}-chat limit`);
	}
	let more = andLinks && identities.length === BATCH;
	let budget = DELETES_PER_PASS;
	for (const identity of identities) {
		if (budget === 0) {
			// The rest wait for the next pass; deleted updates aren't read again.
			return true;
		}
		const take = Math.min(BATCH, budget);
		const events = await ctx.db
			.query("inbound_events")
			.withIndex("by_channel_external", (q) =>
				q.eq("channel", identity.channel).eq("externalId", identity.externalId)
			)
			.take(take);
		for (const event of events) {
			await ctx.db.delete("inbound_events", event._id);
		}
		budget -= events.length;
		if (events.length === take) {
			more = true;
		} else if (andLinks) {
			await ctx.db.delete("channel_identities", identity._id);
		}
	}
	return more;
}

/** Account deletion: every linked chat's row and its inbound updates. */
export const drainChannelIdentities = (
	ctx: MutationCtx,
	profileId: ProfileId
) => drainChats(ctx, profileId, true);

/** A wipe: the inbound updates of every chat, the chats kept. */
export const drainInbound = (ctx: MutationCtx, profileId: ProfileId) =>
	drainChats(ctx, profileId, false);

/** Account deletion: every link token, used or not. */
export async function drainLinkTokens(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const tokens = await ctx.db
		.query("channel_link_tokens")
		.withIndex("by_profile_channel", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(BATCH);
	for (const token of tokens) {
		await ctx.db.delete("channel_link_tokens", token._id);
	}
	return tokens.length === BATCH;
}

/**
 * A wipe: the token that hasn't been redeemed. Minting one marks the
 * previous used, so a profile has at most one unused per channel; the used
 * ones record links that still stand.
 */
export async function drainUnusedLinkTokens(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<void> {
	const tokens = await ctx.db
		.query("channel_link_tokens")
		.withIndex("by_profile_channel", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.order("desc")
		.take(BATCH);
	for (const token of tokens) {
		if (token.usedAt === undefined) {
			await ctx.db.delete("channel_link_tokens", token._id);
		}
	}
}

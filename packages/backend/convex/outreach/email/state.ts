import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type {
	ClosedEmailStatus,
	EmailChannelStatus,
	NotReachableCounts,
} from "../validators";

/**
 * Whether email can reach a person (#916). Signing up links email, so no
 * row reads as `linked`. Resend's events move it to `unreachable` (a hard
 * bounce) or `complained` (a spam complaint), and routing then sends that
 * person no email. Never holds an address (ADR 0004).
 */

type ProfileId = Id<"emotional_profiles">;

/** How strongly each status says no: a complaint is never undone by a bounce. */
const STATUS_SEVERITY: Record<EmailChannelStatus, number> = {
	complained: 2,
	linked: 0,
	unreachable: 1,
};

async function stateRow(ctx: QueryCtx, profileId: ProfileId) {
	return await ctx.db
		.query("email_channel_states")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
}

/** The person's email state, and when it closed (absent when linked). */
export async function emailStateOf(
	ctx: QueryCtx,
	profileId: ProfileId
): Promise<
	{ status: "linked" } | { changedAt: number; status: ClosedEmailStatus }
> {
	const row = await stateRow(ctx, profileId);
	return row && row.status !== "linked"
		? { changedAt: row.changedAt, status: row.status }
		: { status: "linked" };
}

/**
 * Record what Resend told us. A complaint stands over a later bounce, and a
 * repeat of the same status keeps the time it first changed.
 */
export async function markEmailState(
	ctx: MutationCtx,
	profileId: ProfileId,
	status: ClosedEmailStatus,
	now: number
): Promise<void> {
	const row = await stateRow(ctx, profileId);
	if (!row) {
		await ctx.db.insert("email_channel_states", {
			changedAt: now,
			emotionalProfileId: profileId,
			status,
		});
		return;
	}
	if (STATUS_SEVERITY[status] > STATUS_SEVERITY[row.status]) {
		await ctx.db.patch("email_channel_states", row._id, {
			changedAt: now,
			status,
		});
	}
}

/** Account deletion and a wipe: the person's email state goes with outreach. */
export async function drainEmailChannelState(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<void> {
	const row = await stateRow(ctx, profileId);
	if (row) {
		await ctx.db.delete("email_channel_states", row._id);
	}
}

/** How many people email can't reach, by status, counting at most `cap` each. */
export async function countEmailStates(
	ctx: QueryCtx,
	cap: number
): Promise<NotReachableCounts> {
	const count = async (status: ClosedEmailStatus) =>
		(
			await ctx.db
				.query("email_channel_states")
				.withIndex("by_status", (q) => q.eq("status", status))
				.take(cap)
		).length;
	return {
		complained: await count("complained"),
		unreachable: await count("unreachable"),
	};
}

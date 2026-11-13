import type { QueryCtx } from "../_generated/server";
import type {
	ChannelPlan,
	OutreachChannel,
	OutreachIntent,
} from "./validators";

/**
 * Channel config and the per-intent channel rules (#760). The kill switch and
 * free/Plus gating are `outreach_channels` rows an admin edits; a channel with
 * no row runs on its coded default, so nothing needs a backfill.
 */

export const CHANNEL_DEFAULTS: Record<
	OutreachChannel,
	{ enabled: boolean; plan: ChannelPlan }
> = {
	push: { enabled: true, plan: "free" },
	// Off until an admin turns it on (rollout stage 3).
	telegram: { enabled: false, plan: "free" },
};

/** Absent `channelOrder` on the preferences. */
export const DEFAULT_CHANNEL_ORDER: readonly OutreachChannel[] = ["push"];

/**
 * Which intents each channel takes. Telegram carries only the ones a person
 * can answer or act on in the chat; everything else is push-only.
 */
const CHANNEL_INTENTS: Record<OutreachChannel, ReadonlySet<OutreachIntent>> = {
	push: new Set<OutreachIntent>([
		"nudge",
		"gentle_return",
		"pattern_nudge",
		"milestone",
		"kindling_ready",
		"domain_unlock",
		"achievement",
	]),
	telegram: new Set<OutreachIntent>([
		"nudge",
		"gentle_return",
		"pattern_nudge",
	]),
};

export function channelTakesIntent(
	channel: OutreachChannel,
	intent: OutreachIntent
): boolean {
	return CHANNEL_INTENTS[channel].has(intent);
}

/** A channel's live config: its row, else the coded default. */
export async function channelConfig(
	ctx: QueryCtx,
	channel: OutreachChannel
): Promise<{ enabled: boolean; plan: ChannelPlan }> {
	const row = await ctx.db
		.query("outreach_channels")
		.withIndex("by_channel", (q) => q.eq("channel", channel))
		.unique();
	return row
		? { enabled: row.enabled, plan: row.plan }
		: CHANNEL_DEFAULTS[channel];
}

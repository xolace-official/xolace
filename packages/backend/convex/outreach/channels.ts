import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { updateNotificationPrefs } from "../lib/notificationPrefs";
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
 * Move `channel` to the front of the person's order (absent = [push]),
 * keeping the rest as they were.
 */
export async function putChannelFirst(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	channel: OutreachChannel
): Promise<void> {
	const prefs = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	const order = prefs?.notifications.channelOrder ?? DEFAULT_CHANNEL_ORDER;
	await updateNotificationPrefs(ctx, emotionalProfileId, {
		channelOrder: [channel, ...order.filter((c) => c !== channel)],
	});
}

const REGION_CODE = /^[A-Za-z]{2}$/;

/**
 * A linked chat's country from the device's region (ISO 3166-1 alpha-2),
 * uppercased; undefined for anything else. Picks the crisis resources.
 */
export function countryFromRegion(
	regionCode: string | undefined
): string | undefined {
	const code = regionCode?.trim();
	return code && REGION_CODE.test(code) ? code.toUpperCase() : undefined;
}

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

/**
 * The badge toggle: `achievement` is absent on rows written before it existed,
 * and no Settings toggle writes it yet; absent follows `milestone`. The global
 * switch is push's alone, so it isn't read here.
 */
export function achievementToggle(
	notifications: Doc<"preferences">["notifications"]
): boolean {
	return notifications.achievement ?? notifications.milestone;
}

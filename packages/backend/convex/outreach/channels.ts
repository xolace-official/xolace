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
const DEFAULT_CHANNEL_ORDER: readonly OutreachChannel[] = ["push"];

/**
 * Channels signing up links, so routing tries them even when the stored
 * order predates them. None yet; email joins here (#912).
 */
const SIGN_UP_LINKED_CHANNELS: readonly OutreachChannel[] = [];

/**
 * The channels routing tries, in order: the person's stored order (absent =
 * the default), then any channel linked at sign-up it doesn't list. The one
 * place routing reads `channelOrder`; whether a channel is actually linked
 * and open is the router's channel gate, not this.
 */
export function routingOrder(
	notifications:
		| Pick<Doc<"preferences">["notifications"], "channelOrder">
		| undefined,
	signUpLinked: readonly OutreachChannel[] = SIGN_UP_LINKED_CHANNELS
): OutreachChannel[] {
	const stored = notifications?.channelOrder ?? DEFAULT_CHANNEL_ORDER;
	return [...stored, ...signUpLinked.filter((c) => !stored.includes(c))];
}

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
 * can answer, act on or read in the chat (the daily quote arrives whole, as a
 * blockquote); everything else is push-only. Free or Plus is the channel's
 * own config, never the intent's.
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
		"daily_quote",
	]),
	telegram: new Set<OutreachIntent>([
		"nudge",
		"gentle_return",
		"pattern_nudge",
		"daily_quote",
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

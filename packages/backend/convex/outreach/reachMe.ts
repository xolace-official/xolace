import { ConvexError, type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import {
	channelConfig,
	countryFromRegion,
	DEFAULT_CHANNEL_ORDER,
	putChannelFirst,
} from "./channels";
import { channelUnavailable, loadNotifications } from "./router";
import { telegramConfigured } from "./telegram/bot";
import {
	type OutreachChannel,
	outreachChannelValidator,
	revokedReasonValidator,
} from "./validators";

/**
 * The client contract behind "Reach me on…" (#766, plan §9): which channels
 * this person has, in their order, and choosing which comes first. Linking
 * itself is `telegram/link:createLink`.
 */

/** A profile has a handful of rows per channel at most (one per linked chat). */
const MAX_IDENTITIES_PER_CHANNEL = 10;

const channelStatusValidator = v.union(
	v.literal("linked"),
	v.literal("paused"),
	v.literal("needs_plus"),
	v.literal("disconnected"),
	v.literal("not_linked")
);

const channelEntryValidator = v.object({
	/** Open to this person now: switched on and on their plan. */
	available: v.boolean(),
	channel: outreachChannelValidator,
	/** The Telegram `@username` (without the `@`), shown only to its owner. */
	displayHandle: v.optional(v.string()),
	/** The channel routing tries first: first in order, linked and open. */
	isFirst: v.boolean(),
	/** A link exists (active or paused), whatever the plan says now. */
	linked: v.boolean(),
	requiresPlus: v.boolean(),
	revokedReason: v.optional(revokedReasonValidator),
	status: channelStatusValidator,
});
type ChannelEntry = Infer<typeof channelEntryValidator>;

/** Every channel a deployment can offer, in the default display order. */
const ALL_CHANNELS: readonly OutreachChannel[] = ["push", "telegram"];

async function identitiesOf(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	channel: OutreachChannel
): Promise<Doc<"channel_identities">[]> {
	return await ctx.db
		.query("channel_identities")
		.withIndex("by_profile_channel", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).eq("channel", channel)
		)
		.take(MAX_IDENTITIES_PER_CHANNEL);
}

/** The live link: an active row, else a paused one. */
function currentLink(identities: Doc<"channel_identities">[]) {
	return (
		identities.find((i) => i.status === "active") ??
		identities.find((i) => i.status === "paused")
	);
}

/** A live link's status: Plus-only and not Plus wins, then paused. */
function linkStatus(
	link: Doc<"channel_identities">,
	unavailable: string | null
): ChannelEntry["status"] {
	if (unavailable === "requires_plus") {
		return "needs_plus";
	}
	return link.status === "paused" ? "paused" : "linked";
}

async function channelEntry(
	ctx: QueryCtx,
	channel: OutreachChannel,
	profile: Doc<"emotional_profiles">
): Promise<ChannelEntry> {
	const unavailable = await channelUnavailable(ctx, channel, profile);
	const base = {
		available: unavailable === null,
		channel,
		isFirst: false,
		requiresPlus: (await channelConfig(ctx, channel)).plan === "plus",
	};
	if (channel === "push") {
		// Push is the app itself: nothing to link.
		return { ...base, linked: true, status: "linked" };
	}
	const identities = await identitiesOf(ctx, profile._id, channel);
	const link = currentLink(identities);
	if (link) {
		return {
			...base,
			linked: true,
			status: linkStatus(link, unavailable),
			...(link.displayHandle && { displayHandle: link.displayHandle }),
		};
	}
	if (unavailable === "requires_plus") {
		return { ...base, linked: false, status: "needs_plus" };
	}
	const lastRevoked = identities
		.filter((i) => i.status === "revoked")
		.sort((a, b) => (b.revokedAt ?? 0) - (a.revokedAt ?? 0))[0];
	if (lastRevoked) {
		return {
			...base,
			linked: false,
			status: "disconnected",
			...(lastRevoked.revokedReason && {
				revokedReason: lastRevoked.revokedReason,
			}),
		};
	}
	return { ...base, linked: false, status: "not_linked" };
}

/**
 * One entry per channel this deployment offers (Telegram omitted with no
 * bot), in the person's order. Reactive, so the link step updates live.
 */
export const listChannels = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const notifications = await loadNotifications(ctx, profile._id);
		const order = notifications?.channelOrder ?? DEFAULT_CHANNEL_ORDER;
		const offered = new Set<OutreachChannel>(
			(await telegramConfigured(ctx))
				? ALL_CHANNELS
				: ALL_CHANNELS.filter((c) => c !== "telegram")
		);
		const shown = [
			...new Set([...order, ...ALL_CHANNELS].filter((c) => offered.has(c))),
		];
		const entries: ChannelEntry[] = [];
		for (const channel of shown) {
			entries.push(await channelEntry(ctx, channel, profile));
		}
		// First = the channel routing would try first: the first in the
		// person's order that is linked and open to them now.
		const first = entries.find((e) => e.status === "linked" && e.available);
		return entries.map((e) => ({ ...e, isFirst: e === first }));
	},
	returns: v.array(channelEntryValidator),
});

/**
 * "Try this first": move a channel to the front of the person's order.
 * Telegram must be linked (active or paused); `channel_not_linked` if not.
 */
export const setFirstChannel = mutation({
	args: { channel: outreachChannelValidator },
	handler: async (ctx, { channel }) => {
		const { profile } = await requireAuth(ctx);
		if (
			channel !== "push" &&
			!currentLink(await identitiesOf(ctx, profile._id, channel))
		) {
			throw new ConvexError({ channel, code: "channel_not_linked" });
		}
		await putChannelFirst(ctx, profile._id, channel);
		return null;
	},
	returns: v.null(),
});

/**
 * Called when "Reach me on…" opens: the device's region becomes the linked
 * chat's country, for the crisis resources the bot names. A code that isn't
 * an ISO 3166-1 alpha-2 region changes nothing.
 */
export const refreshCountry = mutation({
	args: { regionCode: v.string() },
	handler: async (ctx, { regionCode }) => {
		const { profile } = await requireAuth(ctx);
		const country = countryFromRegion(regionCode);
		if (!country) {
			return null;
		}
		for (const identity of await identitiesOf(ctx, profile._id, "telegram")) {
			if (identity.status !== "revoked" && identity.country !== country) {
				await ctx.db.patch("channel_identities", identity._id, { country });
			}
		}
		return null;
	},
	returns: v.null(),
});

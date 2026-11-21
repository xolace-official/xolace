import { v } from "convex/values";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { CHANNEL_DEFAULTS } from "../outreach/channels";
import {
	channelPlanValidator,
	type OutreachChannel,
	outreachChannelValidator,
} from "../outreach/validators";

/** Every outreach channel, in the order the admin lists them. */
const CHANNELS: readonly OutreachChannel[] = ["push", "telegram", "email"];

/**
 * Every channel's kill switch and plan (#914): its row, else the coded
 * default (email and Telegram ship off). `updatedAt` once an admin set it.
 */
export const listChannelConfigs = adminQuery({
	args: {},
	handler: async (ctx) => {
		const configs = [];
		for (const channel of CHANNELS) {
			const row = await ctx.db
				.query("outreach_channels")
				.withIndex("by_channel", (q) => q.eq("channel", channel))
				.unique();
			configs.push(
				row
					? {
							channel,
							enabled: row.enabled,
							plan: row.plan,
							updatedAt: row.updatedAt,
						}
					: { channel, ...CHANNEL_DEFAULTS[channel] }
			);
		}
		return configs;
	},
	returns: v.array(
		v.object({
			channel: outreachChannelValidator,
			enabled: v.boolean(),
			plan: channelPlanValidator,
			updatedAt: v.optional(v.number()),
		})
	),
});

/**
 * Upsert a channel's outreach config (#760): the kill switch (`enabled`) and
 * whether it's open to free users or only Plus. Read inside `outreach.enqueue`
 * on every call, so it takes effect at once. Turning a channel off never
 * unlinks anyone; routing falls through to the next channel.
 */
export const setChannelConfig = adminMutation({
	args: {
		channel: outreachChannelValidator,
		enabled: v.boolean(),
		plan: channelPlanValidator,
	},
	handler: async (ctx, args) => {
		const fields = {
			enabled: args.enabled,
			plan: args.plan,
			updatedAt: Date.now(),
			updatedBy: ctx.identity.subject,
		};
		const existing = await ctx.db
			.query("outreach_channels")
			.withIndex("by_channel", (q) => q.eq("channel", args.channel))
			.unique();
		if (existing) {
			await ctx.db.patch("outreach_channels", existing._id, fields);
		} else {
			await ctx.db.insert("outreach_channels", {
				channel: args.channel,
				...fields,
			});
		}
		return null;
	},
	returns: v.null(),
});

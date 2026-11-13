import { v } from "convex/values";
import { adminMutation } from "../lib/adminAuth";
import {
	channelPlanValidator,
	outreachChannelValidator,
} from "../outreach/validators";

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

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { activityActionTypeValidator } from "../lib/validators";
import { recordActivity } from "./activityLog";
import { reviveStreak } from "./revive";

// Manual-invocation entry point for recordActivity (production actions call it
// directly, #433). Demo via the Convex dashboard:
//   bunx convex run streaks/manual:recordActivityManual '{"emotionalProfileId": "...", "actionType": "reflect"}'
export const recordActivityManual = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    actionType: activityActionTypeValidator,
    timestamp: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await recordActivity(ctx, args);
    return null;
  },
});

// Demo for revive (#435), no UI yet:
//   bunx convex run streaks/manual:reviveManual '{"emotionalProfileId": "..."}'
export const reviveManual = internalMutation({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) throw new Error("Profile not found");
    return reviveStreak(ctx, profile);
  },
});

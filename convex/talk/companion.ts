import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { validateSpaceName } from "../lib/spaceName";

/**
 * The companion's rename tool (#601), run by our endpoint mid-talk. The name
 * is the space name, so it's saved there for good and on the talk, which
 * the next turn's prompt reads. `sessionId` is untrusted: the talk's key binds it.
 */
export const rename = internalMutation({
  args: { sessionId: v.string(), talkKey: v.string(), name: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), name: v.string() }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (!session?.talkKey || session.talkKey !== args.talkKey || session.state !== "initiated") {
      return { ok: false as const, message: "This talk has ended." };
    }
    const result = validateSpaceName(args.name);
    if (!result.ok) return { ok: false as const, message: result.message };
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", session.emotionalProfileId))
      .unique();
    if (preferences) await ctx.db.patch("preferences", preferences._id, { spaceName: result.trimmed });
    await ctx.db.patch("sessions", session._id, { companionName: result.trimmed });
    return { ok: true as const, name: result.trimmed };
  },
});

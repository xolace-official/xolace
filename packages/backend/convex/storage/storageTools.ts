import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Resolve a `_storage` id to a signed URL — for manually checking an upload
 * from the CLI/dashboard without wiring a query into the app. Not gated by
 * DEV_TOOLS_ENABLED: internalQuery means only the CLI/dashboard/other server
 * code can call it, never a client, so it's safe to leave on in prod.
 *   bunx convex run storageTools:getFileUrl '{"storageId":"..."}' --prod
 */
export const getFileUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

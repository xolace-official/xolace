import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Throwaway: exists only to prove a labelled PR gets its own Convex preview.
export const ping = internalQuery({
	args: {},
	handler: async () => "pr-preview ok",
	returns: v.string(),
});

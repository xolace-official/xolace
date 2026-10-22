import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * What the exercise meaning index embeds (#569): each exercise's title and
 * steps, keyed on its title. Retired exercises come back as `null` text so the
 * index job removes them. The embed itself lives in `ai/exercises/embed.ts`.
 */
export const textsForIndex = internalQuery({
  args: {},
  returns: v.array(v.object({ title: v.string(), text: v.union(v.string(), v.null()) })),
  handler: async (ctx) => {
    // Six today; the seed comment allows up to ~20.
    const exercises = await ctx.db.query("exercises").take(100);
    return exercises.map((e) => ({
      title: e.title,
      text: e.active
        ? [e.title.replaceAll("_", " "), ...e.steps.map((s) => s.defaultContent ?? s.content)].join("\n")
        : null,
    }));
  },
});

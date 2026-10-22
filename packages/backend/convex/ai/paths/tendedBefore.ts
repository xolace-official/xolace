import type { QueryCtx } from "../../_generated/server";
import { domainOf, type Domain } from "../../lib/understandingVocab";
import { kindlingsIn, slugOf, stepsOf, type ProfileId } from "./history";
import { slugKey } from "./bind";

/**
 * What was tended during this domain's previous stretch, on kindlings whose
 * session touched the domain — read for a returning stretch only. `types`
 * goes to the prompt (#565); `slugs` (as `slugKey`s) are what the binder re-offers (#566).
 */
export async function tendedBefore(
  ctx: QueryCtx,
  profileId: ProfileId,
  domain: Domain,
  startedAt: number,
): Promise<{ types: string[]; slugs: string[] }> {
  const previous = await ctx.db
    .query("compounding_stretches")
    .withIndex("by_emotionalProfileId_and_domain_and_startedAt", (q) =>
      q.eq("emotionalProfileId", profileId).eq("domain", domain).lt("startedAt", startedAt),
    )
    .order("desc")
    .first();
  if (previous?.endedAt === undefined) return { types: [], slugs: [] };

  const tended = new Set<string>();
  const slugs = new Set<string>();
  for (const path of await kindlingsIn(ctx, profileId, previous.startedAt, previous.endedAt)) {
    const u = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", path.sessionId))
      .unique();
    if (!u?.thematicTags.some((t) => domainOf(t) === domain)) continue;
    for (const step of await stepsOf(ctx, path._id)) {
      if (step.state !== "done") continue;
      tended.add(step.actionType);
      const slug = slugOf(step.params);
      if (slug !== undefined) slugs.add(slugKey(step.actionType, slug));
    }
  }
  return { types: [...tended].sort(), slugs: [...slugs].sort() };
}

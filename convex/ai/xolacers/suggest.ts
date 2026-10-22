import { v, type Infer } from "convex/values";
import { action, type ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { suggestionValidator } from "../../xolacerChat";
import { SIMILARITY_FLOOR, similarityBand } from "../paths/bind";
import { posthog } from "../../posthog";
import { rateLimiter } from "../../lib/rateLimits";
import { searchXolacers } from "./embed";

type Suggestion = Infer<typeof suggestionValidator>;

/**
 * The one xolacer this session would offer, closest in meaning (#570, ADR
 * 0021). Eligibility is `xolacerChat.suggestionCandidates`, the same rules
 * the old query ran; meaning only reorders who passed. Closest 0.05 band
 * first, the old ranker's order breaking ties; below the floor, or with no
 * text or a failed embed, the old ranker alone.
 *
 * Stores nothing. The session is re-embedded here and the person is chosen at
 * read time, so no record links a session to a xolacer — the promise that a
 * chat is never linked to a person's reflections. Not reactive: callers ask
 * once.
 *
 * The embed is rate limited per profile (`xolacerSuggestion`); past it the
 * old ranker answers alone, so a caller is never refused.
 *
 * Logs how close the best candidate came, to tune SIMILARITY_FLOOR.xolacer
 * (#574) — the score and the fallback only, never who was chosen.
 */
export const sessionSuggestion = action({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.null(), suggestionValidator),
  handler: async (ctx, { sessionId }): Promise<Suggestion | null> => {
    const eligible: { emotionalProfileId: Id<"emotional_profiles">; rawInput?: string; candidates: Suggestion[] } | null =
      await ctx.runQuery(internal.xolacerChat.suggestionCandidates, { sessionId });
    if (!eligible || eligible.candidates.length === 0) return null;
    const { emotionalProfileId, rawInput, candidates } = eligible;
    const log = (search: "ran" | "failed" | "skipped", topScore?: number) =>
      logSearch(ctx, emotionalProfileId, candidates, search, topScore);
    // Over the bucket, the old ranker alone: only the embed spends a token.
    if (
      candidates.length === 1 ||
      !rawInput ||
      !(await rateLimiter.limit(ctx, "xolacerSuggestion", { key: emotionalProfileId })).ok
    ) {
      await log("skipped");
      return candidates[0];
    }

    const similarity = await searchXolacers(ctx, rawInput);
    if (!similarity) {
      await log("failed");
      return candidates[0];
    }
    const scores = candidates.map((c) => similarity[c.xolacerProfileId]).filter((s) => s !== undefined);
    await log("ran", scores.length > 0 ? Math.max(...scores) : undefined);
    const band = (id: Suggestion["xolacerProfileId"]) => {
      const score = similarity[id];
      return score !== undefined && score >= SIMILARITY_FLOOR.xolacer ? similarityBand(score) : -1;
    };
    // Stable sort: within a band the ranker's order stands.
    return [...candidates].sort((a, b) => band(b.xolacerProfileId) - band(a.xolacerProfileId))[0];
  },
});

async function logSearch(
  ctx: ActionCtx,
  emotionalProfileId: Id<"emotional_profiles">,
  candidates: Suggestion[],
  search: "ran" | "failed" | "skipped",
  topScore?: number,
) {
  await posthog.capture(ctx, {
    distinctId: emotionalProfileId,
    event: "xolacer_suggestion_ranked",
    properties: {
      candidates: candidates.length,
      search,
      topScore,
      fallback: search !== "ran" || topScore === undefined || topScore < SIMILARITY_FLOOR.xolacer,
    },
  });
}

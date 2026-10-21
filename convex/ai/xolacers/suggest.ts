import { v, type Infer } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { suggestionValidator } from "../../xolacerChat";
import { SIMILARITY_FLOOR, similarityBand } from "../paths/bind";
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
 */
export const sessionSuggestion = action({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.null(), suggestionValidator),
  handler: async (ctx, { sessionId }): Promise<Suggestion | null> => {
    const eligible: { rawInput?: string; candidates: Suggestion[] } | null = await ctx.runQuery(internal.xolacerChat.suggestionCandidates, { sessionId });
    if (!eligible || eligible.candidates.length === 0) return null;
    const { rawInput, candidates } = eligible;
    if (candidates.length === 1 || !rawInput) return candidates[0];

    const similarity = await searchXolacers(ctx, rawInput);
    if (!similarity) return candidates[0];
    const band = (id: Suggestion["xolacerProfileId"]) => {
      const score = similarity[id];
      return score !== undefined && score >= SIMILARITY_FLOOR.xolacer ? similarityBand(score) : -1;
    };
    // Stable sort: within a band the ranker's order stands.
    return [...candidates].sort((a, b) => band(b.xolacerProfileId) - band(a.xolacerProfileId))[0];
  },
});

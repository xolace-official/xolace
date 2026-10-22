import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { rateLimiter } from "../../lib/rateLimits";
import { posthog } from "../../posthog";
import {
  getAnthropicClient,
  extractTextFromResponse,
  REFLECTION_LIGHT_MODEL,
  REFLECTION_LIGHT_VERSION,
  thinkingOff,
} from "../providers/anthropic";
import {
  buildLightPassPrompt,
  parseLightPassResponse,
} from "../prompts/reflectionLight";
import { workflow } from "./consolidation";

// =============================================================
// Reflection Agent — ORCHESTRATOR / TRIGGER (Cognition Layer Phase 3).
//
// Scheduled off the critical path from sessions.completePath /
// completeSession (a sibling of profileStats.updateAfterSession). Runs the
// post-session LIGHT PASS (single Haiku call, refreshes trajectory), then
// checks the activity gate and, if due, starts the durable CONSOLIDATION
// workflow. Every step is best-effort — this is background work and must
// never throw into a completion path or block a live mirror.
//
// The backing internalQueries (light-pass context, consolidation gate) live
// in triggerQueries.ts.
//
// No "use node": the Anthropic SDK is fetch-based (same as followUps.ts).
// =============================================================

const LIGHT_MAX_TOKENS = 256;

/**
 * Entry point scheduled from the completion mutations. Light pass first, then
 * conditional consolidation. Both wrapped so a failure in one never blocks the
 * other and nothing ever throws back into the scheduler.
 */
export const onSessionComplete = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const key = args.emotionalProfileId;

    // ── Light pass: refresh the trajectory line ──────────────────
    try {
      const { ok } = await rateLimiter.limit(ctx, "reflectionLightPass", { key });
      if (ok) {
        const lightCtx = await ctx.runQuery(
          internal.ai.reflectionAgent.triggerQueries.getLightPassContext,
          { emotionalProfileId: args.emotionalProfileId, sessionId: args.sessionId },
        );
        const prompt = buildLightPassPrompt(lightCtx);
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: REFLECTION_LIGHT_MODEL,
          max_tokens: LIGHT_MAX_TOKENS,
          thinking: thinkingOff(REFLECTION_LIGHT_MODEL),
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
        });
        const parsed = parseLightPassResponse(extractTextFromResponse(response));
        if (parsed) {
          await ctx.runMutation(internal.semanticProfiles.updateTrajectory, {
            emotionalProfileId: args.emotionalProfileId,
            trajectory: parsed.trajectory,
            writerVersion: REFLECTION_LIGHT_VERSION,
          });
          await posthog.capture(ctx, {
            distinctId: args.emotionalProfileId,
            event: "reflect_light_pass",
            properties: { writerVersion: REFLECTION_LIGHT_VERSION },
          });
        }
      }
    } catch (err) {
      console.error("[reflectionAgent] light pass failed", {
        message: err instanceof Error ? err.message : String(err),
        sessionId: args.sessionId,
      });
    }

    // ── Consolidation gate: maybe start the deep pass ────────────
    try {
      const { due } = await ctx.runQuery(
        internal.ai.reflectionAgent.triggerQueries.getConsolidationGate,
        { emotionalProfileId: args.emotionalProfileId },
      );
      if (!due) return;

      await startConsolidation(ctx, args.emotionalProfileId);
    } catch (err) {
      console.error("[reflectionAgent] consolidation trigger failed", {
        message: err instanceof Error ? err.message : String(err),
        emotionalProfileId: args.emotionalProfileId,
      });
    }
  },
});

/** Start the deep pass, within the per-user token budget. */
async function startConsolidation(
  ctx: ActionCtx,
  emotionalProfileId: Id<"emotional_profiles">,
): Promise<void> {
  const { ok } = await rateLimiter.limit(ctx, "reflectionConsolidation", {
    key: emotionalProfileId,
  });
  if (!ok) return; // per-user token budget spent for today

  await workflow.start(
    ctx,
    internal.ai.reflectionAgent.consolidation.consolidationWorkflow,
    { emotionalProfileId },
    {
      onComplete: internal.ai.reflectionAgent.consolidation.onConsolidationComplete,
      context: {},
    },
  );
}

/**
 * Upgrading to Xolace+ runs the pass once, so insights arrive without waiting
 * for the activity gate (#525). Scheduled by premium.onEntitlementActivated.
 */
export const runOnUpgrade = internalAction({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: v.null(),
  handler: async (ctx, { emotionalProfileId }) => {
    await startConsolidation(ctx, emotionalProfileId);
    return null;
  },
});

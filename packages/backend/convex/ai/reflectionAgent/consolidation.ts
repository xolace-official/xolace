import { v } from "convex/values";
import type Anthropic from "@anthropic-ai/sdk";
import {
  WorkflowManager,
  vWorkflowId,
  vResultValidator,
} from "@convex-dev/workflow";
import type { GenericActionCtx } from "convex/server";
import { components, internal } from "../../_generated/api";
import type { DataModel, Id } from "../../_generated/dataModel";
import { internalAction, internalMutation } from "../../_generated/server";
import { posthog } from "../../posthog";
import {
  getAnthropicClient,
  REFLECTION_CONSOLIDATION_MODEL,
  REFLECTION_CONSOLIDATION_VERSION,
  thinkingOff,
} from "../providers/anthropic";
import { buildConsolidationSystemPrompt } from "../prompts/reflectionConsolidation";
import { INSIGHT_TOOLS } from "./insightTools";
import { REFLECTION_TOOLS, WRITE_TOOL, dispatchTool } from "./tools";

// =============================================================
// Reflection Agent — CONSOLIDATION PASS (Cognition Layer Phase 3).
//
// The deep, agentic "slow mind": a durable single-step workflow wrapping the
// custom Sonnet tool-use loop (decision-log #6 — custom loop on workflow for
// durable retry, minimal surface). The loop gathers evidence via read tools
// and commits ONE new profile version through update_profile_section.
//
// Fresh WorkflowManager on the shared component (multiple managers supported,
// same pattern as followUps.ts). The SDK + rag.search are fetch-based, so the
// loop runs WITHOUT "use node".
// =============================================================

export const workflow = new WorkflowManager(components.workflow);

// Cap the loop so a misbehaving model can never spin. Generous: a well-behaved
// pass reads a handful of tools, writes its insights (Xolace+), then writes once.
const MAX_ITERATIONS = 12;
const MAX_TOKENS = 3072;

// The shared client's 30s default is sized for the Haiku calls. A non-streaming
// Sonnet tool-use turn at MAX_TOKENS routinely runs past it, and Convex's fetch
// rejects an abort without an `AbortError` name, so the SDK reports the timeout
// as a generic "Connection error." Override per request rather than widening the
// singleton. maxRetries stays at 1 because the workflow already retries durably.
const CONSOLIDATION_REQUEST_OPTIONS = { timeout: 120_000, maxRetries: 1 };

export const consolidationWorkflow = workflow.define({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (step, args): Promise<void> => {
    const wroteProfile: boolean = await step.runAction(
      internal.ai.reflectionAgent.consolidation.runConsolidation,
      { emotionalProfileId: args.emotionalProfileId },
      // Durable retry is the whole point of hosting this on a workflow.
      { retry: true },
    );
    // Post-write side effects live in their own journaled step: once the
    // action step has committed, a failure here retries only the mutation —
    // it can never rerun the model loop and append a duplicate version.
    if (wroteProfile) {
      await step.runMutation(
        internal.ai.reflectionAgent.consolidation.markConsolidated,
        { emotionalProfileId: args.emotionalProfileId },
      );
    }

    // Tone adaptation (Phase 4, Loop #1). Deterministic — runs regardless of
    // whether the agent wrote a narrative version, and after it, so the "what
    // lands" section patches onto the now-current version. Own journaled step:
    // cheap, idempotent, and never reruns the model loop on retry.
    await step.runMutation(
      internal.ai.reflectionAgent.calibration.refreshCalibration,
      { emotionalProfileId: args.emotionalProfileId },
    );
  },
});

/**
 * The counterpart to the `reflect_consolidation_written` capture in
 * markConsolidated: both terminal outcomes of the loop are now observable.
 * Best-effort — a telemetry failure must never mask the failure it describes.
 */
async function captureConsolidationFailed(
  ctx: GenericActionCtx<DataModel>,
  emotionalProfileId: Id<"emotional_profiles">,
  properties: {
    reason: "error" | "no_write";
    message?: string;
    iterations: number;
  },
): Promise<void> {
  try {
    await posthog.capture(ctx, {
      distinctId: emotionalProfileId,
      event: "reflect_consolidation_failed",
      properties: {
        writerVersion: REFLECTION_CONSOLIDATION_VERSION,
        ...properties,
      },
    });
  } catch (err) {
    console.error("[reflectionConsolidation] failed to capture failure event", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * The custom tool-use loop. Runs the consolidation to terminal write and
 * reports whether it wrote; the workflow stamps lastConsolidationAt in a
 * separate step so a post-write failure can't retry the loop. Best-effort
 * throughout — this is off the critical path; a failure retries via the
 * workflow and never touches a live mirror.
 */
export const runConsolidation = internalAction({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const anthropic = getAnthropicClient();
    // Free users and personal memory off: no insight compute at all (#525).
    const insights: boolean = await ctx.runQuery(
      internal.compounding.insightEvidence.insightsEnabled,
      { emotionalProfileId: args.emotionalProfileId },
    );
    const system = buildConsolidationSystemPrompt({ insights });
    const tools = insights ? [...REFLECTION_TOOLS, ...INSIGHT_TOOLS] : REFLECTION_TOOLS;
    // A retried run gets a newer runAt, so its endRun clears a failed attempt's partial set.
    const runAt = Date.now();

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Consolidate this person's emotional profile. Read the current profile first, gather evidence with the read tools, ${insights ? "write any steadiness insights that pass the bar, " : ""}then write the new version once.`,
      },
    ];

    let wroteProfile = false;
    let iterations = 0;

    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        iterations = i + 1;
        const response = await anthropic.messages.create(
          {
            model: REFLECTION_CONSOLIDATION_MODEL,
            max_tokens: MAX_TOKENS,
            thinking: thinkingOff(REFLECTION_CONSOLIDATION_MODEL),
            system,
            tools,
            messages,
          },
          CONSOLIDATION_REQUEST_OPTIONS,
        );

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason !== "tool_use") break;

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          if (block.name === WRITE_TOOL) wroteProfile = true;
          const result = await dispatchTool(
            ctx,
            args.emotionalProfileId,
            block.name,
            block.input as Record<string, unknown>,
            { runAt, insights },
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        messages.push({ role: "user", content: toolResults });

        // Terminal write done — the profile is committed; stop the loop.
        if (wroteProfile) break;
      }
    } catch (err) {
      // A throw here leaves lastConsolidationAt unstamped, so the gate stays
      // due and the workflow retries. Emit before rethrowing — otherwise a
      // persistent failure disables consolidation with no signal anywhere.
      await captureConsolidationFailed(ctx, args.emotionalProfileId, {
        reason: "error",
        message: err instanceof Error ? err.message : String(err),
        iterations,
      });
      throw err;
    }

    // This run's insights (possibly none) replace every older run's.
    if (insights) {
      await ctx.runMutation(internal.compounding.insightStore.endRun, {
        emotionalProfileId: args.emotionalProfileId,
        runAt,
      });
    }

    if (!wroteProfile) {
      console.warn("[reflectionConsolidation] loop ended without a write", {
        emotionalProfileId: args.emotionalProfileId,
      });
      // Same end state as a throw — no new profile version — but it returns
      // false instead, so nothing retries. Worth its own signal.
      await captureConsolidationFailed(ctx, args.emotionalProfileId, {
        reason: "no_write",
        iterations,
      });
    }
    return wroteProfile;
  },
});

/** Anchor the gate: the consolidation just ran. */
export const markConsolidated = internalMutation({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args) => {
    // Skip if a wipe swept the profile mid-flight (mirrors the write guard).
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile || profile.dataWipeInProgress === true) return null;
    await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
      lastConsolidationAt: Date.now(),
    });
    await posthog.capture(ctx, {
      distinctId: args.emotionalProfileId,
      event: "reflect_consolidation_written",
      properties: { writerVersion: REFLECTION_CONSOLIDATION_VERSION },
    });
    return null;
  },
});

/** Component onComplete hook — purge the workflow's journal tables. */
export const onConsolidationComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    await workflow.cleanup(ctx, args.workflowId);
    return null;
  },
});

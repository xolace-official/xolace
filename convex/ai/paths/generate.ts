import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { rateLimiter } from "../../lib/rateLimits";
import { posthog } from "../../posthog";
import {
  getAnthropicClient,
  extractTextFromResponse,
  PATHS_MODEL,
  PATHS_VERSION,
  thinkingOff,
} from "../providers/anthropic";
import { bindTwig } from "./bind";
import { CATALOG } from "./catalog";
import type { GenerateContext } from "./generateDb";
import {
  buildPathsPrompt,
  parsePathsResponse,
  MIN_TWIGS,
  type Dropped,
} from "./prompt";

/**
 * Kindling generation entry point (docs/paths-v1.md §2.2, §5; ADR 0010; #331).
 *
 * Scheduled as a sibling from `finalizeCompletion` on the genuine
 * `completeSession` route only. Off the critical path and best-effort: every
 * failure is logged, nothing is thrown, the session never waits on it.
 *
 * One standalone Haiku call, no tool loop: the model picks 3–4 action TYPES
 * from the catalog and writes a `why` line each. Twigs that fail validation
 * or binding are dropped, never retried; fewer than MIN_TWIGS survivors means
 * no `paths` row at all — never a synthetic default.
 *
 * The premium gate and the `supportNeed` gate live in `generateDb.getContext`
 * (a null context is a silent no-op — no log noise, no compute, ADR 0009).
 *
 * No "use node": the Anthropic SDK is fetch-based.
 */

const MAX_TOKENS = 512;

type Args = { sessionId: Id<"sessions">; emotionalProfileId: Id<"emotional_profiles"> };

/**
 * Null = unbindable: the type is neither offered to the model nor persisted,
 * so no `path_steps` row ever lands that a reader cannot resolve.
 */
const bind = (actionType: string, ctx: GenerateContext) =>
  bindTwig(actionType, ctx.binding, ctx.tracks, ctx.entries);

async function logDrops(ctx: ActionCtx, args: Args, dropped: Dropped[]) {
  for (const drop of dropped) {
    console.error("kindling: twig dropped", { sessionId: args.sessionId, ...drop });
    await posthog.capture(ctx, {
      distinctId: args.emotionalProfileId,
      event: "path_twig_dropped",
      properties: { sessionId: args.sessionId, ...drop },
    });
  }
}

async function logNoShip(ctx: ActionCtx, args: Args, reason: string, surviving: number) {
  console.error("kindling: no-ship", { sessionId: args.sessionId, reason, surviving });
  await posthog.capture(ctx, {
    distinctId: args.emotionalProfileId,
    event: "path_no_ship",
    properties: { sessionId: args.sessionId, reason, surviving },
  });
}

async function generate(ctx: ActionCtx, args: Args): Promise<void> {
  const context = await ctx.runQuery(internal.ai.paths.generateDb.getContext, args);
  if (!context) return;

  // One kindling per profile per day. `check` here so a spent slot skips
  // the model call; the slot is only consumed (`limit`) once there is
  // something to write — a provider error or a no-ship must not burn the
  // day's single chance.
  const limitKey = { key: args.emotionalProfileId };
  if (!(await rateLimiter.check(ctx, "pathsGenerate", limitKey)).ok) {
    await logNoShip(ctx, args, "rate_limited", 0);
    return;
  }

  // Offer only what fits this grade and can bind for this session.
  const catalog = CATALOG.filter(
    (c) =>
      c.supportNeedFit.includes(context.understanding.supportNeed as "light" | "active") &&
      bind(c.actionType, context) !== null,
  );
  const prompt = buildPathsPrompt({
    understanding: context.understanding,
    profile: context.profile,
    catalog,
    tier: "plus",
    compounding: context.compounding,
  });
  const response = await getAnthropicClient().messages.create({
    model: PATHS_MODEL,
    max_tokens: MAX_TOKENS,
    thinking: thinkingOff(PATHS_MODEL),
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });

  const { twigs: picked, dropped } = parsePathsResponse(
    extractTextFromResponse(response),
    catalog,
  );
  const twigs = [];
  for (const twig of picked) {
    const params = bind(twig.actionType, context);
    if (params) twigs.push({ ...twig, params });
    else dropped.push({ actionType: twig.actionType, reason: "unbindable" });
  }
  await logDrops(ctx, args, dropped);

  if (twigs.length < MIN_TWIGS) {
    await logNoShip(ctx, args, "fewer_than_min_twigs", twigs.length);
    return;
  }

  // The slot is consumed inside `write`, in the same transaction as the
  // rows: a failed write rolls the limit back too, so the day's chance is
  // never burned on a kindling that did not land.
  const pathId = await ctx.runMutation(internal.ai.paths.generateDb.write, {
    ...args,
    semanticProfileId: context.semanticProfileId,
    model: PATHS_MODEL,
    modelVersion: PATHS_VERSION,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    twigs: twigs.map((t, i) => ({ ...t, order: i + 1 })),
  });
  if (pathId === null) {
    await logNoShip(ctx, args, "rate_limited", twigs.length);
    return;
  }

  // Fires only now — after the kindling is written (docs/paths-v1.md §10).
  // There is no "your kindling is being generated" notification.
  await ctx.runMutation(internal.ai.paths.notify.notifyReady, {
    emotionalProfileId: args.emotionalProfileId,
    pathId,
  });
}

export const run = internalAction({
  args: {
    sessionId: v.id("sessions"),
    emotionalProfileId: v.id("emotional_profiles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Every read, gate and model call sits before the single write mutation,
    // so a caught throw leaves either a whole kindling or none — never a
    // replaced previous with no successor.
    try {
      await generate(ctx, args);
    } catch (error) {
      console.error("kindling: generation failed", {
        sessionId: args.sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});

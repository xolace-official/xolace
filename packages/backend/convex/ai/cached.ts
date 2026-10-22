import { components, internal } from "../_generated/api";
import { ActionCache } from "@convex-dev/action-cache";
import type { FunctionReference } from "convex/server";
import type { ModerationResult } from "./providers/moderation";
import type { ClassificationResult } from "./providers/anthropic";

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

export const moderationCache: ActionCache<
  FunctionReference<"action", "internal", { text: string }, ModerationResult>
> = new ActionCache(components.actionCache, {
  action: internal.ai.cachedActions.moderationAction,
  name: "moderation-v1",
  ttl: 48 * HOUR,
});

export const classifierCache: ActionCache<
  FunctionReference<
    "action",
    "internal",
    { systemPrompt: string; userPrompt: string },
    ClassificationResult
  >
> = new ActionCache(components.actionCache, {
  action: internal.ai.cachedActions.classifierAction,
  name: "classifier-v2",
  ttl: 7 * DAY,
});

export const distillerCache: ActionCache<
  FunctionReference<
    "action",
    "internal",
    { systemPrompt: string; userPrompt: string },
    string
  >
> = new ActionCache(components.actionCache, {
  action: internal.ai.cachedActions.distillerAction,
  name: "distiller-v2",
  ttl: 30 * DAY,
});

/**
 * After-talk checks (#606, decisions in #589): code over a closed talk's
 * stored lines, never inline (latency) and never a model (no new signal).
 * A hit flags the session for the CEO's review; it changes nothing the
 * person sees. The talk eval (#605) holds the same rules in CI.
 */
import type { Infer } from "convex/values";
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { TalkPeak } from "../ai/safeguard";
import { talkIssueValidator } from "../lib/validators";
import { CRISIS_LINE } from "./safetyScript";
import type { TalkLine } from "./transcript";

export type TalkIssue = Infer<typeof talkIssueValidator>;

// Naming one, even to deny it ("I'm not ChatGPT"), fails (#583).
// ponytail: "google it" or "magnum opus" flag too; a flag is only a review.
const PROVIDER_NAMES =
  /\b(anthropic|claude|open ?ai|chat ?gpt|gpt[- ]?\d*|gemini|google|deepmind|meta ai|llama|mistral|haiku|sonnet|opus|eleven ?labs|large language model|llm)\b/i;

/** The first provider or model name in a companion line, or null. */
export const providerName = (text: string): string | null => PROVIDER_NAMES.exec(text)?.[0] ?? null;

/**
 * What a closed talk got wrong: any companion line naming a provider or
 * model, and, once it reached crisis, no companion line that is the fixed
 * crisis line verbatim (never said, or cut off mid-line). A crisis raised
 * by moderation after the last turn flags too: no line was possible, but
 * a crisis that got none is worth a look.
 */
export function afterTalkIssues(lines: (TalkLine & { seq: number })[], safety: TalkPeak | undefined): TalkIssue[] {
  const issues: TalkIssue[] = [];
  for (const l of lines) {
    const match = l.role === "companion" ? providerName(l.text) : null;
    if (match) issues.push({ kind: "provider_name", seq: l.seq, match });
  }
  if (safety?.level === "crisis" && !lines.some((l) => l.role === "companion" && l.text.trim() === CRISIS_LINE)) {
    issues.push({ kind: "crisis_line" });
  }
  return issues;
}

/** The review queue, newest first: run from the dashboard; read the thread by sessionId. */
export const flagged = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({ sessionId: v.id("sessions"), flaggedAt: v.number(), issues: v.array(talkIssueValidator) })),
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_talkFlaggedAt", (q) => q.gt("talkFlaggedAt", 0))
      .order("desc")
      .take(Math.min(limit ?? 50, 200));
    return rows.map((s) => ({ sessionId: s._id, flaggedAt: s.talkFlaggedAt!, issues: s.talkFlags ?? [] }));
  },
});

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import { posthog } from "./posthog";

const MAX_LENGTH = 1000;

// "flag" is not here: it has its own mutation and no budget.
const kindValidator = v.union(
  v.literal("bug"),
  v.literal("idea"),
  v.literal("concern"),
);
type Kind = "bug" | "idea" | "concern";

export const contextValidator = v.object({
  appVersion: v.string(),
  route: v.string(),
  themeName: v.string(),
  platform: v.string(),
});

// A concern is metered on its own budget so an abuse report is never refused
// because the reporter spent the day sending feature ideas.
const bucketFor = (kind: Kind) =>
  kind === "concern" ? "concernReport" : "productFeedback";

const RATE_LIMIT_MESSAGE: Record<Kind, string> = {
  bug: "You're sending feedback too fast. Try again shortly.",
  idea: "You're sending feedback too fast. Try again shortly.",
  // Deliberately actionable: the concern budget is 2/day, so a rate-limited
  // reporter may have a real safety problem and no route left in the app.
  concern:
    "You've reached today's report limit. If this is urgent, email support@xolaceinc.com and a human will pick it up.",
};

/**
 * Whether the current user can still submit feedback of this kind (rate-limit
 * check without consuming a token). Mirrors `feedback.canSubmitGeneral`.
 *
 * `kind` is optional so clients built before concerns existed keep checking
 * the feedback bucket they were written against.
 */
export const canSubmit = query({
  args: { kind: v.optional(kindValidator) },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const { ok } = await rateLimiter.check(ctx, bucketFor(args.kind ?? "bug"), {
      key: profile._id,
    });
    return ok;
  },
});

/**
 * Submit a bug report, an idea, or a concern about a person.
 *
 * The owner scope is derived server-side from the authenticated identity —
 * never accepted from the client. Text is trimmed + length-bounded and the
 * submission is rate-limited regardless of any client-side validation.
 *
 * A concern carries the subject's profile id and, when raised inside a thread,
 * the conversation id. No display name is accepted or stored.
 */
export const submit = mutation({
  args: {
    kind: kindValidator,
    text: v.string(),
    context: contextValidator,
    subjectProfileId: v.optional(v.id("emotional_profiles")),
    conversationId: v.optional(v.id("xolacer_conversations")),
  },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const { ok } = await rateLimiter.limit(ctx, bucketFor(args.kind), {
      key: profile._id,
    });
    if (!ok) {
      throw new Error(RATE_LIMIT_MESSAGE[args.kind]);
    }

    const text = args.text.trim();
    if (text.length === 0 || text.length > MAX_LENGTH) {
      throw new Error("Feedback text must be 1–1000 characters.");
    }

    await ctx.db.insert("product_feedback", {
      emotionalProfileId: profile._id,
      kind: args.kind,
      text,
      context: args.context,
      subjectProfileId: args.subjectProfileId,
      conversationId: args.conversationId,
      createdAt: Date.now(),
    });

    if (args.kind === "concern") {
      await captureConcernSubmitted(
        ctx,
        profile._id,
        args.subjectProfileId !== undefined,
      );
      // Also into Stream's moderation queue, so the maintainer reviews flags
      // and reports in one place. Scheduled, not inline: a Stream outage must
      // not lose the report the tray already has.
      if (args.subjectProfileId) {
        await ctx.scheduler.runAfter(0, internal.productFeedbackFlags.flagSubjectOnStream, {
          subjectProfileId: args.subjectProfileId,
          reporterProfileId: profile._id,
        });
      }
    }

    return null;
  },
});

/**
 * Structural only: that a concern was submitted, and whether it named someone.
 * No free text, no subject id, no conversation id — a report about a person
 * must not put that person into analytics. The identity stays in Convex, where
 * moderation happens.
 */
async function captureConcernSubmitted(
  ctx: MutationCtx,
  // Pseudonymous profile id of the REPORTER, matching every other capture in
  // the codebase. The Clerk tokenIdentifier never leaves Convex.
  distinctId: Id<"emotional_profiles">,
  hasSubject: boolean,
) {
  // Swallowed on purpose: this runs inside the submit mutation's transaction,
  // so a throw here would roll back the report the user just filed. Losing one
  // analytics event beats losing the report.
  try {
    await posthog.capture(ctx, {
      distinctId,
      event: "concern_report_submitted",
      properties: { hasSubject },
    });
  } catch (error) {
    console.error("concern_report_submitted capture failed", error);
  }
}

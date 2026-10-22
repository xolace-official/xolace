import { v, type Infer } from "convex/values";
import {
  WorkflowManager,
  vWorkflowId,
  vResultValidator,
  type WorkflowId,
} from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import {
  followUpCadence,
  followUpTier,
  minReturnGapForTier,
  shouldEmitReturn,
  shouldReshowShownCard,
  shouldSupersede,
} from "./lib/followUpCadence";
import { writeFollowUpCard } from "./ai/followUpCard";
import { domainValidator, safeguardLevelValidator } from "./lib/validators";
import {
  buildFollowUpCardPrompt,
  fallbackFollowUpCard,
} from "./ai/prompts/followUpCardWriter";
import { renderSemanticProfile } from "./semanticProfiles";
import { deleteResponsesForCard } from "./followUpResponses";
import {
  compoundingFor,
  spendStretch,
  type StretchRef,
} from "./compounding/stretches";
import { hasPremium } from "./lib/premium";
import { domainOf } from "./lib/understandingVocab";

const MAX_CARD_CHARS = 200;

export const workflow = new WorkflowManager(components.workflow);

// Card responses the client may send.
const userResponseValidator = v.union(
  v.literal("lighter"),
  v.literal("still_here"),
  v.literal("heavier"),
  v.literal("processed"),
  v.literal("vent"),
  v.literal("dismissed"),
);

// Active = a card whose lifecycle is still owned by a live workflow.
// Exported for lib/sessionCascade, which purges cards per-session.
export const ACTIVE_STATUSES = new Set<Doc<"follow_up_cards">["status"]>([
  "pending",
  "ready",
  "shown",
]);

/**
 * Cancel a card's workflow, tolerating an already-terminal one.
 * Shared with lib/sessionCascade so both purge paths swallow identically.
 */
export async function cancelFollowUpWorkflow(
  ctx: MutationCtx,
  workflowId: WorkflowId,
): Promise<void> {
  try {
    await workflow.cancel(ctx, workflowId);
  } catch {
    // Already terminal — nothing to cancel.
  }
}

// =============================================================
// The durable follow-up workflow
// =============================================================
//
// Sleep durations are passed as args (never in-body constants) so cadence
// tuning never reshapes the function — deterministic journal replay.
//
// NOTE: this is a strictly sequential sleep chain — do NOT reintroduce a
// `Promise.race([awaitEvent, sleep])` here. @convex-dev/workflow refuses to
// replay the handler while ANY journal step is in progress, so racing a
// long-lived `awaitEvent` against a `sleep` deadlocks the workflow the moment
// the sleep fires (the still-pending event step blocks every future poll).
// The "user returned" path is handled in `markReturn`, which flips the card to
// `ready` and cancels this workflow directly — no event needed.
export const followUpWorkflow = workflow
  .define({
    args: {
      sessionId: v.id("sessions"),
      emotionalProfileId: v.id("emotional_profiles"),
      stage1Ms: v.number(),
      stage2Ms: v.number(),
      expiryMs: v.number(),
    },
  })
  .handler(async (step, args): Promise<void> => {
    const workflowId = step.workflowId;

    // Stage 1: wait, then nudge if the user hasn't returned (card still pending).
    await step.sleep(args.stage1Ms, { name: "stage1" });
    await step.runMutation(internal.followUps.sendFollowUpNudge, { workflowId });

    // Stage 2: wait again, nudge again if still pending.
    await step.sleep(args.stage2Ms, { name: "stage2" });
    await step.runMutation(internal.followUps.sendFollowUpNudge, { workflowId });

    // Expiry: no return after both nudges → retire the card.
    await step.sleep(args.expiryMs, { name: "expiry" });
    await step.runMutation(internal.followUps.markCardExpired, { workflowId });
  });

// =============================================================
// Workflow start (called from a node action that wrote cardText)
// =============================================================

/**
 * Pre-flight context for the card writer + start gate. Returns null when the
 * session should NOT spawn a follow-up (already has one, or doesn't qualify) —
 * saving a wasted Haiku call. The authoritative idempotency + supersede check
 * is re-done atomically in `createAndStart`.
 */
type StartContextSignals = {
  safeguardLevel: Infer<typeof safeguardLevelValidator> | null;
  intensity: number | null;
  primaryEmotion: string | null;
  granularLabel: string | null;
  confirmationState: string | null;
};

const stretchRefValidator = v.object({ domain: domainValidator, stretchStartedAt: v.number() });

/**
 * The stretch a completed session's follow-up checks in on (#522, #492 §3–4):
 * a domain tonight's session touched that is compounding (never easing) and
 * hasn't had its check-in; top-ranked wins. Nothing on an abandoned, burned,
 * or elevated/crisis session, so the trigger stays unused for the next
 * ordinary one. Xolace+ only. The safeguard gate lives here, not in
 * compounding/, which never reads safeguard state.
 */
async function compoundingFollowUp(
  ctx: QueryCtx,
  session: Doc<"sessions">,
  metadata: Doc<"emotional_metadata"> | null,
): Promise<StretchRef | null> {
  if (session.state !== "completed" || session.kept === false || !metadata) return null;
  const levels = [metadata.safeguardLevel, session.safeguardLevel];
  if (levels.some((l) => l === "elevated" || l === "crisis")) return null;
  const profile = await ctx.db.get("emotional_profiles", session.emotionalProfileId);
  // Entitlement outage reads as free: compounding timing is Xolace+, and an
  // ordinary follow-up must not fail with it.
  if (!profile || !(await hasPremium(ctx, profile).catch(() => false))) return null;
  const touched = new Set(metadata.thematicTags.map(domainOf));
  const top = (await compoundingFor(ctx, profile._id)).find(
    (c) => c.state === "compounding" && !c.followUpUsed && touched.has(c.domain),
  );
  return top ? { domain: top.domain, stretchStartedAt: top.startedAt } : null;
}

type StartContext = {
  emotionalProfileId: Id<"emotional_profiles">;
  escalationDerived: boolean;
  signals: StartContextSignals;
  compounding: StretchRef | null;
  /** Compounding alone earned this one: standard tier (#522). */
  compoundingOnly: boolean;
  cardCtx: {
    mirrorText: string | null;
    followUpReason: string | null;
    primaryEmotion: string | null;
    granularLabel: string | null;
    gaveUp: boolean;
  };
};

export const getStartContext = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<StartContext | null> => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return null;
    if (session.followUpWorkflowId) return null; // already started (idempotent)

    const metadata: Doc<"emotional_metadata"> | null = await ctx.runQuery(
      internal.understanding.getUnderstanding,
      { sessionId: args.sessionId },
    );
    // A trigger, not a tier bump: compounding can earn a session its follow-up
    // on its own, and rides along on one the session earned anyway.
    const compounding = await compoundingFollowUp(ctx, session, metadata);
    if (session.requiresFollowUp !== true && !compounding) return null;

    const gaveUp = session.confirmationState === "gave_up";
    const escalationDerived = session.escalationTriggered === true;

    // Concrete (non-optional) shape — every field present (null when absent) so
    // it matches the createAndStart `signals` validator exactly.
    const signals: StartContextSignals = {
      safeguardLevel: session.safeguardLevel ?? null,
      intensity: metadata?.intensity ?? null,
      primaryEmotion: metadata?.primaryEmotion ?? null,
      granularLabel: metadata?.granularLabel ?? null,
      confirmationState: session.confirmationState ?? null,
    };

    return {
      emotionalProfileId: session.emotionalProfileId,
      escalationDerived,
      signals,
      compounding,
      compoundingOnly: session.requiresFollowUp !== true,
      cardCtx: {
        // gave_up sessions have no landed mirror — write mirror-free.
        mirrorText: gaveUp ? null : (session.mirrorText ?? null),
        followUpReason: metadata?.followUpReason ?? null,
        primaryEmotion: metadata?.primaryEmotion ?? null,
        granularLabel: metadata?.granularLabel ?? null,
        gaveUp,
      },
    };
  },
});

/**
 * Generate the check-in card text (Haiku) and start the durable workflow.
 * Scheduled off the critical path when a session completes (or an escalation
 * session is abandoned). The card row + workflow ALWAYS start — even on a Haiku
 * outage (FALLBACK_FOLLOWUP_CARD) — so safety-relevant follow-ups are never
 * silently dropped. The Anthropic SDK is fetch-based, so this needs no node.
 */
export const startFollowUpWorkflow = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const start = await ctx.runQuery(internal.followUps.getStartContext, {
      sessionId: args.sessionId,
    });
    if (!start) return; // already started, or session no longer qualifies

    const tier = start.compoundingOnly ? "standard" : followUpTier(start.signals);

    // Memory enrichment: suppressed for acute tier — a crisis check-in stays
    // presence-first and wound-light, never "you keep feeling this way".
    const semanticProfileDoc =
      tier === "acute"
        ? null
        : await ctx.runQuery(internal.semanticProfiles.getCurrent, {
            emotionalProfileId: start.emotionalProfileId,
          });
    const semanticProfile = semanticProfileDoc
      ? renderSemanticProfile(semanticProfileDoc)
      : null;

    let cardText: string;
    try {
      const prompt = buildFollowUpCardPrompt({
        tier,
        mirrorText: start.cardCtx.mirrorText,
        followUpReason: start.cardCtx.followUpReason,
        primaryEmotion: start.cardCtx.primaryEmotion,
        granularLabel: start.cardCtx.granularLabel,
        gaveUp: start.cardCtx.gaveUp,
        semanticProfile,
        compoundingDomain: start.compounding?.domain ?? null,
      });

      const raw = (await writeFollowUpCard(prompt))
        .trim()
        .replace(/^["']|["']$/g, "");
      cardText =
        raw && raw.length <= MAX_CARD_CHARS ? raw : fallbackFollowUpCard(tier);
    } catch (err) {
      console.error("[followUpCard] Haiku failed; using fallback card", {
        message: err instanceof Error ? err.message : String(err),
        sessionId: args.sessionId,
      });
      cardText = fallbackFollowUpCard(tier, start.compounding?.domain);
    }

    await ctx.runMutation(internal.followUps.createAndStart, {
      sessionId: args.sessionId,
      emotionalProfileId: start.emotionalProfileId,
      cardText,
      escalationDerived: start.escalationDerived,
      signals: start.signals,
      ...(start.compounding ? { compounding: start.compounding } : {}),
    });
  },
});

/**
 * Atomically: re-check idempotency + weight-aware supersede, start the
 * workflow, create the card row, and pin the workflowId on the session.
 */
export const createAndStart = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    emotionalProfileId: v.id("emotional_profiles"),
    cardText: v.string(),
    escalationDerived: v.boolean(),
    // Pass the pure signals so cadence/tier is computed from one source here.
    signals: v.object({
      safeguardLevel: v.union(
        v.literal("none"),
        v.literal("gentle"),
        v.literal("elevated"),
        v.literal("crisis"),
        v.null(),
      ),
      intensity: v.union(v.number(), v.null()),
      primaryEmotion: v.union(v.string(), v.null()),
      granularLabel: v.union(v.string(), v.null()),
      confirmationState: v.union(v.string(), v.null()),
    }),
    // The stretch the card names (#522); absent on an ordinary follow-up.
    compounding: v.optional(stretchRefValidator),
  },
  handler: async (ctx, args) => {
    // Idempotency: session may already have a workflow (double completion).
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session || session.followUpWorkflowId) return null;

    // Earned by compounding alone: always standard, whatever the signals say.
    const compoundingOnly = session.requiresFollowUp !== true;
    if (compoundingOnly && !args.compounding) return null;
    const cadence = followUpCadence(compoundingOnly ? {} : args.signals);
    const newTier = cadence.tier;

    // One-active-per-profile + weight-aware supersede.
    const active = await getActiveCardForProfile(ctx, args.emotionalProfileId);
    if (active && !shouldSupersede(newTier, active.tier)) {
      // Lower-weight session — skip entirely (do not start). A compounding
      // stretch stays unspent for the next session.
      return null;
    }
    // Spent only now the workflow is certain to start. A sibling session in
    // the same stretch may have spent it since getStartContext looked.
    const spent =
      !!args.compounding && (await spendStretch(ctx, args.emotionalProfileId, args.compounding, "followUpStartedAt"));
    if (compoundingOnly && !spent) return null;
    // An ordinary follow-up that lost the stretch to a sibling keeps going,
    // but without the framing: naming the domain again would be a re-fire.
    const cardText = args.compounding && !spent ? fallbackFollowUpCard(newTier) : args.cardText;
    if (active) {
      // Equal-or-higher weight — cancel the old workflow and mark superseded.
      await workflow.cancel(ctx, active.workflowId);
      await ctx.db.patch("follow_up_cards", active._id, { status: "superseded" });
    }

    const workflowId = await workflow.start(
      ctx,
      internal.followUps.followUpWorkflow,
      {
        sessionId: args.sessionId,
        emotionalProfileId: args.emotionalProfileId,
        stage1Ms: cadence.stage1Ms,
        stage2Ms: cadence.stage2Ms,
        expiryMs: cadence.expiryMs,
      },
      { onComplete: internal.followUps.onFollowUpComplete, context: {} },
    );

    await ctx.db.insert("follow_up_cards", {
      emotionalProfileId: args.emotionalProfileId,
      sessionId: args.sessionId,
      workflowId,
      tier: newTier,
      cardText,
      escalationDerived: args.escalationDerived,
      ...(spent && args.compounding ? { compoundingDomain: args.compounding.domain } : {}),
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.patch("sessions", args.sessionId, { followUpWorkflowId: workflowId });
    return null;
  },
});

// =============================================================
// Workflow-driven card transitions (all idempotent on status === "pending")
// =============================================================

export const markCardExpired = internalMutation({
  args: { workflowId: vWorkflowId },
  handler: async (ctx, args) => {
    const card = await getCardByWorkflow(ctx, args.workflowId);
    // A ready card is NEVER downgraded to expired by the timer.
    if (!card || card.status !== "pending") return null;
    await ctx.db.patch("follow_up_cards", card._id, { status: "expired" });
    return null;
  },
});

/**
 * Deliver a follow-up push. Follow-up-only gating (enabled flag only — no
 * per-type toggle, no quiet window, by deliberate early-stage design). Acute
 * tier sends a recency-anchored, wound-free body; the cardText is in-app only.
 */
export const sendFollowUpNudge = internalMutation({
  args: { workflowId: vWorkflowId },
  handler: async (ctx, args) => {
    const card = await getCardByWorkflow(ctx, args.workflowId);
    if (!card || card.status !== "pending") return null;

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", card.emotionalProfileId),
      )
      .unique();
    // The master switch is now held on by either family — chat notifications
    // or the AI's own reaching out — so it no longer implies a follow-up is
    // wanted. `gentleReturn` is the nudge family this belongs to, and it moves
    // with the master on every row written before chat had its own toggle.
    if (!prefs?.notifications.enabled || !prefs.notifications.gentleReturn) {
      return null;
    }

    // A card naming a compounding domain stays in-app: the lock screen isn't private.
    const body =
      card.tier === "acute"
        ? "Just checking in on what you worked through a little while ago. We're here."
        : card.compoundingDomain
          ? fallbackFollowUpCard(card.tier)
          : card.cardText;

    await ctx.scheduler.runAfter(0, internal.notifications.schedule, {
      emotionalProfileId: card.emotionalProfileId,
      type: "follow_up",
      content: body,
      triggerReason: `follow_up_${card.tier}`,
      followUpTier: card.tier,
      scheduledFor: Date.now(),
    });
    return null;
  },
});

/** Component onComplete hook — purge the workflow's journal tables. */
export const onFollowUpComplete = internalMutation({
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

// =============================================================
// Return detection (client → app open)
// =============================================================

/**
 * Called on app open when a pending follow-up exists. Flips the card to `ready`
 * (so the check-in sheet surfaces) and cancels the cadence workflow, guarded so
 * it only fires after the gap (never in the same sitting) and only for a
 * still-pending card. The guard lives here, not in the client, for robustness.
 */
export const markReturn = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const card = await getActiveCardForProfile(ctx, profile._id);
    if (!card) return null;

    // shouldEmitReturn already requires status === "pending" + gap elapsed.
    if (
      shouldEmitReturn({
        cardStatus: card.status,
        cardCreatedAt: card.createdAt,
        now: Date.now(),
        minGapMs: minReturnGapForTier(card.tier),
      })
    ) {
      await ctx.db.patch("follow_up_cards", card._id, { status: "ready" });
      // Stop the nudge/expiry cadence — the user is back.
      try {
        await workflow.cancel(ctx, card.workflowId);
      } catch {
        // Already terminal — nothing to cancel.
      }
    }
    return null;
  },
});

// =============================================================
// Client read + write surface (the check-in sheet + profile section)
// =============================================================

/**
 * The card to surface on reopen, if any. A `ready` card (fresh return / nudge)
 * always surfaces. An unresolved `shown` card — one the user saw but never
 * answered, e.g. backgrounded the app mid-check-in — only re-surfaces once its
 * re-show cooldown has elapsed, so it doesn't nag on every launch. Gating here
 * (server) keeps the client render pure — it never has to read the clock.
 */
export const getReadyCard = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const ready = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_profile_status", (q) =>
        q.eq("emotionalProfileId", profile._id).eq("status", "ready"),
      )
      .order("desc")
      .first();

    if (ready) return ready;

    const shown = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_profile_status", (q) =>
        q.eq("emotionalProfileId", profile._id).eq("status", "shown"),
      )
      .order("desc")
      .first();

    if (
      shown &&
      shouldReshowShownCard({ shownAt: shown.shownAt, now: Date.now() })
    ) {
      return shown;
    }
    return null;
  },
});

/**
 * Stamp a card as shown when the sheet mounts. Flips `ready → shown` on the
 * first surface, and re-stamps `shownAt` when an unresolved `shown` card
 * re-surfaces after its cooldown (client-gated) — so the next re-show cooldown
 * is measured from the latest viewing. Any terminal status is left untouched.
 */
export const markShown = mutation({
  args: { cardId: v.id("follow_up_cards") },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const card = await ctx.db.get("follow_up_cards", args.cardId);
    if (!card || card.emotionalProfileId !== profile._id) return null;
    if (card.status !== "ready" && card.status !== "shown") return null;
    await ctx.db.patch("follow_up_cards", args.cardId, { status: "shown", shownAt: Date.now() });
    return null;
  },
});

/** Resolve a card with the user's response (chip tap or backdrop dismiss). */
export const resolveCard = mutation({
  args: { cardId: v.id("follow_up_cards"), response: userResponseValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const card = await ctx.db.get("follow_up_cards", args.cardId);
    if (!card || card.emotionalProfileId !== profile._id) return null;
    if (card.status === "resolved") return null; // idempotent
    await ctx.db.patch("follow_up_cards", args.cardId, {
      status: "resolved",
      userResponse: args.response,
      resolvedAt: Date.now(),
    });
    // An answer is a reading: it can close a stretch, never open one (#519).
    // Its own transaction, so it can't fail the answer (#529).
    await ctx.scheduler.runAfter(0, internal.compounding.stretches.evaluate, { profileId: profile._id });
    return null;
  },
});

/** Profile Follow-Ups section — full history, newest first. */
// Profile teaser default. The full history will live on a dedicated
// "See all check-ins" screen (TODO) which can pass a larger limit.
const PROFILE_FOLLOWUP_LIMIT = 5;
// Hard ceiling so a client-supplied limit can never request unbounded rows.
const MAX_FOLLOWUP_LIMIT = 50;

export const listForProfile = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    // Clamp the client-provided limit: floor to an int, bound to [1, MAX],
    // and fall back to the default for missing/NaN/Infinity values.
    const requested = args.limit ?? PROFILE_FOLLOWUP_LIMIT;
    const effectiveLimit = Number.isFinite(requested)
      ? Math.min(Math.max(1, Math.floor(requested)), MAX_FOLLOWUP_LIMIT)
      : PROFILE_FOLLOWUP_LIMIT;
    return await ctx.db
      .query("follow_up_cards")
      .withIndex("by_profile_created", (q) =>
        q.eq("emotionalProfileId", profile._id),
      )
      .order("desc")
      .take(effectiveLimit);
  },
});

// =============================================================
// Privacy cleanup (called by dataWipe + accountDeletion)
// =============================================================

/**
 * Cancel any active workflow and purge all follow-up cards for a profile.
 * Idempotent; safe to call repeatedly. Returns the number of cards purged.
 */
const PURGE_BATCH_SIZE = 200;

export const purgeForProfile = internalMutation({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_profile_created", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId),
      )
      .take(PURGE_BATCH_SIZE);

    for (const card of cards) {
      if (ACTIVE_STATUSES.has(card.status)) {
        // Cancel the live workflow so it stops nudging a deleted user.
        await cancelFollowUpWorkflow(ctx, card.workflowId);
      }
      await deleteResponsesForCard(ctx, card._id);
      await ctx.db.delete("follow_up_cards", card._id);
    }

    // A profile accrues one card per session, so it can hold more than a
    // single transaction can drain. Reschedule while we filled a batch and
    // stop once the tail comes back short, so deletion clears every card.
    if (cards.length === PURGE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.followUps.purgeForProfile, {
        emotionalProfileId: args.emotionalProfileId,
      });
    }

    return cards.length;
  },
});

// =============================================================
// Internal helpers (shared lookups)
// =============================================================

async function getCardByWorkflow(
  ctx: QueryCtx,
  workflowId: Doc<"follow_up_cards">["workflowId"],
): Promise<Doc<"follow_up_cards"> | null> {
  return await ctx.db
    .query("follow_up_cards")
    .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
    .unique();
}

/** The single active (pending|ready|shown) card for a profile, if any. */
async function getActiveCardForProfile(
  ctx: QueryCtx,
  emotionalProfileId: Id<"emotional_profiles">,
): Promise<Doc<"follow_up_cards"> | null> {
  for (const status of ["pending", "ready", "shown"] as const) {
    const card = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_profile_status", (q) =>
        q.eq("emotionalProfileId", emotionalProfileId).eq("status", status),
      )
      .order("desc")
      .first();
    if (card) return card;
  }
  return null;
}

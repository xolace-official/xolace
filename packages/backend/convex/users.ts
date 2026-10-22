import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { streakState } from "./streaks/state";
import { requireAuth } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import { rankInsert } from "./lib/aggregates";
import { generateDisplayName } from "./lib/displayName";
import schema from "./schema";
import {
  intakeAnswerValidators,
  preferencesDocValidator,
} from "./lib/validators";

// Full `users` document shape, mirroring schema.ts's `users` table exactly.
const userDocValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  authProvider: v.union(v.literal("apple"), v.literal("google")),
  authProviderAccountId: v.string(),
  emotionalProfileId: v.id("emotional_profiles"),
  tokenIdentifier: v.string(),
  accountStatus: v.union(
    v.literal("active"),
    v.literal("suspended"),
    v.literal("deleted"),
    v.literal("purging"),
  ),
  deletionRequestedAt: v.optional(v.number()),
  isXolacer: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Full `emotional_profiles` document shape, derived from schema.ts so a new
// profile field can't break this query's return validation again.
const profileDocValidator = v.object({
  _id: v.id("emotional_profiles"),
  _creationTime: v.number(),
  ...schema.tables.emotional_profiles.validator.fields,
});

// Full `intake_responses` document shape, mirroring schema.ts exactly.
const intakeResponseDocValidator = v.object({
  _id: v.id("intake_responses"),
  _creationTime: v.number(),
  emotionalProfileId: v.id("emotional_profiles"),
  intakeVersion: v.number(),
  completedAt: v.number(),
  ...intakeAnswerValidators,
});

/**
 * Idempotent onboarding: find existing user by tokenIdentifier
 * or create user + emotional_profile + preferences + initial consent.
 */
export const getOrCreate = mutation({
  args: {
    // Self-reported by the client, non-authoritative — a display hint (settings
    // screen), never a security-sensitive read. Stored as given.
    authProvider: v.union(v.literal("apple"), v.literal("google")),
    // DEPRECATED(remove-after: app >= next shipped build): the server now stores
    // identity.subject (the verified Clerk user id) instead of this client arg,
    // which was untrusted and — on sign-in, where the client had no createdUserId
    // — a hardcoded placeholder string. Optional; value ignored.
    /** @deprecated server stores identity.subject; value ignored */
    authProviderAccountId: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    console.log("getOrCreate", args);
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      console.log("getOrCreate-error: not authenticated");
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existingUser) {
      // Grace period: if the user signed back in before the cron
      // purged their account, cancel the deletion and reactivate.
      // "purging" is treated the same as "deleted": the sweep has
      // claimed the account but the drain checks status per batch, so
      // flipping back to "active" stops it (accountDeletion.ts:purgeUser).
      // Without this, a stalled/failed purge leaves the user permanently
      // stuck at "purging" — never re-selected by the sweep, never able
      // to reactivate — and requireAuth locks them out.
      if (
        existingUser.accountStatus === "deleted" ||
        existingUser.accountStatus === "purging"
      ) {
        await ctx.db.patch("users", existingUser._id, {
          accountStatus: "active",
          deletionRequestedAt: undefined,
          updatedAt: Date.now(),
        });
        // Best-effort, never blocks reactivation on a Stream hiccup — see
        // `streamSetup.addToXolaceChannel`. Idempotent: Stream no-ops adding
        // an id that's already a member.
        await ctx.scheduler.runAfter(0, internal.streamSetup.addToXolaceChannel, {
          profileId: existingUser.emotionalProfileId,
        });
      }
      return existingUser._id;
    }

    const now = Date.now();

    // Create emotional profile
    const profileId = await ctx.db.insert("emotional_profiles", {
      onboardingComplete: false,
      sessionCount: 0,
      currentStreak: 0,
      dominantEmotionTags: [],
      createdAt: now,
      updatedAt: now,
    });
    await rankInsert(ctx, profileId);

    // Create preferences with defaults
    await ctx.db.insert("preferences", {
      emotionalProfileId: profileId,
      theme: "system",
      motionPreference: "system",
      reducedMotion: false,
      notifications: {
        enabled: false,
        gentleReturn: false,
        patternNudge: false,
        milestone: false,
      },
      mirrorTone: "adaptive",
      contributeByDefault: false,
      dataRetentionPreference: "indefinite",
      preferredInputType: "text",
      displayName: generateDisplayName(),
      avatarId: "default",
    });
    
    // Create user. authProviderAccountId is the server-verified Clerk subject,
    // never the client arg. authProvider is the self-reported display hint.
    const userId = await ctx.db.insert("users", {
      authProvider: args.authProvider,
      authProviderAccountId: identity.subject,
      emotionalProfileId: profileId,
      tokenIdentifier: identity.tokenIdentifier,
      accountStatus: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Initial consent records
    const consentTypes = [
      "reflection_pool_contribution",
      "nudge_delivery",
      "pattern_analysis",
    ] as const;

    for (const consentType of consentTypes) {
      await ctx.db.insert("consent_records", {
        emotionalProfileId: profileId,
        consentType,
        status: "granted",
        consentLanguageVersion: "1.0",
        grantedAt: now,
        createdAt: now,
      });
    }

    // Every camper is a member of the Xolace channel from the moment their
    // account exists (#374) — best-effort, see `streamSetup.addToXolaceChannel`.
    await ctx.scheduler.runAfter(0, internal.streamSetup.addToXolaceChannel, {
      profileId,
    });

    return userId;
  },
});

/**
 * Return the current authenticated user document.
 */
export const getCurrent = query({
  args: {},
  returns: userDocValidator,
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return user;
  },
});

/**
 * Narrow query for the session-end screen's ReachFeedbackCard. Avoids pulling
 * getFullContext into a leaf screen just for one number.
 */
export const getSessionCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    return profile.sessionCount;
  },
});

/**
 * App open: return user + profile + preferences in one call.
 */
export const getFullContext = query({
  args: {
    // The client's local day ("YYYY-MM-DD"). Value unused: it only changes the
    // subscription's args at midnight, so the cached result — and the
    // Date.now()-derived streak/reviveStreak below — re-runs without a write.
    // Optional: pre-fix clients omit it.
    day: v.optional(v.string()),
  },
  returns: v.object({
    user: userDocValidator,
    profile: profileDocValidator,
    preferences: v.union(preferencesDocValidator, v.null()),
    hasPendingFollowUp: v.boolean(),
    intake: v.union(intakeResponseDocValidator, v.null()),
    /** Freeze-aware live streak (#434) — profile.currentStreak is a stale mirror. */
    streak: v.number(),
    /** The count a streak saver would rekindle right now (#437); absent when no revive is on offer. */
    reviveStreak: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const { user, profile } = await requireAuth(ctx);

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .unique();

    // Is there an active follow-up card? The client uses this to (a) call
    // markReturn (emit the return event) only when needed — not a write on
    // every foreground — and (b) decide reopen precedence (the follow-up sheet
    // out-prioritizes ReturnWelcomeSheet). Cheap: ≤3 bounded index lookups.
    let hasPendingFollowUp = false;
    for (const status of ["pending", "ready", "shown"] as const) {
      const card = await ctx.db
        .query("follow_up_cards")
        .withIndex("by_profile_status", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("status", status)
        )
        .first();
      if (card) {
        hasPendingFollowUp = true;
        break;
      }
    }

    // The intake answers, for the client's PostHog person-property backfill
    // (T7, issue #267): an install that ran intake before the dual-write
    // shipped never re-runs it, so app open is the only place those properties
    // can still be set. One bounded index lookup, same as the rest of this.
    const intake = await ctx.db
      .query("intake_responses")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();

    const { streak, revive } = await streakState(ctx, profile);

    return { user, profile, preferences, hasPendingFollowUp, intake, streak, reviveStreak: revive?.streak };
  },
});

/**
 * Soft-delete: set accountStatus to "deleted" and record timestamp.
 * A background job will purge associated data.
 */
export const requestDeletion = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    await ctx.db.patch("users", user._id, {
      accountStatus: "deleted",
      deletionRequestedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Wipe all user content (sessions, reflections, emotional history) while
 * keeping the account, profile shell, preferences, and consent records intact.
 * Schedules a background job that processes deletions in batches.
 *
 * Idempotent: repeated calls while a wipe is in progress are no-ops.
 */
export const requestDataWipe = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    if (profile.dataWipeInProgress) {
      return null;
    }

    const { ok } = await rateLimiter.limit(ctx, "dataWipe", {
      key: profile._id,
    });
    if (!ok) {
      throw new Error("Data wipe can only be requested once every 7 days");
    }

    await ctx.db.patch("emotional_profiles", profile._id, { dataWipeInProgress: true });

    await ctx.scheduler.runAfter(0, internal.jobs.dataWipe.wipe, {
      emotionalProfileId: profile._id,
    });

    return null;
  },
});

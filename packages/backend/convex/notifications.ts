import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import { streakState } from "./streaks/state";
import {
  deletePushDevice,
  MAX_DEVICES_PER_PROFILE,
  profilePushDevices,
  prunePushDeviceHistory,
  pushNotifications,
  sendPushToProfile,
} from "./lib/pushNotifications";
import { reconcilePushDevice } from "./lib/pushDevices";
import { updateNotificationPrefs } from "./lib/notificationPrefs";
import { NUDGE_NOTIFICATION_SOUND } from "./lib/notificationSounds";

// Full `notification_log` document shape, mirroring schema.ts exactly.
const notificationLogDocValidator = v.object({
  _id: v.id("notification_log"),
  _creationTime: v.number(),
  emotionalProfileId: v.id("emotional_profiles"),
  type: v.union(
    v.literal("gentle_return"),
    v.literal("pattern_nudge"),
    v.literal("milestone"),
    v.literal("affirmation"),
    v.literal("follow_up"),
    v.literal("kindling_ready"),
    v.literal("streak_milestone"),
    v.literal("domain_unlock"),
  ),
  content: v.string(),
  triggerReason: v.string(),
  delivered: v.boolean(),
  resultedInSession: v.optional(v.boolean()),
  suppressedReason: v.optional(
    v.union(
      v.literal("rate_limit"),
      v.literal("user_inactive"),
      v.literal("escalation_active"),
    ),
  ),
  scheduledFor: v.number(),
  sentAt: v.optional(v.number()),
  createdAt: v.number(),
  reachUsed: v.optional(
    v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet")),
  ),
  patternContextUsed: v.optional(v.boolean()),
  generatedBy: v.optional(
    v.union(
      v.literal("haiku_personalized"),
      v.literal("template_cold_start"),
      v.literal("template_fallback"),
    ),
  ),
  landed: v.optional(
    v.union(
      v.literal("felt_right"),
      v.literal("too_much"),
      v.literal("not_enough"),
    ),
  ),
});

/**
 * Schedule a notification for delivery.
 * Rate-limited, then dispatched via the push notifications component.
 * Also logs to notification_log for analytics.
 */
export const schedule = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    type: v.union(
      v.literal("gentle_return"),
      v.literal("pattern_nudge"),
      v.literal("milestone"),
      v.literal("affirmation"),
      v.literal("follow_up"),
      v.literal("kindling_ready"),
      v.literal("streak_milestone"),
      v.literal("domain_unlock")
    ),
    // Defaults to "Xolace"; the unlock push carries its own (#523).
    title: v.optional(v.string()),
    content: v.string(),
    triggerReason: v.string(),
    scheduledFor: v.number(),
    // For type "follow_up" only: the cadence tier, so acute (crisis) follow-ups
    // route to their own rate-limit bucket instead of the 1/day gentle cap.
    followUpTier: v.optional(
      v.union(v.literal("acute"), v.literal("elevated"), v.literal("standard"))
    ),
    reachUsed: v.optional(v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))),
    patternContextUsed: v.optional(v.boolean()),
    generatedBy: v.optional(v.union(
      v.literal("haiku_personalized"),
      v.literal("template_cold_start"),
      v.literal("template_fallback")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Rate limit: select the bucket by type so follow-up nudges have their
    // own budget and never starve (or get starved by) the cron nudges. Acute
    // follow-ups fire two presence checks within ~5h, so they get a dedicated
    // bucket rather than the gentler 1/day followUpNudge cap.
    const bucket =
      args.type === "follow_up"
        ? args.followUpTier === "acute"
          ? "followUpAcute"
          : "followUpNudge"
        : args.type === "kindling_ready"
          ? "kindlingReady"
          : args.type === "streak_milestone"
            ? "streakMilestone"
            : args.type === "domain_unlock"
              ? "domainUnlock"
              : "notification";
    const { ok } = await rateLimiter.limit(ctx, bucket, {
      key: args.emotionalProfileId,
    });

    if (!ok) {
      await ctx.db.insert("notification_log", {
        emotionalProfileId: args.emotionalProfileId,
        type: args.type,
        content: args.content,
        triggerReason: args.triggerReason,
        delivered: false,
        suppressedReason: "rate_limit",
        scheduledFor: args.scheduledFor,
        createdAt: now,
        ...(args.reachUsed && { reachUsed: args.reachUsed }),
        ...(args.patternContextUsed !== undefined && { patternContextUsed: args.patternContextUsed }),
        ...(args.generatedBy && { generatedBy: args.generatedBy }),
      });
      return;
    }

    // Insert log first so we have the ID to embed in the notification payload.
    // The client uses this ID to mark resultedInSession when the user taps.
    const logId = await ctx.db.insert("notification_log", {
      emotionalProfileId: args.emotionalProfileId,
      type: args.type,
      content: args.content,
      triggerReason: args.triggerReason,
      delivered: true,
      sentAt: now,
      scheduledFor: args.scheduledFor,
      createdAt: now,
      ...(args.reachUsed && { reachUsed: args.reachUsed }),
      ...(args.patternContextUsed !== undefined && { patternContextUsed: args.patternContextUsed }),
      ...(args.generatedBy && { generatedBy: args.generatedBy }),
    });

    // Dispatch to every device this profile has registered. One log row
    // above, one rate-limit event above, one call here — the device count
    // changes none of that.
    await sendPushToProfile(ctx, {
      emotionalProfileId: args.emotionalProfileId,
      notification: {
        title: args.title ?? "Xolace",
        body: args.content,
        // iOS reads the sound off the payload; Android ignores it and takes the
        // sound from the channel. Sending both is what covers the two platforms
        // in one call. Deliberately not the `default` channel — that one exists
        // without a sound on every device already running the app, and a
        // channel's sound can never be changed after creation.
        sound: NUDGE_NOTIFICATION_SOUND.sound,
        channelId: NUDGE_NOTIFICATION_SOUND.channelId,
        data: { type: args.type, logId },
      },
    });
  },
});

/**
 * Register an Expo push token for the authenticated device.
 *
 * An upsert into the app-owned device registry rather than a single write to
 * the component: the component stores one token per recipient key, so keying
 * it by profile made the last device to register replace every other one.
 *
 * The payload is unchanged from before the registry existed, so old store
 * clients keep working without a compatibility branch.
 */
export const registerToken = mutation({
  args: {
    pushToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    // Single ownership. A reinstalled or handed-down device would otherwise
    // keep delivering the previous account's notifications, and the component
    // does not deduplicate by token — two profiles holding one token means two
    // pushes to one phone.
    const rowsForToken = await ctx.db
      .query("push_devices")
      .withIndex("by_token", (q) => q.eq("expoPushToken", args.pushToken))
      .take(MAX_DEVICES_PER_PROFILE);

    const { keepId, deleteIds } = reconcilePushDevice(rowsForToken, profile._id);

    for (const staleId of deleteIds) {
      await deletePushDevice(ctx, staleId);
    }

    const now = Date.now();
    let deviceId = keepId;
    if (deviceId) {
      await ctx.db.patch("push_devices", deviceId, { lastRegisteredAt: now });
    } else {
      deviceId = await ctx.db.insert("push_devices", {
        emotionalProfileId: profile._id,
        expoPushToken: args.pushToken,
        lastRegisteredAt: now,
      });
    }

    await pushNotifications.recordToken(ctx, {
      userId: deviceId,
      pushToken: args.pushToken,
    });

    // This device just proved it is alive, so its stored notification history
    // has nothing left to say — and the component never prunes that history on
    // its own, so every title and body we have ever sent is sitting in it.
    // Clearing it here also resets the delivery verdict the reaper reads.
    await prunePushDeviceHistory(ctx, deviceId);

    // Retire any pre-migration profile-keyed recipient, which would otherwise
    // duplicate every notification to this same device. Idempotent, and the
    // only available move — the component never exposes the token it stored,
    // so there is nothing to match on.
    await pushNotifications.removeToken(ctx, { userId: profile._id });

    // Auto-enable notification preferences on first token registration
    // so cron jobs include this user. If the user later disables via
    // Settings, the client writes the preferences off itself and calls
    // removeToken only to detach this device's token.
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .unique();

    if (preferences && !preferences.notifications.enabled) {
      await updateNotificationPrefs(ctx, profile._id, {
        enabled: true,
        gentleReturn: true,
        patternNudge: true,
        milestone: true,
        // Chat notifications ride the same permission grant and the same
        // token; a user who just allowed notifications gets the feature
        // without having to find a setting.
        chat: true,
        reach: preferences.notifications.reach ?? "warm",
      });
    }

    return null;
  },
});

/**
 * Unregister a push token for the authenticated user.
 *
 * Scoped to the calling device: disabling notifications on a phone must
 * not silence a tablet. The account-wide "off" is the preference, which both
 * dispatch paths gate on, not the token.
 */
export const removeToken = mutation({
  args: {
    // DEPRECATED(remove-after: app >= 1.9.0): absent pushToken means "remove
    // every device for this profile". Old store clients call removeToken({})
    // with no argument, and that is what the master switch meant to them —
    // identical behavior for a single-device user. Require the token once no
    // store-published client omits it.
    pushToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const devices = await profilePushDevices(ctx, profile._id);

    const targets = args.pushToken
      ? devices.filter((device) => device.expoPushToken === args.pushToken)
      : devices;

    for (const device of targets) {
      await deletePushDevice(ctx, device._id);
    }

    // Once nothing is left, retire the pre-migration profile-keyed recipient
    // too, or the fan-out fallback would keep reaching a device that just
    // unregistered.
    if (targets.length === devices.length) {
      await pushNotifications.removeToken(ctx, { userId: profile._id });
    }

    return null;
  },
});

/**
 * Mark a notification as having resulted in a session.
 * Called from the client when the user taps a notification and opens the app.
 */
export const markResultedInSession = mutation({
  args: {
    logId: v.id("notification_log"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const log = await ctx.db.get("notification_log", args.logId);
    if (!log) return null;

    // Ownership check — only the profile that received it can mark it
    if (log.emotionalProfileId !== profile._id) return null;

    await ctx.db.patch("notification_log", args.logId, { resultedInSession: true });
    return null;
  },
});

/**
 * Mark a notification as delivered.
 */
export const markDelivered = internalMutation({
  args: {
    notificationId: v.id("notification_log"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("notification_log", args.notificationId, {
      delivered: true,
      sentAt: Date.now(),
    });
  },
});

/**
 * Record user feedback on a notification's emotional landing.
 * Called by the "What landed?" card shown after milestone sessions.
 * Ownership-gated: only the receiving profile can record feedback.
 */
export const recordLandedPublic = mutation({
  args: {
    notificationId: v.id("notification_log"),
    landed: v.union(
      v.literal("felt_right"),
      v.literal("too_much"),
      v.literal("not_enough")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const log = await ctx.db.get("notification_log", args.notificationId);
    if (!log || log.emotionalProfileId !== profile._id) return null;
    await ctx.db.patch("notification_log", args.notificationId, { landed: args.landed });
    return null;
  },
});

/**
 * Load the context needed to generate a personalized notification.
 * Called by the generateNotification action.
 */
export const loadGenerationContext = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) return null;

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .unique();

    // Most recent completed session for mood/confirmation context
    const recentSessions = await ctx.db
      .query("sessions")
      .withIndex("by_profile_state", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).eq("state", "completed")
      )
      .order("desc")
      .take(1);
    const lastSession = recentSessions[0] ?? null;

    // Most recent emotional metadata for userLanguageTags
    const recentMetadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_theme", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .order("desc")
      .take(3);

    // Recent notification content to avoid template repetition
    const recentNotifications = await ctx.db
      .query("notification_log")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .order("desc")
      .take(5);

    // Aggregate userLanguageTags from recent metadata
    const tagFrequency: Record<string, number> = {};
    for (const meta of recentMetadata) {
      for (const tag of meta.userLanguageTags) {
        tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
      }
    }
    const userLanguageTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    return {
      // The stored currentStreak is a stale mirror; the writer gets the live one.
      profile: { ...profile, currentStreak: (await streakState(ctx, profile)).streak },
      preferences,
      lastSession,
      userLanguageTags,
      recentNotificationContent: recentNotifications.map((n) => n.content),
    };
  },
});

/**
 * List recent notifications for the current user's profile.
 */
export const list = query({
  args: {},
  returns: v.array(notificationLogDocValidator),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    return await ctx.db
      .query("notification_log")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .order("desc")
      .take(20);
  },
});

/**
 * Return the most recent delivered notification for the current user's profile,
 * or null if none exist. Used by the feedback card shown after milestone sessions.
 */
export const lastDelivered = query({
  args: {},
  returns: v.union(notificationLogDocValidator, v.null()),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    // `by_profile` is (emotionalProfileId, sentAt) and sentAt is only ever
    // written alongside delivered: true, so the descending head is already the
    // most recent delivered row — undelivered rows have no sentAt and sort
    // below every number.
    const latest = await ctx.db
      .query("notification_log")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .order("desc")
      .first();

    if (!latest || !latest.sentAt) return null;
    return latest;
  },
});

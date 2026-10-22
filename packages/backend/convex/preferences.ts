import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import {
  preferencesDocValidator,
  mirrorToneValidator,
  motionPreferenceValidator,
} from "./lib/validators";
import { validateSpaceName } from "./lib/spaceName";
import { updateNotificationPrefs } from "./lib/notificationPrefs";
import { requirePremium, hasPremium } from "./lib/premium";
import { talkDirectnessValidator, talkPaceValidator, voiceSlugValidator } from "./lib/voices";

/**
 * Get the user's quote preferences (themes, notification settings).
 * Returns null if the user hasn't set up quotes preferences yet.
 */
export const getQuotePreferences = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      themes: v.array(v.string()),
      notificationEnabled: v.boolean(),
      notificationTime: v.optional(v.string()),
      shownQuoteIds: v.array(v.id("quotes")),
    }),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();
    return prefs?.quotes ?? null;
  },
});

/**
 * Save quote preferences (themes + notification settings).
 * Called from PreferenceSetupSheet when the user completes setup.
 */
export const updateQuotePreferences = mutation({
  args: {
    themes: v.array(v.string()),
    notificationEnabled: v.boolean(),
    notificationTime: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
      .unique();

    if (!prefs) throw new Error("Preferences not found");

    const existing = prefs.quotes;
    await ctx.db.patch("preferences", prefs._id, {
      quotes: {
        themes: args.themes,
        notificationEnabled: args.notificationEnabled,
        notificationTime: args.notificationTime,
        shownQuoteIds: existing?.shownQuoteIds ?? [],
      },
    });

    return null;
  },
});

/**
 * Fetch preferences for the current user's profile.
 */
export const get = query({
  args: {},
  returns: preferencesDocValidator,
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .unique();

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    return preferences;
  },
});

/**
 * Whether the user has "share by default" enabled.
 * Narrow query to avoid re-renders from unrelated preference changes.
 */
export const getContributeByDefault = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .unique();

    return preferences?.contributeByDefault ?? false;
  },
});

/**
 * Partial update of preferences. All fields optional.
 */
export const update = mutation({
  args: {
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    // Tri-state motion preference. Source of truth going forward.
    motionPreference: v.optional(motionPreferenceValidator),
    // Back-compat boolean mirror. Kept in sync with motionPreference below.
    reducedMotion: v.optional(v.boolean()),
    notifications: v.optional(
      v.object({
        enabled: v.boolean(),
        gentleReturn: v.boolean(),
        patternNudge: v.boolean(),
        milestone: v.boolean(),
        streakMilestone: v.optional(v.boolean()),
        // Accepted so the object a client read back is still a legal argument.
        // Without it, any caller that spreads the stored preferences instead of
        // building a literal would fail argument validation outright.
        chat: v.optional(v.boolean()),
        reach: v.optional(v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))),
        quietWindow: v.optional(v.object({ dontReachBefore: v.number(), dontReachAfter: v.number() })),
        timezone: v.optional(v.string()),
      })
    ),
    // Notification sub-field updates — update just one field without replacing the whole object.
    notificationReach: v.optional(v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))),
    notificationQuietWindow: v.optional(v.union(
      v.object({ dontReachBefore: v.number(), dontReachAfter: v.number() }),
      v.null()
    )),
    notificationTimezone: v.optional(v.string()),
    mirrorTone: v.optional(mirrorToneValidator),
    // Set-only-true. Sent by a client that saw the user reach for a tone they
    // don't have — the mutation can't infer that one, since it throws before
    // the write. A changed `mirrorTone` sets the same flag below.
    registerComplaint: v.optional(v.boolean()),
    contributeByDefault: v.optional(v.boolean()),
    // Personal memory (Cognition Layer §1.1b). Off = new sessions embed
    // metadata-only into episodic memory.
    personalMemoryEnabled: v.optional(v.boolean()),
    dataRetentionPreference: v.optional(
      v.union(
        v.literal("indefinite"),
        v.literal("6_months"),
        v.literal("1_year")
      )
    ),
    preferredInputType: v.optional(
      v.union(v.literal("text"), v.literal("voice"))
    ),
    colorTheme: v.optional(v.string()),
    // null = clear the name; string = set/update; undefined = no-op
    spaceName: v.optional(v.union(v.string(), v.null())),
    spaceNamePromptDismissed: v.optional(v.boolean()),
    // Plus-only custom voice. null clears back to "Auto"; a slug sets it;
    // undefined = no-op. Gated below, same shape as spaceName.
    voice: v.optional(v.union(voiceSlugValidator, v.null())),
    // The companion in a talk (#603); null clears back to the default.
    talkVoice: v.optional(v.union(voiceSlugValidator, v.null())),
    talkPace: v.optional(talkPaceValidator),
    talkDirectness: v.optional(v.union(talkDirectnessValidator, v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", profile._id)
      )
      .unique();

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    if (args.mirrorTone === "witnessed") {
      await requirePremium(ctx, profile, "witnessed mirror tone");
    }

    // Setting a voice is Plus-only; clearing it (null) is always allowed.
    if (args.voice != null) {
      await requirePremium(ctx, profile, "custom voice");
    }

    // Build patch from provided args only
    const patch: Record<string, unknown> = {};
    if (args.theme !== undefined) patch.theme = args.theme;
    // Keep motionPreference (source of truth) and reducedMotion (back-compat
    // mirror) in sync regardless of which one the caller wrote:
    //  - New UI writes motionPreference → mirror to the boolean (reduced only
    //    when forced "reduced"; "system"/"full" both map to false).
    //  - Old UI writes reducedMotion → project onto the tri-state
    //    (true → "reduced", false → "system"), preserving the resolver.
    if (args.motionPreference !== undefined) {
      patch.motionPreference = args.motionPreference;
      patch.reducedMotion = args.motionPreference === "reduced";
    } else if (args.reducedMotion !== undefined) {
      patch.reducedMotion = args.reducedMotion;
      patch.motionPreference = args.reducedMotion ? "reduced" : "system";
    }

    if (args.mirrorTone !== undefined) patch.mirrorTone = args.mirrorTone;

    // Changing how the mirror speaks is the register complaint — it's the act,
    // there is no separate "I don't like the tone" surface. Set-only-true, so
    // a later switch back doesn't erase the signal.
    const changedTone =
      args.mirrorTone !== undefined && args.mirrorTone !== preferences.mirrorTone;
    if (!preferences.registerComplaint && (changedTone || args.registerComplaint)) {
      patch.registerComplaint = true;
    }
    if (args.contributeByDefault !== undefined)
      patch.contributeByDefault = args.contributeByDefault;
    // Turning personal memory OFF has to reach backwards: new replies stop
    // being embedded on their own, but the ones already in the namespace
    // would otherwise keep answering searches.
    const memoryTurnedOff =
      args.personalMemoryEnabled === false &&
      preferences.personalMemoryEnabled !== false;
    if (args.personalMemoryEnabled !== undefined)
      patch.personalMemoryEnabled = args.personalMemoryEnabled;
    if (args.dataRetentionPreference !== undefined)
      patch.dataRetentionPreference = args.dataRetentionPreference;
    if (args.preferredInputType !== undefined)
      patch.preferredInputType = args.preferredInputType;
    if (args.colorTheme !== undefined) patch.colorTheme = args.colorTheme;
    if (args.spaceName !== undefined) {
      if (args.spaceName === null) {
        patch.spaceName = undefined;
      } else {
        const result = validateSpaceName(args.spaceName);
        if (!result.ok) throw new Error(result.message);
        patch.spaceName = result.trimmed;
      }
    }
    if (args.spaceNamePromptDismissed !== undefined) {
      patch.spaceNamePromptDismissed = args.spaceNamePromptDismissed;
    }
    if (args.voice !== undefined) patch.voice = args.voice ?? undefined;
    if (args.talkVoice !== undefined) patch.talkVoice = args.talkVoice ?? undefined;
    if (args.talkPace !== undefined) patch.talkPace = args.talkPace;
    if (args.talkDirectness !== undefined) patch.talkDirectness = args.talkDirectness ?? undefined;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("preferences", preferences._id, patch);
    }

    if (memoryTurnedOff) {
      await ctx.scheduler.runAfter(
        0,
        internal.episodicMemory.purgeAllRepliesForProfile,
        { emotionalProfileId: profile._id },
      );
    }

    // Notification writes are merges, never replacements. `args.notifications`
    // is the whole-object form the settings toggles send, and it carries only
    // the fields whatever UI is installed knows about — a shipped client that
    // predates a preference would otherwise silently erase it on an unrelated
    // toggle. Absent-means-enabled makes that erasure fail open, which is the
    // worse direction: someone who muted chat would start being pushed again.
    if (args.notifications !== undefined) {
      await updateNotificationPrefs(
        ctx,
        preferences.emotionalProfileId,
        args.notifications,
      );
    }

    // Sub-field merges run last so they win over the whole-object form above.
    if (
      args.notificationReach !== undefined ||
      args.notificationQuietWindow !== undefined ||
      args.notificationTimezone !== undefined
    ) {
      await updateNotificationPrefs(ctx, preferences.emotionalProfileId, {
        ...(args.notificationReach !== undefined && { reach: args.notificationReach }),
        ...(args.notificationQuietWindow !== undefined && {
          quietWindow: args.notificationQuietWindow ?? undefined,
        }),
        ...(args.notificationTimezone !== undefined && { timezone: args.notificationTimezone }),
      });
    }

    return null;
  },
});

/**
 * Resolve the effective custom-voice slug for a profile, re-checking premium.
 * Used by the vent pipeline, which runs mid-action with no auth context.
 * Returns null when there's no voice preference OR the subscription lapsed —
 * the caller then falls back to the default vent voice.
 */
export const getResolvedVoiceSlug = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args): Promise<string | null> => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) return null;
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId),
      )
      .unique();
    if (!prefs?.voice) return null;
    return (await hasPremium(ctx, profile)) ? prefs.voice : null;
  },
});


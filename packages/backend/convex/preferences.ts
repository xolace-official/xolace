import { type ObjectType, v } from "convex/values";
import { internal } from "./_generated/api";
import {
	internalQuery,
	type MutationCtx,
	mutation,
	query,
} from "./_generated/server";
import {
	dailyQuoteChoiceValidator,
	dailyQuoteSettingValidator,
} from "./dailyQuotes/validators";
import { requireAuth } from "./lib/auth";
import { updateNotificationPrefs } from "./lib/notificationPrefs";
import { hasPremium, requirePremium } from "./lib/premium";
import { validateSpaceName } from "./lib/spaceName";
import {
	dataRetentionPreferenceValidator,
	mirrorToneValidator,
	motionPreferenceValidator,
	preferencesDocValidator,
} from "./lib/validators";
import {
	talkDirectnessValidator,
	talkLookValidator,
	talkPaceValidator,
	talkViewValidator,
	voiceSlugValidator,
} from "./lib/voices";
import { outreachChannelValidator } from "./outreach/validators";

/**
 * Get the user's quote preferences (themes, notification settings).
 * Returns null if the user hasn't set up quotes preferences yet.
 */
export const getQuotePreferences = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		return prefs?.quotes ?? null;
	},
	returns: v.union(
		v.null(),
		v.object({
			notificationEnabled: v.boolean(),
			notificationTime: v.optional(v.string()),
			shownQuoteIds: v.array(v.id("quotes")),
			themes: v.array(v.string()),
		})
	),
});

/**
 * Save quote preferences (themes + notification settings).
 * Called from PreferenceSetupSheet when the user completes setup.
 */
export const updateQuotePreferences = mutation({
	args: {
		/**
		 * @deprecated The daily quote is a server push now (B19):
		 * `notifications.dailyQuote`, set through `update`'s
		 * `notificationDailyQuote`.
		 */
		// DEPRECATED(remove-after: app >= first version with the daily quote push, B19): kept for builds that still schedule the on-device reminders; `dailyQuotes/pushSettings.adoptLegacyReminders` carries the value over once.
		notificationEnabled: v.boolean(),
		/** @deprecated See `notificationEnabled`. */
		notificationTime: v.optional(v.string()),
		themes: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();

		if (!prefs) {
			throw new Error("Preferences not found");
		}

		const existing = prefs.quotes;
		await ctx.db.patch("preferences", prefs._id, {
			quotes: {
				notificationEnabled: args.notificationEnabled,
				notificationTime: args.notificationTime,
				shownQuoteIds: existing?.shownQuoteIds ?? [],
				themes: args.themes,
			},
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Fetch preferences for the current user's profile.
 */
export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();

		if (!preferences) {
			throw new Error("Preferences not found");
		}

		return preferences;
	},
	returns: preferencesDocValidator,
});

/**
 * Whether the user has "share by default" enabled.
 * Narrow query to avoid re-renders from unrelated preference changes.
 */
export const getContributeByDefault = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();

		return preferences?.contributeByDefault ?? false;
	},
	returns: v.boolean(),
});

const updateArgs = {
	colorTheme: v.optional(v.string()),
	contributeByDefault: v.optional(v.boolean()),
	dataRetentionPreference: v.optional(dataRetentionPreferenceValidator),
	mirrorTone: v.optional(mirrorToneValidator),
	// Tri-state motion preference. Source of truth going forward.
	motionPreference: v.optional(motionPreferenceValidator),
	/**
	 * The daily quote push (B19): on or off, and when. Clears a backoff
	 * pause. The Settings switch and the Quotes screen's one-time offer write it.
	 */
	notificationDailyQuote: v.optional(dailyQuoteChoiceValidator),
	notificationQuietWindow: v.optional(
		v.union(
			v.object({ dontReachAfter: v.number(), dontReachBefore: v.number() }),
			v.null()
		)
	),
	// Notification sub-field updates — update just one field without replacing the whole object.
	notificationReach: v.optional(
		v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))
	),
	notifications: v.optional(
		v.object({
			// Accepted so the object a client read back is still a legal argument.
			// Without it, any caller that spreads the stored preferences instead of
			// building a literal would fail argument validation outright.
			achievement: v.optional(v.boolean()),
			// Accepted for the same reason, then dropped: channel order is
			// written only by linking and "Try this first" (convex/outreach).
			channelOrder: v.optional(v.array(outreachChannelValidator)),
			chat: v.optional(v.boolean()),
			// Accepted so a client echoing what `get` returned never fails
			// validation, then dropped; set it with `notificationDailyQuote`.
			dailyQuote: v.optional(dailyQuoteSettingValidator),
			enabled: v.boolean(),
			gentleReturn: v.boolean(),
			// The letters push (absent = on). Merged like the flags above; the
			// letters screen's own switch is `letters.settings.setPush`.
			letters: v.optional(v.boolean()),
			milestone: v.boolean(),
			patternNudge: v.boolean(),
			quietWindow: v.optional(
				v.object({ dontReachAfter: v.number(), dontReachBefore: v.number() })
			),
			reach: v.optional(
				v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))
			),
			// DEPRECATED(remove-after: data): value ignored since badge pushes
			// replaced the streak-milestone push (#700); see DEPRECATIONS.md.
			streakMilestone: v.optional(v.boolean()),
			timezone: v.optional(v.string()),
		})
	),
	notificationTimezone: v.optional(v.string()),
	// Personal memory (Cognition Layer §1.1b). Off = new sessions embed
	// metadata-only into episodic memory.
	personalMemoryEnabled: v.optional(v.boolean()),
	preferredInputType: v.optional(
		v.union(v.literal("text"), v.literal("voice"))
	),
	// Back-compat boolean mirror. Kept in sync with motionPreference below.
	reducedMotion: v.optional(v.boolean()),
	// Set-only-true. Sent by a client that saw the user reach for a tone they
	// don't have — the mutation can't infer that one, since it throws before
	// the write. A changed `mirrorTone` sets the same flag below.
	registerComplaint: v.optional(v.boolean()),
	// null = clear the name; string = set/update; undefined = no-op
	spaceName: v.optional(v.union(v.string(), v.null())),
	spaceNamePromptDismissed: v.optional(v.boolean()),
	talkDirectness: v.optional(v.union(talkDirectnessValidator, v.null())),
	// The companion's look, by preset name.
	talkLook: v.optional(talkLookValidator),
	talkPace: v.optional(talkPaceValidator),
	// The talk view they last chose; kept for every talk.
	talkView: v.optional(talkViewValidator),
	// The companion in a talk (#603); null clears back to the default.
	talkVoice: v.optional(v.union(voiceSlugValidator, v.null())),
	theme: v.optional(
		v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
	),
	// Plus-only custom voice. null clears back to "Auto"; a slug sets it;
	// undefined = no-op. Gated below, same shape as spaceName.
	voice: v.optional(v.union(voiceSlugValidator, v.null())),
};

/**
 * `update`'s handler. Also the path `privacy/retention.applyRetentionNow`
 * saves a retention preference through, so the two can't disagree.
 */
export async function updatePreferences(
	ctx: MutationCtx,
	args: ObjectType<typeof updateArgs>
): Promise<null> {
	const { profile } = await requireAuth(ctx);

	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
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
	if (args.theme !== undefined) {
		patch.theme = args.theme;
	}
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

	if (args.mirrorTone !== undefined) {
		patch.mirrorTone = args.mirrorTone;
	}

	// Changing how the mirror speaks is the register complaint — it's the act,
	// there is no separate "I don't like the tone" surface. Set-only-true, so
	// a later switch back doesn't erase the signal.
	const changedTone =
		args.mirrorTone !== undefined && args.mirrorTone !== preferences.mirrorTone;
	if (
		!preferences.registerComplaint &&
		(changedTone || args.registerComplaint)
	) {
		patch.registerComplaint = true;
	}
	if (args.contributeByDefault !== undefined) {
		patch.contributeByDefault = args.contributeByDefault;
	}
	// Turning personal memory OFF has to reach backwards: new replies stop
	// being embedded on their own, but the ones already in the namespace
	// would otherwise keep answering searches.
	const memoryTurnedOff =
		args.personalMemoryEnabled === false &&
		preferences.personalMemoryEnabled !== false;
	if (args.personalMemoryEnabled !== undefined) {
		patch.personalMemoryEnabled = args.personalMemoryEnabled;
	}
	if (args.dataRetentionPreference !== undefined) {
		patch.dataRetentionPreference = args.dataRetentionPreference;
	}
	if (args.preferredInputType !== undefined) {
		patch.preferredInputType = args.preferredInputType;
	}
	if (args.colorTheme !== undefined) {
		patch.colorTheme = args.colorTheme;
	}
	if (args.spaceName !== undefined) {
		if (args.spaceName === null) {
			patch.spaceName = undefined;
		} else {
			const result = validateSpaceName(args.spaceName);
			if (!result.ok) {
				throw new Error(result.message);
			}
			patch.spaceName = result.trimmed;
		}
	}
	if (args.spaceNamePromptDismissed !== undefined) {
		patch.spaceNamePromptDismissed = args.spaceNamePromptDismissed;
	}
	if (args.voice !== undefined) {
		patch.voice = args.voice ?? undefined;
	}
	if (args.talkVoice !== undefined) {
		patch.talkVoice = args.talkVoice ?? undefined;
	}
	if (args.talkPace !== undefined) {
		patch.talkPace = args.talkPace;
	}
	if (args.talkDirectness !== undefined) {
		patch.talkDirectness = args.talkDirectness ?? undefined;
	}
	if (args.talkLook !== undefined) {
		patch.talkLook = args.talkLook;
	}
	if (args.talkView !== undefined) {
		patch.talkView = args.talkView;
	}

	if (Object.keys(patch).length > 0) {
		await ctx.db.patch("preferences", preferences._id, patch);
	}

	if (memoryTurnedOff) {
		await ctx.scheduler.runAfter(
			0,
			internal.episodicMemory.purgeAllRepliesForProfile,
			{ emotionalProfileId: profile._id }
		);
	}

	// Notification writes are merges, never replacements. `args.notifications`
	// is the whole-object form the settings toggles send, and it carries only
	// the fields whatever UI is installed knows about — a shipped client that
	// predates a preference would otherwise silently erase it on an unrelated
	// toggle. Absent-means-enabled makes that erasure fail open, which is the
	// worse direction: someone who muted chat would start being pushed again.
	if (args.notifications !== undefined) {
		// The daily quote is set only through `notificationDailyQuote`: an
		// echo read before the backoff paused it would turn it back on.
		const {
			channelOrder: _ignored,
			dailyQuote: _echoed,
			...notifications
		} = args.notifications;
		await updateNotificationPrefs(
			ctx,
			preferences.emotionalProfileId,
			notifications
		);
	}

	// Sub-field merges run last so they win over the whole-object form above.
	if (args.notificationDailyQuote !== undefined) {
		await updateNotificationPrefs(ctx, preferences.emotionalProfileId, {
			dailyQuote: {
				enabled: args.notificationDailyQuote.enabled,
				slot: args.notificationDailyQuote.slot,
			},
		});
	}

	if (
		args.notificationReach !== undefined ||
		args.notificationQuietWindow !== undefined ||
		args.notificationTimezone !== undefined
	) {
		await updateNotificationPrefs(ctx, preferences.emotionalProfileId, {
			...(args.notificationReach !== undefined && {
				reach: args.notificationReach,
			}),
			...(args.notificationQuietWindow !== undefined && {
				quietWindow: args.notificationQuietWindow ?? undefined,
			}),
			...(args.notificationTimezone !== undefined && {
				timezone: args.notificationTimezone,
			}),
		});
	}

	return null;
}

/**
 * Partial update of preferences. All fields optional.
 */
export const update = mutation({
	args: updateArgs,
	handler: updatePreferences,
	returns: v.null(),
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
		const profile = await ctx.db.get(
			"emotional_profiles",
			args.emotionalProfileId
		);
		if (!profile) {
			return null;
		}
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.unique();
		if (!prefs?.voice) {
			return null;
		}
		return (await hasPremium(ctx, profile)) ? prefs.voice : null;
	},
});

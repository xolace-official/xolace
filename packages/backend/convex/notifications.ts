import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { updateNotificationPrefs } from "./lib/notificationPrefs";
import { reconcilePushDevice } from "./lib/pushDevices";
import {
	deletePushDevice,
	MAX_DEVICES_PER_PROFILE,
	profilePushDevices,
	prunePushDeviceHistory,
	pushNotifications,
} from "./lib/pushNotifications";
import { openEscalationCard } from "./outreach/router";
import type { OutreachIntent } from "./outreach/validators";
import { streakState } from "./streaks/state";

// Full `notification_log` document shape, mirroring schema.ts exactly.
const notificationLogDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("notification_log"),
	content: v.string(),
	createdAt: v.number(),
	delivered: v.boolean(),
	emotionalProfileId: v.id("emotional_profiles"),
	generatedBy: v.optional(
		v.union(
			v.literal("haiku_personalized"),
			v.literal("template_cold_start"),
			v.literal("template_fallback")
		)
	),
	landed: v.optional(
		v.union(
			v.literal("felt_right"),
			v.literal("too_much"),
			v.literal("not_enough")
		)
	),
	outreachId: v.optional(v.id("outreach")),
	patternContextUsed: v.optional(v.boolean()),
	reachUsed: v.optional(
		v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))
	),
	resultedInSession: v.optional(v.boolean()),
	scheduledFor: v.number(),
	sentAt: v.optional(v.number()),
	suppressedReason: v.optional(
		v.union(
			v.literal("rate_limit"),
			v.literal("user_inactive"),
			v.literal("escalation_active")
		)
	),
	triggerReason: v.string(),
	type: v.union(
		v.literal("gentle_return"),
		v.literal("pattern_nudge"),
		v.literal("milestone"),
		v.literal("affirmation"),
		v.literal("follow_up"),
		v.literal("kindling_ready"),
		v.literal("streak_milestone"),
		v.literal("domain_unlock"),
		v.literal("achievement")
	),
});

/**
 * Each old type `schedule` still sends, as an intent. The inverse, for the
 * push payload, is `legacyNotificationType` in outreach/push.ts.
 */
const LEGACY_TYPE_INTENT: Record<
	Exclude<Doc<"notification_log">["type"], "streak_milestone">,
	OutreachIntent
> = {
	achievement: "achievement",
	affirmation: "gentle_return",
	domain_unlock: "domain_unlock",
	follow_up: "nudge",
	gentle_return: "gentle_return",
	kindling_ready: "kindling_ready",
	milestone: "milestone",
	pattern_nudge: "pattern_nudge",
};

/**
 * @deprecated Callers reach out through `outreach.enqueue` (#760, #764).
 * Kept, with its validator, for calls scheduled before the push cutover:
 * scheduled functions run the current code with the args they were given.
 *
 * Maps today's args onto `enqueue`: `follow_up` → `nudge` (`followUpTier` →
 * `tier`), `affirmation` → `gentle_return` + `provenance.affirmation`,
 * `streak_milestone` → nothing sent (#700), `title` → `content.title`.
 * `scheduledFor` is ignored, as it always was.
 */
// DEPRECATED(remove-after: backend deploys after #764 have drained every
// `schedule` call scheduled before it; internal, so no app version gates it):
// use `internal.outreach.enqueue.enqueue`.
export const schedule = internalMutation({
	args: {
		content: v.string(),
		emotionalProfileId: v.id("emotional_profiles"),
		// For type "follow_up" only: the cadence tier, so acute (crisis) follow-ups
		// route to their own rate-limit bucket instead of the 1/day gentle cap.
		followUpTier: v.optional(
			v.union(v.literal("acute"), v.literal("elevated"), v.literal("standard"))
		),
		generatedBy: v.optional(
			v.union(
				v.literal("haiku_personalized"),
				v.literal("template_cold_start"),
				v.literal("template_fallback")
			)
		),
		patternContextUsed: v.optional(v.boolean()),
		reachUsed: v.optional(
			v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet"))
		),
		scheduledFor: v.number(),
		// Defaults to "Xolace"; the unlock and badge pushes carry their own.
		title: v.optional(v.string()),
		triggerReason: v.string(),
		type: v.union(
			v.literal("gentle_return"),
			v.literal("pattern_nudge"),
			v.literal("milestone"),
			v.literal("affirmation"),
			v.literal("follow_up"),
			v.literal("kindling_ready"),
			v.literal("streak_milestone"),
			v.literal("domain_unlock"),
			v.literal("achievement")
		),
	},
	handler: async (ctx, args) => {
		if (args.type === "streak_milestone") {
			return null;
		}
		const affirmation = args.type === "affirmation";
		const intent = LEGACY_TYPE_INTENT[args.type];
		// Old args name no card. An acute follow-up then is the open
		// escalation-derived card's own nudge, which its hold must let through.
		const escalationCard =
			intent === "nudge" && args.followUpTier === "acute"
				? await openEscalationCard(ctx, args.emotionalProfileId)
				: null;
		await ctx.runMutation(internal.outreach.enqueue.enqueue, {
			content: {
				body: args.content,
				...(args.title !== undefined && { title: args.title }),
			},
			emotionalProfileId: args.emotionalProfileId,
			intent,
			provenance: {
				triggerReason: args.triggerReason,
				...(affirmation && { affirmation: true }),
				...(args.generatedBy && { generatedBy: args.generatedBy }),
				...(args.patternContextUsed !== undefined && {
					patternContextUsed: args.patternContextUsed,
				}),
				...(args.reachUsed && { reachUsed: args.reachUsed }),
			},
			...(intent === "nudge" &&
				args.followUpTier && { tier: args.followUpTier }),
			...(escalationCard && { followUpId: escalationCard._id }),
		});
		return null;
	},
	returns: v.null(),
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

		const { keepId, deleteIds } = reconcilePushDevice(
			rowsForToken,
			profile._id
		);

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
			pushToken: args.pushToken,
			userId: deviceId,
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
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();

		if (preferences && !preferences.notifications.enabled) {
			await updateNotificationPrefs(ctx, profile._id, {
				// Chat notifications ride the same permission grant and the same
				// token; a user who just allowed notifications gets the feature
				// without having to find a setting.
				chat: true,
				enabled: true,
				gentleReturn: true,
				milestone: true,
				patternNudge: true,
				reach: preferences.notifications.reach ?? "warm",
			});
		}

		return null;
	},
	returns: v.null(),
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
	returns: v.null(),
});

/**
 * Mark a notification as having resulted in a session.
 * Called from the client when the user taps a notification and opens the app.
 */
export const markResultedInSession = mutation({
	args: {
		logId: v.id("notification_log"),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const log = await ctx.db.get("notification_log", args.logId);
		if (!log) {
			return null;
		}

		// Ownership check — only the profile that received it can mark it
		if (log.emotionalProfileId !== profile._id) {
			return null;
		}

		await ctx.db.patch("notification_log", args.logId, {
			resultedInSession: true,
		});
		// The outreach is what new readers attribute sessions from (#764).
		if (log.outreachId) {
			await ctx.db.patch("outreach", log.outreachId, {
				resultedInSession: true,
			});
		}
		return null;
	},
	returns: v.null(),
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
		landed: v.union(
			v.literal("felt_right"),
			v.literal("too_much"),
			v.literal("not_enough")
		),
		notificationId: v.id("notification_log"),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const log = await ctx.db.get("notification_log", args.notificationId);
		if (!log || log.emotionalProfileId !== profile._id) {
			return null;
		}
		await ctx.db.patch("notification_log", args.notificationId, {
			landed: args.landed,
		});
		return null;
	},
	returns: v.null(),
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
		const profile = await ctx.db.get(
			"emotional_profiles",
			args.emotionalProfileId
		);
		if (!profile) {
			return null;
		}

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
				q
					.eq("emotionalProfileId", args.emotionalProfileId)
					.eq("state", "completed")
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

		// Recent outreach copy, to avoid template repetition. Read from the
		// layer (#764): it holds every channel's, deferred ones included.
		const recentOutreach = await ctx.db
			.query("outreach")
			.withIndex("by_profile_created", (q) =>
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
			lastSession,
			preferences,
			// The stored currentStreak is a stale mirror; the writer gets the live one.
			profile: {
				...profile,
				currentStreak: (await streakState(ctx, profile)).streak,
			},
			recentNotificationContent: recentOutreach.map((o) => o.content.body),
			userLanguageTags,
		};
	},
});

/**
 * List recent notifications for the current user's profile.
 */
export const list = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);

		return await ctx.db
			.query("notification_log")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.order("desc")
			.take(20);
	},
	returns: v.array(notificationLogDocValidator),
});

/**
 * Return the most recent delivered notification for the current user's profile,
 * or null if none exist. Used by the feedback card shown after milestone sessions.
 */
export const lastDelivered = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);

		// `by_profile` is (emotionalProfileId, sentAt) and sentAt is only ever
		// written alongside delivered: true, so the descending head is already the
		// most recent delivered row — undelivered rows have no sentAt and sort
		// below every number.
		const latest = await ctx.db
			.query("notification_log")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.order("desc")
			.first();

		if (!(latest && latest.sentAt)) {
			return null;
		}
		return latest;
	},
	returns: v.union(notificationLogDocValidator, v.null()),
});

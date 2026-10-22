import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { hasPremium } from "../lib/premium";
import { renderSemanticProfile } from "../semanticProfiles";
import { streakState } from "../streaks/state";
import { type IntakeSignals, shapeIntakeSignals } from "./intakeSignals";

/** Canonical return type of buildSessionContext. */
export interface SessionContext {
	// ADR-0014: first-session-only intake personalization; null past session one.
	intakeSignals: IntakeSignals | null;
	isFirstSession: boolean;
	// Xolace+ entitlement — the real fence for tone-gated behavior (mirrorTone
	// preference alone isn't trustworthy after a downgrade).
	isPremium: boolean;
	preferences: {
		mirrorTone: string;
		reducedMotion: boolean;
		spaceName?: string;
		voice?: string;
	} | null;
	profile: {
		sessionCount: number;
		currentStreak: number;
		dominantEmotionTags: string[];
		averageSessionDuration?: number;
		onboardingComplete: boolean;
	};
	/** Same-day reach guard: another session by this profile reached today. */
	profileReachedToday: boolean;
	recentMetadata: {
		primaryEmotion: string;
		granularLabel?: string;
		intensity: number;
		thematicTags: string[];
		userLanguageTags: string[];
		temporalContext?: string;
		riskFlag: boolean;
		createdAt: number;
	}[];
	recentSessions: {
		state: string;
		entryType: string;
		timeOfDay?: string;
		pathChosen?: string;
		mirrorText?: string;
		createdAt: number;
	}[];
	// Semantic memory (Cognition Layer §1.3): the current AI-written narrative
	// profile, rendered whole, never vector-searched. Null until the
	// Reflection Agent writes the first version.
	semanticProfile: string | null;
	semanticProfileVersion: number | null;
	session: Record<string, unknown>;
	turns: Record<string, unknown>[];
}

/**
 * "YYYY-MM-DD" in the user's own timezone, so "same calendar day" means their
 * day and not UTC's — at UTC+8 a UTC boundary would reset the reach guard at
 * 08:00 local, which is exactly the twice-before-dinner case it exists to stop.
 * Falls back to UTC when no timezone was captured (it is only stored once
 * notifications are configured) or the stored string is unusable.
 */
export function localDay(ms: number, timeZone?: string): string {
	try {
		return new Intl.DateTimeFormat(
			"en-CA",
			timeZone ? { timeZone } : {}
		).format(new Date(ms));
	} catch {
		return new Date(ms).toISOString().slice(0, 10);
	}
}

/** Build the full context needed for AI processing of a session. */
export const buildSessionContext = internalQuery({
	args: {
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			throw new Error("Session not found");
		}

		// Load profile
		const profile = await ctx.db.get(
			"emotional_profiles",
			session.emotionalProfileId
		);
		if (!profile) {
			throw new Error("Profile not found");
		}

		// Load preferences (for mirrorTone)
		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();

		// Load session turns (refinement history)
		const turns = await ctx.db
			.query("session_turns")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.take(5);

		// Load recent sessions for pattern context (last 10)
		const recentSessions = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", profile._id)
			)
			.order("desc")
			.take(10);

		// Load the current semantic profile (read whole — it carries the
		// longitudinal weight; recent rows below stay as a recency signal).
		const semanticProfileDoc = profile.currentSemanticProfileId
			? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
			: null;

		// Recent emotional metadata: by_profile_theme is [emotionalProfileId], so
		// .order("desc") sorts by _creationTime, not by primaryEmotion.
		const recentMetadata = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_profile_theme", (q) =>
				q.eq("emotionalProfileId", profile._id)
			)
			.order("desc")
			.take(10);

		// Same-day reach guard (docs/confidence-aware-mirroring.md §3.7): never
		// reach twice in one calendar day per profile. Two rows because the
		// newest may be this session's own reach, which must not suppress its
		// own later turns (those resolve to holding, not plain).
		const reachedSessions = await ctx.db
			.query("sessions")
			.withIndex("by_profile_gapNamed", (q) =>
				q.eq("emotionalProfileId", profile._id).eq("gapNamed", true)
			)
			.order("desc")
			.take(2);
		const today = localDay(Date.now(), preferences?.notifications.timezone);

		// Gated on isFirstSession (ADR-0014): zero added query cost later.
		const isFirstSession = profile.sessionCount === 0;
		const intakeRow = isFirstSession
			? await ctx.db
					.query("intake_responses")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", profile._id)
					)
					.unique()
			: null;

		return {
			intakeSignals: shapeIntakeSignals(intakeRow),
			isFirstSession,
			isPremium: await hasPremium(ctx, profile),
			preferences: preferences
				? {
						mirrorTone: preferences.mirrorTone,
						reducedMotion: preferences.reducedMotion,
						spaceName: preferences.spaceName,
						voice: preferences.voice,
					}
				: null,
			profile: {
				averageSessionDuration: profile.averageSessionDuration,
				currentStreak: (await streakState(ctx, profile)).streak,
				dominantEmotionTags: profile.dominantEmotionTags,
				onboardingComplete: profile.onboardingComplete,
				sessionCount: profile.sessionCount,
			},
			profileReachedToday: reachedSessions.some(
				(s) =>
					s._id !== args.sessionId &&
					localDay(s.createdAt, preferences?.notifications.timezone) === today
			),
			recentMetadata: recentMetadata.slice(0, 5).map((m) => ({
				createdAt: m.createdAt,
				granularLabel: m.granularLabel,
				intensity: m.intensity,
				primaryEmotion: m.primaryEmotion,
				riskFlag: m.riskFlag,
				temporalContext: m.temporalContext,
				thematicTags: m.thematicTags,
				userLanguageTags: m.userLanguageTags,
			})),
			recentSessions: recentSessions
				.filter((s) => s._id !== args.sessionId)
				.slice(0, 5)
				.map((s) => ({
					createdAt: s.createdAt,
					entryType: s.entryType,
					mirrorText: s.mirrorText,
					pathChosen: s.pathChosen,
					state: s.state,
					timeOfDay: s.timeOfDay,
				})),
			semanticProfile: semanticProfileDoc
				? renderSemanticProfile(semanticProfileDoc)
				: null,
			semanticProfileVersion: semanticProfileDoc?.version ?? null,
			session,
			turns,
		};
	},
});

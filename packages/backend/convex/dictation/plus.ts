import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalMutation, query } from "../_generated/server";
import { transcribeAudio } from "../ai/transcribe";
import { requireAuth } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { startOfTodayUTC } from "../lib/timeOfDay";

// Plus dictation (#557). A take is capped at 3 minutes on the client and
// recorded as mono 32kbps AAC (≈4KB/s → ~720KB); this leaves room for container
// overhead while staying under Convex's 1MB v.bytes() ceiling.
export const MAX_DICTATION_BYTES = 900_000;
// Mono 32kbps AAC ≈ 4KB/s. Floors the charge so a client can't under-report.
const AUDIO_BYTES_PER_SECOND = 4000;
const DEFAULT_DAILY_CAP_MINUTES = 30;

function dailyCapSeconds(): number {
	const raw = Number(
		process.env.DICTATION_DAILY_CAP_MINUTES_PLUS ?? DEFAULT_DAILY_CAP_MINUTES
	);
	const minutes =
		Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DAILY_CAP_MINUTES;
	return minutes * 60;
}

/** Seconds dictated today, with the same lazy daily reset as vent's counter. */
function secondsUsedToday(profile: Doc<"emotional_profiles">): number {
	const fresh = (profile.dictationDailyResetAt ?? 0) >= startOfTodayUTC();
	return fresh ? (profile.dictationDailySecondsUsed ?? 0) : 0;
}

const capReached = (profile: Doc<"emotional_profiles">) =>
	secondsUsedToday(profile) >= dailyCapSeconds();

/**
 * The UTC day (its midnight) on which the Plus dictation budget was spent, or
 * null. The client falls back to on-device while it is today's. Reads no
 * clock: Convex caches a query until its data changes, so a Date-based
 * answer would stay "capped" past midnight.
 */
export const status = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const used = profile.dictationDailySecondsUsed ?? 0;
		const cappedOn =
			used >= dailyCapSeconds()
				? (profile.dictationDailyResetAt ?? null)
				: null;
		return { cappedOn };
	},
	returns: v.object({ cappedOn: v.union(v.number(), v.null()) }),
});

/**
 * Auth, Plus and today's cap for the action, which can't read the db itself —
 * and, when the take is admitted, reserves its seconds in the same transaction
 * so concurrent takes see each other's spend. Returns the UTC day the
 * reservation landed on, for `release`.
 */
export const reserve = internalMutation({
	args: { seconds: v.number() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		if (!(await hasPremium(ctx, profile))) {
			return { ok: false as const, reason: "plus_required" as const };
		}
		// Admits a take while under the cap; the last one may overshoot by itself.
		if (capReached(profile)) {
			return { ok: false as const, reason: "dictation_cap_reached" as const };
		}
		const day = startOfTodayUTC();
		await ctx.db.patch("emotional_profiles", profile._id, {
			dictationDailyResetAt: day,
			dictationDailySecondsUsed: secondsUsedToday(profile) + args.seconds,
			updatedAt: Date.now(),
		});
		return { day, ok: true as const };
	},
	returns: v.union(
		v.object({
			ok: v.literal(false),
			reason: v.union(
				v.literal("plus_required"),
				v.literal("dictation_cap_reached")
			),
		}),
		v.object({ day: v.number(), ok: v.literal(true) })
	),
});

/** Hands a failed take's reservation back, unless the day has since rolled over. */
export const release = internalMutation({
	args: { day: v.number(), seconds: v.number() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		if (profile.dictationDailyResetAt !== args.day) {
			return null;
		}
		await ctx.db.patch("emotional_profiles", profile._id, {
			dictationDailySecondsUsed: Math.max(
				0,
				(profile.dictationDailySecondsUsed ?? 0) - args.seconds
			),
			updatedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/**
 * Transcribe one Plus dictation take with Scribe (language auto-detected).
 * The audio is never stored or logged — it goes straight to Scribe and is
 * dropped. Returns the text with sound tags stripped, null when transcription
 * fails, "" when nothing was heard.
 * A take reserves its recorded duration from today's dictation budget before
 * Scribe is called; a failed one hands it back.
 *
 * @throws ConvexError `plus_required` for a non-Plus caller
 * @throws ConvexError `dictation_cap_reached` once today's budget is spent
 * @throws ConvexError `audio_too_large` for a take over the 3-minute ceiling
 */
export const transcribe = action({
	// durationMs is optional for the #557 client, which charges by payload alone.
	args: { audioBytes: v.bytes(), durationMs: v.optional(v.number()) },
	handler: async (ctx, args): Promise<string | null> => {
		if (args.audioBytes.byteLength > MAX_DICTATION_BYTES) {
			throw new ConvexError({
				code: "audio_too_large",
				message: "Dictation take too long",
			});
		}
		// v.number() admits NaN/Infinity; a NaN charge would poison the counter and
		// disable the cap for the rest of the day.
		if (
			args.durationMs !== undefined &&
			!(Number.isFinite(args.durationMs) && args.durationMs >= 0)
		) {
			throw new ConvexError({
				code: "invalid_duration",
				message: "Invalid dictation duration",
			});
		}
		const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
		if (!apiKey) {
			console.error("[dictation] ELEVENLABS_VOICE_API_KEY not set");
			return null;
		}

		const seconds = Math.ceil(
			Math.max(
				(args.durationMs ?? 0) / 1000,
				args.audioBytes.byteLength / AUDIO_BYTES_PER_SECOND
			)
		);
		const reservation:
			| { ok: false; reason: "plus_required" | "dictation_cap_reached" }
			| { ok: true; day: number } = await ctx.runMutation(
			internal.dictation.plus.reserve,
			{ seconds }
		);
		if (!reservation.ok) {
			const message =
				reservation.reason === "plus_required"
					? "Xolace+ required: dictation"
					: "Dictation cap reached";
			throw new ConvexError({ code: reservation.reason, message });
		}

		let result: Awaited<ReturnType<typeof transcribeAudio>> = null;
		try {
			result = await transcribeAudio(apiKey, args.audioBytes);
		} finally {
			if (result === null) {
				try {
					await ctx.runMutation(internal.dictation.plus.release, {
						day: reservation.day,
						seconds,
					});
				} catch (err) {
					console.error("[dictation] release failed:", err);
				}
			}
		}
		return result?.text ?? null;
	},
	returns: v.union(v.string(), v.null()),
});

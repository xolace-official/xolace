/**
 * The recipient pool (spec §5.1). A `letter_profiles` row is `ready` only
 * while every hard filter that doesn't change by the minute holds; matching
 * then checks the minute-by-minute ones (quiet window, open follow-ups,
 * blocks) live, at placement.
 */
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { effectiveAgeStatus } from "../age/status";
import {
	SUPPRESSED_THEMES,
	TAP_ONLY_ENTRY_TYPES,
} from "../lib/xolacerSuggestion";
import { letterAimOf } from "./aims";
import { languageOfLocale, letterProfileOf } from "./profiles";
import {
	DAY_MS,
	HEAVIER_FROM,
	METADATA_FRESH_DAYS,
	RECIPIENT_REST_DAYS,
} from "./rules";

/** The row's pool fields when this person can't be matched. */
const OUT = {
	aim: undefined,
	band: undefined,
	metadataAt: undefined,
	pool: "out",
	poolCheckAt: undefined,
} as const;

/** A session a recipient may never be matched off (#749, #750). */
async function unmatchable(
	ctx: MutationCtx,
	metadata: Doc<"emotional_metadata">
): Promise<boolean> {
	if (
		metadata.safeguardLevel === "elevated" ||
		metadata.safeguardLevel === "crisis"
	) {
		return true;
	}
	if (
		metadata.thematicTags.some((tag) =>
			SUPPRESSED_THEMES.has(tag.toLowerCase())
		)
	) {
		return true;
	}
	const session = await ctx.db.get("sessions", metadata.sessionId);
	return TAP_ONLY_ENTRY_TYPES.has(session?.entryType ?? "open_prompt");
}

/** Whether the person behind this row may receive at all, today. */
async function mayReceive(
	ctx: MutationCtx,
	row: Doc<"letter_profiles">
): Promise<boolean> {
	if (row.optIn !== "yes") {
		return false;
	}
	const profile = await ctx.db.get(
		"emotional_profiles",
		row.emotionalProfileId
	);
	if (!profile || profile.dataWipeInProgress) {
		return false;
	}
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", profile._id)
		)
		.unique();
	if (user?.accountStatus !== "active") {
		return false;
	}
	return (await effectiveAgeStatus(ctx, { profile, user })) === "adult";
}

/**
 * Recompute one person's pool state from their latest session. Safe to call
 * for anyone: no row (never answered the offer) changes nothing.
 */
export async function refreshPool(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	now: number
): Promise<void> {
	const row = await letterProfileOf(ctx, emotionalProfileId);
	if (!row) {
		return;
	}
	const language = row.language ?? languageOfLocale(row.locale);
	const metadata = await ctx.db
		.query("emotional_metadata")
		.withIndex("by_profile_createdAt", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.order("desc")
		.first();
	const freshUntil = (metadata?.createdAt ?? 0) + METADATA_FRESH_DAYS * DAY_MS;

	if (
		!(language && metadata && freshUntil > now) ||
		row.unopenedLetterId !== undefined ||
		!(await mayReceive(ctx, row)) ||
		(await unmatchable(ctx, metadata))
	) {
		await ctx.db.patch("letter_profiles", row._id, OUT);
		return;
	}

	const restUntil = row.lastReceivedAt + RECIPIENT_REST_DAYS * DAY_MS;
	const resting = restUntil > now;
	await ctx.db.patch("letter_profiles", row._id, {
		aim: letterAimOf(metadata),
		band: metadata.intensity >= HEAVIER_FROM ? "heavier" : "lighter",
		language,
		metadataAt: metadata.createdAt,
		pool: resting ? "out" : "ready",
		// Resting: back in when the week is up. Ready: out when the session
		// goes stale.
		poolCheckAt: resting ? restUntil : freshUntil,
	});
}

/**
 * Scheduled after a session's understanding is written or refined, after a
 * letter is opened, and by the sweep for rows whose `poolCheckAt` passed.
 */
export const refresh = internalMutation({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		await refreshPool(ctx, args.emotionalProfileId, Date.now());
		return null;
	},
	returns: v.null(),
});

/**
 * Whether the session pipeline should schedule a refresh for this person: only
 * those who said Yes. Everyone else has nothing to recompute.
 */
export async function receivesLetters(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	return (await letterProfileOf(ctx, emotionalProfileId))?.optIn === "yes";
}

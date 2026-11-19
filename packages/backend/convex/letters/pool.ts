/**
 * The recipient pool (spec §5.1). A `letter_profiles` row is `ready` only
 * while every filter on the person holds, as of its last refresh. Matching
 * checks them again live, with the pair's own blocks, and refreshes anyone it
 * turns away, so the next letter doesn't read them again (no starvation
 * behind a page of people in quiet hours or with an open hard follow-up).
 */
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { effectiveAgeStatus } from "../age/status";
import {
	SUPPRESSED_THEMES,
	TAP_ONLY_ENTRY_TYPES,
} from "../lib/xolacerSuggestion";
import { quietWindowEndsAt } from "../outreach/quietWindow";
import { letterAimOf } from "./aims";
import { languageOfLocale, letterProfileOf } from "./profiles";
import {
	DAY_MS,
	FOLLOW_UP_LOOK_AGAIN_MS,
	FOLLOW_UP_PROBE_MAX,
	HEAVIER_FROM,
	METADATA_FRESH_DAYS,
	RECIPIENT_REST_DAYS,
} from "./rules";

/** Follow-up states a person can still see and answer. */
const OPEN_FOLLOW_UP = ["pending", "ready", "shown", "superseded"] as const;

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
export async function mayReceive(
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
 * An open acute or escalation-derived follow-up: no letter now (#749).
 * Escalation-derived cards have their own index, so that half is exact for
 * every open status, superseded included. Acute ones are looked for among the
 * newest {@link FOLLOW_UP_PROBE_MAX} cards per status, so that half is a
 * bound, not a guarantee: an acute card with more than that many newer cards
 * of the same status is missed, most likely a superseded one, since those
 * pile up. Accepted so a placement's reads stay bounded; an index with the
 * tier would make it exact.
 */
async function hasOpenHardFollowUp(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	for (const status of OPEN_FOLLOW_UP) {
		const escalated = await ctx.db
			.query("follow_up_cards")
			.withIndex("by_profile_escalation_status", (q) =>
				q
					.eq("emotionalProfileId", emotionalProfileId)
					.eq("escalationDerived", true)
					.eq("status", status)
			)
			.first();
		if (escalated) {
			return true;
		}
		const newest = await ctx.db
			.query("follow_up_cards")
			.withIndex("by_profile_status", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId).eq("status", status)
			)
			.order("desc")
			.take(FOLLOW_UP_PROBE_MAX);
		if (newest.some((card) => card.tier === "acute")) {
			return true;
		}
	}
	return false;
}

/**
 * When to look again at someone who can't take a letter this minute: the end
 * of their quiet window, or a sweep from now while a hard follow-up is open.
 * Null when nothing stands in the way. Skipped, never reserved (#749).
 */
export async function awayUntil(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	now: number
): Promise<number | null> {
	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	const quietEnds = quietWindowEndsAt(preferences?.notifications, now);
	if (quietEnds !== null) {
		return quietEnds;
	}
	return (await hasOpenHardFollowUp(ctx, emotionalProfileId))
		? now + FOLLOW_UP_LOOK_AGAIN_MS
		: null;
}

/** Patch only what changed: a refresh that changes nothing writes nothing. */
async function patchRow(
	ctx: MutationCtx,
	row: Doc<"letter_profiles">,
	fields: Partial<Doc<"letter_profiles">>
): Promise<void> {
	const changed = (Object.keys(fields) as (keyof typeof fields)[]).some(
		(key) => row[key] !== fields[key]
	);
	if (changed) {
		await ctx.db.patch("letter_profiles", row._id, fields);
	}
}

/**
 * Recompute one person's pool state from their latest session. Safe to call
 * for anyone: no row (never answered the offer) changes nothing.
 *
 * `language` is the language letters are matched in: copied from the locale
 * at Yes (or here, if Yes came without one), until sessions write their own
 * (slice 6), which then wins.
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
		await patchRow(ctx, row, OUT);
		return;
	}

	const restUntil = row.lastReceivedAt + RECIPIENT_REST_DAYS * DAY_MS;
	const back =
		restUntil > now
			? restUntil
			: await awayUntil(ctx, row.emotionalProfileId, now);
	await patchRow(ctx, row, {
		aim: letterAimOf(metadata),
		band: metadata.intensity >= HEAVIER_FROM ? "heavier" : "lighter",
		language,
		metadataAt: metadata.createdAt,
		pool: back === null ? "ready" : "out",
		// Resting or away: back in when that's over. Ready: out when the
		// session goes stale.
		poolCheckAt: back === null ? freshUntil : Math.min(back, freshUntil),
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

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { r2 } from "./ai/paths/audioTracks";
import { CATALOG_BY_KEY } from "./ai/paths/catalog";
import { isTryThis } from "./ai/paths/tryThis";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { hasPremium, requirePremium } from "./lib/premium";
import { posthog } from "./posthog";
import { recordActivity } from "./streaks/activityLog";
import type { Understanding } from "./understanding";

/**
 * Kindling reads + twig state for the active-kindling screen
 * (docs/paths-v1.md §9.1, #333).
 *
 * Everything here is premium-gated at the read: a free user gets `null`, not
 * an empty kindling, so the Today row and the screen both fall away with one
 * check (ADR 0009 — no free compute, and no free surface either).
 */

/** Display family for a twig — what the card and the rail node render as. */
export type TwigKind =
	| "breathing"
	| "bridge"
	| "xolacer"
	| "audio"
	| "music"
	| "read"
	| "try";

function twigKind(actionType: string): TwigKind {
	if (isTryThis(actionType)) {
		return "try";
	}
	if (actionType === "read") {
		return "read";
	}
	if (actionType === "breathing") {
		return "breathing";
	}
	if (actionType === "bridge") {
		return "bridge";
	}
	if (actionType === "xolacer") {
		return "xolacer";
	}
	return actionType.startsWith("music_topic_") ? "music" : "audio";
}

const twigValidator = v.object({
	_id: v.id("path_steps"),
	actionType: v.string(),
	/** Try-this only (#567): the curated step, as offered. */
	detail: v.optional(v.string()),
	kind: v.union(
		v.literal("breathing"),
		v.literal("bridge"),
		v.literal("xolacer"),
		v.literal("audio"),
		v.literal("music"),
		v.literal("read"),
		v.literal("try")
	),
	order: v.number(),
	params: v.any(),
	state: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
	/** Track or entry title for bound audio/music/read, the catalog's for try-this; undefined for breathing + xolacer. */
	title: v.optional(v.string()),
	why: v.string(),
});

/**
 * The one active kindling, or null — null being the common answer: free user,
 * no qualifying session yet, or the last one tended and closed.
 */
export const getActive = query({
	args: {
		/** @deprecated Pre-#412 clients omit it and get no read twigs — they have no card for one. */
		// DEPRECATED(remove-after: app >= 1.11.0): return read twigs unconditionally once no client omits this.
		withRead: v.optional(v.boolean()),
		/** @deprecated Pre-#567 clients omit it and get no try-this twigs — they have no card for one. */
		// DEPRECATED(remove-after: app >= 1.16.0): return try-this twigs unconditionally once no client omits this.
		withTry: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		if (!(await hasPremium(ctx, profile))) {
			return null;
		}

		const path = await ctx.db
			.query("paths")
			.withIndex("by_profile_and_status", (q) =>
				q.eq("emotionalProfileId", profile._id).eq("status", "active")
			)
			.first();
		if (!path) {
			return null;
		}

		const steps = await ctx.db
			.query("path_steps")
			.withIndex("by_path", (q) => q.eq("pathId", path._id))
			.collect();

		const twigs = [];
		for (const step of steps.sort((a, b) => a.order - b.order)) {
			const kind = twigKind(step.actionType);
			if (kind === "read" && !args.withRead) {
				continue;
			}
			if (kind === "try" && !args.withTry) {
				continue;
			}
			const curated =
				kind === "try" ? CATALOG_BY_KEY.get(step.actionType) : undefined;
			const slug = (step.params as { slug?: string } | null)?.slug;
			const bound = slug
				? kind === "read"
					? await ctx.db
							.query("library_entries")
							.withIndex("by_slug", (q) => q.eq("slug", slug))
							.unique()
					: await ctx.db
							.query("audio_tracks")
							.withIndex("by_slug", (q) => q.eq("slug", slug))
							.unique()
				: null;
			twigs.push({
				_id: step._id,
				actionType: step.actionType,
				detail: curated?.detail,
				kind,
				order: step.order,
				params: step.params,
				state: step.state,
				title: curated?.title ?? bound?.title,
				why: step.why,
			});
		}

		return {
			_id: path._id,
			generatedAt: path.generatedAt,
			sessionId: path.sessionId,
			twigs,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id("paths"),
			generatedAt: v.number(),
			sessionId: v.id("sessions"),
			twigs: v.array(twigValidator),
		})
	),
});

/**
 * Whether this session's `supportNeed` is light/active — the same grade
 * `generate.run` gates on (§1), read here so session-end's slot only fires on
 * a genuine trigger moment. Deliberately tier-blind: ADR 0009's free-user
 * upsell is scoped to "a qualifying session," not every session-end, so both
 * the premium pending beat and the free upsell read this one flag and the
 * caller picks the copy from its own premium status.
 */
export const isKindlingQualifyingSession = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args): Promise<boolean> => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);
		const understanding: Understanding | null = await ctx.runQuery(
			internal.understanding.getUnderstanding,
			{ sessionId: session._id }
		);
		return (
			understanding?.supportNeed === "light" ||
			understanding?.supportNeed === "active"
		);
	},
	returns: v.boolean(),
});

/**
 * One hour. A URL is only ever minted for a premium user already on the
 * player, so a longer window costs nothing in exposure and covers a whole
 * listen plus a pause; the client re-mints on resume past this
 * (`useTrackPlayback`).
 */
const AUDIO_URL_TTL_SEC = 3600;

/**
 * A bound track's playable shape (docs/paths-v1.md §3.3) — the one read every
 * player goes through, kindling twig or Browse. Premium-gated: a free user
 * never receives a URL (§9.4). URLs are minted per request and `expiresAt`
 * tells the client when to come back for a fresh one. `showCrisisLine` is
 * derived here so no player re-derives the safety rule from `tier` (§8).
 */
export const getBoundAudioTrack = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		await requirePremium(ctx, profile, "audio playback");

		const track = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		if (!(track && track.active)) {
			return null;
		}

		const [url, thumbUrl] = await Promise.all([
			r2.getUrl(track.key, { expiresIn: AUDIO_URL_TTL_SEC }),
			r2.getUrl(track.thumbKey, { expiresIn: AUDIO_URL_TTL_SEC }),
		]);
		return {
			attributionText: track.licence?.attributionRequired
				? track.licence.attributionText
				: undefined,
			durationSec: track.durationSec,
			expiresAt: Date.now() + AUDIO_URL_TTL_SEC * 1000,
			family: track.family,
			narrators: track.narrators,
			showCrisisLine: track.tier === 4,
			slug: track.slug,
			thumbUrl,
			title: track.title,
			url,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			attributionText: v.optional(v.string()),
			durationSec: v.number(),
			expiresAt: v.number(),
			family: v.union(v.literal("support"), v.literal("music")),
			narrators: v.optional(v.array(v.string())),
			showCrisisLine: v.boolean(),
			slug: v.string(),
			thumbUrl: v.string(),
			title: v.string(),
			url: v.string(),
		})
	),
});

/** Load a twig the caller owns, on the still-active kindling. */
async function ownedStep(
	ctx: QueryCtx | MutationCtx,
	stepId: Id<"path_steps">
): Promise<{
	profile: Doc<"emotional_profiles">;
	step: Doc<"path_steps">;
	path: Doc<"paths">;
}> {
	const { profile } = await requireAuth(ctx);
	const step = await ctx.db.get("path_steps", stepId);
	const path = step ? await ctx.db.get("paths", step.pathId) : null;
	if (!(step && path) || path.emotionalProfileId !== profile._id) {
		throw new ConvexError({
			code: "step_not_found",
			message: "Twig not found",
		});
	}
	// A stale screen (dismissed elsewhere, or replaced by a fresh generation)
	// must not write state or events onto an archived kindling.
	if (path.status !== "active") {
		throw new ConvexError({
			code: "path_not_active",
			message: "Kindling is no longer active",
		});
	}
	return { path, profile, step };
}

/**
 * Settle every twig's state and close the kindling once nothing is pending.
 * `replaced` / `dismissed` are terminal — a late tap must not resurrect one.
 */
async function settle(
	ctx: MutationCtx,
	path: Doc<"paths">,
	profileId: Id<"emotional_profiles">
) {
	if (path.status !== "active") {
		return;
	}
	const steps = await ctx.db
		.query("path_steps")
		.withIndex("by_path", (q) => q.eq("pathId", path._id))
		.collect();
	// Counts twigs pre-#412/#567 clients can't see too — see docs/deprecations.md.
	if (steps.some((s) => s.state === "pending")) {
		return;
	}
	await ctx.db.patch("paths", path._id, { status: "completed" });
	await posthog.capture(ctx, {
		distinctId: profileId,
		event: "path_completed",
		properties: { pathId: path._id, twigs: steps.length },
	});
}

const setState = (
	event: "step_completed" | "step_skipped",
	state: "done" | "skipped"
) =>
	mutation({
		args: { stepId: v.id("path_steps") },
		handler: async (ctx, args) => {
			const { profile, step, path } = await ownedStep(ctx, args.stepId);
			// Only a pending twig can change; same-state retry and any other
			// settled state are no-ops so a late tap can't flip done <-> skipped.
			if (step.state !== "pending") {
				return null;
			}
			await ctx.db.patch("path_steps", step._id, { state });
			// A tended breathing twig is sit-with-this on its own later occasion —
			// the only streak credit a twig carries (#433). Other twig kinds credit
			// at their destination (a read finishes in library.reads.record).
			if (state === "done" && step.actionType === "breathing") {
				await recordActivity(ctx, {
					actionType: "sit_with_this",
					emotionalProfileId: profile._id,
				});
			}
			await posthog.capture(ctx, {
				distinctId: profile._id,
				event,
				properties: {
					actionType: step.actionType,
					order: step.order,
					pathId: path._id,
				},
			});
			await settle(ctx, path, profile._id);
			return null;
		},
		returns: v.null(),
	});

/**
 * Mark a twig tended. Called when the user finishes the thing the twig sent
 * them to — today that is the destination screen's business (#334 and the
 * completion-tracking ticket), so this is the seam those call.
 */
export const completeStep = setState("step_completed", "done");

/** "Not for me" — the skip, and the correction signal for the binder (§9.6). */
export const skipStep = setState("step_skipped", "skipped");

/** Close the whole kindling without tending the rest (§6). */
/**
 * Fulfil the kindling a free user just bought Plus for (docs/paths-v1.md
 * §12). Completion-time `generate.run` silently no-oped on the free tier, so
 * the purchased session has to be re-queued. The webhook that flips
 * `hasPremium` may lag the client's purchase confirmation, so scheduling now
 * would no-op again: when Plus is already visible server-side, schedule; else
 * park the session on the profile and let `onEntitlementActivated` run it.
 */
export const requestKindling = mutation({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const { profile, session } = await requireSessionOwnership(
			ctx,
			args.sessionId
		);
		if (await hasPremium(ctx, profile)) {
			await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
				emotionalProfileId: profile._id,
				sessionId: session._id,
			});
		} else {
			await ctx.db.patch("emotional_profiles", profile._id, {
				pendingKindlingSessionId: session._id,
			});
		}
		return null;
	},
	returns: v.null(),
});

export const dismiss = mutation({
	args: { pathId: v.id("paths") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const path = await ctx.db.get("paths", args.pathId);
		if (!path || path.emotionalProfileId !== profile._id) {
			throw new ConvexError({
				code: "path_not_found",
				message: "Kindling not found",
			});
		}
		if (path.status !== "active") {
			return null;
		}
		await ctx.db.patch("paths", path._id, { status: "dismissed" });
		await posthog.capture(ctx, {
			distinctId: profile._id,
			event: "path_dismissed",
			properties: { pathId: path._id },
		});
		return null;
	},
	returns: v.null(),
});

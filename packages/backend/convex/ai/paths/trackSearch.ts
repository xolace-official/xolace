import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	type ActionCtx,
	internalAction,
	internalMutation,
	internalQuery,
} from "../../_generated/server";
import { bestScoreByKey, syncKey } from "../helpers/namespaceIndex";
import { type BindTrack, REFRAME_SERIES, SIMILARITY_FLOOR } from "./bind";

/**
 * The tracks' meaning index (#572, ADR 0021): a namespace per topic
 * (`track:<topic>`), plus `track:reality-not-false-hope` for the reframe
 * series, keyed on the slug so a re-index replaces. The topic stays the gate:
 * a search only ever runs inside the namespace of the topic the model picked.
 * `upsertTrack` and `setTrackActive` (below) schedule `indexTrack` when what it
 * embeds changes; a retired track is removed. Backfill:
 *   bunx convex run migrations:run '{"fn": "migrations:backfillTrackIndex"}'
 */
const ns = (scope: string) => `track:${scope}`;

/** Every namespace a track lives in. */
export const trackNamespaces = (t: Pick<BindTrack, "topic" | "series">) => [
	ns(t.topic),
	...(t.series === REFRAME_SERIES ? [ns(REFRAME_SERIES)] : []),
];

/** The one namespace a track twig binds inside; null for twigs that aren't tracks. */
export function namespaceFor(actionType: string): string | null {
	if (actionType === "episode_reframe") {
		return ns(REFRAME_SERIES);
	}
	return actionType.startsWith("audio_topic_") ||
		actionType.startsWith("music_topic_")
		? ns(actionType)
		: null;
}

/** Support audio embeds its transcript; music its title, tags and what it's for; either without them, title + tags. */
export function trackIndexText(
	t: Pick<
		Doc<"audio_tracks">,
		"family" | "title" | "tags" | "transcript" | "whatItsFor"
	>
): string {
	if (t.family === "support" && t.transcript) {
		return t.transcript;
	}
	return [
		t.title,
		t.tags.join(", "),
		...(t.family === "music" && t.whatItsFor ? [t.whatItsFor] : []),
	].join("\n\n");
}

/** What `indexTrack` writes, so a re-ingest only re-embeds on a difference. */
export const indexSignature = (t: Doc<"audio_tracks">) =>
	JSON.stringify([t.active, trackNamespaces(t), trackIndexText(t)]);

export const trackForIndex = internalQuery({
	args: { trackId: v.id("audio_tracks") },
	handler: async (ctx, { trackId }) => {
		const t = await ctx.db.get("audio_tracks", trackId);
		if (!t) {
			return null;
		}
		return {
			namespaces: trackNamespaces(t),
			slug: t.slug,
			text: t.active ? trackIndexText(t) : null,
		};
	},
	returns: v.union(
		v.object({
			namespaces: v.array(v.string()),
			slug: v.string(),
			text: v.union(v.string(), v.null()),
		}),
		v.null()
	),
});

/** `previousNamespaces`: where the track lived before a topic/series move; its slug leaves the ones it no longer does. */
export const indexTrack = internalAction({
	args: {
		previousNamespaces: v.optional(v.array(v.string())),
		trackId: v.id("audio_tracks"),
	},
	handler: async (ctx, { trackId, previousNamespaces = [] }) => {
		const t = await ctx.runQuery(internal.ai.paths.trackSearch.trackForIndex, {
			trackId,
		});
		if (!t) {
			return null;
		}
		const stale = previousNamespaces.filter((n) => !t.namespaces.includes(n));
		for (const [namespace, text] of [
			...stale.map((n) => [n, null] as const),
			...t.namespaces.map((n) => [n, t.text] as const),
		]) {
			try {
				await syncKey(ctx, namespace, t.slug, text);
			} catch (e) {
				// The slug is what makes a hole findable; rethrow so the run still shows failed.
				console.error("track index: embed failed", {
					namespace,
					slug: t.slug,
					trackId,
				});
				throw e;
			}
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Retire (licence lapse) or restore a track without deleting it. Script- or
 * dashboard-run: `bunx convex run ai/paths/trackSearch:setTrackActive '{"slug": "…", "active": false}'`.
 * A retired track leaves the meaning index (#572).
 */
export const setTrackActive = internalMutation({
	args: { active: v.boolean(), slug: v.string() },
	handler: async (ctx, { slug, active }) => {
		const existing = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!existing) {
			throw new ConvexError(
				`setTrackActive: no audio_tracks row for slug "${slug}"`
			);
		}
		await ctx.db.patch("audio_tracks", existing._id, { active });
		await ctx.scheduler.runAfter(0, internal.ai.paths.trackSearch.indexTrack, {
			trackId: existing._id,
		});
		return null;
	},
	returns: v.null(),
});

/** Chunks, not tracks; a topic holds tens of tracks, a transcript a few chunks each. */
const SEARCH_LIMIT = 100;

export const trackSearchLogValidator = v.object({
	actionType: v.string(),
	fallback: v.boolean(),
	search: v.union(v.literal("ran"), v.literal("failed")),
	topScore: v.optional(v.number()),
});
export type TrackSearchLog = Infer<typeof trackSearchLogValidator>;

/**
 * Scores the tracks of each picked track twig's topic against tonight's
 * vector, onto `similarity`. `vector` is only called when a track twig was
 * picked. Best-effort: a null vector or a failed search leaves that topic
 * unscored, so it binds on tags, and is logged. One log per track twig:
 * whether the search ran, how close the best track came, and whether it fell
 * back to tags.
 */
export async function scoreTracks(
	ctx: ActionCtx,
	vector: () => Promise<number[] | null>,
	actionTypes: string[],
	tracks: BindTrack[],
	sessionId: Id<"sessions">
): Promise<{ tracks: BindTrack[]; logs: TrackSearchLog[] }> {
	const best = new Map<string, number>();
	const logs: TrackSearchLog[] = [];
	// `vector` memoizes its promise, so the parallel searches share one embed.
	const searches = await Promise.all(
		[...new Set(actionTypes)].flatMap((actionType) => {
			const namespace = namespaceFor(actionType);
			if (namespace === null) {
				return [];
			}
			return [
				vector()
					.then((v) => (v === null ? null : search(ctx, v, namespace)))
					.then((scores) => ({ actionType, namespace, scores })),
			];
		})
	);
	for (const { actionType, namespace, scores } of searches) {
		if (scores === null) {
			console.error("kindling: track search failed, binding on tags", {
				actionType,
				sessionId,
			});
			logs.push({ actionType, fallback: true, search: "failed" });
			continue;
		}
		// Only a track that lives in this namespace scores here (guards a stale entry a failed move left).
		const inTopic = tracks.filter(
			(t) => scores.has(t.slug) && trackNamespaces(t).includes(namespace)
		);
		for (const t of inTopic) {
			best.set(
				t.slug,
				Math.max(
					best.get(t.slug) ?? Number.NEGATIVE_INFINITY,
					scores.get(t.slug)!
				)
			);
		}
		const topScore =
			inTopic.length > 0
				? Math.max(...inTopic.map((t) => scores.get(t.slug)!))
				: undefined;
		logs.push({
			actionType,
			fallback: topScore === undefined || topScore < SIMILARITY_FLOOR.track,
			search: "ran",
			topScore,
		});
	}
	return {
		logs,
		tracks: tracks.map((t) =>
			best.has(t.slug) ? { ...t, similarity: best.get(t.slug) } : t
		),
	};
}

/** slug → best-chunk score in one namespace; null = the search failed. */
async function search(
	ctx: ActionCtx,
	vector: number[],
	namespace: string
): Promise<Map<string, number> | null> {
	try {
		return await bestScoreByKey(ctx, namespace, vector, SEARCH_LIMIT);
	} catch {
		return null;
	}
}

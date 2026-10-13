import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { r2 } from "./ai/paths/audioTracks";
import { topicSlug } from "./ai/paths/catalog";

/**
 * Browse hub reads (#338, docs/paths-v1.md §9.3). Open to every signed-in
 * user — the free-user gate is on playback (the `player` route, #340), not
 * on browsing (§9.4) — so this file never calls `requirePremium`.
 */

const shelfItemValidator = v.object({
  _id: v.id("audio_tracks"),
  slug: v.string(),
  family: v.union(v.literal("support"), v.literal("music")),
  title: v.string(),
  thumbUrl: v.string(),
  attribution: v.optional(v.string()),
});

/**
 * Thumbnails are public catalogue art, so sign for the R2 maximum (7 days)
 * rather than the 900s default — a mounted browse view would otherwise show
 * broken images after 15 minutes without a data change to re-run the query.
 * A relaunch or any catalogue write re-signs well inside the window.
 */
const THUMB_URL_TTL_SEC = 604800;
export const thumbUrlFor = (thumbKey: string) => r2.getUrl(thumbKey, { expiresIn: THUMB_URL_TTL_SEC });

function attributionFor(track: { family: "support" | "music"; narrators?: string[]; licence?: { attributionRequired: boolean; attributionText: string } }) {
  if (track.family === "music") {
    return track.licence?.attributionRequired ? track.licence.attributionText : undefined;
  }
  return track.narrators && track.narrators.length > 0 ? track.narrators.join(", ") : undefined;
}

/**
 * The New shelf: `active` tracks whose `newUntil` is still in the future,
 * newest first, capped at 4. Self-expiring (a past `newUntil` just drops out
 * of the sort), so no cron. No new index — the catalogue is a bounded few
 * hundred rows (docs/paths-v1.md decision 18), so a full collect + in-memory
 * sort is the cheaper choice over indexing a field most rows leave unset.
 * Reused as-is for the Discovery "From the library" strip (§9.5).
 */
export const getNewShelf = query({
  args: {},
  returns: v.array(shelfItemValidator),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const now = Date.now();

    const tracks = await ctx.db.query("audio_tracks").collect();
    const shelf = tracks
      .filter((t) => t.active && t.newUntil !== undefined && t.newUntil > now)
      .sort((a, b) => b.newUntil! - a.newUntil!)
      .slice(0, 4);

    return await Promise.all(
      shelf.map(async (t) => ({
        _id: t._id,
        slug: t.slug,
        family: t.family,
        title: t.title,
        thumbUrl: await thumbUrlFor(t.thumbKey),
        attribution: attributionFor(t),
      })),
    );
  },
});

/**
 * Browse hub hero: the hand-picked `featured` active track, if any — set from
 * the Convex dashboard, no ordering rule needed since only one shows. Falls
 * back to the same newest-`newUntil` pick the hero used before `featured`
 * existed, so an unflagged catalogue still shows something.
 */
export const getFeatured = query({
  args: {},
  returns: v.union(shelfItemValidator, v.null()),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const now = Date.now();

    const tracks = await ctx.db.query("audio_tracks").take(1000);
    const picked =
      tracks.find((t) => t.active && t.featured) ??
      tracks
        .filter((t) => t.active && t.newUntil !== undefined && t.newUntil > now)
        .sort((a, b) => b.newUntil! - a.newUntil!)[0];
    if (!picked) return null;

    return {
      _id: picked._id,
      slug: picked.slug,
      family: picked.family,
      title: picked.title,
      thumbUrl: await thumbUrlFor(picked.thumbKey),
      attribution: attributionFor(picked),
    };
  },
});

// ---------------------------------------------------------------------------
// Browsing screens (#339, docs/paths-v1.md §9.3)
// ---------------------------------------------------------------------------

const familyValidator = v.union(v.literal("support"), v.literal("music"));

export const trackItemValidator = v.object({
  _id: v.id("audio_tracks"),
  slug: v.string(),
  family: familyValidator,
  title: v.string(),
  thumbUrl: v.string(),
  attribution: v.optional(v.string()),
  durationSec: v.number(),
  series: v.optional(v.string()),
  seriesTitle: v.optional(v.string()),
  episodeNumber: v.optional(v.number()),
});

export async function toTrackItem(t: Doc<"audio_tracks">) {
  return {
    _id: t._id,
    slug: t.slug,
    family: t.family,
    title: t.title,
    thumbUrl: await thumbUrlFor(t.thumbKey),
    attribution: attributionFor(t),
    durationSec: t.durationSec,
    series: t.series,
    seriesTitle: t.seriesTitle,
    episodeNumber: t.episodeNumber,
  };
}

const topicTitle = (slug: string) => {
  const words = slug.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Per-family list — `active` rows only, page size chosen by the client (30). */
export const listByFamily = query({
  args: { family: familyValidator, paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(trackItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
    ),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const result = await ctx.db
      .query("audio_tracks")
      .withIndex("by_family_and_active", (q) => q.eq("family", args.family).eq("active", true))
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map(toTrackItem)) };
  },
});

async function activeByFamily(ctx: QueryCtx, family: Doc<"audio_tracks">["family"]) {
  // Bounded catalogue (docs/paths-v1.md decision 18) — a few hundred rows at most.
  return await ctx.db
    .query("audio_tracks")
    .withIndex("by_family_and_active", (q) => q.eq("family", family).eq("active", true))
    .take(1000);
}

/**
 * Every shared topic with ≥ 1 active track in either family, slug order. A
 * `topics` row (#353) decorates a tile — cover + curated title — but never
 * adds one: membership is the active-track grouping. Shared by the topic grid
 * and Browse search (#550).
 */
export async function activeTopics(ctx: QueryCtx) {
  const tracks = [...(await activeByFamily(ctx, "support")), ...(await activeByFamily(ctx, "music"))];

  const byTopic = new Map<string, { thumbKey: string; supportCount: number; musicCount: number }>();
  for (const t of tracks) {
    const slug = topicSlug(t.topic);
    const entry = byTopic.get(slug) ?? { thumbKey: t.thumbKey, supportCount: 0, musicCount: 0 };
    if (t.family === "support") entry.supportCount += 1;
    else entry.musicCount += 1;
    byTopic.set(slug, entry);
  }

  const rows = new Map((await ctx.db.query("topics").take(1000)).map((r) => [r.slug, r]));
  return [...byTopic.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, entry]) => {
      const row = rows.get(slug);
      return { ...entry, slug, title: row?.title || topicTitle(slug), thumbKey: row?.thumbKey ?? entry.thumbKey };
    });
}

/** Topic grid — one tile per shared topic with ≥ 1 active track in either family. */
export const getTopics = query({
  args: {},
  returns: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      thumbUrl: v.string(),
      supportCount: v.number(),
      musicCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await Promise.all(
      (await activeTopics(ctx)).map(async ({ thumbKey, ...t }) => ({ ...t, thumbUrl: await thumbUrlFor(thumbKey) })),
    );
  },
});

/** Topic screen — both families' active tracks for one shared topic slug. */
export const getTopic = query({
  args: { slug: v.string() },
  returns: v.array(trackItemValidator),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const [support, music] = await Promise.all([
      ctx.db
        .query("audio_tracks")
        .withIndex("by_family_and_topic", (q) => q.eq("family", "support").eq("topic", `audio_topic_${args.slug}`))
        .take(1000),
      ctx.db
        .query("audio_tracks")
        .withIndex("by_family_and_topic", (q) => q.eq("family", "music").eq("topic", `music_topic_${args.slug}`))
        .take(1000),
    ]);
    return await Promise.all([...support, ...music].filter((t) => t.active).map(toTrackItem));
  },
});

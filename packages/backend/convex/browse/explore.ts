import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type QueryCtx, query } from "../_generated/server";
import { MIN_RESUME_SEC } from "../audio/progress";
import { requireAuth, requireSignedIn } from "../lib/auth";
import {
	emotionFamily,
	LIFE_AREA_HOME,
	type ThematicTag,
} from "../lib/understandingVocab";
import { explorePhaseValidator } from "../lib/validators";
import { preferencesRow } from "../preferences/row";
import { recentUnderstandings } from "../understanding";
import { activeByFamily } from "./catalogue";
import {
	exploreEntry,
	exploreEntryValidator,
	exploreTracks,
	exploreTrackValidator,
	rotate,
} from "./exploreItems";
import { newPool } from "./hub";

/**
 * Explore home's personal shelves (redesign B6, `explore.md` §5, §7, §8, §10;
 * the owner's cut of the board's spec 10, 19 November):
 *
 * - `getContinue`: "Pick up where you left off".
 * - `forYou`: "Because you named …", from recent sessions, unless the person
 *   said "Don't use my sessions here".
 * - `getForHour`: "For the hour", from `audio_tracks.bestAt`.
 * - `getShort`: "Five minutes or less".
 *
 * Open to every signed-in user, like the rest of `browse/`; the free-user gate
 * is on playback, so each item says whether it's Xolace+ (`exploreItems.ts`).
 * Reads are bounded: the catalogue is a few hundred rows (docs/paths-v1.md
 * decision 18), so the shelves that can't use an index scan it with `take`.
 */

const DAY_MS = 86_400_000;

// ─── Pick up where you left off ────────────────────────────────────────────

const CONTINUE_SIZE = 3;
/** Newest unfinished rows walked per kind; hidden and retired ones are skipped. */
const CONTINUE_SCAN = 30;

const continueTrackValidator = v.object({
	id: v.id("audio_tracks"),
	kind: v.literal("track"),
	/** Whole minutes left, at least 1: the card's "4 min left". */
	minutesLeft: v.number(),
	plus: v.boolean(),
	positionSec: v.number(),
	track: exploreTrackValidator,
	updatedAt: v.number(),
});

const continueEntryValidator = v.object({
	entry: exploreEntryValidator,
	id: v.id("library_entries"),
	kind: v.literal("entry"),
	/** 1–99: the card's "40% read" and its bar. */
	percentRead: v.number(),
	plus: v.boolean(),
	updatedAt: v.number(),
});

type Candidate =
	| { at: number; id: Id<"audio_tracks">; kind: "track"; positionSec: number }
	| { at: number; id: Id<"library_entries">; kind: "entry"; position: number };

/**
 * Up to three things this person stopped partway through, newest first: a
 * support track from `listen_progress` or a Lantern entry from
 * `library_reads`. Finished, retired and hidden items never show.
 *
 * A card removed with "Remove from here" (`preferences/explore`) stays
 * removed, even when the person goes back to it: they asked for it off this
 * shelf, and the player keeps writing progress for whatever is playing. Only
 * the hidden list's own limit (the newest 50) ever lets one back.
 */
export const getContinue = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const [prefs, listens, reads] = await Promise.all([
			preferencesRow(ctx, profile._id),
			ctx.db
				.query("listen_progress")
				.withIndex("by_emotionalProfileId_and_finishedAt_and_updatedAt", (q) =>
					q
						.eq("emotionalProfileId", profile._id)
						.eq("finishedAt", undefined)
						.gt("updatedAt", 0)
				)
				.order("desc")
				.take(CONTINUE_SCAN),
			// Lantern's Continue reading index (#419): unfinished rows only.
			ctx.db
				.query("library_reads")
				.withIndex("by_emotionalProfileId_and_finishedAt_and_lastReadAt", (q) =>
					q
						.eq("emotionalProfileId", profile._id)
						.eq("finishedAt", undefined)
						.gt("lastReadAt", 0)
				)
				.order("desc")
				.take(CONTINUE_SCAN),
		]);
		const hidden = new Set(
			(prefs?.exploreHiddenContinue ?? []).map(
				(h) => `${h.item.kind}:${h.item.id}`
			)
		);

		const candidates: Candidate[] = [
			...listens.flatMap((l) =>
				l.positionSec >= MIN_RESUME_SEC
					? [
							{
								at: l.updatedAt,
								id: l.trackId,
								kind: "track" as const,
								positionSec: l.positionSec,
							},
						]
					: []
			),
			...reads.flatMap((r) =>
				(r.position ?? 0) > 0 && r.lastReadAt !== undefined
					? [
							{
								at: r.lastReadAt,
								id: r.entryId,
								kind: "entry" as const,
								position: r.position!,
							},
						]
					: []
			),
		]
			.filter((c) => !hidden.has(`${c.kind}:${c.id}`))
			.sort((a, b) => b.at - a.at);

		const toTrack = exploreTracks(ctx);
		const cards: (
			| Infer<typeof continueTrackValidator>
			| Infer<typeof continueEntryValidator>
		)[] = [];
		// Walks in time order and stops at three, so retired items cost a read each at most.
		for (const c of candidates) {
			if (cards.length === CONTINUE_SIZE) {
				break;
			}
			if (c.kind === "track") {
				const t = await ctx.db.get("audio_tracks", c.id);
				if (!t?.active) {
					continue;
				}
				const track = await toTrack(t);
				cards.push({
					id: c.id,
					kind: "track",
					minutesLeft: Math.max(
						1,
						Math.ceil((t.durationSec - c.positionSec) / 60)
					),
					plus: track.plus,
					positionSec: c.positionSec,
					track,
					updatedAt: c.at,
				});
			} else {
				const e = await ctx.db.get("library_entries", c.id);
				if (!e?.active) {
					continue;
				}
				const entry = await exploreEntry(e);
				cards.push({
					entry,
					id: c.id,
					kind: "entry",
					percentRead: Math.min(99, Math.max(1, Math.round(c.position * 100))),
					plus: entry.plus,
					updatedAt: c.at,
				});
			}
		}
		return cards;
	},
	returns: v.array(v.union(continueTrackValidator, continueEntryValidator)),
});

// ─── Because you named "…" ─────────────────────────────────────────────────

const FOR_YOU_SIZE = 3;
/**
 * The sessions a word can come from. The board's reason line says "From your
 * last two sessions"; change the copy with this.
 */
export const FOR_YOU_SESSIONS = 2;

/** How a slug reads in the header; the rest read as they are. */
const WORD_LABELS: Record<string, string> = {
	"body-image": "body image",
	"not-belonging": "not belonging",
	"self-doubt": "self-doubt",
	"settling-in": "settling in",
	"social-media": "social media",
};

const isThematicTag = (tag: string): tag is ThematicTag =>
	Object.hasOwn(LIFE_AREA_HOME, tag);

type Word = { axis: "emotion" | "lifeArea"; matches: string[]; slug: string };

/**
 * The words a person's recent sessions named, in the order For You tries
 * them: life areas ("work", "sleep") newest session first, then the main
 * emotion of each, with its parent so "stress" also meets tracks tagged
 * "anxiety" (ADR 0018). A session at risk or in crisis offers nothing, as in
 * Lantern's For you (`library/home.ts`), and the sensitive life areas (abuse,
 * trauma…) are never named back.
 */
async function namedWords(
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">
): Promise<Word[]> {
	const recent = await recentUnderstandings(ctx, profileId, FOR_YOU_SESSIONS);
	const safe = recent.filter(
		(m) =>
			!m.riskFlag &&
			m.safeguardLevel !== "crisis" &&
			m.safeguardLevel !== "elevated"
	);
	const areas = [...new Set(safe.flatMap((m) => m.thematicTags))].filter(
		(tag) => isThematicTag(tag) && LIFE_AREA_HOME[tag] !== "sensitive"
	);
	const emotions = [...new Set(safe.map((m) => m.primaryEmotion))];
	return [
		...areas.map((slug) => ({
			axis: "lifeArea" as const,
			matches: [slug],
			slug,
		})),
		...emotions.map((slug) => ({
			axis: "emotion" as const,
			matches: emotionFamily(slug),
			slug,
		})),
	];
}

const forYouValidator = v.union(
	v.null(),
	v.object({
		axis: v.union(v.literal("emotion"), v.literal("lifeArea")),
		slug: v.string(),
		tracks: v.array(exploreTrackValidator),
		/** The header's word, as people read it: `Because you named “work”`. */
		word: v.string(),
	})
);

/**
 * For You for one profile; the public query resolves the caller first. With
 * "Don't use my sessions here" on (`exploreUsesSessions === false`) it reads
 * the preferences row and nothing else: no session, Understanding or anything
 * derived from them. That is a privacy promise (B7), pinned by
 * `explore.test.ts` against the tables actually read.
 *
 * Otherwise Lantern's For you facet match run against audio tags (production
 * `library/home.ts`, no model call): the first word with any active track
 * tagged with it wins, and up to three of those tracks are its tiles, support
 * audio before music, then the ones sharing the most of the other words.
 * Null for a new member, or when nothing matches.
 */
export async function forYouFor(
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">
): Promise<Infer<typeof forYouValidator>> {
	const prefs = await preferencesRow(ctx, profileId);
	if (prefs?.exploreUsesSessions === false) {
		return null;
	}
	const words = await namedWords(ctx, profileId);
	if (words.length === 0) {
		return null;
	}

	const tracks = [
		...(await activeByFamily(ctx, "support")),
		...(await activeByFamily(ctx, "music")),
	];
	const wanted = new Set(words.flatMap((w) => w.matches));
	const overlap = (t: Doc<"audio_tracks">) =>
		t.tags.filter((tag) => wanted.has(tag)).length;
	for (const word of words) {
		const tagged = tracks
			.filter((t) => t.tags.some((tag) => word.matches.includes(tag)))
			.sort(
				(a, b) =>
					Number(a.family === "music") - Number(b.family === "music") ||
					overlap(b) - overlap(a) ||
					a.slug.localeCompare(b.slug)
			)
			.slice(0, FOR_YOU_SIZE);
		if (tagged.length > 0) {
			const toTrack = exploreTracks(ctx);
			return {
				axis: word.axis,
				slug: word.slug,
				tracks: await Promise.all(tagged.map(toTrack)),
				word: WORD_LABELS[word.slug] ?? word.slug,
			};
		}
	}
	return null;
}

export const forYou = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		return await forYouFor(ctx, profile._id);
	},
	returns: forYouValidator,
});

// ─── For the hour ──────────────────────────────────────────────────────────

const FOR_HOUR_SIZE = 3;

/**
 * Three tracks for this time of day. The client sends Today's phase
 * (`useTodayPhase`), so the Review menu's time pin drives it too. Tracks
 * tagged `bestAt` this phase come first, turned one step per `day` (UTC days
 * since epoch, as the New shelf) when there are more than three. With fewer
 * than three tagged, the New shelf's pool fills the rest, so the section never
 * empties while the catalogue is untagged.
 */
export const getForHour = query({
	args: { day: v.optional(v.number()), phase: explorePhaseValidator },
	handler: async (ctx, { day, phase }) => {
		await requireSignedIn(ctx);
		const tracks = [
			...(await activeByFamily(ctx, "support")),
			...(await activeByFamily(ctx, "music")),
		];
		const tagged = rotate(
			tracks
				.filter((t) => t.bestAt?.includes(phase))
				.sort((a, b) => a.slug.localeCompare(b.slug)),
			day
		).slice(0, FOR_HOUR_SIZE);
		const picked = new Set(tagged.map((t) => t._id));
		const now =
			day === undefined || !Number.isFinite(day) ? Date.now() : day * DAY_MS;
		const fill = newPool(tracks, now)
			.filter((t) => !picked.has(t._id))
			.slice(0, FOR_HOUR_SIZE - tagged.length);
		const toTrack = exploreTracks(ctx);
		return await Promise.all([...tagged, ...fill].map(toTrack));
	},
	returns: v.array(exploreTrackValidator),
});

/**
 * Sets a track's `bestAt` (B6), for a script: `convex run
 * browse/explore:setBestAt '{"slug":"…","bestAt":["late"]}'`. An empty list
 * clears it. No admin screen (the owner's cut); the Kindling manifest can
 * carry `bestAt` too.
 */
export const setBestAt = internalMutation({
	args: { bestAt: v.array(explorePhaseValidator), slug: v.string() },
	handler: async (ctx, { bestAt, slug }) => {
		const track = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!track) {
			throw new Error(`No track "${slug}"`);
		}
		await ctx.db.patch("audio_tracks", track._id, {
			bestAt: bestAt.length > 0 ? [...new Set(bestAt)] : undefined,
		});
		return null;
	},
	returns: v.null(),
});

// ─── Five minutes or less ──────────────────────────────────────────────────

const SHORT_SIZE = 6;
const SHORT_MAX_SEC = 300;
const SHORT_MAX_READ_MIN = 5;
/** Shortest first, per kind; the day's turn is taken from these. */
const SHORT_SCAN = 50;

const shortItemValidator = v.union(
	v.object({
		kind: v.literal("track"),
		plus: v.boolean(),
		track: exploreTrackValidator,
	}),
	v.object({
		entry: exploreEntryValidator,
		kind: v.literal("entry"),
		plus: v.boolean(),
	})
);

/**
 * Up to six things of five minutes or less, support audio and reading taken
 * in turn (music is left out: it loops, so its length says nothing). Both come
 * off an index on length, and turn one step per `day` like the New shelf.
 * When one kind runs short the other fills in.
 */
export const getShort = query({
	args: { day: v.optional(v.number()) },
	handler: async (ctx, { day }) => {
		await requireSignedIn(ctx);
		const [tracks, entries] = await Promise.all([
			ctx.db
				.query("audio_tracks")
				.withIndex("by_family_and_active_and_durationSec", (q) =>
					q
						.eq("family", "support")
						.eq("active", true)
						.gt("durationSec", 0)
						.lte("durationSec", SHORT_MAX_SEC)
				)
				.take(SHORT_SCAN),
			ctx.db
				.query("library_entries")
				.withIndex("by_active_and_readMin", (q) =>
					q
						.eq("active", true)
						.gt("readMin", 0)
						.lte("readMin", SHORT_MAX_READ_MIN)
				)
				.take(SHORT_SCAN),
		]);
		const t = rotate(tracks, day);
		const e = rotate(entries, day);
		const toTrack = exploreTracks(ctx);
		const items: Infer<typeof shortItemValidator>[] = [];
		for (
			let i = 0;
			items.length < SHORT_SIZE && (i < t.length || i < e.length);
			i++
		) {
			if (i < t.length && items.length < SHORT_SIZE) {
				const track = await toTrack(t[i]);
				items.push({ kind: "track", plus: track.plus, track });
			}
			if (i < e.length && items.length < SHORT_SIZE) {
				const entry = await exploreEntry(e[i]);
				items.push({ entry, kind: "entry", plus: entry.plus });
			}
		}
		return items;
	},
	returns: v.array(shortItemValidator),
});

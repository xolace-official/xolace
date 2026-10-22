import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import { type Compounding, compoundingFor } from "../../compounding/stretches";
import { hasPremium } from "../../lib/premium";
import { rateLimiter } from "../../lib/rateLimits";
import { domainOf, lifeAreasOf } from "../../lib/understandingVocab";
import { readRow } from "../../library/reads";
import { posthog } from "../../posthog";
import { renderSemanticProfile } from "../../semanticProfiles";
import { MAX_TURNS } from "../../sessionTurns";
import { buildAccumulatedInput } from "../prompts/accumulatedInput";
import {
	type BindEntry,
	type BindTrack,
	type BindUnderstanding,
	understoodEmotions,
} from "./bind";
import { type KindlingHistory, loadHistory } from "./history";
import type { PathsPromptUnderstanding, PromptCompounding } from "./prompt";
import { tendedBefore } from "./tendedBefore";
import { trackSearchLogValidator } from "./trackSearch";

/**
 * Kindling generation — the DB halves of `generate.ts` (#331): the context
 * read that also carries the gates, and the single write that lands a whole
 * kindling or nothing.
 */

export interface GenerateContext {
	binding: BindUnderstanding;
	compounding: PromptCompounding[];
	entries: BindEntry[];
	history: KindlingHistory;
	profile: string | null;
	/** No read may bind on an elevated/crisis session, so it never searches the Library. */
	readsAllowed: boolean;
	semanticProfileId: Doc<"emotional_profiles">["currentSemanticProfileId"];
	/** What the person wrote, for the read (#568) and track (#572) meaning searches. */
	sessionText: string | null;
	tracks: BindTrack[];
	understanding: PathsPromptUnderstanding;
}

// ponytail: the whole active catalogue in one read (~200–400 rows, six small
// fields). Per-topic index reads if the catalogue outgrows a single query.
const MAX_TRACKS = 2000;

// ponytail: per facet value, the first N tagged entries. Fine for a
// hand-curated Library; rank inside the index if a facet outgrows it.
const MAX_ENTRIES_PER_FACET = 200;

/**
 * Library entries whose `emotion` / `lifeArea` facets overlap this
 * Understanding (#412), carrying only the matched facets — the binder's score
 * is their count. Retracted and already-finished entries are left out, and
 * an elevated/crisis session matches nothing (ADR 0015 twig safety).
 */
async function loadReadCandidates(
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">,
	u: Doc<"emotional_metadata">
): Promise<BindEntry[]> {
	if (!readsAllowed(u)) {
		return [];
	}
	const wanted = [
		// Family: a "stress" session still reaches entries shelved under "anxiety" (ADR 0018).
		...understoodEmotions(u).map((slug) => ({ axis: "emotion", slug })),
		...u.thematicTags.map((slug) => ({ axis: "lifeArea", slug })),
	];
	const matched = new Map<
		Id<"library_entries">,
		{ emotions: string[]; lifeAreas: string[] }
	>();
	for (const { axis, slug } of wanted) {
		const rows = await ctx.db
			.query("library_entry_facets")
			.withIndex("by_axis_and_slug", (q) => q.eq("axis", axis).eq("slug", slug))
			.take(MAX_ENTRIES_PER_FACET);
		for (const row of rows) {
			const m = matched.get(row.entryId) ?? { emotions: [], lifeAreas: [] };
			(axis === "emotion" ? m.emotions : m.lifeAreas).push(slug);
			matched.set(row.entryId, m);
		}
	}

	const entries: BindEntry[] = [];
	for (const [entryId, m] of matched) {
		const entry = await ctx.db.get("library_entries", entryId);
		if (!entry?.active) {
			continue;
		}
		if ((await readRow(ctx, profileId, entryId))?.finishedAt !== undefined) {
			continue;
		}
		entries.push({ slug: entry.slug, ...m });
	}
	return entries;
}

/** The read twig's gate (ADR 0015 twig safety, kept by ADR 0021): no read on an elevated/crisis session. */
const readsAllowed = (u: Doc<"emotional_metadata">) =>
	u.safeguardLevel !== "elevated" && u.safeguardLevel !== "crisis";

const DAY_MS = 86_400_000;

/**
 * The compounding domains tonight's session touched (#521, #492 §2) — never
 * a linked or untouched one — and none at all on an elevated/crisis or burned
 * session (§4). The gate lives here, not in compounding/, which never reads
 * safeguard state. Kindling's own gates are unchanged: this only adds context.
 */
async function touchedCompounding(
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">,
	u: Doc<"emotional_metadata">,
	now: number
): Promise<Compounding[]> {
	if (u.safeguardLevel === "elevated" || u.safeguardLevel === "crisis") {
		return [];
	}
	if ((await ctx.db.get("sessions", u.sessionId))?.kept === false) {
		return [];
	}
	const touched = new Set(u.thematicTags.map(domainOf));
	return (await compoundingFor(ctx, profileId, { now })).filter((c) =>
		touched.has(c.domain)
	);
}

/**
 * Null means "do nothing, silently": free user (ADR 0009), no Understanding
 * yet, or `supportNeed` absent/none (§1 — pre-classifier rows read as none).
 */
export const getContext = internalQuery({
	args: {
		emotionalProfileId: v.id("emotional_profiles"),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args): Promise<GenerateContext | null> => {
		const profile = await ctx.db.get(
			"emotional_profiles",
			args.emotionalProfileId
		);
		if (!(profile && (await hasPremium(ctx, profile)))) {
			return null;
		}

		const u = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.unique();
		const supportNeed = u?.supportNeed ?? "none";
		if (!u || supportNeed === "none") {
			return null;
		}

		const semantic = profile.currentSemanticProfileId
			? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
			: null;

		const now = Date.now();
		const compounding: PromptCompounding[] = [];
		const reofferSlugs: string[] = [];
		for (const c of await touchedCompounding(ctx, profile._id, u, now)) {
			const before = c.returning
				? await tendedBefore(ctx, profile._id, c.domain, c.startedAt)
				: undefined;
			reofferSlugs.push(...(before?.slugs ?? []));
			compounding.push({
				days: (now - c.startedAt) / DAY_MS,
				domain: c.domain,
				returning: c.returning,
				state: c.state,
				tendedBefore: before?.types,
			});
		}
		// Personal memory off reads only the recent kindlings, never the matches (#565).
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		const matchKeys =
			prefs?.personalMemoryEnabled === false ? [] : (u.episodicMatchKeys ?? []);
		const history = await loadHistory(ctx, profile._id, matchKeys, now);
		const tracks = (await ctx.db.query("audio_tracks").take(MAX_TRACKS))
			.filter((t) => t.active)
			.map(({ slug, family, topic, tags, active, series }) => ({
				active,
				family,
				series,
				slug,
				tags,
				topic,
			}));

		return {
			binding: {
				compoundingTags: compounding.flatMap((c) => lifeAreasOf(c.domain)),
				primaryEmotion: u.primaryEmotion,
				reofferSlugs,
				secondaryEmotion: u.secondaryEmotion,
				skippedSlugs: history.skippedSlugs,
				suggestedSpecialty: u.suggestedSpecialty,
				thematicTags: u.thematicTags,
			},
			compounding,
			entries: await loadReadCandidates(ctx, profile._id, u),
			history,
			profile: semantic ? renderSemanticProfile(semantic) : null,
			readsAllowed: readsAllowed(u),
			semanticProfileId: profile.currentSemanticProfileId,
			sessionText: await loadSessionText(ctx, args.sessionId),
			tracks,
			understanding: {
				granularLabel: u.granularLabel,
				intensity: u.intensity,
				primaryEmotion: u.primaryEmotion,
				safeguardLevel: u.safeguardLevel,
				specificity: u.specificity,
				supportNeed,
				temporalContext: u.temporalContext,
				thematicTags: u.thematicTags,
				userLanguageTags: u.userLanguageTags,
			},
		};
	},
});

/**
 * The text the Understanding was classified on: after a refinement turn the
 * classifier re-read the accumulated input (ai/clarify.ts), so the read and
 * track searches must too, or they rank on words the Understanding moved past.
 */
async function loadSessionText(ctx: QueryCtx, sessionId: Id<"sessions">) {
	const session = await ctx.db.get("sessions", sessionId);
	if (session?.rawInput === undefined) {
		return null;
	}
	const turns = await ctx.db
		.query("session_turns")
		.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
		.take(MAX_TURNS);
	// Blank text has no meaning to search: null = "skipped", not a failed embed.
	const text = buildAccumulatedInput(session.rawInput, turns);
	return text.trim() ? text : null;
}

const twigValidator = v.object({
	actionType: v.string(),
	order: v.number(),
	params: v.any(),
	why: v.string(),
});

/**
 * Consume the day's kindling slot, archive the previous active kindling
 * (never delete, §6) and write the new one — one transaction, so a throw
 * anywhere rolls the slot back with the rows and a retry is still allowed.
 * Null = slot already spent; nothing written.
 */
export const write = internalMutation({
	args: {
		completionTokens: v.optional(v.number()),
		emotionalProfileId: v.id("emotional_profiles"),
		historyKinds: v.optional(v.array(v.string())),
		model: v.string(),
		modelVersion: v.string(),
		promptTokens: v.optional(v.number()),
		readFallback: v.optional(v.boolean()),
		readSearch: v.optional(
			v.union(v.literal("ran"), v.literal("failed"), v.literal("skipped"))
		),
		readTopScore: v.optional(v.number()),
		semanticProfileId: v.optional(v.id("semantic_profiles")),
		sessionId: v.id("sessions"),
		trackSearch: v.optional(v.array(trackSearchLogValidator)),
		twigs: v.array(twigValidator),
		withheld: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const slot = await rateLimiter.limit(ctx, "pathsGenerate", {
			key: args.emotionalProfileId,
		});
		if (!slot.ok) {
			return null;
		}

		const previous = await ctx.db
			.query("paths")
			.withIndex("by_profile_and_status", (q) =>
				q
					.eq("emotionalProfileId", args.emotionalProfileId)
					.eq("status", "active")
			)
			.take(10);
		for (const path of previous) {
			await ctx.db.patch("paths", path._id, { status: "replaced" });
		}

		const pathId = await ctx.db.insert("paths", {
			completionTokens: args.completionTokens,
			emotionalProfileId: args.emotionalProfileId,
			// Soft reference: dataRetention prunes old semantic_profiles versions
			// independently, so readers must tolerate a dangling id.
			emotionalProfileVersionId: args.semanticProfileId,
			generatedAt: Date.now(),
			model: args.model,
			modelVersion: args.modelVersion,
			promptTokens: args.promptTokens,
			sessionId: args.sessionId,
			status: "active",
		});
		for (const twig of args.twigs) {
			await ctx.db.insert("path_steps", { pathId, ...twig, state: "pending" });
		}

		for (const path of previous) {
			await posthog.capture(ctx, {
				distinctId: args.emotionalProfileId,
				event: "path_replaced",
				properties: { pathId: path._id, replacedBySessionId: args.sessionId },
			});
		}
		await posthog.capture(ctx, {
			distinctId: args.emotionalProfileId,
			event: "path_generated",
			properties: {
				actionTypes: args.twigs.map((t) => t.actionType),
				historyKinds: args.historyKinds ?? [],
				modelVersion: args.modelVersion,
				pathId,
				readFallback: args.readFallback,
				// Whether the meaning search ran, how close the best Library entry came,
				// and whether the read bound on facets (#568).
				readSearch: args.readSearch,
				readTopScore: args.readTopScore,
				sessionId: args.sessionId,
				// Per track twig (#572): the same three, inside the topic the model picked.
				trackSearch: args.trackSearch ?? [],
				twigs: args.twigs.length,
				withheld: args.withheld ?? [],
			},
		});
		return pathId;
	},
	returns: v.union(v.id("paths"), v.null()),
});

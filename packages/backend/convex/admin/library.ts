import type { UserIdentity } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { manifestSource, resolveSourceSlugs } from "../library/sources";
import {
	assertEntryLive,
	type EntryFields,
	writeEntry,
} from "../library/write";
import schema from "../schema";
import { ADMIN_LIST_LIMIT, adminStamp, assertSlug, notFound } from "./edits";

/**
 * Library entries for the admin (admin v1 step 6). Unlike `library/entries.ts`
 * this returns the curator-only fields (reviews, consent) and inactive rows.
 * Writes go through `library/write.ts`, the same path as the ingest, so a
 * draft may be half-done but nothing goes live past a gate.
 */

const entryFields = schema.tables.library_entries.validator.fields;

const narrationValidator = v.object({
	active: v.boolean(),
	durationSec: v.number(),
	hasTranscript: v.boolean(),
});

const entryRow = v.object({
	active: v.boolean(),
	consentRecordedAt: v.optional(v.number()),
	contentNote: v.optional(v.string()),
	credits: v.array(manifestSource),
	dek: v.string(),
	editedBy: v.optional(v.string()),
	facets: v.record(v.string(), v.array(v.string())), // axis → slugs, without the primary subject
	hasCover: v.boolean(),
	kind: entryFields.kind,
	lastReviewedAt: v.number(),
	narration: v.optional(narrationValidator),
	primarySubject: v.string(),
	publishedAt: v.optional(v.number()),
	readMin: v.number(),
	reflectPrompt: v.optional(v.string()),
	retiredAt: v.optional(v.number()),
	retrievedAt: v.optional(v.number()),
	reuse: entryFields.reuse,
	safetyReviewedAt: v.optional(v.number()),
	slug: v.string(),
	storyDescriptor: v.optional(v.string()),
	title: v.string(),
	updatedAt: v.number(),
});

const MAX_FACETS = 100;
const MAX_CREDITS = 50;

async function entryBySlug(ctx: QueryCtx, slug: string) {
	const e = await ctx.db
		.query("library_entries")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (!e) {
		throw notFound("library entry", slug);
	}
	return e;
}

export async function bodyOf(ctx: QueryCtx, entryId: Id<"library_entries">) {
	const body = await ctx.db
		.query("library_entry_bodies")
		.withIndex("by_entryId", (q) => q.eq("entryId", entryId))
		.unique();
	return body?.markdown ?? "";
}

/** The entry's credits in order, as the manifest names them (source slugs). */
export async function creditsOf(
	ctx: QueryCtx,
	entryId: Id<"library_entries">,
	sourceSlugs: Map<Id<"library_sources">, string>
): Promise<Infer<typeof manifestSource>[]> {
	const pairs = await ctx.db
		.query("library_entry_sources")
		.withIndex("by_entryId_and_order", (q) => q.eq("entryId", entryId))
		.take(MAX_CREDITS);
	return await Promise.all(
		pairs.map(async (p) => ({
			author: p.author,
			pageTitle: p.pageTitle,
			pageUrl: p.pageUrl,
			retrievedAt: p.retrievedAt,
			source:
				sourceSlugs.get(p.sourceId) ??
				(await ctx.db.get("library_sources", p.sourceId))?.slug ??
				"(missing source)",
		}))
	);
}

/** Facets as authored: by axis, minus the `subject` facet ingest derives from `primarySubject`. */
export async function facetsOf(ctx: QueryCtx, e: Doc<"library_entries">) {
	const rows = await ctx.db
		.query("library_entry_facets")
		.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
		.take(MAX_FACETS);
	const facets: Record<string, string[]> = {};
	for (const { axis, slug } of rows) {
		if (axis === "subject" && slug === e.primarySubject) {
			continue;
		}
		facets[axis] = [...(facets[axis] ?? []), slug];
	}
	return facets;
}

async function toRow(
	ctx: QueryCtx,
	e: Doc<"library_entries">,
	sourceSlugs: Map<Id<"library_sources">, string>
): Promise<Infer<typeof entryRow>> {
	const [credits, facets, audio, transcript] = await Promise.all([
		creditsOf(ctx, e._id, sourceSlugs),
		facetsOf(ctx, e),
		ctx.db
			.query("library_entry_audio")
			.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
			.first(),
		ctx.db
			.query("library_entry_transcripts")
			.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
			.first(),
	]);
	return {
		active: e.active,
		consentRecordedAt: e.consentRecordedAt,
		contentNote: e.contentNote,
		credits,
		dek: e.dek,
		editedBy: e.editedBy,
		facets,
		hasCover: Boolean(e.cover1280Key ?? e.coverKey ?? e.coverUrl),
		kind: e.kind,
		lastReviewedAt: e.lastReviewedAt,
		narration: audio
			? {
					active: audio.active,
					durationSec: audio.durationSec,
					hasTranscript: transcript !== null,
				}
			: undefined,
		primarySubject: e.primarySubject,
		publishedAt: e.publishedAt,
		readMin: e.readMin,
		reflectPrompt: e.reflectPrompt,
		retiredAt: e.retiredAt,
		retrievedAt: e.retrievedAt,
		reuse: e.reuse,
		safetyReviewedAt: e.safetyReviewedAt,
		slug: e.slug,
		storyDescriptor: e.storyDescriptor,
		title: e.title,
		updatedAt: e.updatedAt ?? e._creationTime,
	};
}

/** Every entry, live or not, newest first. */
export const list = adminQuery({
	args: {},
	handler: async (ctx) => {
		const [entries, sources] = await Promise.all([
			ctx.db.query("library_entries").order("desc").take(ADMIN_LIST_LIMIT),
			ctx.db.query("library_sources").take(ADMIN_LIST_LIMIT),
		]);
		const sourceSlugs = new Map(sources.map((s) => [s._id, s.slug]));
		return await Promise.all(entries.map((e) => toRow(ctx, e, sourceSlugs)));
	},
	returns: v.array(entryRow),
});

/** Every entry's markdown body by slug. Kept apart from `list` so a metadata edit doesn't resend every body. */
export const bodies = adminQuery({
	args: {},
	handler: async (ctx) => {
		const entries = await ctx.db
			.query("library_entries")
			.take(ADMIN_LIST_LIMIT);
		const out: Record<string, string> = {};
		for (const e of entries) {
			out[e.slug] = await bodyOf(ctx, e._id);
		}
		return out;
	},
	returns: v.record(v.string(), v.string()),
});

/** The fields a caller sets, read back off a stored row (see `EntryFields`). */
function fieldsOf(e: Doc<"library_entries">): EntryFields {
	const {
		_creationTime,
		_id,
		editedBy,
		readMin,
		retiredAt,
		safetyReviewedAt,
		searchText,
		sha256,
		updatedAt,
		...fields
	} = e;
	return fields;
}

/** A new draft. Stories start as `original` (first-hand), the rest as `adapted`. */
export const create = adminMutation({
	args: {
		kind: entryFields.kind,
		primarySubject: v.string(),
		slug: v.string(),
		title: v.string(),
	},
	handler: async (ctx, { kind, primarySubject, slug, title }) => {
		assertSlug(slug);
		const taken = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (taken) {
			throw new ConvexError(`library entry "${slug}" already exists`);
		}
		await writeEntry(
			ctx,
			null,
			{
				facets: {},
				fields: {
					active: false,
					dek: "",
					kind,
					lastReviewedAt: Date.now(),
					primarySubject,
					reuse: kind === "story" ? "original" : "adapted",
					slug,
					title,
				},
				markdown: "",
				sources: [],
			},
			{ editedBy: ctx.identity.subject, strict: false }
		);
		return null;
	},
	returns: v.null(),
});

/**
 * Save the editor's copy, credits, facets and body. Optional copy fields left
 * out are cleared. Saving a live entry re-checks every publish gate, so an
 * explainer's body can't change while it's live (the edit drops its review).
 */
export const save = adminMutation({
	args: {
		credits: v.array(manifestSource),
		entry: v.object({
			contentNote: v.optional(v.string()),
			dek: v.string(),
			primarySubject: v.string(),
			reflectPrompt: v.optional(v.string()),
			storyDescriptor: v.optional(v.string()),
			title: v.string(),
		}),
		facets: v.record(v.string(), v.array(v.string())),
		markdown: v.string(),
		slug: v.string(),
	},
	handler: async (ctx, { credits, entry, facets, markdown, slug }) => {
		if (Object.values(facets).flat().length > MAX_FACETS) {
			throw new ConvexError(
				`library entry "${slug}": over ${MAX_FACETS} facets`
			);
		}
		const existing = await entryBySlug(ctx, slug);
		const {
			contentNote: _contentNote,
			reflectPrompt: _reflectPrompt,
			storyDescriptor: _storyDescriptor,
			...kept
		} = fieldsOf(existing);
		await writeEntry(
			ctx,
			existing,
			{ facets, fields: { ...kept, ...entry }, markdown, sources: credits },
			{ editedBy: ctx.identity.subject, strict: false }
		);
		return null;
	},
	returns: v.null(),
});

async function setActive(
	ctx: MutationCtx,
	identity: UserIdentity,
	e: Doc<"library_entries">,
	active: boolean
) {
	const now = Date.now();
	await ctx.db.patch("library_entries", e._id, {
		...adminStamp(identity),
		active,
		...(active
			? { publishedAt: e.publishedAt ?? now, retiredAt: undefined }
			: { retiredAt: e.active ? now : e.retiredAt }),
	});
	// Live entries are in the meaning index, retired ones leave it (#568).
	await ctx.scheduler.runAfter(0, internal.ai.library.embed.indexEntry, {
		entryId: e._id,
	});
}

/** Put an entry live, after every publish gate passes on what's stored. */
export const publish = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const e = await entryBySlug(ctx, slug);
		const sources = await resolveSourceSlugs(
			ctx,
			e,
			await creditsOf(ctx, e._id, new Map())
		);
		assertEntryLive(e, await bodyOf(ctx, e._id), sources);
		await setActive(ctx, ctx.identity, e, true);
		return null;
	},
	returns: v.null(),
});

/** Take an entry down. Reversible, never a delete: readers who saved it keep read-only access (#404). */
export const retire = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		await setActive(ctx, ctx.identity, await entryBySlug(ctx, slug), false);
		return null;
	},
	returns: v.null(),
});

/** A reviewer's sign-off on an explainer's current body; the next body edit clears it. */
export const markSafetyReviewed = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const e = await entryBySlug(ctx, slug);
		if (e.kind !== "explainer") {
			throw new ConvexError(
				`library entry "${slug}" is a ${e.kind}, not an explainer`
			);
		}
		await ctx.db.patch("library_entries", e._id, {
			...adminStamp(ctx.identity),
			safetyReviewedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/** Record that the writer of a first-hand story consented to publishing it. */
export const recordConsent = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const e = await entryBySlug(ctx, slug);
		if (e.kind !== "story") {
			throw new ConvexError(
				`library entry "${slug}" is a ${e.kind}, not a story`
			);
		}
		await ctx.db.patch("library_entries", e._id, {
			...adminStamp(ctx.identity),
			consentRecordedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});
